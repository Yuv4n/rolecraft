import type { Change, ContentNode, NodeLayout, Snapshot } from '../cv/types.ts';
import { ROOT } from '../cv/types.ts';
import { children, nodeText, renderText, sections, styleFor, wordCount } from '../cv/render.ts';
import { sectionOf } from '../cv/ops.ts';
import { analyse, has } from '../engine.ts';
import {
  firstWord, fluffPattern, hash, isActionVerb, mechanicalFixes, outcomeVerb, pictographs, quantification,
  replaceFirstWord, similarity, spellingVariants, superlativePattern, tenseOf, toPast, trimFiller, vaguePattern, weakOpener,
} from './language.ts';

export type Severity = 'high' | 'medium' | 'low';
export type GroupId = 'relevance' | 'language' | 'evidence' | 'structure' | 'readability' | 'ats';
export type Dimension =
  | 'relevance' | 'verbs' | 'grammar' | 'tense' | 'specificity' | 'outcomes' | 'ownership' | 'credibility'
  | 'sectionOrder' | 'bulletOrder' | 'density' | 'repetition' | 'readability' | 'formatting' | 'ats';

export interface Ask {
  prompt: string;
  placeholder: string;
  /** append: add to the line. replace: rewrite the line. newBullet: add a bullet under `nodeId`. contact: add a contact detail. */
  mode: 'append' | 'replace' | 'newBullet' | 'contact';
  nodeId: string;
}

export interface Finding {
  id: string;
  dimension: Dimension;
  group: GroupId;
  severity: Severity;
  /** 1 to 10, how much fixing this is likely to help the CV read better. */
  impact: number;
  scope: 'document' | 'section' | 'line';
  nodeId?: string;
  sectionId?: string;
  title: string;
  why: string;
  evidence: string[];
  change?: Change;
  ask?: Ask;
}

export const dimensionLabels: Record<Dimension, string> = {
  relevance: 'Relevance to target role', verbs: 'Action verbs', grammar: 'Grammar and spelling', tense: 'Tense consistency',
  specificity: 'Specificity', outcomes: 'Measurable outcomes', ownership: 'Ownership', credibility: 'Credibility',
  sectionOrder: 'Section order', bulletOrder: 'Bullet order', density: 'Information density', repetition: 'Repetition',
  readability: 'Readability', formatting: 'Formatting consistency', ats: 'ATS compatibility',
};

export const groups: { id: GroupId; label: string; weight: number; dimensions: Dimension[]; criteria: string }[] = [
  { id: 'relevance', label: 'Relevance', weight: 20, dimensions: ['relevance'], criteria: 'Share of the role’s recognised terms that your CV supports. Only scored when a target role is chosen.' },
  { id: 'language', label: 'Language', weight: 20, dimensions: ['verbs', 'grammar', 'tense'], criteria: 'Starts at 100. Deducts for weak or missing action verbs, spelling and grammar slips, and mixed tenses.' },
  { id: 'evidence', label: 'Evidence', weight: 25, dimensions: ['specificity', 'outcomes', 'ownership', 'credibility'], criteria: 'Starts at 100. Deducts for vague wording, bullets with no measurable result, unclear personal contribution and claims the CV does not support.' },
  { id: 'structure', label: 'Structure', weight: 15, dimensions: ['sectionOrder', 'bulletOrder', 'density'], criteria: 'Starts at 100. Deducts for section order, bullet order and lines that are too thin or too dense.' },
  { id: 'readability', label: 'Readability', weight: 10, dimensions: ['repetition', 'readability', 'formatting'], criteria: 'Starts at 100. Deducts for repeated openings, hard-to-read lines and inconsistent formatting.' },
  { id: 'ats', label: 'ATS fit', weight: 10, dimensions: ['ats'], criteria: 'Starts at 100. Deducts for layout and wording that automated parsers often misread. This is a checklist, not a simulation of any employer’s system.' },
];

const groupOf = (d: Dimension): GroupId => groups.find((g) => g.dimensions.includes(d))!.id;
const points: Record<Severity, number> = { high: 12, medium: 6, low: 3 };
const DIMENSION_CAP = 40;

export interface Deduction { findingId: string; title: string; dimension: Dimension; points: number }
export interface GroupScore {
  id: GroupId; label: string; weight: number; score: number | null; criteria: string;
  deductions: Deduction[]; note: string;
}
export interface SectionSummary {
  id: string; title: string; kind: string; words: number; bullets: number; quantified: number; findings: Record<Severity, number>;
}
export interface Review {
  findings: Finding[];
  top: Finding[];
  scores: GroupScore[];
  overall: number | null;
  sections: SectionSummary[];
  checks: { dimension: Dimension; label: string; count: number }[];
  hasRole: boolean;
}
export interface ReviewOptions {
  roleText?: string;
  /** Used for date sanity checks. Defaults to the current year. */
  year?: number;
}

export interface Ctx {
  snap: Snapshot;
  year: number;
  sections: ContentNode[];
  bullets: { node: ContentNode; entry?: ContentNode; section: ContentNode; current: boolean }[];
  plain: string;
  role?: ReturnType<typeof analyse>;
}

const cid = (kind: string, key: string, after: unknown) => `c:${kind}:${key}:${hash(JSON.stringify(after))}`;

export function textChange(node: ContentNode, after: string, reason: string): Change {
  return { kind: 'text', id: cid('t', node.id, after), nodeId: node.id, before: node.text, after, reason };
}

function partsChange(snap: Snapshot, node: ContentNode, afterParts: string[], reason: string): Change {
  return { kind: 'text', id: cid('p', node.id, afterParts), nodeId: node.id, before: nodeText(node, snap.layout), after: afterParts.join(styleFor(snap.layout, node).separator), beforeParts: node.parts, afterParts, reason };
}

function batch(key: string, changes: Change[], reason: string): Change | undefined {
  if (!changes.length) return undefined;
  return { kind: 'batch', id: cid('b', key, changes.map((c) => c.id)), changes, reason };
}

