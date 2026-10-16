// Mechanical checks that keep model output tied to the user's own text.
// Nothing here calls a model. Everything is deterministic and unit-tested.
//
// What these checks establish: a quote exists in the person's text, and a rewritten line adds no
// new number and no new content word. What they do not establish: that the model drew the right
// conclusion from a quote. A quote may also be a fragment of a longer sentence.

import {REPLACEMENT_VERBS} from './verbs.ts';
import {itemLines} from './bullets.ts';

const MIN_QUOTE = 12;
const BULLETS = '•*·▪●◦';

/** Lowercases and flattens bullets, dashes, quotes and whitespace so quotes can be compared reliably. */
export function normalise(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/‹/g, '<')
    .replace(/›/g, '>')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―−]/g, '-')
    // A bullet marker is removed. A minus sign in front of a digit is kept.
    .replace(new RegExp(`^[\\s${BULLETS}]+`, 'gm'), '')
    .replace(/^-+(?=\s)/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Splits text into paragraphs. A new paragraph starts at a blank line or a bullet, so a quote cannot span two bullets. */
function paragraphs(text: string): string[] {
  return text.split(new RegExp(`\\n\\s*\\n|\\n(?=\\s*[${BULLETS}-]\\s)`)).map(normalise).filter(Boolean);
}

/** True when `quote` appears verbatim (after normalising) inside one paragraph of at least one source. */
export function quoteInSource(quote: string, ...sources: string[]): boolean {
  const q = normalise(quote);
  if (q.length < MIN_QUOTE) return false;
  return sources.some((s) => paragraphs(s).some((p) => p.includes(q)));
}

/** True when `line` is, after normalising, exactly one whole line of `text`. */
export function isWholeLine(line: string, text: string): boolean {
  const n = normalise(line);
  return n.length > 0 && text.split('\n').some((l) => normalise(l) === n);
}

// ---------------------------------------------------------------------------------------------
// Numbers, including numbers written as words and non-ASCII digits

const WORD_VALUES: Record<string, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15', sixteen: '16', seventeen: '17',
  eighteen: '18', nineteen: '19', twenty: '20', thirty: '30', forty: '40', fifty: '50', sixty: '60',
  seventy: '70', eighty: '80', ninety: '90',
};
const QUANTITY_WORDS = new Set([
  'hundred', 'hundreds', 'thousand', 'thousands', 'million', 'millions', 'billion', 'half', 'double', 'doubled',
  'triple', 'tripled', 'quadruple', 'twice', 'thrice', 'dozen', 'dozens', 'quarter', 'majority',
]);

const DIGITS = /\p{Nd}[\p{Nd},.]*\p{Nd}%?|\p{Nd}%?/gu;

function numberTokens(text: string): string[] {
  const out: string[] = [];
  for (const m of text.normalize('NFKC').match(DIGITS) ?? []) out.push(m.replace(/[,.]+$/, '').replace(/,/g, ''));
  for (const w of text.toLowerCase().match(/\p{L}+/gu) ?? []) {
    if (WORD_VALUES[w]) out.push(WORD_VALUES[w]);
    else if (QUANTITY_WORDS.has(w)) out.push(w);
  }
  return out;
}

/** Numbers (digits or number words) that appear in `text` but in none of `sources`. */
export function unseenNumbers(text: string, ...sources: string[]): string[] {
  const seen = new Set(sources.flatMap(numberTokens));
  return [...new Set(numberTokens(text).filter((n) => !seen.has(n)))];
}

/** Numbers present in `original` that `revised` has dropped. */
export function droppedNumbers(original: string, revised: string): string[] {
  const kept = new Set(numberTokens(revised));
  return [...new Set(numberTokens(original).filter((n) => !kept.has(n)))];
}

// ---------------------------------------------------------------------------------------------
// Words and names

const STOP = new Set((
  'a an the and or but of to in on for with by from at as into onto across over per each all any both that this these those ' +
  'it its their our my your his her we i you they he she was were is are be been being has have had do did does not no ' +
  'than then so such also more most less very new while when where which who whom whose what how within without through ' +
  'between against about around after before during under up down out off can could would should will may might'
).split(' '));

