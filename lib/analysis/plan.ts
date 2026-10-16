import type { Snapshot } from '../cv/types.ts';
import { has } from '../engine.ts';
import { analyse } from '../engine.ts';
import { related, playFor } from './playbook.ts';
import type { ExperienceKind } from './playbook.ts';
import { findRoles } from './roles.ts';
import type { RoleFit } from './roles.ts';
import { nodeText } from '../cv/render.ts';
import { sectionOf } from '../cv/ops.ts';

export interface PlanTarget {
  id: string;
  name: string;
  source: 'saved role' | 'suggested role';
  /** Term to weight: 3 for required, 2 for responsibilities, 1 for preferred or supporting. */
  weights: Record<string, number>;
}

export function targetFromRoleText(id: string, name: string, text: string): PlanTarget {
  const weights: Record<string, number> = {};
  for (const r of analyse('', text).requirements) {
    const w = r.category === 'Required skills' ? 3 : r.category === 'Responsibilities' ? 2 : 1;
    for (const t of r.terms) weights[t] = Math.max(weights[t] ?? 0, w);
  }
  return { id, name, source: 'saved role', weights };
}

export function targetFromFit(fit: RoleFit): PlanTarget {
  const weights: Record<string, number> = {};
  for (const t of fit.def.core) weights[t] = 3;
  for (const t of fit.def.support) weights[t] = Math.max(weights[t] ?? 0, 1);
  return { id: fit.def.id, name: fit.def.title, source: 'suggested role', weights };
}

export type ImpactLevel = 'High' | 'Medium' | 'Low';

export interface PlanItem {
  term: string;
  title: string;
  kind: ExperienceKind;
  impact: ImpactLevel;
  /** Weighted demand across the chosen roles. */
  score: number;
  hours: number;
  /** The CV currently lists the term without a supporting bullet. */
  listedOnly: boolean;
  targets: { name: string; weight: number }[];
  requiredIn: number;
  evidence: string;
  steps: string[];
  template: string;
  rationale: string;
}

function termState(snap: Snapshot, term: string): 'none' | 'listed' | 'shown' {
  let listed = false;
  for (const node of Object.values(snap.content.nodes)) {
    if (node.type === 'section') continue;
    if (!has(nodeText(node, snap.layout), term)) continue;
    if (node.type === 'skills' || sectionOf(snap, node.id)?.kind === 'skills') listed = true;
    else return 'shown';
  }
  return listed ? 'listed' : 'none';
}

export function planExperience(snap: Snapshot, targets: PlanTarget[]): PlanItem[] {
  const terms = new Set(targets.flatMap((t) => Object.keys(t.weights)));
  const items: PlanItem[] = [];
  for (const term of terms) {
    const state = termState(snap, term);
    if (state === 'shown') continue;
    const hit = targets.filter((t) => t.weights[term]).map((t) => ({ name: t.name, weight: t.weights[term] }));
    const demand = hit.reduce((n, h) => n + h.weight, 0);
    const adjacent = (related[term] ?? []).filter((r) => termState(snap, r) === 'shown').length;
    const score = Math.round(demand * (state === 'listed' ? 0.6 : 1) * (1 + 0.15 * Math.min(adjacent, 3)) * 10) / 10;
    const play = playFor(term);
    const requiredIn = hit.filter((h) => h.weight >= 3).length;
    const impact: ImpactLevel = score >= 6 ? 'High' : score >= 3 ? 'Medium' : 'Low';
    const title = state === 'listed' ? `Back up ${term} with real work` : play.title;
    items.push({
      term, title, kind: state === 'listed' ? 'responsibility' : play.kind, impact, score, hours: play.hours, listedOnly: state === 'listed', targets: hit, requiredIn,
      evidence: play.evidence, steps: play.steps, template: play.template,
      rationale: `${term} is ${requiredIn ? `required in ${requiredIn} of ${targets.length}` : `mentioned in ${hit.length} of ${targets.length}`} chosen role${targets.length > 1 ? 's' : ''}` +
        `${state === 'listed' ? ' and appears on your CV only in the skills list' : ' and your CV shows no evidence of it'}` +
        `${adjacent ? `. You already show ${adjacent} related skill${adjacent > 1 ? 's' : ''}, which makes this easier to start` : ''}.`,
    });
  }
  const rank: Record<ImpactLevel, number> = { High: 0, Medium: 1, Low: 2 };
  return items.sort((a, b) => rank[a.impact] - rank[b.impact] || b.score - a.score || a.hours - b.hours);
}

export function defaultSuggestedTargets(snap: Snapshot, count = 3): PlanTarget[] {
  return findRoles(snap).filter((f) => f.readiness !== 'explore').slice(0, count).map(targetFromFit);
}
