import type { Snapshot } from '../cv/types.ts';
import { children, nodeText, sections } from '../cv/render.ts';
import { findRoles } from './roles.ts';
import type { Gap, RoleFit, Readiness, TermEvidence } from './roles.ts';
import { has } from '../engine.ts';
import { sectionOf } from '../cv/ops.ts';

interface RoleSlot { title: string; roleId: string; /** Keywords sent to job boards. Never CV text. */ query: string }
interface IndustryDef { name: string; blurb: string; domain: string[]; roles: RoleSlot[] }
interface PathDef { id: string; title: string; summary: string; roleIds: string[]; industries: IndustryDef[] }

const slot = (title: string, roleId: string, query: string): RoleSlot => ({ title, roleId, query });

const paths: PathDef[] = [
  { id: 'data', title: 'Data and analytics', summary: 'Turning data into decisions: analysis, reporting, experimentation and the models behind them.', roleIds: ['data-analyst', 'product-analyst', 'analytics-engineer', 'growth-analyst', 'financial-analyst'], industries: [
    { name: 'Technology and SaaS', blurb: 'Product-led companies run on usage data and experiments.', domain: ['*SaaS', 'activation', 'retention', 'A/B testing'], roles: [slot('Product Analyst', 'product-analyst', 'product analyst'), slot('Data Analyst', 'data-analyst', 'data analyst'), slot('Analytics Engineer', 'analytics-engineer', 'analytics engineer')] },
    { name: 'E-commerce and retail', blurb: 'Retailers need analysts who can read funnels, pricing and stock.', domain: ['*e-commerce', 'marketing', 'Google Analytics', 'forecasting'], roles: [slot('E-commerce Analyst', 'data-analyst', 'ecommerce analyst'), slot('Growth Analyst', 'growth-analyst', 'growth analyst'), slot('Marketing Analyst', 'growth-analyst', 'marketing analyst')] },
    { name: 'Financial services', blurb: 'Banks and insurers hire for reporting, risk and planning.', domain: ['*fintech', '*compliance', 'financial modelling', 'forecasting', 'reporting'], roles: [slot('Financial Analyst', 'financial-analyst', 'financial analyst'), slot('Reporting Analyst', 'data-analyst', 'reporting analyst'), slot('FP&A Analyst', 'financial-analyst', 'fp&a analyst')] },
    { name: 'Healthcare and public sector', blurb: 'Health and government teams need dependable reporting and service data.', domain: ['*healthcare', '*clinical', '*public sector', 'reporting', 'dashboards'], roles: [slot('Healthcare Data Analyst', 'data-analyst', 'healthcare data analyst'), slot('Performance Analyst', 'data-analyst', 'performance analyst')] },
  ] },
  { id: 'product', title: 'Product and strategy', summary: 'Deciding what to build or change, using research, data and stakeholder alignment.', roleIds: ['apm', 'product-analyst', 'business-analyst'], industries: [
    { name: 'Software and digital products', blurb: 'Product teams pair analysts and associate PMs with engineers and designers.', domain: ['*SaaS', 'roadmap', 'A/B testing', 'Agile'], roles: [slot('Associate Product Manager', 'apm', 'associate product manager'), slot('Product Analyst', 'product-analyst', 'product analyst'), slot('Product Operations Analyst', 'business-analyst', 'product operations')] },
    { name: 'Fintech', blurb: 'Fast-growing fintechs need people who combine product sense with numbers.', domain: ['*fintech', '*payments', 'financial modelling', 'SQL'], roles: [slot('Associate Product Manager, Fintech', 'apm', 'product manager fintech'), slot('Business Analyst, Fintech', 'business-analyst', 'business analyst fintech')] },
    { name: 'Consulting and professional services', blurb: 'Consultancies hire analysts to structure problems and present answers.', domain: ['*consulting', 'stakeholder', 'project management', 'process improvement'], roles: [slot('Business Analyst', 'business-analyst', 'business analyst'), slot('Strategy Analyst', 'business-analyst', 'strategy analyst'), slot('Associate Consultant', 'business-analyst', 'associate consultant')] },
  ] },
  { id: 'ops', title: 'Operations and delivery', summary: 'Making organisations run well: process, projects, suppliers and cost.', roleIds: ['ops-analyst', 'project-coordinator', 'operations-manager', 'business-analyst'], industries: [
    { name: 'Technology operations', blurb: 'Scaling companies need people who build repeatable processes.', domain: ['*SaaS', 'process improvement', 'vendor management'], roles: [slot('Business Operations Analyst', 'ops-analyst', 'business operations analyst'), slot('Revenue Operations Analyst', 'ops-analyst', 'revenue operations analyst'), slot('Project Coordinator', 'project-coordinator', 'project coordinator')] },
    { name: 'Logistics and supply chain', blurb: 'Supply chains run on forecasting, supplier management and cost control.', domain: ['*logistics', '*supply chain', 'vendor management', 'forecasting'], roles: [slot('Logistics Analyst', 'ops-analyst', 'logistics analyst'), slot('Supply Chain Coordinator', 'project-coordinator', 'supply chain coordinator'), slot('Operations Manager', 'operations-manager', 'operations manager')] },
    { name: 'Agencies and professional services', blurb: 'Agencies depend on coordinators who keep scope, budget and people aligned.', domain: ['*consulting', 'project management', 'budgeting', 'stakeholder'], roles: [slot('Project Manager', 'project-coordinator', 'project manager'), slot('Delivery Coordinator', 'project-coordinator', 'delivery coordinator')] },
  ] },
  { id: 'customer', title: 'Customer and revenue', summary: 'Understanding customers and growing accounts: success, insight and account management.', roleIds: ['csm', 'account-manager', 'insights-analyst', 'growth-analyst'], industries: [
    { name: 'SaaS and subscription', blurb: 'Recurring revenue businesses invest heavily in onboarding and renewal.', domain: ['*SaaS', 'retention', 'onboarding', 'CRM'], roles: [slot('Customer Success Manager', 'csm', 'customer success manager'), slot('Onboarding Specialist', 'csm', 'onboarding specialist'), slot('Account Manager', 'account-manager', 'account manager saas')] },
    { name: 'Consumer services', blurb: 'Consumer brands use research and support data to improve the experience.', domain: ['*retail', 'customer support', 'retention', 'CRM'], roles: [slot('Customer Insights Analyst', 'insights-analyst', 'customer insights analyst'), slot('Customer Experience Analyst', 'insights-analyst', 'customer experience analyst')] },
    { name: 'B2B sales and partnerships', blurb: 'B2B firms need people who manage relationships and the numbers behind them.', domain: ['sales', 'negotiation', 'CRM', 'vendor management'], roles: [slot('Account Manager', 'account-manager', 'account manager'), slot('Sales Operations Analyst', 'ops-analyst', 'sales operations analyst')] },
  ] },
  { id: 'engineering', title: 'Software and engineering', summary: 'Building software: interfaces, services and data pipelines.', roleIds: ['frontend', 'software-engineer', 'analytics-engineer'], industries: [
    { name: 'Software product companies', blurb: 'Product companies hire engineers across the stack.', domain: ['JavaScript', 'TypeScript', 'React', 'Agile', 'Git'], roles: [slot('Frontend Developer', 'frontend', 'frontend developer'), slot('Software Engineer', 'software-engineer', 'software engineer'), slot('Analytics Engineer', 'analytics-engineer', 'analytics engineer')] },
    { name: 'Agencies and consultancies', blurb: 'Agencies build many small products and value breadth and speed.', domain: ['HTML', 'CSS', 'JavaScript', 'Figma'], roles: [slot('Frontend Developer', 'frontend', 'frontend developer'), slot('Web Developer', 'frontend', 'web developer')] },
    { name: 'Data teams', blurb: 'Data teams need engineers who can model and ship reliable pipelines.', domain: ['SQL', 'Python', 'dbt', 'data warehouse'], roles: [slot('Analytics Engineer', 'analytics-engineer', 'analytics engineer'), slot('Data Engineer', 'analytics-engineer', 'data engineer')] },
  ] },
  { id: 'design', title: 'Design and research', summary: 'Understanding users and shaping what they experience.', roleIds: ['product-designer', 'ux-researcher', 'insights-analyst'], industries: [
    { name: 'Digital products', blurb: 'Product teams embed designers and researchers alongside engineers.', domain: ['Figma', 'prototyping', 'user research'], roles: [slot('Product Designer', 'product-designer', 'product designer'), slot('UX Designer', 'product-designer', 'ux designer'), slot('UX Researcher', 'ux-researcher', 'ux researcher')] },
    { name: 'Research and insight', blurb: 'Insight teams and agencies turn customer evidence into direction.', domain: ['customer research', 'user research', 'data analysis'], roles: [slot('UX Researcher', 'ux-researcher', 'ux researcher'), slot('Customer Insights Analyst', 'insights-analyst', 'customer insights'), slot('Market Research Analyst', 'insights-analyst', 'market research analyst')] },
  ] },
  { id: 'marketing', title: 'Marketing and growth', summary: 'Reaching and keeping customers, and measuring what works.', roleIds: ['growth-analyst', 'marketing-specialist', 'insights-analyst'], industries: [
    { name: 'Digital marketing', blurb: 'Brands and agencies need people who plan and measure campaigns.', domain: ['SEO', 'Google Analytics', 'marketing', 'CRM'], roles: [slot('Marketing Analyst', 'growth-analyst', 'marketing analyst'), slot('Digital Marketing Specialist', 'marketing-specialist', 'digital marketing specialist'), slot('SEO Specialist', 'marketing-specialist', 'seo specialist')] },
    { name: 'SaaS growth', blurb: 'Subscription products run growth as a data discipline.', domain: ['*SaaS', 'A/B testing', 'activation', 'retention'], roles: [slot('Growth Analyst', 'growth-analyst', 'growth analyst'), slot('Lifecycle Marketing Specialist', 'marketing-specialist', 'lifecycle marketing')] },
  ] },
  { id: 'finance', title: 'Finance and planning', summary: 'Modelling, forecasting and reporting the numbers that steer a business.', roleIds: ['financial-analyst', 'ops-analyst', 'business-analyst'], industries: [
    { name: 'Corporate finance', blurb: 'Finance teams in every industry need planning and reporting analysts.', domain: ['financial modelling', 'forecasting', 'budgeting', 'Excel'], roles: [slot('Financial Analyst', 'financial-analyst', 'financial analyst'), slot('FP&A Analyst', 'financial-analyst', 'fp&a analyst'), slot('Finance Analyst', 'financial-analyst', 'finance analyst')] },
    { name: 'Technology finance', blurb: 'Software companies need analysts who understand subscription metrics.', domain: ['*SaaS', 'reporting', 'SQL'], roles: [slot('Revenue Analyst', 'financial-analyst', 'revenue analyst'), slot('Business Finance Analyst', 'financial-analyst', 'business finance analyst')] },
  ] },
];

