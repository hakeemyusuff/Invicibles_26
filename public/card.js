import { saveBlob, safeRead, safeSave } from './utils.js';

const palettes = {
  editorial: { bg: '#f6f2e7', ink: '#183c32', muted: '#6a7564', accent: '#def19c', photoBg: '#dce2d0', photoInk: '#7b8e71' },
  evergreen: { bg: '#173c32', ink: '#f6f2e7', muted: '#bac9b0', accent: '#e3f49f', photoBg: '#315345', photoInk: '#8fa58a' },
  blueprint: { bg: '#244bb3', ink: '#f9f5e8', muted: '#c2d0ff', accent: '#e4f49f', photoBg: '#3863c8', photoInk: '#a0b9f0' }
};
export function wrapText(ctx, text, maxWidth) {
  const lines = []; let current = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (ctx.measureText(word).width > maxWidth) {
      if (current) { lines.push(current); current = ''; }
      for (const char of Array.from(word)) { if (ctx.measureText(current + char).width > maxWidth && current) { lines.push(current); current = char; } else current += char; }
    } else if (current && ctx.measureText(`${current} ${word}`).width > maxWidth) { lines.push(current); current = word; }
    else current = current ? `${current} ${word}` : word;
  }
  if (current) lines.push(current); return lines;
}
function fittedLines(ctx, text, width, maxLines, startSize, family, weight = 700) {
  let size = startSize, lines;
  do { ctx.font = `${weight} ${size}px "${family}"`; lines = wrapText(ctx, text, width); size -= 1; } while (lines.length > maxLines && size > 14);
  return { size: size + 1, lines };
}
function line(ctx, x1, y1, x2, y2, color) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke(); }
function star(ctx, x, y, r, color) { ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * .25, y + Math.sin(a) * r * .25); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); } ctx.restore(); }

