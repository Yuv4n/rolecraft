import assert from "node:assert/strict";
import {
  sampleCV,
  sampleJob,
  analyse,
  tailor,
  rate,
  has,
} from "../lib/engine.ts";
const a = analyse(sampleCV, sampleJob),
  t = tailor(sampleCV, sampleJob);
assert(a.gaps.includes("dbt"));
assert(!a.matched.includes("dbt"));
assert(a.requirements.some((r) => r.category === "Preferred experience"));
assert(t.includes("31% to 39%"));
assert(t.includes("• Built SQL dashboards"));
assert(!t.includes("dbt"));
assert.equal(t.split("\n").filter((l) => l.startsWith("•")).length, 6);
assert(rate(t, sampleJob)[2].score > rate(sampleCV, sampleJob)[2].score);
assert(has("SQL and stakeholders", "stakeholder"));
assert(!has("NoSQL", "SQL"));
assert.equal(analyse("Unrelated text", "Unrelated role").matched.length, 0);
assert.equal(rate("", sampleJob)[0].score, 0);
console.log(
  "PASS: 12 grounding, extraction-category, matching and rubric assertions",
);

// Negated and aspirational skill mentions must not become evidence.
for (const text of [
  "No experience with SQL.",
  "I am learning SQL.",
  "I have never used SQL.",
  "I want to learn SQL.",
]) {
  assert(!analyse(text, "SQL").matched.includes("SQL"), text);
  assert(
    !analyse(text, "SQL").suggestions.some(
      (s) => s.title === "Product & growth analytics",
    ),
    text,
  );
}
assert(
  analyse(
    "No Python experience. Built SQL dashboards.",
    "SQL",
  ).matched.includes("SQL"),
);
assert(
  analyse("Built Node.js services.", "Node.js").matched.includes("Node.js"),
);
assert(has("ReactJS, Postgres and split testing", "React"));
assert(has("ReactJS, Postgres and split testing", "PostgreSQL"));
assert(has("ReactJS, Postgres and split testing", "A/B testing"));
const short = analyse(sampleCV, "Required skills:\nSQL\nPython\nReact");
assert.equal(short.requirements.length, 3);
assert(short.requirements.every((r) => r.category === "Required skills"));
const preferred = analyse(
  sampleCV,
  "Preferred experience\nPython is required for bonus projects.",
);
assert.equal(preferred.requirements[0].category, "Preferred experience");
for (const text of [
  "",
  "EXPERIENCE\nEDUCATION\nSKILLS\nSQL",
  "Unrelated text",
]) {
  assert(
    rate(text, "SQL").every((r) => r.score === 0),
    text,
  );
}
assert.equal(
  tailor("• Worked on Python automation.", "Python"),
  "• Worked on Python automation.",
);
assert.equal(
  tailor("• Responsible for managing customer accounts.", "sales"),
  "• Managed customer accounts.",
);
assert.equal(
  tailor("  • Responsible for building SQL dashboards.", "SQL"),
  "• Built SQL dashboards.",
);
assert.equal(
  tailor("1. Responsible for developing React applications.", "React"),
  "• Developed React applications.",
);
const partitioned =
  "Role A\n• Python automation.\n• SQL analysis.\n\nRole B\n• React development.";
assert(
  tailor(partitioned, "SQL").indexOf("Role B") >
    tailor(partitioned, "SQL").indexOf("SQL analysis"),
);
assert(tailor(partitioned, "SQL").endsWith("• React development."));
assert(rate(sampleCV, sampleJob).every((r) => r.score >= 0 && r.score <= 100));
assert.equal(
  analyse(
    sampleCV,
    Array.from({ length: 40 }, (_, i) => `Requirement ${i}: SQL`).join("\n"),
  ).requirements.length,
  40,
);
console.log(
  "PASS: negation, aliases, short requirements, category preservation, empty scores, grammar and bullet boundaries",
);

const { supports, recommendProjects } = await import("../lib/engine.ts");
const prose =
  "Alex Morgan\nEXPERIENCE\nBuilt SQL dashboards for customer support teams and reduced weekly reporting time by 30%.\nEDUCATION\nEconomics degree\nSKILLS\nSQL, Excel";