export function contentWords(text: string): string[] {
  return (text.normalize('NFKC').toLowerCase().match(/\p{L}[\p{L}'-]*/gu) ?? []).filter((w) => w.length >= 3 && !STOP.has(w));
}

const shares5 = (a: string, b: string) => a.length >= 5 && b.length >= 5 && a.slice(0, 5) === b.slice(0, 5);

/** Content words in `revised` that are not in `original`, not a close variant of one, and not a replacement verb. */
export function novelWords(revised: string, original: string): string[] {
  const base = contentWords(original);
  const have = new Set(base);
  return [...new Set(contentWords(revised).filter((w) => !have.has(w) && !REPLACEMENT_VERBS.has(w) && !base.some((b) => shares5(w, b))))];
}

function wordSet(text: string): Set<string> {
  return new Set(normalise(text).match(/[\p{L}][\p{L}'-]*/gu) ?? []);
}

/**
 * Capitalised words that are not at the start of a sentence and appear in none of the sources
 * or the allowed list. These are the usual signature of an invented employer, product or tool.
 */
export function unseenProperNouns(text: string, sources: string[], allow: string[] = []): string[] {
  const known = new Set<string>();
  for (const s of sources) for (const w of wordSet(s)) known.add(w);
  for (const a of allow) for (const w of wordSet(a)) known.add(w);
  const found = new Set<string>();
  const re = /\b(\p{Lu}[\p{L}'-]{2,})\b/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const before = text.slice(0, m.index).replace(/[ \t]+$/, '');
    if (before === '' || /[.!?:;\n•*]$/.test(before)) continue; // start of a sentence or line
    if (!known.has(m[1].toLowerCase())) found.add(m[1]);
  }
  return [...found];
}

/** URLs and email addresses in `text` that appear in none of the sources. */
export function unseenLinks(text: string, ...sources: string[]): string[] {
  const hay = sources.map(normalise).join('\n');
  const found = text.match(/https?:\/\/\S+|\bwww\.\S+|\b[\w.+-]+@[\w-]+\.[\w.-]+/gi) ?? [];
  return found.filter((l) => !hay.includes(normalise(l).replace(/[.,;:)]+$/, '')));
}

/** Problems with a piece of model-written prose that should only restate things found in `sources`. */
export function proseIssues(text: string, sources: string[]): string[] {
  const issues: string[] = [];
  const numbers = unseenNumbers(text, ...sources);
  if (numbers.length) issues.push(`numbers not in the input: ${numbers.join(', ')}`);
  const names = unseenProperNouns(text, sources);
  if (names.length) issues.push(`names not in the input: ${names.join(', ')}`);
  const links = unseenLinks(text, ...sources);
  if (links.length) issues.push(`links or addresses not in the input: ${links.join(', ')}`);
  return issues;
}

// ---------------------------------------------------------------------------------------------
// CV rewrites

export type Check = {ok: true} | {ok: false; problem: string};

/**
 * A rewritten CV line may reorder and tighten wording but may not add facts. It must be a single
 * line, replace a whole CV line, add no number and no content word of its own, and keep every number.
 */
export function checkRewrite(original: string, revised: string, cv: string): Check {
  const text = revised.trim();
  if (!text) return {ok: false, problem: 'empty rewrite'};
  if (/[\r\n]/.test(text)) return {ok: false, problem: 'a rewrite must be a single line'};
  if (!isWholeLine(original, cv)) return {ok: false, problem: 'original is not one whole line of the CV'};
  const added = unseenNumbers(text, original);
  if (added.length) return {ok: false, problem: `adds numbers not in the original line: ${added.join(', ')}`};
  const lost = droppedNumbers(original, text);
  if (lost.length) return {ok: false, problem: `drops numbers from the original: ${lost.join(', ')}`};
  const novel = novelWords(text, original);
  if (novel.length) return {ok: false, problem: `introduces words that are not in the original line: ${novel.join(', ')}`};
  if (unseenLinks(text, original).length) return {ok: false, problem: 'adds a link or address'};
  if (text.length > original.length * 1.5 + 40) return {ok: false, problem: 'rewrite is much longer than the original'};
  return {ok: true};
}

/**
 * Applies validated rewrites to the CV by exact line replacement, then moves emphasised bullets to the
 * front of their own bullet group. Lines that are not found are left alone.
 */
export function applyTailoring(
  cv: string,
  rewrites: {original: string; revised: string}[],
  emphasis: string[],
): string {
  const lines = cv.split('\n');
  const markerRe = new RegExp(`^\\s*[${BULLETS}-]\\s+`);
  const byNorm = new Map<string, string>();
  for (const r of rewrites) byNorm.set(normalise(r.original), r.revised);
  const rewritten = lines.map((line) => {
    const hit = byNorm.get(normalise(line));
    if (hit === undefined) return line;
    const marker = line.match(markerRe)?.[0] ?? '';
    const body = hit.replace(markerRe, '').trim();
    return marker ? marker.replace(/\s+$/, ' ') + body : body;
  });
  const emph = emphasis.map((e) => normalise(e));
  const isEmphasised = (line: string) => {
    const n = normalise(line);
    return n.length >= MIN_QUOTE && emph.some((e) => e.length >= MIN_QUOTE && (n.includes(e) || e.includes(n)));
  };
  // Items are found with or without bullet markers, so plain-text CVs are reordered too.
  const item = itemLines(rewritten);
  const out: string[] = [];
  for (let i = 0; i < rewritten.length; ) {
    if (!item[i]) {
      out.push(rewritten[i++]);
      continue;
    }
    const run: string[] = [];
    while (i < rewritten.length && item[i]) run.push(rewritten[i++]);
    const ranked = run.map((line, index) => ({line, index, hot: isEmphasised(line) ? 0 : 1}));
    ranked.sort((a, b) => a.hot - b.hot || a.index - b.index);
    out.push(...ranked.map((x) => x.line));
  }
  return out.join('\n');
}
