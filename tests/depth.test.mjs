// Vocabulary breadth, rewrite rules, plain-text CVs, impact scoring, and the property that no output
// contains anything that is not in the source CV.

import assert from 'node:assert/strict';
import {sampleCV, sampleNurseCV, analyse, tailor, rate, has, hasMetric, rewriteLine, rubric, vocabularySize} from '../lib/engine.ts';
import {itemLines, isHeading} from '../lib/focus/bullets.ts';
import {GERUND_TO_PAST, REPLACEMENT_VERBS} from '../lib/focus/verbs.ts';
import {applyTailoring, checkRewrite, isWholeLine, normalise, unseenNumbers} from '../lib/focus/grounding.ts';
import {discoverOffline, packageOffline} from '../lib/focus/offline.ts';
import {teacher, accountant, marketer, plain, softwareEngineer, chef, lawyer, graduate, nonsense} from './fixtures/cvs.mjs';

let checks = 0;
const ok = (v, m) => { checks++; assert.ok(v, m); };
const eq = (a, b, m) => { checks++; assert.deepEqual(a, b, m); };

const corpus = {
  teacher: [teacher, 'Learning Designer\nRequired skills\nCurriculum design and lesson planning. Instructional design, e-learning authoring tools, assessment and evaluation.'],
  accountant: [accountant, 'Financial Analyst\nRequired skills\nBudgeting, forecasting and variance analysis. Advanced Excel. Month-end close and reconciliation.'],
  marketer: [marketer, 'Marketing Analyst\nRequired skills\nSEO and Google Analytics. Email marketing and campaign reporting.'],
  plain: [plain, 'Customer Success Manager\nRequired skills\nCRM, onboarding, complaint handling and customer communication.'],
  nurse: [sampleNurseCV, 'Clinical Informatics Analyst\nRequired skills\nSQL and data analysis. Clinical audit and patient safety reporting. Stakeholder communication.'],
  analyst: [sampleCV, 'Product Analyst\nRequired skills\nSQL and Python. Dashboards, A/B testing and stakeholder communication.'],
};

// --- vocabulary breadth and synonyms
ok(vocabularySize >= 120, `vocabulary has ${vocabularySize} terms`);
for (const [name, [cv, job]] of Object.entries(corpus)) {
  const a = analyse(cv, job);
  ok(a.skills.length >= 4, `${name}: the job description yields at least 4 recognised terms (got ${a.skills.length})`);
  ok(a.matched.length >= 2, `${name}: the CV matches at least 2 of them`);
}
ok(has('We ran experiments on onboarding', 'experimentation'));
ok(has('Reported on GA4 and tag manager', 'Google Analytics'));
ok(has('Ran a/b tests weekly', 'A/B testing'));
ok(has('Built reconciliations each month', 'reconciliation'));
ok(has('Planned lessons using Google Classroom', 'e-learning'));
ok(has('Worked on the ward as a triage nurse', 'triage'));
ok(!has('Stored in NoSQL', 'SQL'));
ok(!has('She went to the market', 'marketing'));
ok(!has('We went to the arcade', 'ARC'));
ok(!has('Reactive programming', 'React'));

// --- rewrite rules
const rules = [
  ['• Responsible for building SQL dashboards', '• Built SQL dashboards'],
  ['Responsible for planning and delivering lessons to classes of 30', 'Planned and delivered lessons to classes of 30'],
  ['- Tasked with resolving billing complaints', '- Resolved billing complaints'],
  ['Charged with leading the rota', 'Led the rota'],
  ['In charge of running the weekly review', 'Ran the weekly review'],
  ['Duties included: building the annual budget', 'Built the annual budget'],
  ['* Worked on onboarding experiments', '* Contributed to onboarding experiments'],
  ['Helped with customer support analysis', 'Supported customer support analysis'],
  ['Assisted with the year-end audit', 'Supported the year-end audit'],
  ['Assisted in training new starters', 'Supported training new starters'],
  ['Successfully delivered the project on time', 'Delivered the project on time'],
  ['• Effectively managing a team of 4', '• Managing a team of 4'],
];
for (const [input, output] of rules) eq(rewriteLine(input), output, input);
const unchanged = [
  'Responsible for the weekly report',
  'Responsible for developing curriculum and training staff', // "training" could be a noun, so the line is left alone
  'Tasked with managing, mentoring and coaching 5 juniors',
  'Participated in the launch', 'Involved in recruitment',
  'Led a department project', '', '•', '• ',
];
for (const line of unchanged) eq(rewriteLine(line), line, 'left alone: ' + JSON.stringify(line));
for (const gerund of Object.keys(GERUND_TO_PAST)) {
  const line = `• Responsible for ${gerund} the quarterly figures`;
  const out = rewriteLine(line);
  ok(out !== line && checkRewrite(line, out, line).ok, `every verb in the table passes the grounding check: ${gerund}`);
}
for (const verb of REPLACEMENT_VERBS) ok(/^[a-z]+$/.test(verb));

