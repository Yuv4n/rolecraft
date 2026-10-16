// Offline engine. Same outputs as the live pipeline, produced by keyword matching against the
// curated role list. It runs in the browser, sends nothing anywhere, and understands a limited
// vocabulary. Used when no API key is configured or the user declines to send text for analysis.

import type {
  Direction, Email, Evidence, Gap, OutreachInput, PlanTask, Profile, Strength, TailorResult, Tier, TraceEntry,
} from './types.ts';
import {roleById, roleFamilies, type RoleFamily, type RoleRequirement} from './roles.ts';
import {has, hasMetric, rewriteLine} from '../engine.ts';
import {itemLines} from './bullets.ts';
import {quoteInSource} from './grounding.ts';

const BULLET = /^[\s•*·▪●◦-]+/;
const NO_PREFIX = new Set(['lever', 'account', 'process']);

/** Whole-word match for short terms, word-prefix match for longer ones so that "audit" finds "auditing". */
function matchTerm(text: string, term: string): boolean {
  if (term.length >= 5 && !NO_PREFIX.has(term)) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(?<![a-z0-9])' + escaped, 'i').test(text);
  }
  return has(text, term);
}

const strip = (line: string) => line.replace(BULLET, '').trim();

type Scored = {family: RoleFamily; score: number; rank: number; touched: {req: RoleRequirement; terms: string[]; line?: string; listOnly?: boolean}[]};

