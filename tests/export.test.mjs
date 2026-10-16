import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseCv} from '../lib/cv/parse.ts';
import {setText} from '../lib/cv/ops.ts';
import {exportPdf,exportDocx,pdfSafe} from '../lib/cv/export.ts';

const font=()=>Promise.resolve(fs.readFileSync(new URL('../public/fonts/NotoSans-Regular.ttf',import.meta.url)).buffer.slice(0));
const snap=parseCv('Zoë Łukasz\nzoe@example.com | Köln\n\nEXPERIENCE\nAnalyst | Müller GmbH | 2020–present\n• Built Łódź dashboards for 12,000 users.\n');
const pdf=await exportPdf(snap,font);
assert(pdf.size>5000&&(await pdf.slice(0,5).text())==='%PDF-');
const bullet=Object.values(snap.content.nodes).find(n=>n.type==='bullet');
await assert.rejects(()=>exportPdf(setText(snap,bullet.id,'Led 漢字 reporting'),font),/cannot show these characters/);
const plain=parseCv('Sam Lee\nsam@example.com\n\nEXPERIENCE\nAnalyst | Acme | 2020–2022\n• Built reports – weekly.\n');
let fetched=0;const blob=await exportPdf(plain,()=>{fetched++;return font()});
assert.equal(fetched,0,'standard Latin text must not load the Unicode font'); assert(blob.size>1000);
assert.equal(pdfSafe('a – b • c 漢'),'a – b • c ?');
assert((await exportDocx(snap)).size>3000);
console.log('PASS: PDF and DOCX export, Unicode font handling');
