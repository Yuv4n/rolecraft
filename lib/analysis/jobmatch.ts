import type { Snapshot } from '../cv/types.ts';
import { nodeText, renderText } from '../cv/render.ts';
import { sectionOf } from '../cv/ops.ts';
import { analyse, catalog, supports } from '../engine.ts';
import type { JobPosting } from '../jobs/types.ts';
import { contentWords } from './language.ts';
import { yearsOfExperience } from './careers.ts';

export interface JobMatch {
  posting: JobPosting;
  /** 0 to 100 ranking value used to order postings. */
  score: number;
  /** Share of the skills the posting names that your CV supports. */
  fit: number;
  matched: { term: string; quote: string; listedOnly: boolean }[];
  gaps: string[];
  reasons: string[];
  caveats: string[];
  titleMatch: number;
  seniority: 'junior' | 'senior' | 'unstated';
  requiredYears: number | null;
  /** The posting names too few recognisable skills for the fit figure to mean much. */
  lowInfo: boolean;
}

function cvEvidence(snap: Snapshot): Map<string, { quote: string; listedOnly: boolean }> {
  const index = new Map<string, { quote: string; listedOnly: boolean }>();
  for (const node of Object.values(snap.content.nodes)) {
    if (node.type === 'section') continue;
    const text = nodeText(node, snap.layout);
    const listedOnly = node.type === 'skills' || sectionOf(snap, node.id)?.kind === 'skills';
    for (const term of catalog) {
      if (!supports(text, term)) continue;
      const prev = index.get(term);
      if (!prev || (prev.listedOnly && !listedOnly)) index.set(term, { quote: text, listedOnly });
    }
  }
  return index;
}

const seniorTitle = /\b(senior|sr\.?|lead|principal|staff|head of|director|vp|chief)\b/i;
const juniorTitle = /\b(junior|jr\.?|graduate|intern|internship|entry[- ]level|trainee|apprentice)\b/i;

export function requiredYears(text: string): number | null {
  const m = text.match(/\b(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b[^.\n]{0,40}\bexperience|\bexperience[^.\n]{0,30}\b(\d{1,2})\s*\+?\s*(?:years?|yrs?)|\b(\d{1,2})\+\s*years?\b/i);
  const n = m ? Number(m[1] ?? m[2] ?? m[3]) : NaN;
  return Number.isFinite(n) && n > 0 && n <= 20 ? n : null;
}

function titleOverlap(title: string, targets: string[]): number {
  const t = contentWords(title);
  let best = 0;
  for (const target of targets) {
    const want = contentWords(target);
    if (!want.size) continue;
    let shared = 0;
    for (const w of want) if (t.has(w)) shared++;
    best = Math.max(best, shared / want.size);
  }
  return best;
}

const list = (items: string[]) => (items.length <= 2 ? items.join(' and ') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

/** Ranks postings against the CV in the browser. The CV and its text stay on this device. */
export function rankJobs(snap: Snapshot, postings: JobPosting[], opts: { targets: string[]; year?: number } = { targets: [] }): JobMatch[] {
  const year = opts.year ?? new Date().getFullYear();
  const plain = renderText(snap, true);
  const evidence = cvEvidence(snap);
  const years = yearsOfExperience(snap, year);
  return postings.map((posting): JobMatch => {
    const a = analyse(plain, `${posting.title}\n${posting.description}`);
    const skills = a.skills;
    const matched = skills.filter((t) => evidence.has(t)).map((term) => ({ term, ...evidence.get(term)! }));
    const gaps = skills.filter((t) => !evidence.has(t));
    const fit = skills.length ? Math.round((matched.length / skills.length) * 100) : 0;
    const lowInfo = skills.length < 3;
    const seniority: JobMatch['seniority'] = juniorTitle.test(posting.title) ? 'junior' : seniorTitle.test(posting.title) ? 'senior' : 'unstated';
    const need = requiredYears(posting.description);
    const titleMatch = titleOverlap(posting.title, opts.targets);

    const caveats: string[] = [];
    let penalty = 0;
    if (seniority === 'senior' && years !== null && years < 5) { caveats.push(`The title is senior and your dated roles span about ${years} years.`); penalty += 15; }
    if (seniority === 'junior' && years !== null && years >= 6) { caveats.push(`The title looks junior for about ${years} years of experience.`); penalty += 12; }
    if (need !== null && years !== null && need > years + 1) { caveats.push(`It asks for ${need}+ years and your dated roles span about ${years}.`); penalty += 10; }
    if (lowInfo) caveats.push('Few recognisable skills appear in this posting, so the match is rough. Read it yourself.');
    if (matched.some((m) => m.listedOnly)) caveats.push(`${list(matched.filter((m) => m.listedOnly).map((m) => m.term))} appear only in your skills list. Add a bullet that shows them in use.`);

    const age = posting.postedAt ? (Date.now() - posting.postedAt) / 86400000 : null;
    const recency = posting.sample || age === null ? 0 : age <= 7 ? 12 : age <= 30 ? 6 : 0;
    const score = Math.max(0, Math.min(100, Math.round((lowInfo ? fit * 0.6 : fit) * 0.6 + titleMatch * 100 * 0.28 + recency - penalty)));

    const reasons: string[] = [];
    if (matched.length) reasons.push(`Your CV supports ${matched.length} of the ${skills.length} skills this posting names: ${list(matched.map((m) => m.term).slice(0, 6))}.`);
    else reasons.push('Your CV does not show any of the skills this posting names that we recognise.');
    if (titleMatch >= 0.5) reasons.push(`The title is close to a role we think suits you (${opts.targets.find((t) => titleOverlap(posting.title, [t]) === titleMatch) ?? 'a target role'}).`);
    if (gaps.length) reasons.push(`Not shown on your CV: ${list(gaps.slice(0, 4))}.`);
    return { posting, score, fit, matched, gaps, reasons, caveats, titleMatch, seniority, requiredYears: need, lowInfo };
  }).sort((x, y) => y.score - x.score);
}
