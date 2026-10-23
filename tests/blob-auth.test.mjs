import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { blobImages } from '../lib/photo-images.mjs';
import photos from '../api/photos.js';

function environment(t, values) {
  const original = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  t.after(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
}

async function service(t, handle) {
  const server = createServer(handle);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('connected Blob stores use the current request token without an OIDC environment variable', async t => {
  const requests = [];
  const endpoint = await service(t, async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    requests.push({ method: request.method, headers: request.headers, body: Buffer.concat(chunks) });
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ url: 'https://teststore.public.blob.vercel-storage.com/story/test.webp', pathname: 'story/test.webp', contentType: 'image/webp' }));
  });
  environment(t, { VERCEL_BLOB_API_URL: endpoint, VERCEL_OIDC_TOKEN: undefined, BLOB_READ_WRITE_TOKEN: undefined });
  const symbol = Symbol.for('@vercel/request-context'), originalContext = globalThis[symbol];
  t.after(() => { if (originalContext === undefined) delete globalThis[symbol]; else globalThis[symbol] = originalContext; });
  const token = marker => `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, marker })).toString('base64url')}.test-signature`;
  let currentToken = token('first-request');
  globalThis[symbol] = { get: () => ({ headers: { 'x-vercel-oidc-token': currentToken } }) };

  const images = blobImages({ BLOB_STORE_ID: 'store_teststore' });
  assert.ok(images, 'A connected store must not be disabled because its token lives in the request context.');
  const saved = await images.put('test', Buffer.from('photo-bytes'));
  assert.equal(requests[0].headers.authorization, `Bearer ${currentToken}`);
  assert.equal(requests[0].headers['x-vercel-blob-store-id'], 'teststore');
  assert.equal(requests[0].body.toString(), 'photo-bytes');
  currentToken = token('next-request');
  await images.remove(saved.url);
  assert.equal(requests[1].headers.authorization, `Bearer ${currentToken}`, 'Rotated request tokens must not be cached.');
});

test('the deployed photo route reads configuration when a request arrives', async t => {
  const endpoint = await service(t, async (request, response) => {
    for await (const chunk of request) {} // Consume the Redis REST request body.
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ result: [] }));
  });
  environment(t, {
    UPSTASH_REDIS_REST_URL: endpoint, UPSTASH_REDIS_REST_TOKEN: 'test-redis-token',
    BLOB_STORE_ID: 'store_teststore', BLOB_READ_WRITE_TOKEN: undefined,
    VERCEL_OIDC_TOKEN: undefined, GALLERY_UPLOAD_PASSWORD: 'test-class-password'
  });
  const request = () => new Request('https://class.example/api/photos');
  assert.equal((await (await photos.fetch(request())).json()).available, true);
  delete process.env.GALLERY_UPLOAD_PASSWORD;
  assert.equal((await (await photos.fetch(request())).json()).available, false, 'A store connection must never bypass the class password requirement.');
});

test('Blob storage remains unavailable without a store ID or read-write token', () => {
  assert.equal(blobImages({}), undefined);
});
