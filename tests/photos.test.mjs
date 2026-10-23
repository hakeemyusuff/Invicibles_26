import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { createPhotoHandler, MAX_PHOTO_BODY } from '../lib/photo-service.mjs';
import { normalizeImage } from '../lib/photo-images.mjs';
import { LocalPhotoStore } from '../scripts/local-store.mjs';

const env = { GALLERY_UPLOAD_PASSWORD: 'test-class-password', MEMORY_ADMIN_TOKEN: 'test-organiser-password' };
const picture = await sharp({ create: { width: 240, height: 320, channels: 3, background: '#63834c' } }).jpeg().toBuffer();
function upload({ password = env.GALLERY_UPLOAD_PASSWORD, id = randomUUID(), bytes = picture, type = 'image/jpeg', fields = {}, headers = {} } = {}) {
  const form = new FormData();
  Object.entries({ id, name: 'QA Classmate', caption: 'Our field trip', category: 'Hands-on', consent: 'true', website: '', ...fields }).forEach(([key, value]) => form.set(key, value));
  form.set('photo', new Blob([bytes], { type }), 'photo.jpg');
  return new Request('https://class.example/api/photos', { method: 'POST', headers: { 'X-Gallery-Password': password, ...headers }, body: form });
}
const get = (admin = false) => new Request(`https://class.example/api/photos${admin ? '?admin=1' : ''}`, { headers: admin ? { Authorization: `Bearer ${env.MEMORY_ADMIN_TOKEN}` } : {} });
const patch = (id, status, authorized = true) => new Request('https://class.example/api/photos?admin=1', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(authorized ? { Authorization: `Bearer ${env.MEMORY_ADMIN_TOKEN}` } : {}) }, body: JSON.stringify({ id, status }) });
function setup(options = {}) {
  const store = new LocalPhotoStore(':memory:'), saved = new Map();
  const images = { async put(id, bytes) { const url = `https://test.public.blob.vercel-storage.com/story/${id}.webp`; saved.set(url, bytes); return { url }; }, async remove(url) { saved.delete(url); } };
  return { store, saved, images, handler: createPhotoHandler({ env, store, images, normalizeImage, ...options }) };
}

test('photo uploads stay closed until both storage and a server password are configured', async () => {
  const handler = createPhotoHandler({ env: {} });
  assert.equal((await (await handler(get())).json()).available, false);
  assert.equal((await handler(upload())).status, 503);
  const s = setup({ env: {} }); assert.equal((await s.handler(upload())).status, 503); s.store.close();
});

test('wrong passwords are rejected before image processing; repeated attempts are limited', async () => {
  let processed = 0;
  const s = setup({ normalizeImage: async () => { processed++; throw new Error(); } });
  for (let i = 0; i < 10; i++) assert.equal((await s.handler(upload({ password: 'wrong' }))).status, 403);
  assert.equal((await s.handler(upload({ password: 'wrong' }))).status, 429);
  assert.equal(processed, 0); assert.equal(s.saved.size, 0); s.store.close();
});

test('valid photos persist, retries are idempotent, and request hashes stay private', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'invincibles-photo-test-'));
  const path = join(directory, 'photos.sqlite'), s = setup(), store = new LocalPhotoStore(path), id = randomUUID();
  try {
    const handler = createPhotoHandler({ env, store, images: s.images, normalizeImage });
    const response = await handler(upload({ id })); assert.equal(response.status, 201);
    const result = await response.json(); assert.equal(result.photo.width, 240); assert.equal(result.photo.height, 320); assert.equal(result.photo.requestHash, undefined);
    assert.equal((await handler(upload({ id }))).status, 200); assert.equal(s.saved.size, 1);
    assert.equal((await handler(upload({ id, fields: { caption: 'Different caption' } }))).status, 409);
    store.close();
    const reopened = new LocalPhotoStore(path), second = createPhotoHandler({ env, store: reopened });
    const data = await (await second(get())).json(); assert.equal(data.available, false); assert.equal(data.photos.length, 1); assert.equal(data.photos[0].caption, 'Our field trip'); assert.equal(data.photos[0].requestHash, undefined); reopened.close();
  } finally { s.store.close(); await rm(directory, { recursive: true, force: true }); }
});

test('file content, consent, field limits, origin and body size are enforced', async () => {
  const s = setup();
  for (const fields of [{ name: '' }, { caption: 'x'.repeat(121) }, { category: 'other' }, { consent: 'false' }, { website: 'bot' }]) assert.equal((await s.handler(upload({ fields }))).status, 400);
  assert.equal((await s.handler(upload({ headers: { Origin: 'https://unrelated.example' } }))).status, 403);
  assert.equal((await s.handler(upload({ type: 'image/svg+xml', bytes: Buffer.from('<svg/>') }))).status, 415);
  assert.equal((await s.handler(upload({ bytes: Buffer.from('not actually a JPEG') }))).status, 415);
  const big = new Request('https://class.example/api/photos', { method: 'POST', headers: { 'X-Gallery-Password': env.GALLERY_UPLOAD_PASSWORD, 'Content-Type': 'multipart/form-data; boundary=test' }, body: Buffer.alloc(MAX_PHOTO_BODY + 1) });
  assert.equal((await s.handler(big)).status, 413); assert.equal(s.saved.size, 0); s.store.close();
});

test('only the organiser can hide or restore photographs, including when uploads are closed', async () => {
  const s = setup(), result = await (await s.handler(upload())).json(), id = result.photo.id;
  assert.equal((await s.handler(patch(id, 'hidden', false))).status, 401);
  assert.equal((await s.handler(patch(id, 'hidden'))).status, 200);
  assert.equal((await (await s.handler(get())).json()).photos.length, 0);
  assert.equal((await (await s.handler(get(true))).json()).photos.length, 1);
  const closed = createPhotoHandler({ env: { MEMORY_ADMIN_TOKEN: env.MEMORY_ADMIN_TOKEN }, store: s.store });
  assert.equal((await closed(patch(id, 'published'))).status, 200);
  assert.equal((await (await closed(get())).json()).photos.length, 1); s.store.close();
});

test('failed metadata writes remove their uploaded file instead of leaving a false success', async () => {
  const s = setup(); s.store.save = async () => { throw new Error('database unavailable'); };
  assert.equal((await s.handler(upload())).status, 503); assert.equal(s.saved.size, 0); s.store.close();
});

test('ambiguous write failures retain a successfully saved photo', async () => {
  const s = setup(), originalSave = s.store.save.bind(s.store);
  s.store.save = async record => { await originalSave(record); throw new Error('response timed out'); };
  assert.equal((await s.handler(upload())).status, 201); assert.equal(s.saved.size, 1); assert.equal((await s.store.list()).length, 1); s.store.close();
});

test('upload rate limiting does not write another file', async () => {
  const s = setup(); s.store.allow = async () => false;
  assert.equal((await s.handler(upload())).status, 429); assert.equal(s.saved.size, 0); s.store.close();
});

test('image processing rotates portraits, limits dimensions, strips metadata and rejects huge inputs', async () => {
  const source = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: '#63834c' } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const result = await normalizeImage(source), meta = await sharp(result.data).metadata();
  assert.equal(result.width, 800); assert.equal(result.height, 1600); assert.equal(meta.format, 'webp'); assert.equal(meta.exif, undefined); assert.equal(meta.orientation, undefined);
  const huge = await sharp({ create: { width: 6000, height: 5000, channels: 3, background: '#fff' } }).png().toBuffer();
  await assert.rejects(normalizeImage(huge));
});
