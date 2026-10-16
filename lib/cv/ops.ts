import type { Change, ContentNode, Layout, NodeLayout, PageSetup, Role, SectionKind, Snapshot, TextStyle } from './types.ts';
import { ROOT } from './types.ts';
import { nodeText, sections } from './render.ts';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function withNode(snap: Snapshot, id: string, patch: Partial<ContentNode>): Snapshot {
  const node = snap.content.nodes[id];
  if (!node) return snap;
  return { ...snap, content: { ...snap.content, nodes: { ...snap.content.nodes, [id]: { ...node, ...patch } } } };
}

export function setText(snap: Snapshot, id: string, text: string): Snapshot {
  return withNode(snap, id, { text });
}

export function setParts(snap: Snapshot, id: string, parts: string[]): Snapshot {
  return withNode(snap, id, { parts });
}

export function setOrder(snap: Snapshot, parentId: string, ids: string[]): Snapshot {
  return { ...snap, layout: { ...snap.layout, order: { ...snap.layout.order, [parentId]: ids } } };
}

export function moveWithin(snap: Snapshot, id: string, direction: -1 | 1): Snapshot {
  const node = snap.content.nodes[id];
  if (!node) return snap;
  const ids = [...(snap.layout.order[node.parent] ?? [])];
  const i = ids.indexOf(id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= ids.length) return snap;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  return setOrder(snap, node.parent, ids);
}

export function setOverride(snap: Snapshot, id: string, patch: NodeLayout): Snapshot {
  const next: NodeLayout = { ...(snap.layout.overrides[id] ?? {}), ...patch };
  for (const k of Object.keys(next) as (keyof NodeLayout)[]) if (next[k] === undefined) delete next[k];
  const overrides = { ...snap.layout.overrides };
  if (Object.keys(next).length) overrides[id] = next;
  else delete overrides[id];
  return { ...snap, layout: { ...snap.layout, overrides } };
}

export function replaceOverride(snap: Snapshot, id: string, value: NodeLayout): Snapshot {
  const overrides = { ...snap.layout.overrides };
  if (Object.keys(value).length) overrides[id] = value;
  else delete overrides[id];
  return { ...snap, layout: { ...snap.layout, overrides } };
}

export function setRoleStyle(snap: Snapshot, role: Role, patch: Partial<TextStyle>): Snapshot {
  return { ...snap, layout: { ...snap.layout, styles: { ...snap.layout.styles, [role]: { ...snap.layout.styles[role], ...patch } } } };
}

export function setPage(snap: Snapshot, patch: Partial<PageSetup>): Snapshot {
  return { ...snap, layout: { ...snap.layout, page: { ...snap.layout.page, ...patch } } };
}

function mint(snap: Snapshot): [Snapshot, string] {
  const seq = snap.content.seq + 1;
  return [{ ...snap, content: { ...snap.content, seq } }, `n${seq}`];
}

export function addNode(snap: Snapshot, node: Omit<ContentNode, 'id'>, afterId?: string, override?: NodeLayout): [Snapshot, string] {
  const [minted, id] = mint(snap);
  const order = [...(minted.layout.order[node.parent] ?? [])];
  const at = afterId ? order.indexOf(afterId) : -1;
  if (at >= 0) order.splice(at + 1, 0, id);
  else order.push(id);
  let next: Snapshot = {
    content: { ...minted.content, nodes: { ...minted.content.nodes, [id]: { id, ...node } } },
    layout: { ...minted.layout, order: { ...minted.layout.order, [node.parent]: order } },
  };
  if (override) next = replaceOverride(next, id, override);
  return [next, id];
}

export function removeNode(snap: Snapshot, id: string): Snapshot {
  const node = snap.content.nodes[id];
  if (!node) return snap;
  const nodes = { ...snap.content.nodes };
  const order = { ...snap.layout.order };
  const overrides = { ...snap.layout.overrides };
  const drop = (nid: string) => {
    for (const child of order[nid] ?? []) drop(child);
    delete nodes[nid];
    delete order[nid];
    delete overrides[nid];
  };
  drop(id);
  order[node.parent] = (order[node.parent] ?? []).filter((x) => x !== id);
  return { content: { ...snap.content, nodes }, layout: { ...snap.layout, order, overrides } };
}

export function sectionOf(snap: Snapshot, id: string): ContentNode | undefined {
  let node = snap.content.nodes[id];
  while (node && node.type !== 'section') node = snap.content.nodes[node.parent];
  return node;
}

export function entryOf(snap: Snapshot, id: string): ContentNode | undefined {
  const node = snap.content.nodes[id];
  if (!node) return undefined;
  const parent = snap.content.nodes[node.parent];
  return parent?.type === 'entry' ? parent : undefined;
}

