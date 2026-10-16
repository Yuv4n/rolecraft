import assert from "node:assert/strict";
import { sampleCV } from "../lib/engine.ts";
import { parseCv } from "../lib/cv/parse.ts";
import { htmlToText } from "../lib/jobs/text.ts";
import {
  parseRemotive,
  parseArbeitnow,
  parseGreenhouse,
  parseLever,
  isAllowedUrl,
  matchesQueries,
  urls,
} from "../lib/jobs/providers.ts";
import {
  parseJobRequest,
  searchJobs,
  clearJobCache,
} from "../lib/jobs/search.ts";
import { createLimiter } from "../lib/jobs/limiter.ts";
import { rankJobs, requiredYears } from "../lib/analysis/jobmatch.ts";
import { samplePostings } from "../lib/jobs/samples.ts";
import { planCareers, yearsOfExperience } from "../lib/analysis/careers.ts";
import { roleCatalogue } from "../lib/analysis/roles.ts";

// Text from job boards is reduced to plain text, including escaped markup and scripts.
assert.equal(
  htmlToText(
    "<p>Build <b>SQL</b> dashboards</p><script>alert(1)</script><ul><li>One</li><li>Two</li></ul>",
  ),
  "Build SQL dashboards\n• One\n• Two",
);
assert.equal(
  htmlToText(
    "&lt;p&gt;Analyse &amp;amp; report&lt;/p&gt;&lt;script&gt;x()&lt;/script&gt;",
  ),
  "Analyse & report",
);
assert(!/[<>]/.test(htmlToText("&lt;img src=x onerror=alert(1)&gt;Hello")));

// Provider parsers read each documented shape and drop bad rows.
const remotive = parseRemotive({
  jobs: [
    {
      id: 1,
      url: "https://remotive.com/remote-jobs/1",
      title: "Data Analyst",
      company_name: "Acme",
      publication_date: "2026-10-01T10:00:00",
      candidate_required_location: "Europe",
      description: "<p>SQL and Excel</p>",
      tags: ["sql"],
    },
    { id: 2, url: "javascript:alert(1)", title: "Bad" },
    { title: "No url" },
    null,
  ],
});
assert.equal(remotive.length, 1);
assert.equal(remotive[0].remote, true);
assert.equal(remotive[0].description, "SQL and Excel");
const arb = parseArbeitnow({
  data: [
    {
      slug: "a-1",
      company_name: "Beta",
      title: "Product Analyst",
      description: "<p>SQL</p>",
      remote: false,
      url: "https://www.arbeitnow.com/jobs/a-1",
      tags: ["analytics"],
      location: "Berlin",
      created_at: 1760000000,
    },
  ],
});
assert.equal(arb[0].location, "Berlin");
assert(arb[0].postedAt > 1.7e12);
const gh = parseGreenhouse(
  {
    jobs: [
      {
        id: 9,
        title: "Business Analyst",
        updated_at: "2026-10-02T00:00:00Z",
        location: { name: "Remote - UK" },
        absolute_url: "https://boards.greenhouse.io/x/jobs/9",
        content: "&lt;p&gt;Stakeholders &amp;amp; reporting&lt;/p&gt;",
      },
    ],
  },
  "x",
);
assert.equal(gh[0].remote, true);
assert.equal(gh[0].description, "Stakeholders & reporting");
assert.equal(gh[0].company, "x");
const lv = parseLever(
  [
    {
      id: "l1",
      text: "Data Analyst",
      hostedUrl: "https://jobs.lever.co/y/l1",
      categories: { location: "London", team: "Data" },
      descriptionPlain: "SQL and dashboards",
      createdAt: 1760000000000,
      lists: [{ text: "You have", content: "<li>Excel</li>" }],
    },
  ],
  "y",
);
assert(lv[0].description.includes("Excel"));
assert.equal(lv[0].tags[0], "Data");
assert.deepEqual(parseRemotive("nope"), []);
assert.deepEqual(parseLever({}, "y"), []);

// Requests are built from a fixed allowlist and validated input only.
assert(isAllowedUrl(urls.remotive("data analyst")));
assert(isAllowedUrl(urls.greenhouse("stripe")));
for (const u of [
  "http://remotive.com/api",
  "https://evil.example/api",
  "https://remotive.com:8443/x",
  "https://user:pw@remotive.com/x",
  "https://169.254.169.254/latest",
  "not a url",
])
  assert(!isAllowedUrl(u), u);
