import type { Change, Decision, SavedRole, Snapshot, Variant, Workspace } from './types.ts';
import { applyChange, diffSnapshots } from './ops.ts';
import { parseCv } from './parse.ts';

export type Action =
  | { type: 'edit'; snapshot: Snapshot }
  | { type: 'stage'; change: Change; decision: Decision | null }
  | { type: 'commit'; label: string; now: number }
  | { type: 'discard' }
  | { type: 'newVariant'; name: string; roleId: string | null; now: number; fromVersionId?: string }
  | { type: 'switchVariant'; id: string }
  | { type: 'renameVariant'; id: string; name: string }
  | { type: 'deleteVariant'; id: string }
  | { type: 'restore'; versionId: string; now: number }
  | { type: 'saveRole'; role: Omit<SavedRole, 'id'> & { id?: string } }
  | { type: 'removeRole'; id: string }
  | { type: 'load'; workspace: Workspace };

export function createWorkspace(text: string, fileName: string, now: number): Workspace {
  const snapshot = parseCv(text);
  return {
    schema: 1,
    originalText: text,
    fileName,
    originalVersionId: 'v1',
    versions: { v1: { id: 'v1', label: 'Original import', createdAt: now, parentId: null, origin: 'import', note: 'Parsed from the uploaded or pasted text. Never edited.', snapshot } },
    variants: { a1: { id: 'a1', name: 'General CV', roleId: null, headId: 'v1', history: ['v1'], working: snapshot, staged: {} } },
    variantOrder: ['a1'],
    activeVariantId: 'a1',
    roles: {},
    roleOrder: [],
    seq: 1,
  };
}

export const activeVariant = (ws: Workspace): Variant => ws.variants[ws.activeVariantId];
export const headSnapshot = (ws: Workspace, v: Variant): Snapshot => ws.versions[v.headId].snapshot;

export interface Effective {
  snapshot: Snapshot;
  applied: Change[];
  skipped: Change[];
}

/** The working copy with every accepted change applied in the order it was accepted. */
export function effective(variant: Variant): Effective {
  let snapshot = variant.working;
  const applied: Change[] = [];
  const skipped: Change[] = [];
  for (const { decision, change } of Object.values(variant.staged)) {
    if (decision !== 'accepted') continue;
    const next = applyChange(snapshot, change);
    if (next) { snapshot = next; applied.push(change); } else skipped.push(change);
  }
  return { snapshot, applied, skipped };
}

export function acceptedCount(variant: Variant): number {
  return Object.values(variant.staged).filter((s) => s.decision === 'accepted').length;
}

export function isDirty(ws: Workspace, variant: Variant): boolean {
  return variant.working !== headSnapshot(ws, variant) || acceptedCount(variant) > 0;
}

export function hasUnsavedWork(ws: Workspace): boolean {
  return Object.values(ws.variants).some((v) => isDirty(ws, v));
}

function update(ws: Workspace, id: string, fn: (v: Variant) => Variant): Workspace {
  return { ...ws, variants: { ...ws.variants, [id]: fn(ws.variants[id]) } };
}

