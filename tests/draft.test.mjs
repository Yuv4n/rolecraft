import assert from "node:assert/strict";
import { readDraft, readWorkspaceDraft } from "../lib/draft.ts";
import { createWorkspace } from "../lib/cv/workspace.ts";
import { sampleCV } from "../lib/engine.ts";
const draft = {
  version: 1,
  cv: "CV text",
  job: "Job text",
  result: "Final CV",
  filename: "cv.docx",
};
assert.deepEqual(readDraft(JSON.stringify(draft)), draft);
for (const raw of [
  null,
  "",
  "bad JSON",
  "null",
  "[]",
  "{}",
  JSON.stringify({ ...draft, version: 2 }),
  JSON.stringify({ ...draft, cv: 42 }),
  JSON.stringify({ ...draft, job: "a".repeat(20001) }),
  JSON.stringify({ ...draft, result: "a".repeat(30001) }),
  JSON.stringify({ ...draft, filename: "a".repeat(256) }),
  "a".repeat(100001),
])
  assert.equal(readDraft(raw), null);
const workspace = createWorkspace(sampleCV, "sample.txt", 1);
assert.deepEqual(readWorkspaceDraft(JSON.stringify(workspace)), workspace);
for (const raw of [
  null,
  "",
  "bad JSON",
  "null",
  "{}",
  JSON.stringify({ ...workspace, schema: 2 }),
  "a".repeat(2_000_001),
])
  assert.equal(readWorkspaceDraft(raw), null);
console.log("PASS: draft schema, versions, corruption and size limits");
