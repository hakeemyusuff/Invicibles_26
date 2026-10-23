import { createHash, randomUUID, randomBytes, timingSafeEqual } from 'node:crypto';

export const hash = value => createHash('sha256').update(value).digest('hex');
const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
function equal(a, b) { if (!a || !b) return false; const aa = Buffer.from(a); const bb = Buffer.from(b); return aa.length === bb.length && timingSafeEqual(aa, bb); }
export function validateMemory(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Please fill in your name and memory.');
  const clean = value => typeof value === 'string' ? value.normalize('NFC').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim() : '';
  const name = clean(body.name), message = clean(body.message), category = body.category;
  if (name.length < 2 || name.length > 65) throw new Error('Please use a name between 2 and 65 characters.');
  if (message.length < 8 || message.length > 600) throw new Error('Please write between 8 and 600 characters.');
  if (!['memory', 'shoutout', 'wish'].includes(category)) throw new Error('Choose a memory, shout-out or wish.');
  if (body.consent !== true) throw new Error('Please confirm you are happy to share this note.');
  if (body.website) throw new Error('Your note could not be submitted.');
  return { name, message, category };
}
export function publicMemory(record) { const { deleteHash, ...safe } = record; return safe; }

export class RedisStore {
  constructor(url, token, fetcher = fetch) { this.url = url.replace(/\/$/, ''); this.token = token; this.fetcher = fetcher; }
  async command(...args) {
    const response = await this.fetcher(this.url, { method: 'POST', headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args), signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Shared storage is temporarily unavailable.');
    const data = await response.json(); if (data.error) throw new Error('Shared storage is temporarily unavailable.'); return data.result;
  }
  async list(all = false) {
    const raw = await this.command('HVALS', 'invincibles26:notes');
    return raw.map(value => JSON.parse(value)).filter(r => all || r.status === 'published').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async get(id) { const value = await this.command('HGET', 'invincibles26:notes', id); return value ? JSON.parse(value) : null; }
  async create(record, clientKey) {
    const script = "local n=tonumber(redis.call('GET',KEYS[2]) or '0'); if n>=5 then return 0 end; redis.call('INCR',KEYS[2]); if n==0 then redis.call('EXPIRE',KEYS[2],600) end; redis.call('HSET',KEYS[1],ARGV[1],ARGV[2]); return 1";
    return (await this.command('EVAL', script, 2, 'invincibles26:notes', `invincibles26:rate:${clientKey}`, record.id, JSON.stringify(record))) === 1;
  }
  async update(record) { await this.command('HSET', 'invincibles26:notes', record.id, JSON.stringify(record)); }
  async remove(id) { await this.command('HDEL', 'invincibles26:notes', id); }
}

export function createMemoryHandler({ env = process.env, store, development = false } = {}) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  const db = store || (url && token ? new RedisStore(url, token) : null);
  const needsApproval = env.MEMORY_REQUIRE_APPROVAL === 'true';
  const configured = Boolean(db) && (!needsApproval || Boolean(env.MEMORY_ADMIN_TOKEN));
  const meta = { available: configured, codeRequired: Boolean(env.MEMORY_POST_CODE), approvalRequired: needsApproval, development };
  return async request => {
    const requestUrl = new URL(request.url);
    const adminRequest = requestUrl.searchParams.get('admin') === '1';
    const isAdmin = equal(request.headers.get('authorization') || '', `Bearer ${env.MEMORY_ADMIN_TOKEN || ''}`) && Boolean(env.MEMORY_ADMIN_TOKEN);
    if (adminRequest && !isAdmin) return json({ error: 'Please check the admin passphrase.' }, 401);
    if (!['GET', 'POST', 'DELETE', 'PATCH'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET, POST, DELETE, PATCH' });
    if (!configured) return request.method === 'GET' ? json({ ...meta, memories: [] }) : json({ error: 'The wall is not open for new notes yet. Please try again later.' }, 503);
    try {
      if (request.method === 'GET') {
        const memories = (await db.list(adminRequest)).map(publicMemory);
        return json({ ...meta, memories });
      }
      const origin = request.headers.get('origin');
      const allowedOrigins = new Set([requestUrl.origin, env.SITE_ORIGIN, env.VERCEL_URL && `https://${env.VERCEL_URL}`, env.VERCEL_PROJECT_PRODUCTION_URL && `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`].filter(Boolean));
      if (origin && !allowedOrigins.has(origin)) return json({ error: 'Please submit this note from the class website.' }, 403);
      if (!(request.headers.get('content-type') || '').startsWith('application/json')) return json({ error: 'Please submit a valid form.' }, 415);
      if (Number(request.headers.get('content-length') || 0) > 12000) return json({ error: 'That note is too long.' }, 413);
      const text = await request.text(); if (Buffer.byteLength(text) > 12000) return json({ error: 'That note is too long.' }, 413);
      let body; try { body = JSON.parse(text); } catch { return json({ error: 'Please submit a valid form.' }, 400); }
      if (request.method === 'POST') {
        if (env.MEMORY_POST_CODE && !equal(String(body.code || ''), env.MEMORY_POST_CODE)) return json({ error: 'Please check the class posting code.' }, 403);
        let clean; try { clean = validateMemory(body); } catch (error) { return json({ error: error.message }, 400); }
        const ip = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
        const clientKey = hash(`${token || 'local'}:${new Date().toISOString().slice(0, 10)}:${ip}`);
        const deleteToken = randomBytes(24).toString('hex');
        const note = { ...clean, id: randomUUID(), createdAt: new Date().toISOString(), status: needsApproval ? 'pending' : 'published', deleteHash: hash(deleteToken) };
        const saved = await db.create(note, clientKey);
        if (!saved) return json({ error: 'You have shared several notes. Give it 10 minutes, then add another.' }, 429, { 'Retry-After': '600' });
        return json({ memory: publicMemory(note), deleteToken, pending: needsApproval }, 201);
      }
      if (typeof body.id !== 'string' || !/^[a-f0-9-]{36}$/.test(body.id)) return json({ error: 'Please choose a valid note.' }, 400);
      const existing = await db.get(body.id); if (!existing) return json({ error: 'This note is no longer on the wall.' }, 404);
      if (request.method === 'DELETE') {
        if (!isAdmin && !equal(existing.deleteHash, hash(String(body.deleteToken || '')))) return json({ error: 'You can only remove your own notes from this browser.' }, 403);
        await db.remove(body.id); return json({ success: true });
      }
      if (!isAdmin) return json({ error: 'Admin access is required.' }, 401);
      if (!['published', 'hidden'].includes(body.status)) return json({ error: 'Choose publish or hide.' }, 400);
      await db.update({ ...existing, status: body.status }); return json({ success: true });
    } catch { return json({ error: 'The memory wall is taking a moment. Please try again shortly.' }, 503); }
  };
}