export function buildContext(snap: Snapshot, opts: ReviewOptions = {}): Ctx {
  const secs = sections(snap);
  const bullets: Ctx['bullets'] = [];
  for (const section of secs) {
    const visit = (parent: ContentNode, entry?: ContentNode) => {
      for (const child of children(snap, parent.id)) {
        if (child.type === 'bullet') {
          const dates = entry ? nodeText(entry, snap.layout) : '';
          bullets.push({ node: child, entry, section, current: /\b(present|current|now|ongoing)\b/i.test(dates) });
        } else if (child.type === 'entry') visit(child, child);
      }
    };
    visit(section);
  }
  const plain = renderText(snap, true);
  const roleText = opts.roleText?.trim();
  return { snap, year: opts.year ?? new Date().getFullYear(), sections: secs, bullets, plain, role: roleText ? analyse(plain, roleText) : undefined };
}

function make(f: Omit<Finding, 'id' | 'group'> & { key?: string }): Finding {
  const { key, ...rest } = f;
  return { ...rest, group: groupOf(f.dimension), id: `f:${f.dimension}:${f.nodeId ?? f.sectionId ?? 'doc'}:${key ?? hash(f.title)}` };
}

const bodySections = (c: Ctx) => c.sections.filter((s) => s.kind === 'experience' || s.kind === 'projects');
const quote = (s: string) => (s.length > 140 ? s.slice(0, 137) + '…' : s);

// ---------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------

export function checkVerbs(c: Ctx): Finding[] {
  const out: Finding[] = [];
  for (const { node, section } of c.bullets) {
    if (section.kind === 'education') continue;
    const text = node.text;
    const weak = weakOpener(text);
    if (weak) {
      const after = weak.rewrite(text);
      out.push(make({
        dimension: 'verbs', severity: 'medium', impact: 6, scope: 'line', nodeId: node.id, sectionId: section.id,
        title: `Opens with a duty phrase: “${weak.phrase}”`,
        why: 'Phrases like this describe a responsibility and hide what you actually did. Opening with a specific verb states the action and your part in it.',
        evidence: [quote(text)],
        change: after ? textChange(node, after, `Replaces “${weak.phrase}” without changing the claim.`) : undefined,
        ask: after ? undefined : { prompt: 'What did you personally do? Rewrite the line so it opens with that verb.', placeholder: 'e.g. Built, Led, Designed…', mode: 'replace', nodeId: node.id },
      }));
      continue;
    }
    const word = firstWord(text);
    const tense = tenseOf(word);
    if (tense === 'gerund') {
      const past = toPast(word);
      out.push(make({
        dimension: 'verbs', severity: 'low', impact: 3, scope: 'line', nodeId: node.id, sectionId: section.id,
        title: 'Opens with an -ing form', why: 'A gerund opening reads as a fragment and breaks the pattern of the other bullets.', evidence: [quote(text)],
        change: past ? textChange(node, replaceFirstWord(text, past), 'Changes the opening word to the past tense.') : undefined,
      }));
    } else if (!isActionVerb(word)) {
      out.push(make({
        dimension: 'verbs', severity: 'low', impact: 3, scope: 'line', nodeId: node.id, sectionId: section.id,
        title: word ? `Does not open with an action verb (“${word}”)` : 'Does not open with an action verb',
        why: 'Recruiters scan the first word of each bullet. A verb such as built, led or reduced tells them what you did.',
        evidence: [quote(text)],
        ask: { prompt: 'Which verb describes what you did here? Rewrite the line to open with it.', placeholder: 'Rewrite the line', mode: 'replace', nodeId: node.id },
      }));
    }
  }
  return out;
}

export function checkTense(c: Ctx): Finding[] {
  const out: Finding[] = [];
  const byEntry = new Map<string, Ctx['bullets']>();
  for (const b of c.bullets) if (b.entry) byEntry.set(b.entry.id, [...(byEntry.get(b.entry.id) ?? []), b]);
  for (const list of byEntry.values()) {
    const tenses = list.map((b) => ({ b, t: tenseOf(firstWord(b.node.text)) }));
    const past = tenses.filter((x) => x.t === 'past').length;
    const present = tenses.filter((x) => x.t === 'present').length;
    const current = list[0].current;
    for (const { b, t } of tenses) {
      if (t !== 'present') continue;
      const mismatch = !current || past > present;
      if (!mismatch) continue;
      const past1 = toPast(firstWord(b.node.text));
      out.push(make({
        dimension: 'tense', severity: current ? 'low' : 'medium', impact: current ? 3 : 5, scope: 'line', nodeId: b.node.id, sectionId: b.section.id,
        title: current ? 'Tense differs from the other bullets in this role' : 'Present tense used for a past role',
        why: current ? 'Within one role, keep bullets in one tense. Most of these use the past tense.' : 'This role has ended, so its bullets should be in the past tense.',
        evidence: [quote(b.node.text)],
        change: past1 ? textChange(b.node, replaceFirstWord(b.node.text, past1), 'Changes the opening verb to the past tense.') : undefined,
      }));
    }
  }
  return out;
}

