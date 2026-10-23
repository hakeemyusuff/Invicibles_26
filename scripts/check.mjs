import { readFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
const files=['public/app.js','public/card.js','public/utils.js','public/admin.js','public/photo-upload.js','public/countdown-share.js','api/memories.js','api/photos.js','lib/memory-service.mjs','lib/photo-service.mjs','lib/photo-images.mjs','scripts/dev.mjs'];
for(const file of files)execFileSync(process.execPath,['--check',file]);
const html=await readFile('public/index.html','utf8');
for(const match of html.matchAll(/(?:src|href)="(\/[^"#?]+)"/g)){if(match[1]==='/')continue;await access(`public${match[1]}`);}
const gallery=JSON.parse(await readFile('public/gallery.json','utf8'));
for(const image of gallery){for(const path of [image.src,image.thumb]){const bytes=await readFile(`public${path}`);if(bytes.length<100||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP'||bytes.readUInt32LE(4)+8!==bytes.length)throw new Error(`Invalid photograph: ${path}`);}}
const names=JSON.parse(await readFile('public/class-names.json','utf8'));
if(names.length!==50||new Set(names).size!==50)throw new Error('Check the class name list.');
if(readdirSync('public').some(name=>name.startsWith('.env')))throw new Error('A private environment file cannot be public.');
console.log(`Checked JavaScript, page assets, ${gallery.length} photographs and ${names.length} editable class names.`);
