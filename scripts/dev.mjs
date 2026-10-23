import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { join, resolve, extname, sep } from 'node:path';
import { createMemoryHandler } from '../lib/memory-service.mjs';
import { LocalStore } from './local-store.mjs';
try { process.loadEnvFile('.env.local'); } catch {}
const root = resolve('public');
await mkdir('.data', { recursive: true });
const remote = Boolean((process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) && (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN));
const handler = createMemoryHandler({ store: remote ? undefined : new LocalStore('.data/memories.sqlite'), development: !remote });
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost:4173'}`);
    if (url.pathname === '/api/memories') {
      let size = 0; const chunks = [];
      for await (const chunk of req) { size += chunk.length; if (size > 12000) { res.writeHead(413); return res.end('Too large'); } chunks.push(chunk); }
      const request = new Request(url, { method: req.method, headers: req.headers, ...(req.method !== 'GET' && req.method !== 'HEAD' ? { body: Buffer.concat(chunks) } : {}) });
      const response = await handler(request); res.writeHead(response.status, Object.fromEntries(response.headers)); return res.end(Buffer.from(await response.arrayBuffer()));
    }
    const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = resolve(join(root, requested));
    if (!file.startsWith(root + sep)) { res.writeHead(403); return res.end('Forbidden'); }
    const data = await readFile(file); res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(Number(process.env.PORT) || 4173, '0.0.0.0', () => console.log('Invincibles preview ready on port', Number(process.env.PORT) || 4173));