export interface RoleRec {
  title: string;
  roleId: string;
  /** Search keywords. Contains no CV content. */
  query: string;
  fit: number;
  readiness: Readiness;
  why: string;
  gaps: Gap[];
}

export interface IndustryRec {
  name: string;
  blurb: string;
  fit: number;
  domainShown: TermEvidence[];
  domainMissing: string[];
  roles: RoleRec[];
  reasoning: string[];
}

export interface PathRec {
  id: string;
  title: string;
  summary: string;
  fit: number;
  readiness: Readiness;
  /** Plain-language reasons, each tied to something on the CV. */
  reasoning: string[];
  evidence: TermEvidence[];
  gaps: Gap[];
  industries: IndustryRec[];
}

export interface CareerPlan {
  years: number | null;
  level: 'early' | 'mid' | 'experienced' | 'unknown';
  paths: PathRec[];
}

/** Estimated span of dated experience, from the earliest year on a role to the latest end or now. */
export function yearsOfExperience(snap: Snapshot, year = new Date().getFullYear()): number | null {
  const years: number[] = [];
  for (const s of sections(snap).filter((x) => x.kind === 'experience')) {
    for (const e of children(snap, s.id).filter((n) => n.type === 'entry')) {
      const text = nodeText(e, snap.layout);
      for (const y of text.match(/\b(?:19|20)\d{2}\b/g) ?? []) years.push(Number(y));
      if (/\b(present|current|now)\b/i.test(text)) years.push(year);
    }
  }
  if (!years.length) return null;
  return Math.max(0, Math.max(...years) - Math.min(...years));
}