assert(
  rate(prose, "Required skills\nSQL")[0].score > 0,
  "Short paragraph CVs must be scored",
);
assert(rate(prose, "SQL")[1].score > 0, "Paragraph outcomes must count");
assert(supports("No Python experience, built SQL dashboards.", "SQL"));
assert(!supports("No Python experience, built SQL dashboards.", "Python"));
assert(supports("Used SQL without supervision.", "SQL"));
assert(!supports("Never used SQL.", "SQL"));
assert(!supports("SQL is not a skill I have.", "SQL"));
assert(supports("Used SQL, not Python.", "SQL"));
assert(!supports("Used SQL, not Python.", "Python"));
const projects = recommendProjects(
  prose,
  "Required skills\nA/B testing\nStatistical significance\ndbt\nData warehouse\nPreferred experience\nReact",
);
assert.equal(projects.filter((p) => p.id === "experiment").length, 1);
assert.deepEqual(projects.find((p) => p.id === "experiment").terms, [
  "A/B testing",
  "statistical significance",
]);
assert.equal(projects.filter((p) => p.id === "pipeline").length, 1);
assert(projects.every((p) => p.requirements.length > 0));
assert.equal(new Set(projects.map((p) => p.id)).size, projects.length);
const { readFile } = await import("node:fs/promises");
const { missingGlyphs } = await import("../lib/pdf-font.ts");
const font = await readFile(
  new URL("../public/fonts/NotoSans-Regular.ttf", import.meta.url),
);
const fontBuffer = font.buffer.slice(
  font.byteOffset,
  font.byteOffset + font.byteLength,
);
assert.deepEqual(
  missingGlyphs(fontBuffer, "José Müller — Łódź • Ελληνικά Кириллица"),
  [],
);
assert(
  missingGlyphs(fontBuffer, "你好").length > 0,
  "Unsupported scripts should trigger DOCX fallback",
);
console.log(
  "PASS: paragraph CVs, local negation, grouped projects and PDF glyph coverage",
);

const { parseJob } = await import("../lib/engine.ts");
assert(
  supports("Built machine learning models in Python.", "machine learning"),
);
assert(
  analyse(sampleCV, "Required skills\nMachine learning").skills.includes(
    "machine learning",
  ),
);
for (const text of [
  "I cannot use SQL.",
  "I can’t use SQL.",
  "I couldn't use SQL.",
  "Never used SQL.",
  "SQL is not a skill I have.",
])
  assert(!supports(text, "SQL"), text);
assert(supports("Not only SQL but also Python.", "SQL"));
const wrapped =
  "EXPERIENCE\n• Built Python tools\n• Built SQL dashboards\n  for a bank, saving 2 hours each week.";
assert.equal(
  tailor(wrapped, "SQL"),
  "EXPERIENCE\n• Built SQL dashboards\n  for a bank, saving 2 hours each week.\n• Built Python tools",
);
const ambiguous =
  "EXPERIENCE\n• Built Python tools\n• Built SQL dashboards\nfor a bank, saving 2 hours each week.";
assert.equal(tailor(ambiguous, "SQL"), ambiguous);
for (const conditional of [
  "• Responsible for managing a team if promoted next year.",
  "• Responsible for managing a team\n  if promoted next year.",
])
  assert.equal(tailor(conditional, "leadership"), conditional);
const fake =
  "Alex Morgan\nEXPERIENCE\n• Reduced nothing and saved nothing for 123 clients with no useful measurable outcome.\nEDUCATION\nDegree\nSKILLS\nSQL";
assert.equal(rate(fake, "SQL")[1].score, 0);
const licensedJob =
  "Required skills\nSQL\nMust hold a current medical licence.";
const unresolved = analyse(prose, licensedJob);
assert(unresolved.unassessed.some((r) => r.text.includes("medical licence")));
assert(rate(prose, licensedJob)[0].score < 100);
assert(
  analyse(sampleCV, "Requirements\n10 years of leadership experience")
    .unassessed.length > 0,
);
const parsed = parseJob(sampleJob);
assert.deepEqual(analyse(sampleCV, parsed), analyse(sampleCV, sampleJob));
assert.deepEqual(
  rate(sampleCV, parsed, analyse(sampleCV, parsed)),
  rate(sampleCV, sampleJob),
);
assert.deepEqual(
  recommendProjects(sampleCV, parsed, analyse(sampleCV, parsed)),
  recommendProjects(sampleCV, sampleJob),
);
const completed =
  sampleCV +
  "\nPROJECTS\nBuilt dbt models for a data warehouse and tested the pipeline.";
assert(
  !recommendProjects(completed, sampleJob).some((p) => p.id === "pipeline"),
);
console.log(
  "PASS: machine learning, negation, continuation integrity, conditional rewrites, unresolved requirements and updated projects",
);
