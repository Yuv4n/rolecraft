import type { Change, Snapshot } from "./types.ts";
import { nodeText } from "./render.ts";

export interface ChangeRow {
  label?: string;
  before?: string;
  after?: string;
  /** For reorders: the sibling texts before and after. */
  list?: { before: string[]; after: string[] };
}

export interface ChangeView {
  kind: Change["kind"];
  rows: ChangeRow[];
  /** Short note about where the change lands. */
  where: string;
}

const short = (s: string, n = 70) =>
  s.length > n ? s.slice(0, n - 1) + "…" : s;

function label(snap: Snapshot, id: string): string {
  const node = snap.content.nodes[id];
  return node
    ? short(nodeText(node, snap.layout) || "Section")
    : "Removed item";
}

function where(snap: Snapshot, id: string): string {
  let node = snap.content.nodes[id];
  const trail: string[] = [];
  while (node) {
    if (node.type === "section") trail.unshift(node.text || "Header");
    else if (node.type === "entry")
      trail.unshift(
        short(
          nodeText(node, snap.layout).split(" | ").slice(0, 2).join(" · "),
          40,
        ),
      );
    node = snap.content.nodes[node.parent];
  }
  return trail.join(" › ");
}

/** Turns a change into rows the interface can show as a before and after preview. */
export function describeChange(snap: Snapshot, change: Change): ChangeView {
  switch (change.kind) {
    case "text":
      return {
        kind: "text",
        where: where(snap, change.nodeId),
        rows: [{ before: change.before, after: change.after }],
      };
    case "order":
      return {
        kind: "order",
        where: where(snap, change.parentId) || "Section order",
        rows: [
          {
            list: {
              before: change.before.map((id) => label(snap, id)),
              after: change.after.map((id) => label(snap, id)),
            },
          },
        ],
      };
    case "layout": {
      const rows: ChangeRow[] = change.patches.slice(0, 6).map((p) => ({
        label: label(snap, p.nodeId),
        before: JSON.stringify(p.before),
        after: JSON.stringify(p.after),
      }));
      if (change.patches.length > 6)
        rows.push({ label: `…and ${change.patches.length - 6} more` });
      if (change.page)
        rows.push({
          label: "Page",
          before: `${change.page.before.columns} column(s), margins ${Object.values(change.page.before.margins).join("/")} mm`,
          after: `${change.page.after.columns} column(s), margins ${Object.values(change.page.after.margins).join("/")} mm`,
        });
      for (const s of change.styles ?? [])
        rows.push({
          label: `${s.role} style`,
          before: JSON.stringify(s.before),
          after: JSON.stringify(s.after),
        });
      return { kind: "layout", where: "Presentation only", rows };
    }
    case "add":
      return {
        kind: "add",
        where: change.section
          ? `New “${change.section.title}” section`
          : where(snap, change.parentId),
        rows: [{ label: "New bullet", after: change.text }],
      };
    case "batch": {
      const rows = change.changes.flatMap((c) => describeChange(snap, c).rows);
      return { kind: "batch", where: `${change.changes.length} line(s)`, rows };
    }
  }
}

/** Word-level diff used to highlight what changed inside a line. */
export function wordDiff(
  before: string,
  after: string,
): { text: string; op: "same" | "del" | "ins" }[] {
  const a = before.split(/(\s+)/);
  const b = after.split(/(\s+)/);
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: { text: string; op: "same" | "del" | "ins" }[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ text: a[i], op: "same" });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1])
      out.push({ text: a[i++], op: "del" });
    else out.push({ text: b[j++], op: "ins" });
  }
  while (i < n) out.push({ text: a[i++], op: "del" });
  while (j < m) out.push({ text: b[j++], op: "ins" });
  return out;
}
