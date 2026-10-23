import { randomUUID, timingSafeEqual } from 'node:crypto';
import { RedisStore, hash } from './memory-service.mjs';

export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const MAX_PHOTO_BODY = MAX_PHOTO_BYTES + 8192;
const key = 'invincibles26:photos';
const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
const equal = (a, b) => Boolean(a && b) && timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
const clean = value => typeof value === 'string' ? value.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, '').trim() : '';
const publicPhoto = ({ requestHash, ...photo }) => photo;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

export class RedisPhotoStore extends RedisStore {
  async list(all = false) {
    return (await this.command('HVALS', key)).map(value => JSON.parse(value)).filter(photo => all || photo.status === 'published').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async get(id) { const raw = await this.command('HGET', key, id); return raw ? JSON.parse(raw) : null; }
  async save(photo) { await this.command('HSET', key, photo.id, JSON.stringify(photo)); }
  async allow(clientKey, limit, seconds = 600) {
    const script = "local n=tonumber(redis.call('GET',KEYS[1]) or '0'); if n>=tonumber(ARGV[1]) then return 0 end; redis.call('INCR',KEYS[1]); if n==0 then redis.call('EXPIRE',KEYS[1],ARGV[2]) end; return 1";
    return await this.command('EVAL', script, 1, `invincibles26:photo-rate:${clientKey}`, limit, seconds) === 1;
  }
}

export async function readLimitedBody(request, limit) {
  if (Number(request.headers.get('content-length') || 0) > limit) throw new RangeError('too large');
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new RangeError('too large'); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}

export function createPhotoHandler({ env = process.env, store, images, normalizeImage, development = false } = {}) {
  const redisUrl = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  const db = store || (redisUrl && redisToken ? new RedisPhotoStore(redisUrl, redisToken) : null);
  const available = Boolean(db && images && normalizeImage && env.GALLERY_UPLOAD_PASSWORD);
  return async request => {
    const url = new URL(request.url), method = request.method;
    const admin = equal(request.headers.get('authorization'), env.MEMORY_ADMIN_TOKEN && `Bearer ${env.MEMORY_ADMIN_TOKEN}`);
    const adminRequest = url.searchParams.get('admin') === '1';
    if ((adminRequest || method === 'PATCH') && !admin) return json({ error: 'Please check the organiser passphrase.' }, 401);
    if (!['GET', 'POST', 'PATCH'].includes(method)) return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET, POST, PATCH' });
    try {
      if (method === 'GET') return json({ available, development, photos: db ? (await db.list(adminRequest)).map(publicPhoto) : [] });
      const origin = request.headers.get('origin');
      const allowed = [url.origin, env.SITE_ORIGIN, env.VERCEL_URL && `https://${env.VERCEL_URL}`, env.VERCEL_PROJECT_PRODUCTION_URL && `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`];
      if (origin && !allowed.includes(origin)) return json({ error: 'Please add photos from the class website.' }, 403);
      if (method === 'PATCH') {
        if (!db) return json({ error: 'The shared album is not connected.' }, 503);
        if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Invalid update.' }, 415);
        let body; try { body = JSON.parse((await readLimitedBody(request, 2048)).toString()); } catch (error) { return json({ error: 'Invalid update.' }, error instanceof RangeError ? 413 : 400); }
        if (!uuid.test(body?.id) || !['published', 'hidden'].includes(body?.status)) return json({ error: 'Choose a photograph and publish or hide.' }, 400);
        const photo = await db.get(body.id); if (!photo) return json({ error: 'This photograph could not be found.' }, 404);
        await db.save({ ...photo, status: body.status }); return json({ success: true });
      }
      if (!available) return json({ error: 'Photo contributions will open here soon. Please try again later.' }, 503);
      const ip = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      const client = hash(`${redisToken || env.GALLERY_UPLOAD_PASSWORD}:${new Date().toISOString().slice(0, 10)}:${ip}`);
      if (!await db.allow(`request:${client}`, 120)) return json({ error: 'Too many upload attempts from this connection. Please try again in 10 minutes.' }, 429, { 'Retry-After': '600' });
      if (!equal(request.headers.get('x-gallery-password'), env.GALLERY_UPLOAD_PASSWORD)) {
        const allowedAttempt = await db.allow(`password:${client}`, 10);
        return json({ error: allowedAttempt ? 'That class password is not right. Please try again.' : 'Too many password attempts. Please try again in 10 minutes.' }, allowedAttempt ? 403 : 429, allowedAttempt ? {} : { 'Retry-After': '600' });
      }
      if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) return json({ error: 'Choose a JPG, PNG or WebP photograph.' }, 415);
      let bytes;
      try { bytes = await readLimitedBody(request, MAX_PHOTO_BODY); } catch (error) { if (error instanceof RangeError) return json({ error: 'This photo is too large. Choose a smaller copy.' }, 413); throw error; }
      let form;
      try { form = await new Request(url, { method: 'POST', headers: { 'Content-Type': request.headers.get('content-type') }, body: bytes }).formData(); } catch { return json({ error: 'The photo form could not be read.' }, 400); }
      const name = clean(form.get('name')), caption = clean(form.get('caption')), category = form.get('category');
      const file = form.get('photo'), id = form.get('id') || randomUUID();
      if (name.length < 2 || name.length > 65 || caption.length > 120 || !['Class days', 'Hands-on', 'Celebrations'].includes(category) || !uuid.test(id)) return json({ error: 'Check your name, caption and photo category.' }, 400);
      if (form.get('consent') !== 'true' || form.get('website')) return json({ error: 'Please confirm you have permission to share these photographs publicly.' }, 400);
      if (!(file instanceof File) || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return json({ error: 'Choose a JPG, PNG or WebP photograph.' }, 415);
      if (!file.size || file.size > MAX_PHOTO_BYTES) return json({ error: 'This photo is too large or empty. Choose another copy.' }, 413);
      const input = Buffer.from(await file.arrayBuffer());
      const requestHash = hash(JSON.stringify({ name, caption, category, photo: hash(input) }));
      const previous = await db.get(id);
      // Retrying a completed upload must not add another copy to the album.
      if (previous) return previous.requestHash === requestHash ? json({ photo: publicPhoto(previous) }) : json({ error: 'Choose the photograph again to upload a new copy.' }, 409);
      if (!await db.allow(`upload:${client}`, 60)) return json({ error: 'Several photos have been shared from this connection. Try again in 10 minutes.' }, 429, { 'Retry-After': '600' });
      let output;
      try { output = await normalizeImage(input); } catch { return json({ error: 'This picture could not be opened. Try a JPG, PNG or WebP copy.' }, 415); }
      const stored = await images.put(id, output.data);
      const photo = { id, name, caption: caption || `A moment shared by ${name}`, category, src: stored.url, thumb: stored.url, width: output.width, height: output.height, createdAt: new Date().toISOString(), status: 'published', contributed: true, requestHash };
      try { await db.save(photo); } catch (error) {
        // A timed-out database write may have succeeded. Only roll back a confirmed failure.
        const saved = await db.get(id);
        if (saved?.requestHash === requestHash) return json({ photo: publicPhoto(saved) }, 201);
        await images.remove(stored.url); throw error;
      }
      return json({ photo: publicPhoto(photo) }, 201);
    } catch { return json({ error: 'The shared album is taking a moment. Please try again shortly.' }, 503); }
  };
}
