import { saveBlob } from './utils.js';
let key = '', notes = [], photos = [];
const $ = id => document.getElementById(id);
async function request(endpoint, options = {}) {
  const response = await fetch(`/api/${endpoint}?admin=1`, { ...options, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(15000) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Please try again.'); return data;
}
function render(items, target, endpoint) {
  target.replaceChildren();
  if (!items.length) { const p = document.createElement('p'); p.className = 'admin-empty'; p.textContent = 'No contributions here yet.'; target.append(p); }
  for (const item of items) {
    const el = document.createElement('article'); el.className = `memory-note${endpoint === 'photos' ? ' admin-photo' : ''}`;
    if (endpoint === 'photos') { const img = document.createElement('img'); img.src = item.thumb; img.alt = item.caption; img.loading = 'lazy'; el.append(img); }
    const label = document.createElement('div'); label.className = 'note-label'; label.textContent = item.status;
    const content = document.createElement('p'); content.className = 'note-text'; content.textContent = item.message || item.caption;
    const by = document.createElement('p'); by.className = 'note-author'; by.textContent = item.name;
    const actions = document.createElement('div'); actions.style.cssText = 'display:flex;gap:20px;margin-top:20px';
    for (const [status, text] of [['published', 'Publish'], ['hidden', 'Hide']]) {
      if (item.status === status) continue;
      const button = document.createElement('button'); button.className = 'text-button'; button.textContent = text;
      button.addEventListener('click', async () => { button.disabled = true; try { await request(endpoint, { method: 'PATCH', body: JSON.stringify({ id: item.id, status }) }); await load(); } catch (error) { $('admin-status').textContent = error.message; button.disabled = false; } });
      actions.append(button);
    }
    el.append(label, content, by, actions); target.append(el);
  }
}
async function load() {
  const results = await Promise.allSettled([request('memories'), request('photos')]);
  if (results.every(result => result.status === 'rejected')) throw results[0].reason;
  $('admin-controls').hidden = false; $('admin-login').hidden = true; $('admin-content').hidden = false;
  const errors = [];
  if (results[0].status === 'fulfilled') { notes = results[0].value.memories || []; render(notes, $('admin-notes'), 'memories'); } else errors.push('Notes could not load.');
  if (results[1].status === 'fulfilled') { photos = results[1].value.photos || []; render(photos, $('admin-photos'), 'photos'); } else errors.push('Photos could not load.');
  $('admin-status').textContent = `${notes.length} notes · ${photos.length} photos · ${notes.filter(note => note.status === 'pending').length} notes awaiting approval. ${errors.join(' ')}`;
}
$('admin-login').addEventListener('submit', async event => { event.preventDefault(); key = $('admin-key').value; try { await load(); $('admin-key').value = ''; } catch (error) { $('admin-status').textContent = error.message; key = ''; } });
$('admin-refresh').addEventListener('click', () => load().catch(error => $('admin-status').textContent = error.message));
$('admin-logout').addEventListener('click', () => { key = ''; notes = []; photos = []; $('admin-notes').replaceChildren(); $('admin-photos').replaceChildren(); $('admin-controls').hidden = true; $('admin-content').hidden = true; $('admin-login').hidden = false; $('admin-status').textContent = 'Organiser page locked.'; });
$('admin-export').addEventListener('click', () => saveBlob(new Blob([JSON.stringify({ class: 'The Invincibles 26', exportedAt: new Date().toISOString(), memories: notes, photos }, null, 2)], { type: 'application/json' }), 'Invincibles26-class-archive.json'));
