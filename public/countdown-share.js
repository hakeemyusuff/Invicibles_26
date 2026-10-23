import { remainingTime, SIGN_OUT, saveBlob } from './utils.js';

export function drawCountdownShare(canvas, { now = Date.now(), photo, host = '' } = {}) {
  canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext('2d'), t = remainingTime(now);
  ctx.fillStyle = '#173c32'; ctx.fillRect(0, 0, 1080, 1920);
  ctx.fillStyle = '#e3f49f'; ctx.font = '700 25px "DM Sans"'; ctx.fillText('THE INVINCIBLES ’26', 64, 80);
  ctx.textAlign = 'right'; ctx.font = '500 18px "DM Sans"'; ctx.fillText('AEE / UNIVERSITY OF IBADAN', 1016, 80); ctx.textAlign = 'left';
  ctx.fillStyle = '#6b8767'; ctx.fillRect(64, 116, 952, 1);
  ctx.fillStyle = '#f6f2e7'; ctx.font = '700 174px "Barlow Condensed"';
  ctx.fillText(t.complete ? 'PENS DOWN.' : 'THE FINAL', 58, 290, 952);
  ctx.fillText(t.complete ? 'WE MADE IT.' : 'STRETCH.', 58, 450, 952);
  ctx.fillStyle = '#e3f49f'; ctx.font = 'italic 400 58px "DM Serif Display"';
  ctx.textAlign = 'right'; ctx.fillText(t.complete ? 'On to what’s next.' : 'Then, the world.', 1016, 510); ctx.textAlign = 'left';
  ctx.save(); ctx.beginPath(); ctx.rect(64, 565, 952, 600); ctx.clip();
  ctx.fillStyle = '#315345'; ctx.fillRect(64, 565, 952, 600);
  if (photo) { const scale = Math.max(952 / photo.width, 600 / photo.height); ctx.drawImage(photo, 64 + (952 - photo.width * scale) / 2, 565 + (600 - photo.height * scale) / 2, photo.width * scale, photo.height * scale); }
  const shade = ctx.createLinearGradient(0, 970, 0, 1165); shade.addColorStop(0, '#173c3200'); shade.addColorStop(1, '#09251ce6'); ctx.fillStyle = shade; ctx.fillRect(64, 970, 952, 195);
  ctx.fillStyle = '#f6f2e7'; ctx.font = '500 20px "DM Sans"'; ctx.fillText('THE PEOPLE. THE JOURNEY. THE NEXT CHAPTER.', 91, 1128); ctx.restore();
  ctx.fillStyle = '#e3f49f'; ctx.fillRect(64, 1203, 952, 233); ctx.fillStyle = '#173c32';
  ctx.textAlign = 'center'; ctx.font = '600 17px "DM Sans"'; ctx.fillText(t.complete ? 'TOGETHER, INVINCIBLE. ALWAYS.' : 'UNTIL OUR SIGN-OUT MOMENT', 540, 1241);
  ['days', 'hours', 'minutes', 'seconds'].forEach((unit, index) => {
    const x = 183 + index * 238;
    ctx.font = '700 125px "Barlow Condensed"'; ctx.fillText(String(t[unit]).padStart(2, '0'), x, 1360);
    ctx.font = '600 16px "DM Sans"'; ctx.fillText(unit.toUpperCase(), x, 1401);
    if (index < 3) { ctx.fillStyle = '#89a66c'; ctx.fillRect(x + 118, 1271, 1, 115); ctx.fillStyle = '#173c32'; }
  });
  ctx.fillStyle = '#f6f2e7'; ctx.font = '700 65px "Barlow Condensed"';
  ctx.fillText(new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' }).format(SIGN_OUT).toUpperCase(), 540, 1554);
  ctx.font = '500 23px "DM Sans"'; ctx.fillStyle = '#bac9b0';
  const time = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Africa/Lagos' }).format(SIGN_OUT);
  ctx.fillText(`${time.toUpperCase()} WAT  /  AFTER TAE 521`, 540, 1604);
  ctx.fillStyle = '#e3f49f'; ctx.font = 'italic 400 45px "DM Serif Display"'; ctx.fillText('The next chapter is ours.', 540, 1710);
  ctx.fillStyle = '#6b8767'; ctx.fillRect(64, 1762, 952, 1);
  ctx.fillStyle = '#f6f2e7'; ctx.font = '500 23px "DM Sans"'; ctx.fillText(host || 'THE INVINCIBLES ’26', 540, 1811, 940);
  const stamp = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Africa/Lagos' }).format(now);
  ctx.fillStyle = '#bac9b0'; ctx.font = '400 16px "DM Sans"'; ctx.fillText(`SNAPSHOT · ${stamp.toUpperCase()} WAT`, 540, 1856);
  ctx.font = '500 13px "DM Sans"'; ctx.fillText('AGRICULTURAL & ENVIRONMENTAL ENGINEERING · CLASS OF 2026', 540, 1895); ctx.textAlign = 'left';
}

export function initCountdownShare(toast) {
  const $ = id => document.getElementById(id), dialog = $('countdown-dialog'), canvas = $('countdown-canvas');
  let photo, timer;
  const liveLink = new URL(location.href); liveLink.hash = 'countdown'; liveLink.search = '';
  const ready = Promise.all([
    document.fonts.load('700 174px "Barlow Condensed"'), document.fonts.load('italic 400 58px "DM Serif Display"'), document.fonts.load('700 25px "DM Sans"'), document.fonts.load('500 23px "DM Sans"'),
    fetch('/assets/photos/the-invincibles.webp').then(r => r.blob()).then(createImageBitmap).then(image => { photo = image; }).catch(() => {})
  ]);
  const render = () => drawCountdownShare(canvas, { photo, host: location.host });
  $('share-page').addEventListener('click', () => { dialog.showModal(); render(); ready.then(render); clearInterval(timer); timer = setInterval(render, 1000); });
  $('close-countdown-share').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => clearInterval(timer));
  $('copy-countdown-link').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(liveLink.href); toast('Live countdown link copied.'); }
    catch { $('countdown-export-status').textContent = `Live countdown: ${liveLink.href}`; }
  });
  async function exportImage(share) {
    const buttons = [$('download-countdown-image'), $('share-countdown-image')]; buttons.forEach(button => button.disabled = true);
    try {
      await ready; render();
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png')); if (!blob) throw new Error('export failed');
      const filename = 'Invincibles26-countdown.png', file = new File([blob], filename, { type: 'image/png' });
      if (share && navigator.canShare?.({ files: [file] })) {
        const message = remainingTime().complete ? 'Pens down. We made it.' : 'The final stretch. A whole new chapter.';
        await navigator.share({ files: [file], title: 'The Invincibles ’26 — the countdown', text: `${message} Follow the live countdown: ${liveLink.href}` });
        $('countdown-export-status').textContent = 'Snapshot shared. The live link is included in the message.';
      } else {
        saveBlob(blob, filename); $('countdown-export-status').textContent = 'Snapshot saved at 1080 × 1920. Ready for your Status.';
        if (share) toast('Image downloaded. Share it from your gallery.');
      }
    } catch (error) { if (error.name !== 'AbortError') $('countdown-export-status').textContent = 'The image could not be saved. Please try again.'; }
    finally { buttons.forEach(button => button.disabled = false); }
  }
  $('download-countdown-image').addEventListener('click', () => exportImage(false));
  $('share-countdown-image').addEventListener('click', () => exportImage(true));
}