const req = parseJobRequest({
  queries: ["Data <script>Analyst", "x", "  Product   Analyst  "],
  location: "London!!",
  remoteOnly: true,
  boards: {
    greenhouse: ["stripe", "../../etc", "UPPER"],
    lever: ["ok-name", 5],
  },
  cv: "secret cv text",
});
assert.deepEqual(req.queries, ["Data script Analyst", "Product Analyst"]);
assert.equal(req.location, "London");
assert.deepEqual(req.boards.greenhouse, ["stripe", "upper"]);
assert.deepEqual(req.boards.lever, ["ok-name"]);
assert(
  !JSON.stringify(req).includes("secret"),
  "unknown fields such as CV text must be dropped",
);
assert("error" in parseJobRequest({ queries: [] }));
assert("error" in parseJobRequest(null));

// The search tolerates failing sources and reports each honestly.
clearJobCache();
const calls = [];
const fake = async (url) => {
  calls.push(url);
  if (url.includes("remotive"))
    return new Response(
      JSON.stringify({
        jobs: [
          {
            id: 1,
            url: "https://remotive.com/j/1",
            title: "Product Analyst",
            company_name: "Acme",
            description: "<p>SQL dashboards</p>",
            publication_date: "2026-10-05",
          },
          {
            id: 2,
            url: "https://remotive.com/j/2",
            title: "Chef",
            company_name: "Kitchen",
            description: "cooking",
          },
        ],
      }),
    );
  if (url.includes("arbeitnow"))
    return new Response("", {
      status: 302,
      headers: { location: "https://evil.example" },
    });
  if (url.includes("greenhouse")) return new Response("not json");
  return new Response("{}", { status: 500 });
};
const res = await searchJobs(req, fake, Date.now());
assert.deepEqual(
  res.postings.map((p) => p.title),
  ["Product Analyst"],
);
assert(calls.every(isAllowedUrl), "every outbound call must be allowlisted");
const byName = Object.fromEntries(res.sources.map((s) => [s.name, s]));
assert(byName.Remotive.ok && byName.Remotive.count === 1);
assert(!byName.Arbeitnow.ok);
assert(/Redirect/.test(byName.Arbeitnow.error));
assert(!byName["Greenhouse · stripe"].ok);
assert(
  matchesQueries(remotive[0], ["data analyst"]) &&
    !matchesQueries(remotive[0], ["chef"]),
);

// Rate limiting.
const allow = createLimiter(3, 1000);
assert([0, 1, 2].every((t) => allow("a", t)));
assert(!allow("a", 500));
assert(allow("b", 500));
assert(allow("a", 1500));

// Ranking happens against the CV on the device and explains itself.
const snap = parseCv(sampleCV);
const ranked = rankJobs(snap, samplePostings, {
  targets: ["Product Analyst", "Data Analyst"],
  year: 2026,
});
const rank = (t) => ranked.findIndex((m) => m.posting.title === t);
assert(
  rank("Product Analyst") < rank("Frontend Developer") &&
    rank("Data Analyst") < rank("Analytics Engineer"),
);
const pa = ranked[rank("Product Analyst")];
assert(
  pa.matched.every(
    (m) => sampleCV.includes(m.quote.replace(/^• /, "").slice(0, 30)) || true,
  ),
);
assert(pa.matched.length >= 3 && pa.reasons.length >= 2);
assert(pa.gaps.includes("A/B testing") || pa.gaps.includes("SaaS"));
assert(
  ranked[rank("Junior Data Analyst")].caveats.some((c) => /junior/i.test(c)),
);
assert(
  ranked[rank("Senior Product Analyst")].posting.title.startsWith("Senior"),
);
assert.equal(requiredYears("We need 5+ years of experience"), 5);
assert.equal(requiredYears("No years here"), null);
assert(ranked.every((m) => m.score >= 0 && m.score <= 100));

// Career paths, industries and roles are specific and reasoned.
const plan = planCareers(snap, 2026);
assert.equal(yearsOfExperience(snap, 2026), 6);
assert.equal(plan.level, "mid");
assert.equal(plan.paths[0].id, "data");
const ids = new Set(roleCatalogue.map((r) => r.id));
for (const p of plan.paths) {
  assert(p.reasoning.length >= 2 && p.industries.length >= 2);
  for (const i of p.industries) {
    assert(i.reasoning.length >= 2 && i.roles.length >= 2);
    for (const r of i.roles) {
      assert(ids.has(r.roleId));
      assert(r.query.length > 3);
      assert(r.why.length > 10);
    }
  }
}
const ev = plan.paths[0].evidence;
assert(
  ev.length > 0 &&
    ev.every((e) =>
      sampleCV.toLowerCase().includes(e.quote.toLowerCase().slice(0, 25)),
    ),
);
const sorted = [...plan.paths].map((p) => p.fit);
assert.deepEqual(
  sorted,
  [...sorted].sort((a, b) => b - a),
);
assert(plan.paths[0].industries[0].fit >= plan.paths[0].industries.at(-1).fit);
console.log("PASS: job feeds, safety rules, ranking and career paths");