/** Terms starting with * are specific to the industry and count three times as much as general skills. */
function domainEvidence(snap: Snapshot, spec: string[]): { shown: TermEvidence[]; missing: string[]; share: number } {
  const shown: TermEvidence[] = [];
  const missing: string[] = [];
  let got = 0;
  let total = 0;
  for (const raw of spec) {
    const term = raw.replace(/^\*/, '');
    const weight = raw.startsWith('*') ? 3 : 1;
    total += weight;
    let hit: TermEvidence | null = null;
    for (const node of Object.values(snap.content.nodes)) {
      if (node.type === 'section') continue;
      const text = nodeText(node, snap.layout);
      if (!has(text, term)) continue;
      const listedOnly = node.type === 'skills' || sectionOf(snap, node.id)?.kind === 'skills';
      if (!hit || (hit.listedOnly && !listedOnly)) hit = { term, nodeId: node.id, quote: text, listedOnly };
    }
    if (hit) { shown.push(hit); got += hit.listedOnly ? weight / 2 : weight; } else missing.push(term);
  }
  return { shown, missing, share: total ? got / total : 0 };
}

const list = (items: string[]) => (items.length <= 2 ? items.join(' and ') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

export function planCareers(snap: Snapshot, year = new Date().getFullYear()): CareerPlan {
  const fits = new Map<string, RoleFit>(findRoles(snap).map((f) => [f.def.id, f]));
  const years = yearsOfExperience(snap, year);
  const level: CareerPlan['level'] = years === null ? 'unknown' : years < 3 ? 'early' : years < 8 ? 'mid' : 'experienced';

  const recs = paths.map((def): PathRec => {
    const roleFits = def.roleIds.map((id) => fits.get(id)).filter((f): f is RoleFit => !!f).sort((a, b) => b.fit - a.fit);
    const top = roleFits.slice(0, 3);
    const fit = Math.round((roleFits[0]?.fit ?? 0) * 0.6 + (top.reduce((n, f) => n + f.fit, 0) / Math.max(1, top.length)) * 0.4);
    const readiness: Readiness = roleFits.some((f) => f.readiness === 'ready') ? 'ready' : roleFits.some((f) => f.readiness === 'stretch') ? 'stretch' : 'explore';

    const evidence: TermEvidence[] = [];
    for (const f of roleFits) for (const e of f.evidence) if (!e.listedOnly && !evidence.some((x) => x.term === e.term) && f.def.core.includes(e.term)) evidence.push(e);
    const gapMap = new Map<string, Gap>();
    for (const f of roleFits.slice(0, 3)) for (const g of f.gaps) if (g.importance === 'core' && !gapMap.has(g.term)) gapMap.set(g.term, g);
    const gaps = [...gapMap.values()].slice(0, 5);

    const reasoning: string[] = [];
    if (evidence.length) reasoning.push(`Your CV shows ${list(evidence.slice(0, 5).map((e) => e.term))}, which these roles rely on.`);
    else reasoning.push(`Your CV shows little of the vocabulary this path relies on, so treat it as a longer-term option.`);
    if (roleFits[0] && roleFits[0].fit >= 20) reasoning.push(`The closest role is ${roleFits[0].def.title}, where ${roleFits[0].fit}% of the role’s vocabulary has support on your CV.`);
    if (gaps.length) reasoning.push(`The evidence most worth adding is ${list(gaps.slice(0, 3).map((g) => g.term))}.`);
    if (level !== 'unknown') reasoning.push(`Your dated roles span about ${years} year${years === 1 ? '' : 's'}, so ${level === 'early' ? 'entry-level and junior roles are the realistic target' : level === 'mid' ? 'early and mid-level roles are realistic' : 'you can aim at mid-level and senior roles, provided the evidence is there'}.`);

    const industries = def.industries.map((ind): IndustryRec => {
      const roles = ind.roles.map((r): RoleRec => {
        const f = fits.get(r.roleId)!;
        return { title: r.title, roleId: r.roleId, query: r.query, fit: f.fit, readiness: f.readiness, why: f.why, gaps: f.gaps.filter((g) => g.importance === 'core').slice(0, 3) };
      }).sort((a, b) => b.fit - a.fit);
      const { shown, missing, share: domainShare } = domainEvidence(snap, ind.domain);
      const reasoning: string[] = [`Strongest role here: ${roles[0].title} (${roles[0].fit}% of its vocabulary supported).`];
      if (shown.length) reasoning.push(`Domain evidence on your CV: ${list(shown.map((s) => s.term))}.`);
      if (missing.length) reasoning.push(shown.length ? `Employers here also look for ${list(missing.slice(0, 3))}, which your CV does not show yet.` : `No domain evidence yet. Employers here usually expect ${list(missing.slice(0, 3))}, so this would be a pivot.`);
      return { name: ind.name, blurb: ind.blurb, fit: Math.round(roles[0].fit * 0.6 + domainShare * 100 * 0.4), domainShown: shown, domainMissing: missing, roles, reasoning };
    }).sort((a, b) => b.fit - a.fit);

    return { id: def.id, title: def.title, summary: def.summary, fit, readiness, reasoning, evidence, gaps, industries };
  }).sort((a, b) => b.fit - a.fit);

  return { years, level, paths: recs };
}
