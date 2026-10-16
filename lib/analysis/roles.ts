import type { Snapshot } from '../cv/types.ts';
import { nodeText } from '../cv/render.ts';
import { sectionOf } from '../cv/ops.ts';
import { supports } from '../engine.ts';
import { playFor } from './playbook.ts';

export interface RoleDef {
  id: string;
  title: string;
  sector: string;
  blurb: string;
  core: string[];
  support: string[];
}

export const roleCatalogue: RoleDef[] = [
  { id: 'product-analyst', title: 'Product Analyst', sector: 'SaaS · Digital products', blurb: 'Turns product usage data into decisions with product and growth teams.', core: ['SQL', 'dashboards', 'data analysis', 'experimentation', 'A/B testing', 'stakeholder'], support: ['Python', 'Tableau', 'activation', 'retention', 'customer research', 'SaaS'] },
  { id: 'data-analyst', title: 'Data Analyst', sector: 'Any industry', blurb: 'Answers business questions with data and communicates the result.', core: ['SQL', 'Excel', 'data analysis', 'dashboards', 'reporting'], support: ['Python', 'Tableau', 'Power BI', 'Looker', 'stakeholder', 'statistical significance'] },
  { id: 'analytics-engineer', title: 'Analytics Engineer', sector: 'Data teams · SaaS', blurb: 'Builds the tested data models that analysts and dashboards rely on.', core: ['SQL', 'dbt', 'data warehouse', 'Python'], support: ['Git', 'AWS', 'dashboards', 'Looker'] },
  { id: 'growth-analyst', title: 'Growth or Marketing Analyst', sector: 'Consumer · E-commerce', blurb: 'Measures campaigns and funnels and finds where growth is leaking.', core: ['SQL', 'A/B testing', 'Google Analytics', 'marketing', 'reporting'], support: ['Excel', 'dashboards', 'retention', 'activation', 'SEO', 'CRM'] },
  { id: 'insights-analyst', title: 'Customer Insights Analyst', sector: 'Consumer services · Research', blurb: 'Combines research and data to explain what customers want.', core: ['customer research', 'data analysis', 'stakeholder', 'communication'], support: ['Excel', 'Tableau', 'customer support', 'SQL', 'user research'] },
  { id: 'ops-analyst', title: 'Business Operations Analyst', sector: 'Technology · Professional services', blurb: 'Improves how the organisation runs, using data and process work.', core: ['Excel', 'process improvement', 'project management', 'reporting', 'stakeholder'], support: ['SQL', 'budgeting', 'forecasting', 'vendor management', 'customer support'] },
  { id: 'project-coordinator', title: 'Project Coordinator', sector: 'Agencies · Delivery teams', blurb: 'Keeps projects on plan across people and suppliers.', core: ['project management', 'stakeholder', 'communication', 'Agile'], support: ['budgeting', 'leadership', 'reporting', 'vendor management'] },
  { id: 'apm', title: 'Associate Product Manager', sector: 'Software · Digital products', blurb: 'Helps decide what to build, working with design and engineering.', core: ['product management', 'stakeholder', 'customer research', 'roadmap', 'experimentation'], support: ['SQL', 'Agile', 'user research', 'SaaS', 'A/B testing', 'dashboards'] },
  { id: 'frontend', title: 'Frontend Developer', sector: 'Software · Digital agencies', blurb: 'Builds the interfaces people use.', core: ['JavaScript', 'TypeScript', 'React', 'HTML', 'CSS'], support: ['Git', 'Node.js', 'Figma', 'Agile'] },
  { id: 'product-designer', title: 'Product Designer', sector: 'Digital products · Design studios', blurb: 'Designs flows and interfaces grounded in user research.', core: ['Figma', 'design', 'prototyping', 'user research'], support: ['customer research', 'HTML', 'CSS', 'stakeholder'] },
  { id: 'csm', title: 'Customer Success Manager', sector: 'SaaS · Subscription services', blurb: 'Helps customers get value and renew.', core: ['customer success', 'onboarding', 'communication', 'customer support'], support: ['CRM', 'SaaS', 'retention', 'stakeholder', 'negotiation'] },
  { id: 'business-analyst', title: 'Business Analyst', sector: 'Consulting · Technology', blurb: 'Turns stakeholder needs and data into clear requirements and recommendations.', core: ['stakeholder', 'data analysis', 'process improvement', 'communication', 'reporting'], support: ['SQL', 'Excel', 'Agile', 'project management', 'dashboards'] },
  { id: 'ux-researcher', title: 'UX Researcher', sector: 'Digital products · Research', blurb: 'Finds out what users need and makes the evidence usable for design and product.', core: ['user research', 'customer research', 'communication', 'data analysis'], support: ['Figma', 'prototyping', 'stakeholder', 'Excel'] },
  { id: 'operations-manager', title: 'Operations Manager', sector: 'Operations · Services', blurb: 'Runs the processes, people and suppliers that deliver the service.', core: ['project management', 'process improvement', 'leadership', 'budgeting', 'vendor management'], support: ['Excel', 'reporting', 'stakeholder', 'Agile'] },
  { id: 'software-engineer', title: 'Software Engineer', sector: 'Software · Technology', blurb: 'Builds and maintains software, from interfaces to services.', core: ['JavaScript', 'TypeScript', 'Git', 'Node.js', 'AWS'], support: ['React', 'Python', 'SQL', 'Agile'] },
  { id: 'account-manager', title: 'Account Manager', sector: 'B2B · Subscription services', blurb: 'Owns relationships with customers and grows the account.', core: ['sales', 'CRM', 'negotiation', 'customer success', 'communication'], support: ['stakeholder', 'reporting', 'SaaS'] },
  { id: 'marketing-specialist', title: 'Marketing Specialist', sector: 'Digital marketing · Consumer', blurb: 'Plans and measures campaigns across search, email and social.', core: ['marketing', 'SEO', 'Google Analytics', 'CRM', 'communication'], support: ['Excel', 'reporting', 'design', 'A/B testing'] },
  { id: 'financial-analyst', title: 'Financial Analyst', sector: 'Finance · Corporate', blurb: 'Models and reports on the numbers behind decisions.', core: ['financial modelling', 'Excel', 'forecasting', 'budgeting', 'reporting'], support: ['SQL', 'Power BI', 'stakeholder'] },
];

