// Small, explicit language helpers. Every rewrite here keeps the meaning of
// the source line or leaves it alone; nothing adds facts.

const pastForms: Record<string, string> = {
  manage: 'Managed', lead: 'Led', build: 'Built', run: 'Ran', write: 'Wrote', create: 'Created', develop: 'Developed',
  design: 'Designed', deliver: 'Delivered', analyse: 'Analysed', analyze: 'Analyzed', coordinate: 'Coordinated',
  maintain: 'Maintained', present: 'Presented', automate: 'Automated', support: 'Supported', track: 'Tracked',
  produce: 'Produced', launch: 'Launched', improve: 'Improved', reduce: 'Reduced', increase: 'Increased', train: 'Trained',
  mentor: 'Mentored', plan: 'Planned', own: 'Owned', drive: 'Drove', use: 'Used', work: 'Worked', document: 'Documented',
  collaborate: 'Collaborated', partner: 'Partnered', monitor: 'Monitored', review: 'Reviewed', implement: 'Implemented',
  organise: 'Organised', organize: 'Organized', prepare: 'Prepared', research: 'Researched', test: 'Tested', ship: 'Shipped',
  establish: 'Established', negotiate: 'Negotiated', resolve: 'Resolved', streamline: 'Streamlined', report: 'Reported',
};

function gerund(base: string): string {
  if (['run', 'plan', 'ship'].includes(base)) return base + base.slice(-1) + 'ing';
  if (base.endsWith('e') && base !== 'be') return base.slice(0, -1) + 'ing';
  return base + 'ing';
}

const presentToPast = new Map<string, string>();
const gerundToPast = new Map<string, string>();
for (const [base, past] of Object.entries(pastForms)) {
  presentToPast.set(base, past);
  presentToPast.set(base + 's', past);
  gerundToPast.set(gerund(base), past);
}

const irregularPast = new Set(['built', 'led', 'ran', 'wrote', 'drove', 'grew', 'won', 'taught', 'sold', 'took', 'made', 'gave', 'held', 'brought', 'chose', 'set', 'put', 'cut', 'found', 'kept', 'met', 'began', 'spoke', 'saw', 'sent', 'spent', 'oversaw', 'undertook', 'drew', 'taught']);

