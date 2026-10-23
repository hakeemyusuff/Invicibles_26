import { safeRead, safeSave } from './utils.js';

function uploadId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16)); bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export function initPhotoUploads({ toast, onAdded, refresh }) {
  const $ = id => document.getElementById(id), dialog = $('photos-dialog');
  let selected = [], busy = false;
  function release() { for (const item of selected) URL.revokeObjectURL(item.url); selected = []; }
  function previews() {
    $('upload-previews').replaceChildren();
    for (const item of selected) {
      const figure = document.createElement('figure'), image = document.createElement('img'), remove = document.createElement('button');
      image.src = item.url; image.alt = item.file.name;
      remove.type = 'button'; remove.textContent = '×'; remove.setAttribute('aria-label', `Remove ${item.file.name}`); remove.disabled = busy;
      remove.addEventListener('click', () => { URL.revokeObjectURL(item.url); selected = selected.filter(x => x !== item); previews(); });
      figure.append(image, remove); $('upload-previews').append(figure);
    }
  }
  $('open-photos').addEventListener('click', () => {
    $('photo-name').value = safeRead('invincibles-memory-name', '') || $('card-name').value;
    $('photo-form-status').textContent = ''; dialog.showModal();
  });
  $('close-photos').addEventListener('click', () => { if (!busy) dialog.close(); });
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  dialog.addEventListener('close', () => { if (!busy) $('photo-password').value = ''; });
  $('story-files').addEventListener('change', event => {
    const files = [...event.target.files]; event.target.value = '';
    if (selected.length + files.length > 8) return toast('Choose up to 8 photos at a time. You can add more afterwards.');
    if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024)) return toast('Choose JPG, PNG or WebP photos, each smaller than 12 MB.');
    selected.push(...files.map(file => ({ file, id: uploadId(), url: URL.createObjectURL(file) })));
    previews();
  });
  $('photo-form').addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !event.target.reportValidity()) return;
    const status = $('photo-form-status'); status.dataset.error = 'false';
    if (!selected.length) { status.textContent = 'Choose at least one photograph first.'; $('story-files').focus(); return; }
    busy = true; dialog.dataset.busy = 'true';
    const controls = [...event.target.querySelectorAll('input, select, button')]; controls.forEach(el => el.disabled = true); $('close-photos').disabled = true;
    const total = selected.length; let completed = 0;
    try {
      // Each photo has a stable ID until it succeeds, so retrying cannot create duplicates.
      for (const item of [...selected]) {
        status.textContent = `Preparing photo ${completed + 1} of ${total}…`;
        item.compressed ||= await compressPhoto(item.file);
        const form = new FormData();
        form.set('photo', item.compressed, 'class-moment.jpg'); form.set('id', item.id);
        form.set('name', $('photo-name').value); form.set('caption', $('photo-caption').value); form.set('category', $('photo-category').value);
        form.set('consent', String($('photo-consent').checked)); form.set('website', $('photo-website').value);
        status.textContent = `Adding photo ${completed + 1} of ${total}…`;
        const response = await fetch('/api/photos', { method: 'POST', headers: { 'X-Gallery-Password': $('photo-password').value }, body: form, signal: AbortSignal.timeout(45000) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'This photo could not be uploaded. Please try again.');
        onAdded(data.photo); URL.revokeObjectURL(item.url); selected = selected.filter(x => x !== item); completed++; previews();
      }
      safeSave('invincibles-memory-name', $('photo-name').value);
      event.target.reset(); release(); previews();
      status.textContent = `${completed} ${completed === 1 ? 'photo is' : 'photos are'} now part of our story.`;
      toast(status.textContent);
    } catch (error) {
      status.dataset.error = 'true';
      status.textContent = `${completed ? `${completed} saved. ` : ''}${error.name === 'TimeoutError' ? 'The connection took too long. Retry to check and finish this upload.' : error.message || 'Please try again.'} Your remaining photos are still selected.`;
    } finally {
      busy = false; dialog.dataset.busy = 'false'; controls.forEach(el => el.disabled = false); $('close-photos').disabled = false; previews();
    }
  });
  $('refresh-photos').addEventListener('click', refresh);
}

async function compressPhoto(file) {
  const image = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#f6f2e7'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .86));
    if (!blob || blob.size > 3 * 1024 * 1024) throw new Error('Choose a smaller copy of this photograph.');
    return blob;
  } finally { image.close(); }
}
