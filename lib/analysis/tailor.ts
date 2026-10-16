import type { Change, ContentNode, Snapshot } from '../cv/types.ts';
import { ROOT } from '../cv/types.ts';
import { children, nodeText, renderText, styleFor } from '../cv/render.ts';
import { applyChange } from '../cv/ops.ts';
import { parseCv } from '../cv/parse.ts';
import { analyse, has } from '../engine.ts';
import { buildContext, checkBulletOrder, checkRelevance, checkVerbs, priority } from './review.ts';
import type { Ask, Finding } from './review.ts';
import { hash } from './language.ts';

export type RequirementStatus = 'evidenced' | 'partial' | 'missing' | 'unrecognised';

export interface RequirementView {
  text: string;
  category: string;
  terms: string[];
  matched: string[];
  status: RequirementStatus;
  evidence: { nodeId: string; text: string }[];
}

export interface Tailoring {
  coverage: { matched: number; total: number };
  requirements: RequirementView[];
  /** Bullets ranked by how many role terms they support. */
  relevant: { node: ContentNode; entryTitle: string; terms: string[] }[];
  missing: Finding[];
  changes: Finding[];
  top: Finding[];
}

/** Everything the Tailor workflow needs, derived from the CV as it stands and the role text. */
export function tailorCv(snap: Snapshot, roleText: string, year?: number): Tailoring {
  const c = buildContext(snap, { roleText, year });
  const role = c.role!;
  const requirements: RequirementView[] = role.requirements.map((r) => {
    const status: RequirementStatus = !r.terms.length ? 'unrecognised' : r.matched.length === r.terms.length ? 'evidenced' : r.matched.length ? 'partial' : 'missing';
    const evidence = c.bullets
      .filter((b) => r.terms.some((t) => has(b.node.text, t)))
      .slice(0, 2)
      .map((b) => ({ nodeId: b.node.id, text: b.node.text }));
    return { text: r.text, category: r.category, terms: r.terms, matched: r.matched, status, evidence };
  });

  const relevant = c.bullets
    .map((b) => ({ node: b.node, entryTitle: b.entry ? nodeText(b.entry, snap.layout).split(' | ').slice(0, 2).join(' · ') : '', terms: role.skills.filter((t) => has(b.node.text, t)) }))
    .filter((x) => x.terms.length)
    .sort((a, b) => b.terms.length - a.terms.length);

  const relevance = checkRelevance(c);
  const missing = relevance.filter((f) => f.ask?.mode === 'newBullet');
  const changes = [...relevance.filter((f) => f.change || (f.ask && f.ask.mode !== 'newBullet')), ...checkBulletOrder(c), ...checkVerbs(c).filter((f) => f.change)].sort((a, b) => priority(b) - priority(a));
  const top = [...missing, ...changes].sort((a, b) => priority(b) - priority(a)).slice(0, 4);
  return { coverage: { matched: role.matched.length, total: role.skills.length }, requirements, relevant, missing, changes, top };
}

/** Accepts every automatic change and returns plain text. Used by the tests and for quick previews. */
export function tailorText(cv: string, job: string): string {
  let snap = parseCv(cv);
  for (const f of tailorCv(snap, job, 2026).changes) {
    if (!f.change) continue;
    const next = applyChange(snap, f.change);
    if (next) snap = next;
  }
  return renderText(snap);
}

const trimEnd = (s: string) => s.trim().replace(/[\s.;,]+$/, '');

/** Turns a user's answer to a finding's question into a change they can preview. */
export function composeAsk(snap: Snapshot, ask: Ask, answer: string, parentId?: string): Change | null {
  const text = answer.trim();
  if (!text) return null;
  const node = snap.content.nodes[ask.nodeId];
  if (!node) return null;
  switch (ask.mode) {
    case 'append': {
      const hadStop = /[.!?]$/.test(node.text.trim());
      const joiner = node.type === 'bullet' ? ', ' : ' ';
      const after = `${trimEnd(node.text)}${joiner}${trimEnd(text)}${hadStop || node.type !== 'bullet' ? '.' : ''}`;
      return { kind: 'text', id: `c:ask:${node.id}:${hash(after)}`, nodeId: node.id, before: node.text, after, reason: 'Adds the detail you supplied.', userSupplied: true };
    }
    case 'replace': {
      if (text === node.text.trim()) return null;
      return { kind: 'text', id: `c:ask:${node.id}:${hash(text)}`, nodeId: node.id, before: node.text, after: text, reason: 'Uses your rewrite.', userSupplied: true };
    }
    case 'newBullet': {
      const target = snap.content.nodes[parentId ?? node.id] ?? node;
      const sibling = children(snap, target.id).find((n) => n.type === 'bullet');
      const glyph = sibling ? styleFor(snap.layout, sibling).bulletGlyph : snap.layout.styles.bullet.bulletGlyph;
      return { kind: 'add', id: `c:add:${target.id}:${hash(text)}`, parentId: target.id, text, glyph, reason: 'Adds the bullet you wrote.', userSupplied: true };
    }
    case 'contact': {
      if (node.type !== 'contact' || !node.parts) return null;
      const afterParts = [...node.parts, text];
      return { kind: 'text', id: `c:ask:${node.id}:${hash(text)}`, nodeId: node.id, before: nodeText(node, snap.layout), after: afterParts.join(styleFor(snap.layout, node).separator), beforeParts: node.parts, afterParts, reason: 'Adds the contact detail you supplied.', userSupplied: true };
    }
  }
}

/** Adds a section-aware bullet used by the Plan workflow once a user has done the work. */
export function projectBullet(text: string): Change {
  return { kind: 'add', id: `c:project:${hash(text)}`, parentId: ROOT, text, section: { title: 'Projects', kind: 'projects' }, reason: 'Adds a personal project you completed.', userSupplied: true };
}