export function checkGrammar(c: Ctx): Finding[] {
  const out: Finding[] = [];
  const candidates = c.snap.content.nodes;
  for (const node of Object.values(candidates)) {
    if (!['bullet', 'paragraph', 'headline'].includes(node.type)) continue;
    const { text, issues } = mechanicalFixes(node.text);
    let fixed = text;
    if (node.type === 'bullet' && /^[a-z]/.test(fixed)) { fixed = fixed.charAt(0).toUpperCase() + fixed.slice(1); issues.push('lowercase first letter'); }
    if (fixed === node.text) continue;
    out.push(make({
      dimension: 'grammar', severity: 'low', impact: 3, scope: 'line', nodeId: node.id, sectionId: sectionOf(c.snap, node.id)?.id,
      title: `Mechanical errors: ${issues.join(', ')}`, why: 'Typos and spacing slips are the easiest things for a reader to judge, and the cheapest to fix.',
      evidence: [quote(node.text)], change: textChange(node, fixed, 'Fixes spelling and spacing only.'),
    }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export function checkSpecificity(c: Ctx): Finding[] {
  const out: Finding[] = [];
  for (const node of Object.values(c.snap.content.nodes)) {
    if (!['bullet', 'paragraph', 'headline'].includes(node.type)) continue;
    const sectionId = sectionOf(c.snap, node.id)?.id;
    const vague = node.text.match(vaguePattern);
    const fluff = node.text.match(fluffPattern);
    if (vague) {
      out.push(make({
        dimension: 'specificity', severity: 'medium', impact: 5, scope: 'line', nodeId: node.id, sectionId, key: 'vague',
        title: `Vague wording: “${vague[0]}”`, why: 'Words such as “various” or “several” ask the reader to take your word for it. Names and numbers show scale.',
        evidence: [quote(node.text)],
        ask: { prompt: `What exactly does “${vague[0]}” stand for? Give the real number or the names.`, placeholder: 'Rewrite the line with specifics', mode: 'replace', nodeId: node.id },
      }));
    }
    if (fluff) {
      out.push(make({
        dimension: 'specificity', severity: 'low', impact: 3, scope: 'line', nodeId: node.id, sectionId, key: 'fluff',
        title: `Generic claim: “${fluff[0]}”`, why: 'Adjectives like this appear on most CVs, so they carry no signal. A concrete example does the same job better.',
        evidence: [quote(node.text)],
        ask: { prompt: 'What example from your work shows this? Rewrite the line around it.', placeholder: 'Rewrite the line with an example', mode: 'replace', nodeId: node.id },
      }));
    }
  }
  return out;
}

export function checkOutcomes(c: Ctx): Finding[] {
  const out: Finding[] = [];
  for (const { node, section } of c.bullets) {
    if (!['experience', 'projects'].includes(section.kind ?? '')) continue;
    if (node.text.split(/\s+/).length < 5) continue;
    const { quantified, scaleOnly } = quantification(node.text);
    if (!quantified) {
      const claims = outcomeVerb.test(node.text);
      out.push(make({
        dimension: 'outcomes', severity: claims ? 'high' : 'medium', impact: claims ? 8 : 6, scope: 'line', nodeId: node.id, sectionId: section.id,
        title: claims ? 'Claims a result without a measure' : 'No measurable outcome',
        why: claims ? 'The line says something improved but not by how much. A figure makes the claim checkable.' : 'The line says what you did but not what changed. Add a result, a scale or a time saved if you have one.',
        evidence: [quote(node.text)],
        ask: { prompt: 'What changed because of this work, and by how much? Only add a figure you can verify.', placeholder: 'e.g. cutting report time from 4 hours to 1', mode: 'append', nodeId: node.id },
      }));
    } else if (scaleOnly) {
      out.push(make({
        dimension: 'outcomes', severity: 'low', impact: 3, scope: 'line', nodeId: node.id, sectionId: section.id,
        title: 'Numbers show scale, not result', why: 'The figures describe size (users, people, volume) but not what the work achieved.', evidence: [quote(node.text)],
        ask: { prompt: 'Was there an outcome you can measure? Add it if so.', placeholder: 'e.g. reducing churn by 2 points', mode: 'append', nodeId: node.id },
      }));
    }
  }
  return out;
}

export function checkOwnership(c: Ctx): Finding[] {
  const out: Finding[] = [];
  const shared = /\b(helped|assisted|supported|participated|involved|part of|contributed to|worked with|we)\b/i;
  const owned = /\b(led|owned|built|designed|created|launched|founded|managed|drove|wrote|established)\b/i;
  for (const { node, section } of c.bullets) {
    if (weakOpener(node.text)) continue;
    const m = node.text.match(shared);
    if (!m || owned.test(node.text.split(/[;,]/)[0])) continue;
    out.push(make({
      dimension: 'ownership', severity: 'medium', impact: 5, scope: 'line', nodeId: node.id, sectionId: section.id,
      title: `Your own contribution is unclear (“${m[0]}”)`, why: 'Shared-credit wording makes it hard to tell what you did yourself. Name the decision, deliverable or result that was yours.',
      evidence: [quote(node.text)],
      ask: { prompt: 'What was your own part? Name the deliverable, decision or result that was yours.', placeholder: 'Rewrite the line', mode: 'replace', nodeId: node.id },
    }));
  }
  return out;
}

function yearsClaimed(text: string): number | null {
  const m = text.match(/\b(\d{1,2})\+?\s*years?\b[^.]{0,30}\bexperience|\bexperience[^.]{0,20}\b(\d{1,2})\+?\s*years?/i);
  const n = m ? Number(m[1] ?? m[2]) : NaN;
  return Number.isFinite(n) ? n : null;
}

export function checkCredibility(c: Ctx): Finding[] {
  const out: Finding[] = [];
  const nodes = Object.values(c.snap.content.nodes);

  for (const node of nodes) {
    if (!['bullet', 'paragraph', 'headline'].includes(node.type)) continue;
    const m = node.text.match(superlativePattern);
    if (!m) continue;
    out.push(make({
      dimension: 'credibility', severity: 'medium', impact: 5, scope: 'line', nodeId: node.id, sectionId: sectionOf(c.snap, node.id)?.id,
      title: `Unsupported claim: “${m[0]}”`, why: 'Self-assessment is not evidence. Say what shows it: a result, a recognition, a scale.',
      evidence: [quote(node.text)],
      ask: { prompt: 'What evidence supports this? Rewrite the line to show it instead of stating it.', placeholder: 'Rewrite the line', mode: 'replace', nodeId: node.id },
    }));
  }

  // Years of experience claimed versus dates on the CV.
  const years: number[] = [];
  for (const s of c.sections.filter((x) => x.kind === 'experience')) {
    for (const e of children(c.snap, s.id).filter((x) => x.type === 'entry')) {
      for (const y of nodeText(e, c.snap.layout).match(/\b(?:19|20)\d{2}\b/g) ?? []) years.push(Number(y));
    }
  }
  if (years.length) {
    const span = c.year - Math.min(...years);
    for (const node of nodes.filter((n) => n.type === 'paragraph' || n.type === 'headline')) {
      const claim = yearsClaimed(node.text);
      if (claim !== null && claim > span + 1) {
        out.push(make({
          dimension: 'credibility', severity: 'high', impact: 8, scope: 'line', nodeId: node.id, sectionId: sectionOf(c.snap, node.id)?.id,
          title: `Claims ${claim} years of experience; dates show about ${span}`, why: 'A mismatch between the summary and the dated roles is the kind of thing reviewers notice. Either the claim or the dates need correcting.',
          evidence: [quote(node.text), `Earliest dated role: ${Math.min(...years)}`],
          ask: { prompt: 'Which is right? Rewrite the line with the figure your dates support.', placeholder: 'Rewrite the line', mode: 'replace', nodeId: node.id },
        }));
      }
    }
  }

  // Date ranges that end before they start.
  for (const e of nodes.filter((n) => n.type === 'entry')) {
    const range = nodeText(e, c.snap.layout).match(/\b((?:19|20)\d{2})\s*[–—-]\s*((?:19|20)\d{2})\b/);
    if (range && Number(range[2]) < Number(range[1])) {
      out.push(make({
        dimension: 'credibility', severity: 'high', impact: 7, scope: 'line', nodeId: e.id, sectionId: sectionOf(c.snap, e.id)?.id,
        title: 'Date range ends before it starts', why: 'This looks like a typo and will confuse both readers and parsers.', evidence: [nodeText(e, c.snap.layout)],
      }));
    }
  }

  // Skills listed with no supporting line elsewhere.
  const skillsSection = c.sections.find((s) => s.kind === 'skills');
  if (skillsSection) {
    const body = nodes.filter((n) => n.type !== 'skills' && sectionOf(c.snap, n.id)?.kind !== 'skills').map((n) => nodeText(n, c.snap.layout)).join('\n').toLowerCase();
    const items = nodes.filter((n) => n.type === 'skills').flatMap((n) => n.text.split(/[,;·|]/).map((x) => x.trim()).filter(Boolean));
    const unsupported = items.filter((item) => !body.includes(item.toLowerCase()));
    if (unsupported.length) {
      const entry = bodySections(c).flatMap((s) => children(c.snap, s.id)).find((n) => n.type === 'entry');
      out.push(make({
        dimension: 'credibility', severity: unsupported.length > 2 ? 'medium' : 'low', impact: 4, scope: 'section', sectionId: skillsSection.id, key: 'skills',
        title: `${unsupported.length} listed skill${unsupported.length > 1 ? 's have' : ' has'} no supporting experience`,
        why: 'A skill that appears only in the list is easy to doubt. Showing where you used it makes it believable. If you cannot, consider removing it.',
        evidence: unsupported.slice(0, 6),
        ask: entry ? { prompt: `Where did you use ${unsupported[0]}? Write one bullet for the role it belongs to.`, placeholder: `A bullet that shows ${unsupported[0]} in use`, mode: 'newBullet', nodeId: entry.id } : undefined,
      }));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

const sectionRank: Record<string, number> = { header: 0, summary: 1, experience: 2, projects: 3, education: 4, skills: 5, other: 6 };

export function checkSectionOrder(c: Ctx): Finding[] {
  const ids = c.snap.layout.order[ROOT] ?? [];
  const secs = ids.map((id) => c.snap.content.nodes[id]).filter(Boolean);
  const idx = (k: string) => secs.findIndex((s) => s.kind === k);
  const exp = idx('experience');
  const problems: string[] = [];
  if (exp >= 0 && idx('education') >= 0 && idx('education') < exp) problems.push('Education comes before Experience');
  if (idx('summary') > 1) problems.push('The summary is not directly after your contact details');
  if (exp >= 0 && secs.some((s, i) => s.kind === 'other' && i < exp)) problems.push('An extra section sits above Experience');
  if (!problems.length) return [];
  const sorted = [...secs].sort((a, b) => (sectionRank[a.kind ?? 'other'] ?? 6) - (sectionRank[b.kind ?? 'other'] ?? 6));
  const after = sorted.map((s) => s.id);
  return [make({
    dimension: 'sectionOrder', severity: 'medium', impact: 6, scope: 'document', key: 'order',
    title: 'Section order buries your strongest material', why: 'Readers spend a few seconds on the first screen. Put your summary and recent experience there, then education and skills.',
    evidence: problems.concat('Current order: ' + secs.map((s) => s.text || 'Header').join(' → ')),
    change: { kind: 'order', id: cid('o', ROOT, after), parentId: ROOT, before: ids, after, reason: 'Moves sections into the order most readers expect. Wording is untouched.' },
  })];
}

export function relevanceScore(text: string, terms: string[]): number {
  return terms.filter((t) => has(text, t)).length;
}

function moveEvidence(snap: Snapshot, before: string[], after: string[]): string {
  const i = after.findIndex((id, k) => id !== before[k]);
  const moved = snap.content.nodes[after[i]];
  return `“${quote(moved.text)}” moves from position ${before.indexOf(after[i]) + 1} to ${i + 1}`;
}

export function checkBulletOrder(c: Ctx): Finding[] {
  const out: Finding[] = [];
  const terms = c.role?.skills ?? [];
  for (const section of bodySections(c)) {
    for (const entry of children(c.snap, section.id).filter((n) => n.type === 'entry')) {
      const kids = children(c.snap, entry.id).filter((n) => n.type === 'bullet');
      if (kids.length < 2) continue;
      const before = c.snap.layout.order[entry.id] ?? [];
      let ranked: ContentNode[];
      let reason: string;
      let why: string;
      if (terms.length) {
        ranked = kids.map((n, i) => ({ n, i, s: relevanceScore(n.text, terms) })).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.n);
        reason = 'Moves the bullets that match the target role first. No wording changes.';
        why = 'The first bullets get read; the rest are skimmed. Lead with the evidence that matches this role.';
      } else {
        const lead = kids.findIndex((n) => quantification(n.text).quantified);
        if (lead <= 0) continue;
        ranked = [kids[lead], ...kids.filter((_, i) => i !== lead)];
        reason = 'Moves the first bullet that contains a figure to the top of the role.';
        why = 'A bullet with a number is the strongest opener for a role. Right now the first bullet has none.';
      }
      const after = [...ranked.map((n) => n.id), ...before.filter((id) => !ranked.some((n) => n.id === id))];
      if (JSON.stringify(after) === JSON.stringify(before)) continue;
      out.push(make({
        dimension: 'bulletOrder', severity: 'medium', impact: terms.length ? 6 : 4, scope: 'section', sectionId: section.id, nodeId: entry.id, key: 'bullets',
        title: `Reorder the bullets under “${nodeText(entry, c.snap.layout).split(' | ')[0]}”`, why,
        evidence: [moveEvidence(c.snap, before, after)],
        change: { kind: 'order', id: cid('o', entry.id, after), parentId: entry.id, before, after, reason },
      }));
    }
  }
  return out;
}

export function checkDensity(c: Ctx): Finding[] {
  const out: Finding[] = [];
  for (const { node, section } of c.bullets) {
    const n = wordCountOf(node.text);
    const base = { dimension: 'density' as const, scope: 'line' as const, nodeId: node.id, sectionId: section.id, evidence: [quote(node.text)] };
    if (n > 30) {
      out.push(make({ ...base, severity: 'medium', impact: 5, title: `Long bullet (${n} words)`, why: 'Past about 25 words a bullet stops being scanned. Split it so each line carries one achievement.' }));
    } else if (n < 5 && section.kind !== 'education') {
      out.push(make({ ...base, severity: 'low', impact: 3, title: `Very short bullet (${n} words)`, why: 'A bullet this short rarely shows scope or result.', ask: { prompt: 'What else can you say about this? Add the scope, tool or result.', placeholder: 'Rewrite the line', mode: 'replace', nodeId: node.id } }));
    }
    const trimmed = trimFiller(node.text);
    if (trimmed) out.push(make({ ...base, key: 'filler', severity: 'low', impact: 2, title: 'Filler phrase', why: 'Shorter phrasing frees space for evidence.', change: textChange(node, trimmed, 'Shortens filler phrases without changing meaning.') }));
  }

  for (const section of c.sections) {
    for (const entry of children(c.snap, section.id).filter((n) => n.type === 'entry')) {
      const kids = children(c.snap, entry.id).filter((n) => n.type === 'bullet');
      if (section.kind === 'experience' && kids.length === 0) {
        out.push(make({
          dimension: 'density', severity: 'medium', impact: 5, scope: 'section', sectionId: section.id, nodeId: entry.id, key: 'nobullets',
          title: 'Role with no description', why: 'A role with only a title tells the reader nothing about what you did there.', evidence: [nodeText(entry, c.snap.layout)],
          ask: { prompt: 'What was your most significant achievement in this role?', placeholder: 'One bullet, starting with a verb', mode: 'newBullet', nodeId: entry.id },
        }));
      } else if (kids.length > 8) {
        out.push(make({ dimension: 'density', severity: 'low', impact: 3, scope: 'section', sectionId: section.id, nodeId: entry.id, key: 'many', title: `${kids.length} bullets under one role`, why: 'More than six or seven bullets dilute the best ones. Keep those that show the most.', evidence: [nodeText(entry, c.snap.layout)] }));
      }
    }
  }

  const total = wordCount(c.plain);
  if (total > 1000) out.push(make({ dimension: 'density', severity: 'high', impact: 7, scope: 'document', key: 'len', title: `Long CV (about ${total} words)`, why: 'Most CVs work best at one or two pages, roughly 450 to 800 words. Cut the oldest or least relevant material first.', evidence: [`${total} words`] }));
  else if (total > 750) out.push(make({ dimension: 'density', severity: 'low', impact: 3, scope: 'document', key: 'len', title: `Fairly long CV (about ${total} words)`, why: 'This is near the limit of two pages. Check that every line earns its place.', evidence: [`${total} words`] }));
  else if (total < 150) out.push(make({ dimension: 'density', severity: 'medium', impact: 5, scope: 'document', key: 'len', title: `Thin CV (about ${total} words)`, why: 'There is little here for a reader to judge. Add roles, results and skills you can support.', evidence: [`${total} words`] }));
  return out;
}

const wordCountOf = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

// ---------------------------------------------------------------------------
// Readability and consistency
// ---------------------------------------------------------------------------

export function checkRepetition(c: Ctx): Finding[] {
  const out: Finding[] = [];
  const openers = new Map<string, Ctx['bullets']>();
  for (const b of c.bullets) {
    const w = firstWord(b.node.text).toLowerCase();
    if (w) openers.set(w, [...(openers.get(w) ?? []), b]);
  }
  for (const [word, list] of openers) {
    if (list.length >= 3) {
      out.push(make({
        dimension: 'repetition', severity: 'low', impact: 3, scope: 'document', key: `open-${word}`,
        title: `“${word}” opens ${list.length} bullets`, why: 'Repeating the same opening makes the list read as a template. Vary the verbs to match what you did each time.',
        evidence: list.slice(0, 3).map((b) => quote(b.node.text)),
      }));
    }
  }
  for (let i = 0; i < c.bullets.length; i++) {
    for (let j = i + 1; j < c.bullets.length; j++) {
      const a = c.bullets[i].node;
      const b = c.bullets[j].node;
      if (similarity(a.text, b.text) >= 0.6) {
        out.push(make({
          dimension: 'repetition', severity: 'medium', impact: 4, scope: 'line', nodeId: b.id, sectionId: c.bullets[j].section.id, key: `dup-${a.id}`,
          title: 'Near-duplicate of another bullet', why: 'Saying the same thing twice uses space that could show something new. Merge them or keep the stronger one.', evidence: [quote(a.text), quote(b.text)],
        }));
      }
    }
  }
  return out;
}

export function checkReadability(c: Ctx): Finding[] {
  const out: Finding[] = [];
  for (const { node, section } of c.bullets) {
    if (/\b(was|were|been|being|is|are)\s+\w+ed\b/i.test(node.text)) {
      out.push(make({
        dimension: 'readability', severity: 'low', impact: 2, scope: 'line', nodeId: node.id, sectionId: section.id, key: 'passive',
        title: 'Passive voice', why: 'Passive phrasing hides who did the work. Active phrasing is shorter and states your part.', evidence: [quote(node.text)],
      }));
    }
  }
  for (const node of Object.values(c.snap.content.nodes).filter((n) => n.type === 'paragraph')) {
    const n = wordCountOf(node.text);
    if (n > 60) {
      out.push(make({
        dimension: 'readability', severity: n > 90 ? 'medium' : 'low', impact: 4, scope: 'line', nodeId: node.id, sectionId: sectionOf(c.snap, node.id)?.id, key: 'wall',
        title: `Dense paragraph (${n} words)`, why: 'A block of text this long is rarely read in full. Aim for two or three short sentences, or move detail into bullets.', evidence: [quote(node.text)],
      }));
    }
  }
  return out;
}

const dateParts = (c: Ctx) => Object.values(c.snap.content.nodes).filter((n) => n.type === 'entry' && n.parts?.length).map((n) => ({ node: n, index: n.parts!.findIndex((p) => /\b(19|20)\d{2}\b|present/i.test(p)) })).filter((x) => x.index >= 0);

function majority<T>(values: T[]): T | undefined {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

export function checkFormatting(c: Ctx): Finding[] {
  const out: Finding[] = [];
  const { snap } = c;

  // Bullet glyphs.
  const glyphOf = (id: string) => styleFor(snap.layout, snap.content.nodes[id]).bulletGlyph;
  const glyphs = c.bullets.map((b) => glyphOf(b.node.id));
  if (new Set(glyphs).size > 1) {
    const target = majority(glyphs)!;
    const patches = c.bullets.filter((b) => glyphOf(b.node.id) !== target).map((b) => {
      const before = snap.layout.overrides[b.node.id] ?? {};
      const after: NodeLayout = { ...before };
      delete after.bulletGlyph;
      return { nodeId: b.node.id, before, after: target === snap.layout.styles.bullet.bulletGlyph ? after : { ...after, bulletGlyph: target } };
    });
    out.push(make({
      dimension: 'formatting', severity: 'low', impact: 3, scope: 'document', key: 'glyph',
      title: `Mixed bullet styles (${[...new Set(glyphs)].join(' ')})`, why: 'One bullet style throughout looks deliberate. This changes presentation only.',
      evidence: [`Most common: ${target}`],
      change: { kind: 'layout', id: cid('l', 'glyph', patches), patches, reason: `Sets every bullet to “${target}”. Text is untouched.` },
    }));
  }

  // Date style.
  const dates = dateParts(c);
  const dashes = dates.map((d) => (d.node.parts![d.index].match(/[–—-]|\bto\b/i)?.[0] ?? '').toLowerCase());
  const usedDashes = new Set(dashes.filter(Boolean));
  const presentCase = dates.map((d) => d.node.parts![d.index].match(/\b(present|current)\b/i)?.[0]).filter((x): x is string => !!x);
  const inconsistentCase = new Set(presentCase.map((p) => (p === p.toLowerCase() ? 'lower' : p === p.toUpperCase() ? 'upper' : 'title'))).size > 1;
  if (usedDashes.size > 1 || inconsistentCase) {
    const dash = majority(dashes.filter(Boolean)) ?? '–';
    const casing = majority(presentCase);
    const changes: Change[] = [];
    for (const d of dates) {
      let part = d.node.parts![d.index];
      if (usedDashes.size > 1) part = part.replace(/\s*(?:[–—-]|\bto\b)\s*/i, dash === 'to' ? ' to ' : dash);
      if (casing) part = part.replace(/\b(present|current)\b/i, casing);
      if (part !== d.node.parts![d.index]) {
        const parts = [...d.node.parts!];
        parts[d.index] = part;
        changes.push(partsChange(snap, d.node, parts, 'Aligns the date style with the rest of the CV.'));
      }
    }
    out.push(make({
      dimension: 'formatting', severity: 'low', impact: 3, scope: 'document', key: 'dates',
      title: 'Inconsistent date formatting', why: 'Dates written in different styles look careless and can trip up parsers.',
      evidence: dates.slice(0, 4).map((d) => d.node.parts![d.index]),
      change: batch('dates', changes, 'Aligns dash and “Present” style across roles.'),
    }));
  }

  // End punctuation.
  const ends = c.bullets.map((b) => /[.!?]$/.test(b.node.text.trim()));
  const withStop = ends.filter(Boolean).length;
  if (withStop > 0 && withStop < ends.length) {
    const wantStop = withStop >= ends.length / 2;
    const changes = c.bullets.filter((b, i) => ends[i] !== wantStop).map((b) => textChange(b.node, wantStop ? b.node.text.trim() + '.' : b.node.text.trim().replace(/[.!?]+$/, ''), 'Matches end punctuation to the other bullets.'));
    out.push(make({
      dimension: 'formatting', severity: 'low', impact: 2, scope: 'document', key: 'stops',
      title: 'Bullets end inconsistently', why: wantStop ? 'Most bullets end with a full stop; some do not.' : 'Most bullets have no full stop; some do.',
      evidence: c.bullets.filter((b, i) => ends[i] !== wantStop).slice(0, 3).map((b) => quote(b.node.text)),
      change: batch('stops', changes, 'Adds or removes the final full stop only.'),
    }));
  }

  // Heading case.
  const titles = c.sections.filter((s) => s.kind !== 'header' && !snap.layout.overrides[s.id]?.hidden);
  const upperFlags = titles.map((s) => styleFor(snap.layout, s).uppercase);
  if (new Set(upperFlags).size > 1) {
    const want = majority(upperFlags)!;
    const patches = titles.filter((s, i) => upperFlags[i] !== want).map((s) => {
      const before = snap.layout.overrides[s.id] ?? {};
      return { nodeId: s.id, before, after: { ...before, uppercase: want } };
    });
    out.push(make({
      dimension: 'formatting', severity: 'low', impact: 3, scope: 'document', key: 'heads',
      title: 'Section headings use different capitalisation', why: 'Headings should look alike. This changes presentation only.', evidence: titles.map((s) => s.text),
      change: { kind: 'layout', id: cid('l', 'heads', patches), patches, reason: 'Applies one heading case to every section.' },
    }));
  }

  // UK and US spelling.
  const all = Object.values(snap.content.nodes).filter((n) => ['bullet', 'paragraph', 'headline', 'skills'].includes(n.type));
  const blob = all.map((n) => n.text).join(' ').toLowerCase();
  const pairs = spellingVariants().filter(([uk, us]) => blob.includes(uk) && blob.includes(us));
  if (pairs.length) {
    out.push(make({
      dimension: 'formatting', severity: 'low', impact: 2, scope: 'document', key: 'spelling',
      title: 'Mixed UK and US spelling', why: 'Pick one spelling convention and keep it.', evidence: pairs.map(([a, b]) => `${a} / ${b}`),
    }));
  }

  // Role-level style drift.
  const entries = Object.values(snap.content.nodes).filter((n) => n.type === 'entry');
  const drift = entries.filter((e) => ['size', 'bold', 'italic', 'font', 'color'].some((k) => snap.layout.overrides[e.id]?.[k as keyof NodeLayout] !== undefined));
  if (drift.length && drift.length < entries.length) {
    const patches = drift.map((e) => {
      const before = snap.layout.overrides[e.id] ?? {};
      const after: NodeLayout = { ...before };
      for (const k of ['size', 'bold', 'italic', 'font', 'color'] as const) delete after[k];
      return { nodeId: e.id, before, after };
    });
    out.push(make({
      dimension: 'formatting', severity: 'low', impact: 3, scope: 'document', key: 'drift',
      title: 'Some role headings are styled differently', why: 'Role headings that differ in size or weight make the page look uneven.', evidence: drift.map((e) => nodeText(e, snap.layout)),
      change: { kind: 'layout', id: cid('l', 'drift', patches), patches, reason: 'Removes one-off styling so all roles share the same style.' },
    }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// ATS
// ---------------------------------------------------------------------------

const standardTitles = /^(summary|professional summary|profile|experience|work experience|professional experience|education|skills|technical skills|projects|certifications|languages|awards|volunteering)$/i;
const preferredTitle: Record<string, string> = { summary: 'Summary', experience: 'Experience', education: 'Education', skills: 'Skills', projects: 'Projects' };

export function checkAts(c: Ctx): Finding[] {
  const out: Finding[] = [];
  const { snap } = c;
  if (snap.layout.page.columns > 1) {
    const before = snap.layout.page;
    out.push(make({
      dimension: 'ats', severity: 'high', impact: 8, scope: 'document', key: 'columns',
      title: 'Two-column layout', why: 'Many parsers read columns across the page and scramble the order. A single column is the safest.', evidence: ['Columns: 2'],
      change: { kind: 'layout', id: cid('l', 'columns', 1), patches: [], page: { before, after: { ...before, columns: 1 } }, reason: 'Switches the page to a single column.' },
    }));
  }

  for (const s of c.sections) {
    if (s.kind === 'header' || standardTitles.test(s.text.trim())) continue;
    const better = preferredTitle[s.kind ?? ''];
    out.push(make({
      dimension: 'ats', severity: 'medium', impact: 5, scope: 'section', sectionId: s.id, nodeId: s.id, key: 'title',
      title: `Non-standard heading “${s.text}”`, why: 'Applicant tracking systems look for familiar headings to file your content in the right place.', evidence: [s.text],
      change: better ? textChange(s, better, `Renames the heading to the standard “${better}”.`) : undefined,
    }));
  }

  for (const kind of ['experience', 'education', 'skills'] as const) {
    if (!c.sections.some((s) => s.kind === kind)) {
      out.push(make({ dimension: 'ats', severity: 'medium', impact: 5, scope: 'document', key: `missing-${kind}`, title: `No ${kind} section found`, why: 'Parsers expect these three sections. If yours has a different heading, rename it.', evidence: ['Sections found: ' + c.sections.map((s) => s.text || 'Header').join(', ')] }));
    }
  }

  const contact = Object.values(snap.content.nodes).filter((n) => n.type === 'contact');
  const contactText = contact.map((n) => nodeText(n, snap.layout)).join(' ');
  const contactNode = contact[0] ?? Object.values(snap.content.nodes).find((n) => n.type === 'name');
  if (!/@/.test(contactText)) {
    out.push(make({ dimension: 'ats', severity: 'high', impact: 8, scope: 'document', key: 'email', title: 'No email address found', why: 'An application with no email cannot be answered.', evidence: [contactText || 'No contact line'], ask: contactNode ? { prompt: 'What email address should employers use?', placeholder: 'name@example.com', mode: 'contact', nodeId: contactNode.id } : undefined }));
  }
  if (!/\+?\d[\d\s().-]{7,}\d/.test(contactText)) {
    out.push(make({ dimension: 'ats', severity: 'medium', impact: 4, scope: 'document', key: 'phone', title: 'No phone number found', why: 'Many recruiters call first. Add a number if you are comfortable sharing it.', evidence: [contactText || 'No contact line'], ask: contactNode ? { prompt: 'Phone number to show (leave empty to skip).', placeholder: '+44 7700 900000', mode: 'contact', nodeId: contactNode.id } : undefined }));
  }

  for (const node of Object.values(snap.content.nodes)) {
    if (node.type === 'section') continue;
    const text = node.parts ? node.parts.join(' ') : node.text;
    if (pictographs.test(text)) {
      pictographs.lastIndex = 0;
      const cleaned = text.replace(pictographs, '').replace(/\s{2,}/g, ' ').trim();
      out.push(make({
        dimension: 'ats', severity: 'medium', impact: 4, scope: 'line', nodeId: node.id, sectionId: sectionOf(snap, node.id)?.id, key: 'symbols',
        title: 'Symbols or icons in text', why: 'Icons and special characters often turn into garbage when parsed.', evidence: [quote(text)],
        change: node.parts ? undefined : textChange(node, cleaned, 'Removes decorative symbols only.'),
      }));
    }
    pictographs.lastIndex = 0;
  }

  const body = snap.layout.styles.bullet.size;
  if (body < 9.5) {
    out.push(make({
      dimension: 'ats', severity: 'medium', impact: 4, scope: 'document', key: 'size', title: `Small body text (${body} pt)`, why: 'Text under about 10 pt is hard to read on screen and in print.', evidence: [`Bullet size: ${body} pt`],
      change: { kind: 'layout', id: cid('l', 'size', 10), patches: [], styles: [{ role: 'bullet', before: { size: body }, after: { size: 10 } }], reason: 'Raises bullet text to 10 pt.' },
    }));
  }
  const m = snap.layout.page.margins;
  if (Math.min(m.top, m.right, m.bottom, m.left) < 12) {
    const before = snap.layout.page;
    out.push(make({
      dimension: 'ats', severity: 'low', impact: 3, scope: 'document', key: 'margins', title: 'Very narrow margins', why: 'Margins under about 12 mm risk clipped text when printed.', evidence: [`Smallest margin: ${Math.min(m.top, m.right, m.bottom, m.left)} mm`],
      change: { kind: 'layout', id: cid('l', 'margins', 15), patches: [], page: { before, after: { ...before, margins: { top: Math.max(m.top, 15), right: Math.max(m.right, 15), bottom: Math.max(m.bottom, 15), left: Math.max(m.left, 15) } } }, reason: 'Sets a minimum 15 mm margin.' },
    }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Relevance to a target role
// ---------------------------------------------------------------------------

export function checkRelevance(c: Ctx): Finding[] {
  const role = c.role;
  if (!role) return [];
  const out: Finding[] = [];
  const latest = bodySections(c).flatMap((s) => children(c.snap, s.id)).find((n) => n.type === 'entry');
  const required = new Set(role.requirements.filter((r) => r.category === 'Required skills').flatMap((r) => r.terms));
  for (const term of role.gaps.slice(0, 8)) {
    const lines = role.requirements.filter((r) => r.terms.includes(term)).map((r) => r.text);
    const isRequired = required.has(term);
    out.push(make({
      dimension: 'relevance', severity: isRequired ? 'high' : 'medium', impact: isRequired ? 8 : 5, scope: 'document', key: `gap-${term}`,
      title: `No evidence of ${term}`, why: isRequired ? `The role asks for ${term} and nothing in your CV shows it.` : `The role mentions ${term} and your CV does not.`,
      evidence: lines.slice(0, 2).map(quote),
      ask: latest ? { prompt: `Do you have real experience with ${term}? If so, write one bullet saying what you did and with what result. If not, leave it out.`, placeholder: `A bullet that shows ${term} in use`, mode: 'newBullet', nodeId: latest.id } : undefined,
    }));
  }

  const summary = c.sections.find((s) => s.kind === 'summary');
  const para = summary && children(c.snap, summary.id).find((n) => n.type === 'paragraph');
  if (para && role.skills.length && relevanceScore(para.text, role.skills) === 0) {
    out.push(make({
      dimension: 'relevance', severity: 'medium', impact: 5, scope: 'line', nodeId: para.id, sectionId: summary.id, key: 'summary',
      title: 'Summary does not mention anything the role asks for', why: 'The summary is the first thing read. It should reflect what this role needs from you.', evidence: [quote(para.text)],
      ask: { prompt: 'In one sentence, what do you bring that fits this role? Use only what is true.', placeholder: 'e.g. Experience building SQL dashboards for product teams.', mode: 'append', nodeId: para.id },
    }));
  }

  const skillsNode = Object.values(c.snap.content.nodes).find((n) => n.type === 'skills');
  if (skillsNode) {
    const items = skillsNode.text.split(',').map((x) => x.trim()).filter(Boolean);
    if (items.length >= 3) {
      const ranked = items.map((t, i) => ({ t, i, s: relevanceScore(t, role.skills) })).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.t);
      const after = ranked.join(', ');
      if (after !== items.join(', ')) {
        out.push(make({
          dimension: 'relevance', severity: 'low', impact: 3, scope: 'line', nodeId: skillsNode.id, sectionId: sectionOf(c.snap, skillsNode.id)?.id, key: 'skillsorder',
          title: 'Skills the role asks for are not listed first', why: 'Putting the matching skills first makes the match visible at a glance.', evidence: [skillsNode.text],
          change: textChange(skillsNode, after, 'Reorders the existing skills. Nothing is added or removed.'),
        }));
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

const severityWeight: Record<Severity, number> = { high: 3, medium: 2, low: 1 };
export const priority = (f: Finding) => f.impact * 10 + severityWeight[f.severity] * 3 + (f.change ? 2 : 0);

export function reviewCv(snap: Snapshot, opts: ReviewOptions = {}): Review {
  const c = buildContext(snap, opts);
  const findings = [
    ...checkRelevance(c), ...checkVerbs(c), ...checkTense(c), ...checkGrammar(c), ...checkSpecificity(c), ...checkOutcomes(c),
    ...checkOwnership(c), ...checkCredibility(c), ...checkSectionOrder(c), ...checkBulletOrder(c), ...checkDensity(c),
    ...checkRepetition(c), ...checkReadability(c), ...checkFormatting(c), ...checkAts(c),
  ];
  const seen = new Set<string>();
  const unique = findings.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true))).sort((a, b) => priority(b) - priority(a));

  const scores: GroupScore[] = groups.map((g) => {
    const mine = unique.filter((f) => g.dimensions.includes(f.dimension));
    if (g.id === 'relevance') {
      if (!c.role) return { id: g.id, label: g.label, weight: g.weight, score: null, criteria: g.criteria, deductions: [], note: 'Choose a target role to include relevance in the score.' };
      const total = c.role.skills.length;
      const matched = c.role.matched.length;
      return {
        id: g.id, label: g.label, weight: g.weight, score: total ? Math.round((matched / total) * 100) : 0, criteria: g.criteria,
        deductions: mine.filter((f) => f.id.includes(':gap-')).map((f) => ({ findingId: f.id, title: f.title, dimension: f.dimension, points: 0 })),
        note: `${matched} of ${total} recognised role terms appear in your CV. Vocabulary coverage, not a semantic judgement.`,
      };
    }
    const deductions: Deduction[] = [];
    let total = 0;
    for (const d of g.dimensions) {
      let used = 0;
      for (const f of mine.filter((x) => x.dimension === d)) {
        const p = Math.min(points[f.severity], DIMENSION_CAP - used);
        if (p <= 0) continue;
        used += p;
        deductions.push({ findingId: f.id, title: f.title, dimension: d, points: p });
      }
      total += used;
    }
    return { id: g.id, label: g.label, weight: g.weight, score: Math.max(0, 100 - total), criteria: g.criteria, deductions, note: deductions.length ? `${deductions.length} deduction${deductions.length > 1 ? 's' : ''}, ${total} points in total.` : 'No issues found by these checks.' };
  });

  const scored = scores.filter((s) => s.score !== null);
  const weightSum = scored.reduce((n, s) => n + s.weight, 0);
  const overall = weightSum ? Math.round(scored.reduce((n, s) => n + (s.score as number) * s.weight, 0) / weightSum) : null;

  const summaries: SectionSummary[] = c.sections.filter((s) => s.kind !== 'header').map((s) => {
    const own = c.bullets.filter((b) => b.section.id === s.id);
    const text = renderSectionText(snap, s);
    const counts: Record<Severity, number> = { high: 0, medium: 0, low: 0 };
    for (const f of unique) if (f.sectionId === s.id) counts[f.severity]++;
    return { id: s.id, title: s.text, kind: s.kind ?? 'other', words: wordCount(text), bullets: own.length, quantified: own.filter((b) => quantification(b.node.text).quantified).length, findings: counts };
  });

  const checks = (Object.keys(dimensionLabels) as Dimension[]).filter((d) => d !== 'relevance' || c.role).map((d) => ({ dimension: d, label: dimensionLabels[d], count: unique.filter((f) => f.dimension === d).length }));
  const top = unique.filter((f) => f.change || f.ask).slice(0, 5);
  return { findings: unique, top, scores, overall, sections: summaries, checks, hasRole: !!c.role };
}

function renderSectionText(snap: Snapshot, section: ContentNode): string {
  const lines: string[] = [];
  const visit = (n: ContentNode) => { lines.push(nodeText(n, snap.layout)); for (const k of children(snap, n.id)) visit(k); };
  for (const k of children(snap, section.id)) visit(k);
  return lines.join(' ');
}