export function sectionByKind(snap: Snapshot, kind: SectionKind): ContentNode | undefined {
  return sections(snap).find((s) => s.kind === kind);
}

/** Applies one change. Returns null when the change no longer matches the document. */
export function applyChange(snap: Snapshot, change: Change): Snapshot | null {
  switch (change.kind) {
    case 'text': {
      const node = snap.content.nodes[change.nodeId];
      if (!node) return null;
      if (change.afterParts) {
        if (!same(node.parts, change.beforeParts)) return null;
        return setParts(snap, node.id, change.afterParts);
      }
      if (node.text !== change.before) return null;
      return setText(snap, node.id, change.after);
    }
    case 'order': {
      const current = snap.layout.order[change.parentId] ?? [];
      if (!same(current, change.before)) return null;
      return setOrder(snap, change.parentId, change.after);
    }
    case 'layout': {
      let next = snap;
      for (const p of change.patches) {
        if (!snap.content.nodes[p.nodeId]) return null;
        next = replaceOverride(next, p.nodeId, p.after);
      }
      if (change.page) {
        if (!same(snap.layout.page, change.page.before)) return null;
        next = setPage(next, change.page.after);
      }
      for (const st of change.styles ?? []) next = setRoleStyle(next, st.role, st.after);
      return next;
    }
    case 'add': {
      let target = change.parentId;
      let next = snap;
      if (change.section) {
        const [s, sectionId] = addSectionAfterExperience(next, change.section.title, change.section.kind);
        next = s;
        target = sectionId;
      } else if (!next.content.nodes[target]) return null;
      const glyphOverride = change.glyph && change.glyph !== '•' ? { bulletGlyph: change.glyph } : undefined;
      const [added] = addNode(next, { type: 'bullet', parent: target, text: change.text }, change.afterId, glyphOverride);
      return added;
    }
    case 'batch': {
      let next = snap;
      for (const c of change.changes) {
        const applied = applyChange(next, c);
        if (applied) next = applied;
      }
      return next === snap ? null : next;
    }
  }
}

function addSectionAfterExperience(snap: Snapshot, title: string, kind: SectionKind): [Snapshot, string] {
  const existing = sections(snap).find((s) => s.kind === kind && kind !== 'other');
  if (existing) return [snap, existing.id];
  const order = snap.layout.order[ROOT] ?? [];
  const exp = sections(snap).filter((s) => s.kind === 'experience');
  const anchor = exp.length ? exp[exp.length - 1].id : order[order.length - 1];
  return addNode(snap, { type: 'section', parent: ROOT, text: title, kind }, anchor);
}

export interface DiffItem {
  nodeId: string;
  kind: 'changed' | 'added' | 'removed' | 'moved' | 'layout';
  before: string;
  after: string;
}

/** Summarises the difference between two snapshots by node id. */
export function diffSnapshots(a: Snapshot, b: Snapshot): DiffItem[] {
  const out: DiffItem[] = [];
  for (const [id, node] of Object.entries(b.content.nodes)) {
    const prev = a.content.nodes[id];
    if (!prev) {
      out.push({ nodeId: id, kind: 'added', before: '', after: nodeText(node, b.layout) });
      continue;
    }
    const before = nodeText(prev, a.layout);
    const after = nodeText(node, b.layout);
    if (before !== after) out.push({ nodeId: id, kind: 'changed', before, after });
    else if (!same(a.layout.overrides[id] ?? {}, b.layout.overrides[id] ?? {})) out.push({ nodeId: id, kind: 'layout', before, after });
  }
  for (const [id, node] of Object.entries(a.content.nodes)) {
    if (!b.content.nodes[id]) out.push({ nodeId: id, kind: 'removed', before: nodeText(node, a.layout), after: '' });
  }
  for (const [parent, ids] of Object.entries(b.layout.order)) {
    const prev = (a.layout.order[parent] ?? []).filter((id) => ids.includes(id));
    const now = ids.filter((id) => prev.includes(id));
    if (!same(prev, now)) {
      for (const id of now) if (prev.indexOf(id) !== now.indexOf(id) && !out.some((o) => o.nodeId === id)) {
        const node = b.content.nodes[id];
        out.push({ nodeId: id, kind: 'moved', before: nodeText(node, a.layout), after: nodeText(node, b.layout) });
      }
    }
  }
  return out;
}

export function layoutDiffers(a: Layout, b: Layout): boolean {
  return !same(a.page, b.page) || !same(a.styles, b.styles);
}