export function reduce(ws: Workspace, action: Action): Workspace {
  const id = ws.activeVariantId;
  switch (action.type) {
    case 'load':
      return action.workspace;
    case 'edit':
      // Edits are made against the working copy plus accepted changes, so those changes are now part of it.
      return update(ws, id, (v) => ({ ...v, working: action.snapshot, staged: Object.fromEntries(Object.entries(v.staged).filter(([, s]) => s.decision === 'rejected')) }));
    case 'stage':
      return update(ws, id, (v) => {
        const staged = { ...v.staged };
        if (action.decision) staged[action.change.id] = { decision: action.decision, change: action.change };
        else delete staged[action.change.id];
        return { ...v, staged };
      });
    case 'discard':
      return update(ws, id, (v) => ({ ...v, working: headSnapshot(ws, v), staged: Object.fromEntries(Object.entries(v.staged).filter(([, s]) => s.decision === 'rejected')) }));
    case 'commit': {
      const v = ws.variants[id];
      const { snapshot, applied } = effective(v);
      if (snapshot === headSnapshot(ws, v)) return ws;
      const seq = ws.seq + 1;
      const versionId = `v${seq}`;
      const origin = applied.length ? 'accepted-changes' : 'edit';
      const note = diffSnapshots(headSnapshot(ws, v), snapshot).length + ' line(s) differ from the previous version.';
      const rejected = Object.fromEntries(Object.entries(v.staged).filter(([, s]) => s.decision === 'rejected'));
      return {
        ...ws,
        seq,
        versions: { ...ws.versions, [versionId]: { id: versionId, label: action.label, createdAt: action.now, parentId: v.headId, origin, note, snapshot } },
        variants: { ...ws.variants, [id]: { ...v, headId: versionId, history: [...v.history, versionId], working: snapshot, staged: rejected } },
      };
    }
    case 'newVariant': {
      const existing = action.roleId ? Object.values(ws.variants).find((x) => x.roleId === action.roleId) : undefined;
      if (existing) return { ...ws, activeVariantId: existing.id };
      const general = Object.values(ws.variants).find((x) => x.roleId === null) ?? ws.variants[id];
      const from = action.fromVersionId ? ws.versions[action.fromVersionId] : undefined;
      const source = from ? from.snapshot : headSnapshot(ws, general);
      const seq = ws.seq + 2;
      const variantId = `a${seq}`;
      const versionId = `v${seq}`;
      return {
        ...ws,
        seq,
        versions: { ...ws.versions, [versionId]: { id: versionId, label: `Fork for ${action.name}`, createdAt: action.now, parentId: from ? from.id : general.headId, origin: 'fork', note: from ? `Copied from “${from.label}”.` : `Copied from ${general.name}.`, snapshot: source } },
        variants: { ...ws.variants, [variantId]: { id: variantId, name: action.name, roleId: action.roleId, headId: versionId, history: [versionId], working: source, staged: {} } },
        variantOrder: [...ws.variantOrder, variantId],
        activeVariantId: variantId,
      };
    }
    case 'switchVariant':
      return ws.variants[action.id] ? { ...ws, activeVariantId: action.id } : ws;
    case 'renameVariant':
      return update(ws, action.id, (v) => ({ ...v, name: action.name }));
    case 'deleteVariant': {
      const v = ws.variants[action.id];
      if (!v || v.roleId === null) return ws;
      const { [action.id]: _removed, ...rest } = ws.variants;
      const order = ws.variantOrder.filter((x) => x !== action.id);
      return { ...ws, variants: rest, variantOrder: order, activeVariantId: ws.activeVariantId === action.id ? order[0] : ws.activeVariantId };
    }
    case 'restore': {
      const old = ws.versions[action.versionId];
      const v = ws.variants[id];
      if (!old) return ws;
      const seq = ws.seq + 1;
      const versionId = `v${seq}`;
      return {
        ...ws,
        seq,
        versions: { ...ws.versions, [versionId]: { id: versionId, label: `Restored: ${old.label}`, createdAt: action.now, parentId: v.headId, origin: 'restore', note: 'Copy of an earlier version. History is kept.', snapshot: old.snapshot } },
        variants: { ...ws.variants, [id]: { ...v, headId: versionId, history: [...v.history, versionId], working: old.snapshot, staged: {} } },
      };
    }
    case 'saveRole': {
      const seq = ws.seq + 1;
      const roleId = action.role.id ?? `r${seq}`;
      const role: SavedRole = { id: roleId, name: action.role.name, text: action.role.text, url: action.role.url };
      return { ...ws, seq: action.role.id ? ws.seq : seq, roles: { ...ws.roles, [roleId]: role }, roleOrder: ws.roleOrder.includes(roleId) ? ws.roleOrder : [...ws.roleOrder, roleId] };
    }
    case 'removeRole': {
      const { [action.id]: _gone, ...roles } = ws.roles;
      const variants = Object.fromEntries(Object.entries(ws.variants).map(([k, v]) => [k, v.roleId === action.id ? { ...v, roleId: null } : v]));
      return { ...ws, roles, roleOrder: ws.roleOrder.filter((x) => x !== action.id), variants };
    }
  }
}

/** Parses a saved workspace file and restores snapshot sharing so dirty checks stay accurate. */
export function parseWorkspace(json: string): Workspace {
  const bad = () => new Error('This file is not a Rolecraft workspace.');
  let data: Workspace;
  try { data = JSON.parse(json) as Workspace; } catch { throw bad(); }
  if (!data || data.schema !== 1 || typeof data.versions !== 'object' || typeof data.variants !== 'object' || !data.variants[data.activeVariantId]) throw bad();
  for (const version of Object.values(data.versions)) {
    if (!version.snapshot?.content?.nodes || !version.snapshot?.layout?.order) throw bad();
  }
  const variants = Object.fromEntries(Object.entries(data.variants).map(([k, v]) => {
    const head = data.versions[v.headId];
    if (!head) throw bad();
    const working = JSON.stringify(v.working) === JSON.stringify(head.snapshot) ? head.snapshot : v.working;
    return [k, { ...v, working }];
  }));
  return { ...data, variants };
}