// --- the property: tailoring never adds anything that is not in the CV
for (const [name, [cv, job]] of Object.entries(corpus)) {
  const out = tailor(cv, job);
  const inLines = cv.split('\n');
  const outLines = out.split('\n');
  eq(outLines.length, inLines.length, `${name}: same number of lines`);
  const item = itemLines(inLines);
  inLines.forEach((line, i) => { if (!item[i]) eq(outLines[i], line, `${name}: a non-item line is never touched (line ${i + 1})`); });
  // every output line is an input line, or a validated rewrite of one
  const originals = inLines.filter((_, i) => item[i]);
  for (const line of outLines.filter((_, i) => item[i] || true)) {
    if (inLines.includes(line)) continue;
    const source = originals.find((o) => rewriteLine(o) === line);
    ok(source !== undefined, `${name}: changed line traces to a rule: ${line}`);
    ok(checkRewrite(source, line, cv).ok, `${name}: changed line passes the grounding check: ${line}`);
  }
  eq(unseenNumbers(out, cv), [], `${name}: no number is introduced`);
  const words = (t) => new Set(normalise(t).match(/[a-z][a-z'-]*/g) ?? []);
  const known = new Set([...words(cv), ...REPLACEMENT_VERBS]);
  const novel = [...words(out)].filter((w) => !known.has(w) && !/^(contributed|supported)$/.test(w));
  eq(novel, [], `${name}: no word is introduced`);
}

// --- the offline package obeys the same rules
for (const [name, [cv]] of Object.entries(corpus)) {
  const profile = {cv, projects: '', interests: '', hoursPerWeek: 4, applyBy: '2026-11-27'};
  const directions = discoverOffline(profile).directions;
  ok(directions.length >= 1, `${name}: at least one direction`);
  const pkg = packageOffline(profile, directions[0]);
  for (const r of pkg.tailor.rewrites) ok(checkRewrite(r.original, r.revised, cv).ok, `${name}: offline rewrite is grounded`);
  for (const line of [...pkg.tailor.emphasis, ...pkg.tailor.questions.map((q) => q.line)]) ok(isWholeLine(line, cv), `${name}: emphasis and questions quote whole CV lines`);
  const applied = applyTailoring(cv, pkg.tailor.rewrites, pkg.tailor.emphasis);
  eq(applied.split('\n').length, cv.split('\n').length, `${name}: applying the package keeps every line`);
}

// --- CVs without bullet markers
{
  const lines = plain.split('\n');
  const item = itemLines(lines);
  const flagged = lines.filter((_, i) => item[i]);
  eq(flagged.length, 4, 'the four duty lines are found without markers');
  ok(!flagged.some((l) => /Northline Energy, 2020/.test(l)), 'the job title line is not treated as a duty');
  ok(isHeading('Experience') && isHeading('SKILLS') && !isHeading('Led a team of five people on a long project'));
  const out = tailor(plain, corpus.plain[1]);
  ok(out.includes('Resolved billing complaints'), 'a plain-text duty is rewritten');
  ok(out.includes('Handled 60 customer calls'), 'every ownership opener is handled');
  ok(!out.includes('•'), 'no bullet marker is invented');
  const reordered = applyTailoring(plain, [], ['Assisted with training 8 new starters on the CRM system']);
  const names = reordered.split('\n');
  ok(names.indexOf('Assisted with training 8 new starters on the CRM system') < names.indexOf('Responsible for handling 60 customer calls and emails a day'), 'emphasis reorders a plain-text list');
  // Windows line endings
  const crlf = plain.replace(/\n/g, '\r\n');
  const crOut = tailor(crlf, corpus.plain[1]);
  ok(crOut.includes('Resolved billing complaints'), 'CRLF text is handled');
  eq(crOut.split('\n').length, crlf.split('\n').length);
  // degenerate input
  eq(tailor('', ''), '');
  eq(tailor('SKILLS\nEXPERIENCE\nEDUCATION', 'x'), 'SKILLS\nEXPERIENCE\nEDUCATION');
  ok(typeof tailor('x'.repeat(30000), 'y') === 'string');
}

// --- impact scoring ignores years, dates and bare numbers
const metric = [
  'Increased activation from 31% to 39%', 'Saved £40k a year', 'Managed £1.2m of accounts payable', 'Cut costs by 3x',
  'Built dashboards for 12,000 monthly users', 'Saved the team 6 hours each week', 'Grew the list to 15,000 subscribers',
  'Handled 60 customer calls and emails a day', 'Taught 30 pupils', 'Raised $2m in funding',
];
const notMetric = [
  'Product Analyst | Finch Digital | 2022–present', 'Worked at Acme from 2019 to 2022', 'Joined in March 2021',
  'Launched in Q3', 'Upgraded to version 2.1', 'Led a team of 5', 'Taught the Year 9 curriculum', 'Based in Leeds, UK',
  'BSc Economics, 2020', 'Since 2018', 'Sat the Grade 7 exam in 2015', 'Maintained project documentation',
];
for (const line of metric) ok(hasMetric(line), 'counts: ' + line);
for (const line of notMetric) ok(!hasMetric(line), 'does not count: ' + line);
{
  const datesOnly = 'Jo Smith\nEXPERIENCE\nAnalyst | Acme | 2019–2022\n• Prepared the weekly figures in 2021 and 2022\n• Worked with the finance team from March 2020\nEDUCATION\nBSc | 2018\nSKILLS\nExcel';
  eq(rate(datesOnly, 'x')[1].score, 0, 'a CV whose only numbers are years scores zero for impact');
  const withResult = datesOnly.replace('weekly figures in 2021 and 2022', 'weekly figures, cutting errors by 30%');
  ok(rate(withResult, 'x')[1].score > 0, 'a real result raises it');
}

// --- demo robustness: a CV from almost any field gets a sensible first direction from the offline engine
{
  const expected = [
    [sampleCV, ['product-analyst'], 'product analyst'],
    [sampleNurseCV, ['clinical-informatics'], 'nurse'],
    [teacher, ['training-facilitator', 'learning-designer'], 'teacher'],
    [accountant, ['financial-analyst'], 'accountant'],
    [marketer, ['marketing-analyst', 'content-marketer'], 'marketer'],
    [plain, ['customer-success-manager'], 'plain-text customer service'],
    [softwareEngineer, ['frontend-developer'], 'software engineer'],
    [chef, ['hospitality-manager'], 'chef'],
    [lawyer, ['legal-assistant'], 'trainee solicitor'],
    [graduate, ['researcher'], 'psychology graduate'],
  ];
  for (const [cv, ids, label] of expected) {
    const profile = {cv, projects: '', interests: '', hoursPerWeek: 4, applyBy: '2026-11-27'};
    const directions = discoverOffline(profile).directions;
    ok(directions.length >= 1 && ids.includes(directions[0].roleFamilyId), `${label}: primary is ${ids.join(' or ')} (got ${directions[0]?.roleFamilyId})`);
    for (const d of directions) for (const r of d.reasons) ok(isWholeLine(r.quote, cv) || cv.includes(r.quote.slice(0, 20)), `${label}: reason is quoted from the CV`);
    const ids2 = new Set(directions.map((d) => d.roleFamilyId));
    eq(ids2.size, directions.length, `${label}: no direction is repeated`);
  }
  eq(discoverOffline({cv: nonsense, projects: '', interests: '', hoursPerWeek: 4, applyBy: '2026-11-27'}).directions, [], 'text with no recognisable experience gives no directions, not a guess');
  const generic = 'I managed a team and wrote a report on the budget for the event.';
  eq(discoverOffline({cv: generic.repeat(3), projects: '', interests: '', hoursPerWeek: 4, applyBy: '2026-11-27'}).directions, [], 'generic words alone do not produce a direction');
}

// --- the score rubric is explained
eq(rubric.map((r) => r.name), rate(sampleCV, 'x').map((r) => r.name), 'one rubric entry per score, in the same order');
for (const r of rubric) for (const key of ['measures', 'method', 'limits', 'improve']) ok(typeof r[key] === 'string' && r[key].length > 20, `${r.name}.${key}`);

console.log(`PASS: ${checks} depth checks (vocabulary, rewrite rules, plain-text CVs, impact scoring, no-new-facts property)`);