export function drawCard(canvas, state) {
  const h = state.format === 'story' ? 1920 : 1350;
  if (canvas.width !== 1080 || canvas.height !== h) { canvas.width = 1080; canvas.height = h; }
  const ctx = canvas.getContext('2d'), p = palettes[state.theme] || palettes.editorial;
  ctx.clearRect(0, 0, 1080, h); ctx.fillStyle = p.bg; ctx.fillRect(0, 0, 1080, h);
  const story = h === 1920, margin = 64;
  if (state.theme === 'blueprint') { ctx.save(); ctx.strokeStyle = '#ffffff13'; ctx.lineWidth = 1; for (let x = 0; x < 1080; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); } for (let y = 0; y < h; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1080, y); ctx.stroke(); } ctx.restore(); }
  ctx.textBaseline = 'alphabetic'; ctx.fillStyle = p.ink; ctx.font = '700 25px "DM Sans"'; ctx.fillText('THE INVINCIBLES ’26', margin, 75);
  ctx.font = '500 17px "DM Sans"'; ctx.textAlign = 'right'; ctx.fillText('AEE  /  UNIVERSITY OF IBADAN', 1016, 75); ctx.textAlign = 'left';
  line(ctx, 64, 100, 1016, 100, state.theme === 'editorial' ? '#c8ceba' : '#ffffff45');
  ctx.font = '700 103px "Barlow Condensed"'; ctx.fillStyle = p.ink; ctx.fillText('ONE OF THE', 64, 207); ctx.fillText('INVINCIBLES.', 64, 306);
  ctx.save();ctx.textAlign='right';ctx.font='italic 400 75px "DM Serif Display"';ctx.fillStyle=state.theme==='editorial'?'#6b8053':p.accent;ctx.fillText('’26',1016,294);ctx.restore();
  // Both export sizes use a true 3:4 portrait window.
  const frame = story ? { x: 160, y: 350, width: 760, height: 1013.333 } : { x: 64, y: 350, width: 576, height: 768 };
  ctx.save();ctx.beginPath();ctx.rect(frame.x,frame.y,frame.width,frame.height);ctx.clip();ctx.fillStyle=p.photoBg;ctx.fillRect(frame.x,frame.y,frame.width,frame.height);
  if (state.image) {
    const scale = Math.max(frame.width / state.image.width, frame.height / state.image.height) * state.zoom;
    const w = state.image.width * scale, ih = state.image.height * scale;
    const availableX = Math.max(0, w - frame.width), availableY = Math.max(0, ih - frame.height);
    const x = frame.x - availableX / 2 + state.offsetX * availableX / 2;
    const y = frame.y - availableY / 2 + state.offsetY * availableY / 2;
    ctx.drawImage(state.image, x, y, w, ih);
  } else {
    const centre = frame.x + frame.width / 2;
    ctx.fillStyle = p.photoInk; ctx.globalAlpha = .17; ctx.beginPath();ctx.arc(centre,frame.y+frame.height*.33,frame.width*.17,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(centre,frame.y+frame.height*.79,frame.width*.36,frame.height*.29,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    ctx.textAlign='center';ctx.font='500 20px "DM Sans"';ctx.fillStyle=p.ink;ctx.fillText('YOUR PORTRAIT. YOUR STORY.',centre,frame.y+frame.height*.83);ctx.font='400 17px "DM Sans"';ctx.fillText('Add a photograph to make this yours.',centre,frame.y+frame.height*.83+35);ctx.textAlign='left';
  }
  ctx.restore();
  const nameX = story ? 64 : 688, nameY = story ? 1460 : 460;
  if (!story) {
    ctx.fillStyle=p.muted;ctx.font='600 17px "DM Sans"';ctx.fillText('THIS CHAPTER',nameX,373);ctx.fillText('BELONGS TO',nameX,399);
    star(ctx,984,1090,23,state.theme==='editorial'?'#496d45':p.accent);
  }
  const name = (state.name.trim() || 'Your name here').toUpperCase();
  ctx.fillStyle = p.ink; const fitted = fittedLines(ctx,name,story?952:328,story?2:5,story?84:73,'Barlow Condensed');
  fitted.lines.forEach((l,i)=>ctx.fillText(l,nameX,nameY+i*fitted.size*1.05));
  const quoteY = Math.max(nameY + fitted.lines.length*fitted.size*1.05 + 48, story ? 1662 : 850);
  const quote = state.quote.trim() || 'The next chapter is mine to write.';
  const quoteFit = fittedLines(ctx,quote,story?900:320,story?3:6,story?32:29,'DM Serif Display',400);
  ctx.fillStyle = p.muted;quoteFit.lines.forEach((l,i)=>ctx.fillText(l,nameX,quoteY+i*quoteFit.size*1.3));
  if (story) {
    ctx.save();ctx.translate(838,1348);ctx.rotate(-.055);ctx.fillStyle=p.accent;ctx.fillRect(-140,-53,288,103);ctx.fillStyle='#173c32';ctx.textAlign='center';ctx.font='600 14px "DM Sans"';ctx.fillText('SIGNING OUT',3,-20);ctx.font='700 42px "Barlow Condensed"';ctx.fillText('29 OCTOBER 2026',3,22);ctx.restore();
  } else {
    ctx.fillStyle=p.accent;ctx.fillRect(64,1150,952,57);ctx.fillStyle='#173c32';ctx.font='600 20px "DM Sans"';ctx.fillText('SIGNING OUT  /  29 OCTOBER 2026',86,1187);ctx.textAlign='right';ctx.font='italic 400 24px "DM Serif Display"';ctx.fillText('On to what’s next.',994,1187);ctx.textAlign='left';
  }
  line(ctx,64,h-114,1016,h-114,state.theme==='editorial'?'#c8ceba':'#ffffff45');
  ctx.fillStyle=p.ink;ctx.font='500 18px "DM Sans"';ctx.fillText('AGRICULTURAL & ENVIRONMENTAL ENGINEERING',64,h-71);ctx.font='400 16px "DM Sans"';ctx.fillStyle=p.muted;ctx.fillText('CLASS OF 2026  ·  ONE CLASS. A THOUSAND BEGINNINGS.',64,h-38);
  star(ctx,980,h-63,23,state.theme==='editorial'?'#496d45':p.accent);
  return frame;
}

export async function initCardMaker(toast) {
  const $ = selector => document.querySelector(selector), canvas = $('#card-canvas');
  const draft = safeRead('invincibles-card-draft', {});
  const state = { theme: 'editorial', format: 'portrait', name: draft.name || '', quote: draft.quote || '', image: null, zoom: 1, offsetX: 0, offsetY: 0 };
  $('#card-name').value=state.name;$('#card-quote').value=state.quote;
  let frame, imageVersion = 0;
  function render() { frame=drawCard(canvas,state);$('#card-resolution').textContent=`1080 × ${canvas.height}`;$('#card-message').textContent=`${state.image ? 'Preview updated' : 'High-resolution PNG'} · 1080 × ${canvas.height}`; }
  function remember() { safeSave('invincibles-card-draft',{name:state.name,quote:state.quote}); }
  for (const [id,key] of [['#card-name','name'],['#card-quote','quote']]) $(id).addEventListener('input', e=>{state[key]=e.target.value;render();remember();});
  document.querySelectorAll('[data-theme]').forEach(button=>button.addEventListener('click',()=>{state.theme=button.dataset.theme;document.querySelectorAll('[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();}));
  document.querySelectorAll('[data-format]').forEach(button=>button.addEventListener('click',()=>{state.format=button.dataset.format;document.querySelectorAll('[data-format]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();}));
  const fontsReady=Promise.all([document.fonts.load('700 80px "Barlow Condensed"'),document.fonts.load('400 30px "DM Serif Display"'),document.fonts.load('italic 400 75px "DM Serif Display"'),document.fonts.load('500 18px "DM Sans"'),document.fonts.load('700 25px "DM Sans"')]);
  render();fontsReady.then(render).catch(()=>toast('Using fallback lettering while fonts load.'));
  $('#portrait-upload').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))return toast('Choose a JPG, PNG or WebP photograph.');
    if(file.size>12*1024*1024)return toast('Choose a photograph smaller than 12 MB.');
    const version=++imageVersion;
    try {
      const image=await createImageBitmap(file,{imageOrientation:'from-image'});
      if(version!==imageVersion){image.close();return;}
      state.image?.close?.();state.image=image;state.zoom=1;state.offsetX=0;state.offsetY=0;$('#photo-zoom').value='1';$('#crop-controls').hidden=false;$('.canvas-wrap').classList.add('has-portrait');render();
      $('#card-message').textContent='Drag your photo to frame it. Then download your finished card.';
    } catch {toast('That photograph could not be opened. Try a JPG or PNG copy.');}
  });
  $('#photo-zoom').addEventListener('input',e=>{state.zoom=Number(e.target.value);render();});
  $('#reset-photo').addEventListener('click',()=>{state.zoom=1;state.offsetX=state.offsetY=0;$('#photo-zoom').value='1';render();});
  canvas.addEventListener('keydown',event=>{if(!state.image||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const step=event.shiftKey?.2:.05;if(event.key==='ArrowLeft')state.offsetX=Math.max(-1,state.offsetX-step);if(event.key==='ArrowRight')state.offsetX=Math.min(1,state.offsetX+step);if(event.key==='ArrowUp')state.offsetY=Math.max(-1,state.offsetY-step);if(event.key==='ArrowDown')state.offsetY=Math.min(1,state.offsetY+step);render();});
  let dragging=null;
  canvas.addEventListener('pointerdown',e=>{if(!state.image)return;const b=canvas.getBoundingClientRect();const x=(e.clientX-b.left)*1080/b.width,y=(e.clientY-b.top)*canvas.height/b.height;if(x<frame.x||x>frame.x+frame.width||y<frame.y||y>frame.y+frame.height)return;dragging={x:e.clientX,y:e.clientY,ox:state.offsetX,oy:state.offsetY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;const b=canvas.getBoundingClientRect();const scale=Math.max(frame.width/state.image.width,frame.height/state.image.height)*state.zoom;const extraX=state.image.width*scale-frame.width,extraY=state.image.height*scale-frame.height;state.offsetX=extraX>0?Math.max(-1,Math.min(1,dragging.ox+(e.clientX-dragging.x)*1080/b.width*2/extraX)):0;state.offsetY=extraY>0?Math.max(-1,Math.min(1,dragging.oy+(e.clientY-dragging.y)*canvas.height/b.height*2/extraY)):0;render();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>dragging=null);
  async function exportCard(share=false){
    if(!state.name.trim()){toast('Add your name to finish your card.');$('#card-name').focus();return;}
    if(!state.image){toast('Choose your photograph to finish your card.');$('#portrait-upload').focus();return;}
    const button=share?$('#share-card'):$('#download-card');button.disabled=true;
    try {await fontsReady;render();const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error();const safeName=state.name.replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').slice(0,60)||'my-card';const name=`Invincibles26-${safeName}-${state.format}.png`;const file=new File([blob],name,{type:'image/png'});
      if(share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'One of The Invincibles ’26',text:'AEE, University of Ibadan. The next chapter is ours.'});}
      else{saveBlob(blob,name);toast(share?'Card downloaded. You can share it from your gallery.':'Your card is ready. Check your downloads.');}
      $('#card-message').textContent=`Saved at 1080 × ${canvas.height}. Ready to share.`;
    }catch(error){if(error.name!=='AbortError')toast('The card could not be saved. Please try again.');}finally{button.disabled=false;}
  }
  $('#download-card').addEventListener('click',()=>exportCard());$('#share-card').addEventListener('click',()=>exportCard(true));
}
