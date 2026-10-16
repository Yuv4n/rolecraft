// Mechanical checks that keep model output tied to the user's own text.
// Nothing here calls a model. Everything is deterministic and unit-tested.

const MIN_QUOTE = 12;

/** Lowercases and flattens bullets, dashes, quotes and whitespace so quotes can be compared reliably. */
export function normalise(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/^[\s•*·▪●◦\-]+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when `quote` appears verbatim (after normalising) in at least one source. */
export function quoteInSource(quote: string, ...sources: string[]): boolean {
  const q = normalise(quote);
  if (q.length < MIN_QUOTE) return false;
  return sources.some((s) => normalise(s).includes(q));
}

const NUMBER = /\d[\d,.]*\d%?|\d%?/g;

function numberTokens(text: string): string[] {
  return (text.normalize('NFKC').match(NUMBER) ?? []).map((n) => n.replace(/[,.]+$/, '').replace(/,/g, ''));
}

/** Numbers that appear in `text` but in none of `sources`. */
export function unseenNumbers(text: string, ...sources: string[]): string[] {
  const seen = new Set(sources.flatMap(numberTokens));
  return [...new Set(numberTokens(text).filter((n) => !seen.has(n)))];
}

/** Numbers present in `original` that `revised` has dropped. */
export function droppedNumbers(original: string, revised: string): string[] {
  const kept = new Set(numberTokens(revised));
  return [...new Set(numberTokens(original).filter((n) => !kept.has(n)))];
}

function wordSet(text: string): Set<string> {
  return new Set(normalise(text).match(/[a-z][a-z'-]*/g) ?? []);
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
  const re = /\b([A-Z][A-Za-z'-]{2,})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const before = text.slice(0, m.index).replace(/[ \t]+$/, '');
    if (before === '' || /[.!?:;\n\u2022*-]$/.test(before)) continue; // start of a sentence or line
    const word = m[1].toLowerCase();
    if (!known.has(word)) found.add(m[1]);
  }
  return [...found];
}

export type Check = {ok: true} | {ok: false; problem: string};

/** A rewritten CV line may reorder and tighten wording but may not add facts. */
export function checkRewrite(original: string, revised: string, cv: string): Check {
  if (!revised.trim()) return {ok: false, problem: 'empty rewrite'};
  if (!quoteInSource(original, cv)) return {ok: false, problem: 'original line is not in the CV'};
  const added = unseenNumbers(revised, original, cv);
  if (added.length) return {ok: false, problem: `adds numbers not in the CV: ${added.join(', ')}`};
  const lost = droppedNumbers(original, revised);
  if (lost.length) return {ok: false, problem: `drops numbers from the original: ${lost.join(', ')}`};
  const nouns = unseenProperNouns(revised, [cv]);
  if (nouns.length) return {ok: false, problem: `introduces names not in the CV: ${nouns.join(', ')}`};
  if (revised.length > original.length * 1.5 + 40) return {ok: false, problem: 'rewrite is much longer than the original'};
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
  const bulletRe = /^\s*[•*·▪●◦-]\s+/;
  const byNorm = new Map<string, string>();
  for (const r of rewrites) byNorm.set(normalise(r.original), r.revised);
  const rewritten = lines.map((line) => {
    const hit = byNorm.get(normalise(line));
    if (hit === undefined) return line;
    const marker = line.match(bulletRe)?.[0] ?? '';
    const body = hit.replace(bulletRe, '').trim();
    return marker ? marker.replace(/\s+$/, ' ') + body : body;
  });
  const emph = emphasis.map((e) => normalise(e));
  const isEmphasised = (line: string) => {
    const n = normalise(line);
    return emph.some((e) => e.length >= MIN_QUOTE && (n.includes(e) || e.includes(n)) && n.length >= MIN_QUOTE);
  };
  const out: string[] = [];
  for (let i = 0; i < rewritten.length; ) {
    if (!bulletRe.test(rewritten[i])) {
      out.push(rewritten[i++]);
      continue;
    }
    const run: string[] = [];
    while (i < rewritten.length && bulletRe.test(rewritten[i])) run.push(rewritten[i++]);
    const ranked = run.map((line, index) => ({line, index, hot: isEmphasised(line) ? 0 : 1}));
    ranked.sort((a, b) => a.hot - b.hot || a.index - b.index);
    out.push(...ranked.map((x) => x.line));
  }
  return out.join('\n');
}
