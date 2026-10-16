import assert from "node:assert/strict";
import { sampleCV } from "../lib/engine.ts";
import { parseCv } from "../lib/cv/parse.ts";
import { renderText, renderBlocks } from "../lib/cv/render.ts";
import {
  setText,
  moveWithin,
  setOverride,
  setRoleStyle,
  applyChange,
  diffSnapshots,
  removeNode,
  addNode,
} from "../lib/cv/ops.ts";
import {
  createWorkspace,
  reduce,
  effective,
  parseWorkspace,
  isDirty,
  activeVariant,
} from "../lib/cv/workspace.ts";

const norm = (x) =>
  x
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
const snap = parseCv(sampleCV);

// Meaning and layout survive a parse and render round trip.
assert.equal(norm(renderText(snap)), norm(sampleCV));
const sections = snap.layout.order.root.map((id) => snap.content.nodes[id]);
assert.deepEqual(
  sections.map((s) => s.kind),
  ["header", "summary", "experience", "education", "skills"],
);
assert.equal(snap.layout.overrides[sections[2].id].uppercase, true);

// Content and presentation change independently and ids stay stable.
const firstBullet = snap.layout.order[snap.layout.order[sections[2].id][0]][0];
const reordered = moveWithin(snap, firstBullet, 1);
assert.equal(
  reordered.content,
  snap.content,
  "reordering must not touch content",
);
assert.notDeepEqual(reordered.layout.order, snap.layout.order);
const edited = setText(snap, firstBullet, "Built dashboards.");
assert.equal(edited.layout, snap.layout, "editing text must not touch layout");
assert.equal(edited.content.nodes[firstBullet].id, firstBullet);
const styled = setRoleStyle(
  setOverride(snap, firstBullet, { pageBreakBefore: true, bulletGlyph: "-" }),
  "bullet",
  { size: 12 },
);
assert.equal(styled.content, snap.content);
const blocks = renderBlocks(styled);
const block = blocks.find((b) => b.nodeId === firstBullet);
assert.equal(block.pageBreakBefore, true);
assert.equal(block.prefix, "-");
assert.equal(block.style.size, 12);

// Changes only apply to the text they were written against.
const change = {
  kind: "text",
  id: "x",
  nodeId: firstBullet,
  before: snap.content.nodes[firstBullet].text,
  after: "Built SQL dashboards.",
  reason: "",
};
assert(applyChange(snap, change));
assert.equal(applyChange(edited, change), null);
assert.deepEqual(
  diffSnapshots(snap, edited).map((d) => d.kind),
  ["changed"],
);
assert.deepEqual(
  diffSnapshots(snap, reordered).map((d) => d.kind),
  ["moved", "moved"],
);

// Add and remove keep the tree consistent.
const [added, newId] = addNode(
  snap,
  {
    type: "bullet",
    parent: snap.content.nodes[firstBullet].parent,
    text: "New",
  },
  firstBullet,
);
assert.equal(
  added.layout.order[snap.content.nodes[firstBullet].parent][1],
  newId,
);
const removed = removeNode(added, snap.content.nodes[firstBullet].parent);
assert.equal(removed.content.nodes[firstBullet], undefined);
assert.equal(
  removed.layout.order[snap.content.nodes[firstBullet].parent],
  undefined,
);

// Versions, variants and the untouched original.
let ws = createWorkspace(sampleCV, "sample.txt", 1);
const originalJson = JSON.stringify(ws.versions.v1);
ws = reduce(ws, { type: "newVariant", name: "Orbit", roleId: "r9", now: 2 });
assert.equal(Object.keys(ws.variants).length, 2);
assert.equal(activeVariant(ws).name, "Orbit");
ws = reduce(ws, { type: "stage", change, decision: "accepted" });
assert(isDirty(ws, activeVariant(ws)));
assert.equal(effective(activeVariant(ws)).applied.length, 1);
ws = reduce(ws, { type: "commit", label: "Accept 1 change", now: 3 });
const v = activeVariant(ws);
assert.equal(v.history.length, 2);
assert(!isDirty(ws, v));
assert.equal(
  v.working.content.nodes[firstBullet].text,
  "Built SQL dashboards.",
);
assert.equal(
  JSON.stringify(ws.versions.v1),
  originalJson,
  "original must never change",
);
const general = Object.values(ws.variants).find((x) => x.roleId === null);
assert.equal(
  general.working.content.nodes[firstBullet].text,
  snap.content.nodes[firstBullet].text,
  "general CV must not change",
);
ws = reduce(ws, { type: "restore", versionId: "v1", now: 4 });
assert.equal(activeVariant(ws).history.length, 3);
assert.equal(
  activeVariant(ws).working.content.nodes[firstBullet].text,
  snap.content.nodes[firstBullet].text,
);
ws = reduce(ws, {
  type: "edit",
  snapshot: setText(activeVariant(ws).working, firstBullet, "Draft"),
});
assert(isDirty(ws, activeVariant(ws)));
ws = reduce(ws, { type: "discard" });
assert(!isDirty(ws, activeVariant(ws)));

// Saved files round trip and keep dirty tracking correct.
const loaded = parseWorkspace(JSON.stringify(ws));
assert(!isDirty(loaded, activeVariant(loaded)));
assert.throws(() => parseWorkspace('{"nope":1}'));
console.log("PASS: data model, versions and variants");