export const firstWord = (text: string): string => (text.trim().match(/^[A-Za-z][A-Za-z'-]*/)?.[0] ?? '');

export type Tense = 'past' | 'present' | 'gerund' | 'other';

export function tenseOf(word: string): Tense {
  const w = word.toLowerCase();
  if (!w) return 'other';
  if (irregularPast.has(w) || (/ed$/.test(w) && w.length > 3)) return 'past';
  if (presentToPast.has(w)) return 'present';
  if (/ing$/.test(w) && w.length > 4) return 'gerund';
  return 'other';
}

export function isActionVerb(word: string): boolean {
  const t = tenseOf(word);
  return t === 'past' || t === 'present';
}

/** Past-tense form of a present-tense or gerund opening word, when known. */
export function toPast(word: string): string | null {
  const w = word.toLowerCase();
  return presentToPast.get(w) ?? gerundToPast.get(w) ?? null;
}

export function replaceFirstWord(text: string, replacement: string): string {
  return text.replace(/^[A-Za-z][A-Za-z'-]*/, replacement);
}

export interface WeakOpener {
  phrase: string;
  /** Returns a safe rewrite, or null when the right verb depends on facts only the author has. */
  rewrite: (text: string) => string | null;
}

const upper = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function weakOpener(text: string): WeakOpener | null {
  const t = text.trim();
  let m: RegExpMatchArray | null;
  if ((m = t.match(/^(responsible for|tasked with)\s+(\w+ing)\b\s*(.*)$/i))) {
    const past = gerundToPast.get(m[2].toLowerCase());
    return { phrase: m[1], rewrite: () => (past ? `${past} ${m![3]}`.trim() : null) };
  }
  if ((m = t.match(/^(responsible for|tasked with|in charge of|duties included|handled)\b\s*(.*)$/i))) return { phrase: m[1], rewrite: () => null };
  if ((m = t.match(/^(worked on|involved in)\s+(.*)$/i))) return { phrase: m[1], rewrite: () => `Contributed to ${m![2]}` };
  if ((m = t.match(/^(helped with|assisted with)\s+(.*)$/i))) return { phrase: m[1], rewrite: () => `Supported ${m![2]}` };
  if ((m = t.match(/^(participated in)\s+(.*)$/i))) return { phrase: m[1], rewrite: () => `Took part in ${m![2]}` };
  return null;
}

/** Numbers that describe results or scale, ignoring years, durations and team sizes. */
export function quantification(text: string): { quantified: boolean; scaleOnly: boolean } {
  const stripped = text
    .replace(/\b(19|20)\d{2}\b/g, ' ')
    .replace(/\bteam of \d+/gi, ' ')
    .replace(/\b\d+\s*(years?|months?|yrs?|weeks?)\b/gi, ' ');
  const quantified = /\d/.test(stripped);
  const outcomeCue = /%|[£$€]|\b(increas|reduc|sav|grew|grow|improv|cut|boost|rais|doubl|halv|faster|fewer|lower|higher)/i.test(stripped);
  return { quantified, scaleOnly: quantified && !outcomeCue };
}

export const outcomeVerb = /\b(increased|reduced|improved|saved|grew|cut|boosted|raised|doubled|launched|delivered|achieved|won|generated|decreased|lifted)\b/i;

export const vaguePattern = /\b(various|several|numerous|multiple|many|a (?:lot|number|variety|range) of|etc\.?|stuff|things|assorted|miscellaneous)\b/i;
export const fluffPattern = /\b(hard-?working|team player|self-?starter|go-?getter|results-?driven|detail-?oriented|passionate|dynamic|motivated|excellent|proven track record|extensive experience|highly skilled|synerg\w+|ninja|guru|rockstar|think outside the box|fast-?paced)\b/i;
export const superlativePattern = /\b(expert|world-?class|best-?in-?class|unmatched|unrivalled|exceptional|outstanding|flawless|perfect|top performer)\b/i;

const fillerFixes: [RegExp, string][] = [
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bin order to\b/gi, 'to'],
  [/\bon a daily basis\b/gi, 'daily'],
  [/\bon a weekly basis\b/gi, 'weekly'],
  [/\bon a monthly basis\b/gi, 'monthly'],
  [/\bon a regular basis\b/gi, 'regularly'],
  [/\bthe fact that\b/gi, 'that'],
];

export function trimFiller(text: string): string | null {
  let out = text;
  for (const [re, to] of fillerFixes) out = out.replace(re, to);
  return out === text ? null : out;
}

const misspellings: Record<string, string> = {
  recieve: 'receive', seperate: 'separate', definately: 'definitely', occured: 'occurred', managment: 'management',
  responsability: 'responsibility', succesful: 'successful', successfull: 'successful', acheived: 'achieved', achive: 'achieve',
  adress: 'address', enviroment: 'environment', experiance: 'experience', alot: 'a lot', teh: 'the', wich: 'which',
  goverment: 'government', buisness: 'business', reccomend: 'recommend', accomodate: 'accommodate', independant: 'independent',
};

/** Fixes only mechanical problems. Returns the cleaned text and what was fixed. */
export function mechanicalFixes(text: string): { text: string; issues: string[] } {
  let out = text;
  const issues: string[] = [];
  const apply = (re: RegExp, to: string | ((m: string, ...g: string[]) => string), issue: string) => {
    const next = out.replace(re, to as string);
    if (next !== out) { issues.push(issue); out = next; }
  };
  apply(/[ \t]{2,}/g, ' ', 'double spaces');
  apply(/\s+([,.;:!?])/g, '$1', 'space before punctuation');
  apply(/\b([A-Za-z]{2,})\s+\1\b/gi, '$1', 'repeated word');
  apply(/\bi\b(?=\s)/g, 'I', 'lowercase “I”');
  apply(/\b[A-Za-z]+\b/g, (w) => {
    const fix = misspellings[w.toLowerCase()];
    return fix ? (w[0] === w[0].toUpperCase() ? upper(fix) : fix) : w;
  }, 'misspelling');
  return { text: out.trim(), issues };
}

export const pictographs = /[\t│║★☆✓✔►▶■◆❖☎✉\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

const spellingPairs: [string, string][] = [
  ['analyse', 'analyze'], ['organise', 'organize'], ['prioritise', 'prioritize'], ['optimise', 'optimize'], ['specialise', 'specialize'],
  ['summarise', 'summarize'], ['recognise', 'recognize'], ['realise', 'realize'], ['colour', 'color'], ['behaviour', 'behavior'],
  ['centre', 'center'], ['licence', 'license'],
];
export function spellingVariants(): [string, string][] { return spellingPairs; }

export function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9][a-z0-9'+#.-]*/g) ?? [];
}

const stop = new Set(['the', 'and', 'for', 'with', 'to', 'of', 'a', 'in', 'on', 'by', 'from', 'that', 'this', 'as', 'at', 'an', 'or', 'was', 'were', 'is', 'are', 'my', 'our', 'their', 'across', 'into', 'over']);
export function contentWords(text: string): Set<string> {
  return new Set(words(text).filter((w) => w.length > 2 && !stop.has(w)));
}

export function similarity(a: string, b: string): number {
  const x = contentWords(a);
  const y = contentWords(b);
  if (!x.size || !y.size) return 0;
  let shared = 0;
  for (const w of x) if (y.has(w)) shared++;
  return shared / (x.size + y.size - shared);
}

export function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