export interface TermEvidence {
  term: string;
  nodeId: string;
  quote: string;
  /** True when the term appears only in a skills list. */
  listedOnly: boolean;
}

export interface Gap {
  term: string;
  importance: 'core' | 'helpful';
  /** What would count as evidence. */
  closeWith: string;
}

export type Readiness = 'ready' | 'stretch' | 'explore';

export interface RoleFit {
  def: RoleDef;
  /** 0 to 100, share of the role’s vocabulary your CV supports. */
  fit: number;
  readiness: Readiness;
  evidence: TermEvidence[];
  gaps: Gap[];
  why: string;
}

function evidenceFor(snap: Snapshot, term: string): TermEvidence | null {
  let listed: TermEvidence | null = null;
  for (const node of Object.values(snap.content.nodes)) {
    if (node.type === 'section') continue;
    const text = nodeText(node, snap.layout);
    if (!supports(text, term)) continue;
    const inSkills = node.type === 'skills' || sectionOf(snap, node.id)?.kind === 'skills';
    const hit = { term, nodeId: node.id, quote: text, listedOnly: inSkills };
    if (!inSkills) return hit;
    listed ||= hit;
  }
  return listed;
}

export function findRoles(snap: Snapshot): RoleFit[] {
  const cache = new Map<string, TermEvidence | null>();
  const get = (t: string) => {
    if (!cache.has(t)) cache.set(t, evidenceFor(snap, t));
    return cache.get(t)!;
  };
  const weight = (e: TermEvidence | null) => (!e ? 0 : e.listedOnly ? 0.5 : 1);

  return roleCatalogue.map((def) => {
    const coreEv = def.core.map((t) => get(t));
    const supEv = def.support.map((t) => get(t));
    const coreScore = coreEv.reduce((n, e) => n + weight(e), 0) / def.core.length;
    const supScore = supEv.reduce((n, e) => n + weight(e), 0) / def.support.length;
    const fit = Math.round((coreScore * 0.75 + supScore * 0.25) * 100);
    const coreMatches = coreEv.filter(Boolean).length;
    const readiness: Readiness = coreScore >= 0.5 && coreMatches >= 3 ? 'ready' : coreMatches >= 1 && fit >= 20 ? 'stretch' : 'explore';
    const evidence = [...coreEv, ...supEv].filter((e): e is TermEvidence => !!e);
    const gaps: Gap[] = [
      ...def.core.filter((t) => !get(t) || get(t)!.listedOnly).map((t) => ({ term: t, importance: 'core' as const, closeWith: get(t) ? `Show ${t} in a bullet, not just the skills list. ${playFor(t).evidence}` : playFor(t).evidence })),
      ...def.support.filter((t) => !get(t)).slice(0, 3).map((t) => ({ term: t, importance: 'helpful' as const, closeWith: playFor(t).evidence })),
    ];
    const strong = coreEv.map((e, i) => (e && !e.listedOnly ? def.core[i] : null)).filter(Boolean);
    const why = strong.length
      ? `Your CV supports ${strong.length} of ${def.core.length} core skills for this role (${strong.join(', ')}).`
      : coreMatches
        ? `Your CV mentions some core skills for this role but only in the skills list.`
        : `Your CV shows little of this role’s core vocabulary.`;
    return { def, fit, readiness, evidence, gaps, why };
  }).sort((a, b) => b.fit - a.fit);
}