function profileLines(p: Profile): string[] {
  return [p.cv, p.projects, p.interests]
    .join('\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => strip(l).length >= 12);
}

// A comma-separated skills list matches many terms but says nothing about what was done.
const isList = (l: string) => (l.match(/,/g) ?? []).length >= 3 && !/[.;:]/.test(l);

function score(family: RoleFamily, lines: string[], text: string): Scored {
  let total = 0;
  const touched: Scored['touched'] = [];
  for (const req of family.requirements) {
    const terms = req.terms.filter((t) => matchTerm(text, t));
    if (!terms.length) {
      touched.push({req, terms});
      continue;
    }
    total += 1 + Math.min(1, (terms.length - 1) * 0.25);
    // A comma-separated skills list matches many terms but says nothing about what was done, so it ranks last.
    const best = lines
      .map((l) => ({l, hits: req.terms.filter((t) => matchTerm(l, t)).length}))
      .filter((x) => x.hits > 0)
      .map((x) => ({l: x.l, n: isList(x.l) ? 0.4 : x.hits + (/\d/.test(x.l) ? 0.5 : 0) + (BULLET.test(x.l) ? 0.25 : 0)}))
      .sort((a, b) => b.n - a.n)[0];
    touched.push({req, terms, line: best?.l, listOnly: best ? isList(best.l) : false});
  }
  // A job title that already appears in the text is strong evidence. It affects ranking only.
  const titleBonus = family.searchTitles.some((t) => matchTerm(text, t)) ? 2 : 0;
  return {family, score: total, rank: total + titleBonus, touched};
}

function strengthOf(terms: string[], line?: string, listOnly?: boolean): Strength {
  if (!terms.length || !line) return 'none';
  return terms.length >= 2 && !listOnly ? 'strong' : 'partial';
}

function buildDirection(s: Scored, tier: Tier): Direction | null {
  const reasons: Evidence[] = [];
  const seen = new Set<string>();
  for (const t of [...s.touched].sort((a, b) => b.terms.length - a.terms.length)) {
    if (!t.line || seen.has(t.line)) continue;
    const quote = strip(t.line);
    if (!quoteInSource(quote, t.line)) continue;
    seen.add(t.line);
    reasons.push({quote, why: `Relevant to "${t.req.text}".`});
    if (reasons.length === 3) break;
  }
  if (!reasons.length) return null;
  const gaps: Gap[] = s.touched.map((t) => {
    const strength = strengthOf(t.terms, t.line, t.listOnly);
    return {
      requirement: t.req.text,
      strength,
      evidence: strength === 'none' || !t.line ? [] : [{quote: strip(t.line), why: `Mentions ${t.terms.slice(0, 3).join(', ')}.`}],
    };
  });
  const carried = s.touched.filter((t) => t.terms.length).map((t) => t.req.text).slice(0, 3);
  return {
    id: s.family.id,
    roleFamilyId: s.family.id,
    title: s.family.title,
    field: s.family.field,
    tier,
    summary: s.family.summary,
    reasons,
    gaps,
    transferNote: tier === 'primary' ? undefined : `Carries over from your current evidence: ${carried.join('; ')}.`,
    searchTitles: s.family.searchTitles,
  };
}

function trace(role: string, started: number, kept: number): TraceEntry[] {
  return [{agent: 'offline-engine', role, model: 'offline', ms: Date.now() - started, kept, dropped: 0, attempts: 1}];
}

export function discoverOffline(profile: Profile): {directions: Direction[]; trace: TraceEntry[]} {
  const started = Date.now();
  const text = [profile.cv, profile.projects, profile.interests].join('\n');
  const lines = profileLines(profile);
  const scored = roleFamilies.map((f) => score(f, lines, text)).filter((s) => s.score >= 1.5).sort((a, b) => b.rank - a.rank);
  const primary = scored[0];
  if (!primary) return {directions: [], trace: trace('Keyword matching against the role list', started, 0)};
  const rest = scored.slice(1);
  const adjacent =
    rest.find((s) => primary.family.adjacent.includes(s.family.id) && s.family.field !== primary.family.field) ??
    rest.find((s) => primary.family.adjacent.includes(s.family.id)) ??
    rest.find((s) => s.family.field !== primary.family.field) ??
    rest[0];
  const stretch = rest.find((s) => s !== adjacent && s.family.field !== primary.family.field) ?? rest.find((s) => s !== adjacent);
  const directions = [buildDirection(primary, 'primary'), adjacent && buildDirection(adjacent, 'adjacent'), stretch && buildDirection(stretch, 'stretch')]
    .filter((d): d is Direction => Boolean(d));
  return {directions, trace: trace('Keyword matching against the role list', started, directions.length)};
}

type Template = {match: RegExp; title: string; hours: number; deliverable: string};
const templates: Template[] = [
  {match: /dbt|warehouse|data model/i, title: 'Build a small tested data model', hours: 12, deliverable: 'A public repository that loads an open dataset into a free-tier warehouse, builds staging and reporting models, and runs data-quality tests, with setup instructions.'},
  {match: /experiment|a\/b|statistic|significance/i, title: 'Design and analyse an experiment', hours: 8, deliverable: 'A write-up using simulated or open data: a hypothesis, a primary metric, a sample size, the result with its uncertainty, and the decision you would make.'},
  {match: /sql|dashboard|visualis|spreadsheet|excel/i, title: 'Publish a dashboard from open data', hours: 8, deliverable: 'A dashboard on a public dataset with the question it answers, how the numbers were calculated, and its limits.'},
  {match: /python|automat|script/i, title: 'Automate one recurring report', hours: 6, deliverable: 'A short script and a README that turn a messy input into a repeatable report.'},
  {match: /react|javascript|typescript|accessib|responsive/i, title: 'Build and test a small accessible interface', hours: 12, deliverable: 'A deployed page with automated tests and a short note on the accessibility checks you ran.'},
  {match: /figma|prototype|design system|portfolio/i, title: 'Write one design case study', hours: 10, deliverable: 'A case study with the problem, your research, two design options, the one you chose and why.'},
  {match: /research|interview|survey|usability/i, title: 'Run a small research study', hours: 8, deliverable: 'A short report from five conversations or a short survey, with the questions asked, the themes found and what you would change.'},
  {match: /writ|report|briefing|documentation/i, title: 'Write a sample briefing from public evidence', hours: 5, deliverable: 'A two-page briefing that cites its sources and states what the evidence does and does not show.'},
];

function describeRewrite(original: string): string {
  const a = strip(original).toLowerCase();
  if (/^(successfully|effectively|efficiently|proactively|actively|diligently)\b/.test(a)) return 'Removed an opening word that adds no information.';
  if (/^(worked on|helped with|assisted with|assisted in)\b/.test(a)) return 'Replaced a vague opener with a verb that says what your role was, without claiming more.';
  return 'Replaced "responsible for" style wording with the verb for what you did.';
}

export function packageOffline(profile: Profile, direction: Direction): {tasks: PlanTask[]; tailor: TailorResult; trace: TraceEntry[]} {
  const started = Date.now();
  const tasks: PlanTask[] = [];
  const add = (t: Omit<PlanTask, 'id' | 'priority'>) => tasks.push({...t, id: `t${tasks.length + 1}`, priority: tasks.length + 1});
  for (const g of direction.gaps.filter((x) => x.strength === 'partial')) {
    add({
      title: `Strengthen your existing evidence: ${g.requirement}`,
      requirement: g.requirement,
      deliverable: 'A revised CV line or project description that says what you did, how it was measured and what changed, using only facts you can confirm.',
      why: 'Related work is already on your CV. Adding the missing detail turns it into clear evidence.',
      hours: 2,
      kind: 'experience',
    });
  }
  for (const g of direction.gaps.filter((x) => x.strength === 'none')) {
    const t = templates.find((x) => x.match.test(g.requirement));
    add({
      title: t?.title ?? `Produce a small piece of work that shows: ${g.requirement}`,
      requirement: g.requirement,
      deliverable: t?.deliverable ?? 'A small, finished piece of work with a short explanation of your method, decisions and limits.',
      why: `Gives a reader something concrete to look at for "${g.requirement}".`,
      hours: t?.hours ?? 8,
      kind: 'project',
    });
  }

  const family = roleById.get(direction.roleFamilyId);
  const terms = family ? family.requirements.flatMap((r) => r.terms) : [];
  const lines = profile.cv.split('\n');
  const item = itemLines(lines);
  const bullets = lines.filter((_, i) => item[i]);
  const rewrites = bullets
    .map((l) => ({original: l, revised: rewriteLine(l)}))
    .filter((r) => r.revised !== r.original)
    .map((r) => ({original: r.original, revised: r.revised, why: describeRewrite(r.original)}));
  const emphasis = bullets
    .map((l) => ({l, n: terms.filter((t) => matchTerm(l, t)).length}))
    .filter((x) => x.n > 0 && strip(x.l).length >= 12)
    .sort((a, b) => b.n - a.n)
    .slice(0, 4)
    .map((x) => x.l.trim());
  const questions = bullets
    .filter((l) => !hasMetric(l) && strip(l).length >= 12)
    .slice(0, 3)
    .map((l) => ({line: l.trim(), ask: 'What was the result of this, how was it measured, and who benefited? Add only what you can confirm.'}));
  return {tasks, tailor: {rewrites, emphasis, questions}, trace: trace('Fixed task templates and wording rules', started, tasks.length + rewrites.length)};
}

const STOP = new Set(['about', 'which', 'their', 'there', 'where', 'would', 'these', 'those', 'while', 'with', 'from', 'that', 'this', 'have', 'been', 'your']);
const words = (s: string) => (s.toLowerCase().match(/[a-z]{5,}/g) ?? []).filter((w) => !STOP.has(w));

export function outreachOffline(profile: Profile, direction: Direction, input: OutreachInput): {email: Email; trace: TraceEntry[]} {
  const started = Date.now();
  const family = roleById.get(direction.roleFamilyId);
  const vocabulary = new Set(words([direction.title, ...direction.gaps.map((g) => g.requirement), ...direction.reasons.map((r) => r.quote)].join(' ')));
  const sentence = input.page
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 40 && s.length <= 240)
    .map((s) => ({s, n: words(s).filter((w) => vocabulary.has(w)).length}))
    .sort((a, b) => b.n - a.n)[0];
  if (!sentence) throw new Error('The pasted text has no sentence of a usable length. Paste a few full sentences.');
  const terms = family ? family.requirements.flatMap((r) => r.terms) : [];
  const bullet = profile.cv
    .split('\n')
    .filter((l) => strip(l).length >= 20)
    .map((l) => ({l: strip(l), n: terms.filter((t) => matchTerm(l, t)).length + (/\d/.test(l) ? 1 : 0)}))
    .sort((a, b) => b.n - a.n)[0];
  if (!bullet) throw new Error('The CV has no line long enough to quote.');
  const first = profile.cv.split('\n')[0]?.trim() ?? '';
  const name = first.length > 0 && first.split(/\s+/).length <= 4 && !/[@\d]/.test(first) && !/curriculum|resume|r\u00e9sum\u00e9|\bcv\b/i.test(first) ? first : '';
  const rawTopic = direction.gaps[0]?.requirement ?? direction.title;
  // Lowercase the first letter unless it starts an acronym such as SQL.
  const topic = /^[A-Z][a-z]/.test(rawTopic) ? rawTopic.replace(/^./, (c) => c.toLowerCase()) : rawTopic;
  const s1 = `I read this on ${input.company}'s site: “${sentence.s}”`;
  const s2 = `A line from my CV: “${bullet.l}”`;
  const body = [
    input.contact ? `Hello ${input.contact},` : 'Hello,',
    '',
    s1,
    '',
    s2,
    '',
    `I would be glad to hear how your team approaches ${topic}, if you have a minute to reply.`,
    '',
    name ? `Thank you,\n${name}` : 'Thank you,',
  ].join('\n');
  return {
    email: {
      subject: `A question about ${input.company}`.slice(0, 60),
      body,
      claims: [
        {sentence: s1, source: 'page', quote: sentence.s},
        {sentence: s2, source: 'cv', quote: bullet.l},
      ],
    },
    trace: trace('Template filled with two quotes', started, 2),
  };
}
