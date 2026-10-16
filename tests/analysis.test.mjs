import assert from "node:assert/strict";
import { sampleCV, sampleJob } from "../lib/engine.ts";
import { parseCv } from "../lib/cv/parse.ts";
import { renderText } from "../lib/cv/render.ts";
import { applyChange, setPage } from "../lib/cv/ops.ts";
import { reviewCv, groups } from "../lib/analysis/review.ts";
import { tailorCv, tailorText, composeAsk } from "../lib/analysis/tailor.ts";
import { findRoles } from "../lib/analysis/roles.ts";
import {
  planExperience,
  defaultSuggestedTargets,
  targetFromRoleText,
} from "../lib/analysis/plan.ts";

const snap = parseCv(sampleCV);
const review = reviewCv(snap, { roleText: sampleJob, year: 2026 });
const byTitle = (t) => review.findings.find((f) => f.title.includes(t));

// Review finds the issues a reader would and attaches evidence.
assert(
  byTitle("Responsible for")?.change,
  "weak opener should offer a rewrite",
);
assert.match(byTitle("Responsible for").change.after, /^Built SQL dashboards/);
assert(
  review.findings.some((f) => f.dimension === "outcomes" && f.ask),
  "bullets with no outcome should ask for facts",
);
assert(
  review.findings.every((f) => f.evidence.length > 0 || f.scope === "document"),
);
assert(review.top.length > 0 && review.top.length <= 5);

// Rewrites never change figures or add facts.
const digits = (s) => (s.match(/\d+/g) || []).join(",");
const tailored = tailorText(sampleCV, sampleJob);
assert.equal(digits(tailored), digits(sampleCV));
const vocab = new Set(
  sampleCV
    .toLowerCase()
    .match(/[a-z0-9%]+/g)
    .concat(["built", "contributed", "supported", "to"]),
);
for (const w of tailored.toLowerCase().match(/[a-z0-9%]+/g))
  assert(vocab.has(w), "invented word: " + w);

// Asks need a user-supplied answer and are marked as such.
const outcome = review.findings.find(
  (f) => f.dimension === "outcomes" && f.ask,
);
assert.equal(composeAsk(snap, outcome.ask, "   "), null);
const composed = composeAsk(
  snap,
  outcome.ask,
  "cutting review time from 4 hours to 1",
);
assert(composed.userSupplied);
assert.match(composed.after, /cutting review time from 4 hours to 1/);
const gap = review.findings.find((f) => f.ask?.mode === "newBullet");
const add = composeAsk(
  snap,
  gap.ask,
  "Modelled 12 tables in dbt for the growth team.",
);
assert.equal(add.kind, "add");
assert(
  renderText(applyChange(snap, add)).includes("Modelled 12 tables in dbt"),
);

// Scores explain themselves and only use defined groups.
assert.equal(
  groups.reduce((n, g) => n + g.weight, 0),
  100,
);
for (const s of review.scores) {
  assert(s.criteria.length > 20);
  if (s.score !== null) {
    assert(s.score >= 0 && s.score <= 100);
    if (s.id !== "relevance")
      assert.equal(
        100 - s.deductions.reduce((n, d) => n + d.points, 0),
        s.score,
      );
  }
}
const noRole = reviewCv(snap, { year: 2026 });
assert.equal(noRole.scores.find((s) => s.id === "relevance").score, null);
assert(noRole.overall !== null);

// Credibility, order, formatting and ATS checks.
const risky = parseCv(
  `Sam Lee\nsam@example.com\n\nSUMMARY\nExpert analyst with 12 years of experience.\n\nEDUCATION\nBSc Maths | Leeds | 2018\n\nEXPERIENCE\nAnalyst | Acme | 2019 - present\n- built reports for various teams\n* Helped with data stuff\n`,
);
const r2 = reviewCv(risky, { year: 2026 });
const titles = r2.findings.map((f) => f.title).join("\n");
assert.match(titles, /Claims 12 years/);
assert.match(titles, /Unsupported claim: “Expert”/);
assert.match(titles, /Education comes before|Section order/);
assert.match(titles, /Mixed bullet styles/);
assert.match(titles, /Vague wording/);
const order = r2.findings.find((f) => f.dimension === "sectionOrder");
assert.deepEqual(applyChange(risky, order.change) && true, true);
const twoCol = reviewCv(setPage(risky, { columns: 2 }), { year: 2026 });
const colFix = twoCol.findings.find((f) => f.title === "Two-column layout");
assert.equal(
  applyChange(setPage(risky, { columns: 2 }), colFix.change).layout.page
    .columns,
  1,
);

// Relevance and tailoring.
const t = tailorCv(snap, sampleJob, 2026);
assert(t.requirements.some((r) => r.status === "evidenced"));
assert(t.requirements.some((r) => r.status === "missing"));
assert(t.missing.every((f) => f.ask && f.ask.mode === "newBullet"));
assert(t.relevant[0].terms.length >= t.relevant.at(-1).terms.length);

// Role fit separates ready from stretch with specific gaps.
const fits = findRoles(snap);
const ready = fits.filter((f) => f.readiness === "ready"),
  stretch = fits.filter((f) => f.readiness === "stretch");
assert(ready.some((f) => f.def.id === "data-analyst"));
const ae = fits.find((f) => f.def.id === "analytics-engineer");
assert.equal(ae.readiness, "stretch");
assert(ae.gaps.some((g) => g.term === "dbt" && g.importance === "core"));
assert(ae.evidence.every((e) => e.quote.length > 0));
assert(stretch.length > 0);

// Plan prioritises by demand and never writes unverified facts.
const plan = planExperience(snap, [
  targetFromRoleText("r1", "Orbit", sampleJob),
  ...defaultSuggestedTargets(snap, 2),
]);
assert(plan.length > 0);
for (let i = 1; i < plan.length; i++)
  assert(
    ["High", "Medium", "Low"].indexOf(plan[i - 1].impact) <=
      ["High", "Medium", "Low"].indexOf(plan[i].impact),
  );
assert(
  plan.every(
    (p) => p.template.includes("[") && p.steps.length > 0 && p.evidence,
  ),
);
assert(plan.find((p) => p.term === "dbt"));
console.log("PASS: review, grounding, role fit and plan assertions");
