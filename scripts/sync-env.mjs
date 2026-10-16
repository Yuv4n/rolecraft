// Copies the live-analysis settings from the environment into .env.local, which Next.js reads at startup and Git
// ignores. It prints variable names only, never values, so a key never appears in a terminal, a log or a chat.
//
//   ANTHROPIC_API_KEY=... npm run dev:live
//
// In a cloud session, set ANTHROPIC_API_KEY in the environment's settings instead of typing it anywhere.

import {chmodSync, existsSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const target = fileURLToPath(new URL('../.env.local', import.meta.url));
const names = ['ANTHROPIC_API_KEY', 'ANTHROPIC_WORKSPACE_ID', 'ANTHROPIC_MODEL', ...Object.keys(process.env).filter((k) => k.startsWith('FOCUS_MODEL_'))];
const present = names.filter((n) => process.env[n]);

if (!process.env.ANTHROPIC_API_KEY) {
  if (existsSync(target)) console.log('ANTHROPIC_API_KEY is not set in the environment. Keeping the existing .env.local.');
  else console.log('ANTHROPIC_API_KEY is not set. Starting without it, so the app will use the offline engine.');
  process.exit(0);
}

const lines = present.map((n) => `${n}=${String(process.env[n]).replace(/[\r\n]/g, '')}`);
writeFileSync(target, lines.join('\n') + '\n', {mode: 0o600});
chmodSync(target, 0o600);
console.log(`Wrote .env.local with ${present.length} variable${present.length === 1 ? '' : 's'}: ${present.join(', ')}. Values are not shown.`);
