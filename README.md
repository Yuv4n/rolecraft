# Rolecraft

A hackathon CV studio built with React 19, TypeScript and Vinext on Vite. The server route deploys to Cloudflare Workers through Sites.

## Run locally

Use Node.js 22.13 or later (Node 24 recommended).

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite, usually http://127.0.0.1:5173. Click **Try a sample** to populate the CV and job description, then continue through the four steps. The sample also works without any external job website.

## Environment variables

None required. No AI provider keys are used. The demo uses deterministic matching and conservative text transformations, rather than a language model. If you extend it with an AI service, keep its API key in a server-only environment variable and never prefix it with NEXT_PUBLIC_ or VITE_.

## Checks

```sh
npx tsc --noEmit
npm test
node --experimental-strip-types tests/public-demo.test.mjs
npm run build
npm run check   # type check, all suites and the public-demo test
```

`npm test` runs six suites: the engine rubric and the deploy-branch regression tests (`tests/engine.test.mjs`), the data model, versions and variants (`tests/model.test.mjs`), review, grounding, role fit and plan (`tests/analysis.test.mjs`), job feeds, safety rules, ranking and career paths (`tests/jobs.test.mjs`), PDF and DOCX export (`tests/export.test.mjs`). `tests/public-demo.test.mjs` checks that URL fetching stays off.

## Five starting points

After loading a CV the user chooses a goal. All five share one workspace, so accepted changes, saved roles and variants carry across them.

- Explore careers and find jobs: career paths ranked by fit, each with reasoning tied to CV lines, then industries and specific roles inside them (for example Product Analyst in SaaS, Financial Analyst in fintech), then live postings from open job feeds ranked against the CV. Roles the user ticks become search keywords. Each posting shows why it fits, what is missing, and seniority or years-of-experience mismatches, and can be sent straight to the Tailor workflow.
- Tailor my CV to a specific role: saved roles, requirement-by-requirement evidence, missing-evidence questions and proposed edits.
- Find roles that fit my CV: 18 role profiles split into ready, stretch and low overlap, with evidence quotes and specific gaps.
- Plan experience to strengthen my CV: projects, responsibilities and work experience ranked by weighted demand across chosen roles. CV lines stay locked until every [bracket] is replaced with a real fact.
- Review and improve my CV: 15 checks (relevance, action verbs, specificity, outcomes, ownership, repetition, credibility, grammar, tense, section order, bullet order, density, readability, formatting consistency, ATS), six scored groups with deductions shown, and section, line and check views.

Every proposed edit shows a word-level before and after, can be previewed in the CV panel, and is accepted or rejected individually. Edits that need a fact ask for it and use only the user's answer.

## Job postings

`/api/jobs` reads open job feeds and never accepts CV text or arbitrary URLs.

- Sources: Remotive and Arbeitnow, plus optional company boards on Greenhouse and Lever that the user names. These are documented public JSON feeds. Rolecraft does not scrape job-board HTML, which most boards forbid and block. Each posting shows its source, links to the original, and is not stored.
- Request: only role keywords (6 at most, 60 characters each), a place, a remote flag and board names that match `^[a-z0-9][a-z0-9_-]{0,49}$`. Every outbound URL is built from a fixed host allowlist (`lib/jobs/providers.ts`). Redirects are not followed, responses are capped at 4 MB, calls time out at 8 seconds and results are cached for 10 minutes.
- Errors: each source reports found, or unavailable with a short fixed reason. Raw error text is never shown.
- Ranking: runs in the browser (`lib/analysis/jobmatch.ts`). The CV is never sent. Job text is rendered as plain text.
- Switch: live feeds are off unless the server variable `JOB_FEEDS_ENABLED` is `true`. Otherwise `/api/jobs` returns 410 and makes no outbound request, which keeps the public demo's no-outbound rule. The Careers workflow then offers the sample postings.
- Rate limit: 20 searches per client per 10 minutes, held in memory. Each worker instance counts separately, so add a Cloudflare rate-limiting rule before public hosting.
- Sample postings (fictional, no links) let the feature be demonstrated offline.
- The feed formats were written from each provider's documentation and tested against fixtures. They were not exercised live from the development sandbox, which has no outbound network access, so check each source once on the deployed site.
- Coverage: the open feeds lean towards remote and technology roles. Other boards would need their own licensed API.

## Data model

`lib/cv/types.ts` separates meaning from appearance and links them with stable node ids.

- Content: a flat map of nodes (section, name, headline, contact, entry, bullet, paragraph, skills) with parent ids and text or parts. Content holds no order.
- Layout: sibling order for every parent (section order, bullet order), role styles (font, size, bold, italic, colour, alignment, spacing, line height, indent, capitals, bullet glyph, separator), per-node overrides (page break, column break, hidden, style), and page setup (size, margins, columns, gap).
- Snapshot: one content plus one layout. Editing text never replaces the layout object, and layout edits never replace content. `tests/model.test.mjs` asserts both.
- Versions are immutable snapshots with a parent id. The import is stored once and never rewritten. A variant (for example one per role) has a head version, an uncommitted working copy and staged accept or reject decisions. Saving commits the working copy and accepted changes as one new version. Restoring and branching create new versions, so history is never lost.
- `lib/cv/render.ts` resolves styles into render blocks. The live preview, PDF, DOCX and plain text all read the same blocks, so previews and exports agree. The exact PDF preview shows true pagination.
- A workspace can be saved to and opened from a JSON file the user controls.

Import limits: structure is parsed from extracted text, so fonts, columns and spacing in the uploaded file are not read. Imports start from a clean single-column layout that the Layout tab can change.

## Known limits

This is a working demo with bounded heuristics. The vocabulary includes product, analytics, operations, design and common software roles, with a small alias dictionary. It does not perform broad semantic understanding, verify facts, or infer unstated qualifications. Niche recommendations are exploratory. Indented and numbered bullets are recognised. Rewrites apply only to known grammatical forms; other wording is preserved. Scores measure term coverage and textual proxies; they are not hiring predictions or actual employer ATS scores. Scores require at least 12 words, 60 letters and one statement of six words. Paragraphs and bullets are both accepted. Impact scoring requires both a number and an outcome verb; it still cannot verify the outcome. Negated and aspirational claims are excluded conservatively, which can miss valid evidence in complex sentences.

Job URL fetching is disabled for the public demo. Add production egress controls and rate limiting before restoring it. Live job feeds (`/api/jobs`) are also off by default and answer HTTP 410 without any outbound request until `JOB_FEEDS_ENABLED` is set to `true`.

Scanned PDFs need OCR outside this app. Complex layouts may extract out of order. Exports use the layout stored with the CV, which starts as a single column and can be changed in the Layout tab. PDF exports embed the openly licensed Noto Sans font. The exporter checks character coverage and directs users to DOCX if the text includes unsupported characters. Review exports before sending. Downloads were exercised in the browser; DOCX text was re-extracted to check preservation.

No server database, accounts, LLM integration or persistent uploads are included. The standalone Cloudflare app is public. The separate Sites deployment remains owner-private by default.

## Working across Claude sessions

Clone the GitHub repository in each environment and ask Claude to read `CLAUDE.md` first. Give each task its own branch. For sessions on the same machine, use separate clones or `git worktree add ../rolecraft-task -b task-name` so concurrent edits do not share a working directory. Commit and push completed work; fetch and merge through pull requests before starting dependent tasks. Git stores source and handoff notes, not chat history.


## Public Cloudflare Workers deployment

The standalone deployment uses `worker.ts` and does not use Sites authentication
or connector bindings. The existing `.openai/hosting.json` remains unchanged for
Sites deployments. No application secrets or database bindings are required.

Use Node 24 and run:

```sh
npm ci
npm run check
npm run build:cloudflare
npx wrangler login
npm run deploy:cloudflare
```

The generated Worker config is `dist/server/wrangler.json`. Deploy only after a
successful standalone build. Wrangler prints the public `workers.dev` URL.
Anyone with that link can use the demo without signing in. CV contents remain in
the browser. Check the flow with the sample, then a real PDF and DOCX, and verify
both exports on desktop and mobile.

For automatic deployments, connect this repository under Cloudflare Workers
Builds. Select `main`, use `npm run build:cloudflare` as the build command, and
`npm run deploy:cloudflare` as the deploy command. The Worker name is `rolecraft`;
use the same name in the dashboard. Configure the build environment to use Node
24. Add a custom domain from the Worker settings if wanted. Cloudflare account
authorization is required to deploy; GitHub access alone does not grant it.

`.github/workflows/check.yml` runs type checks, engine and endpoint tests, and the
standalone build on pull requests and pushes to main. Enable branch protection
with this check required before merging if deployments should wait for checks.


## Scoring and matching limits

Review scores start at 100 per group and lose points for the findings listed under it, with at most 40 points lost per check. Relevance is the share of a role's recognised terms that the CV supports, and required or uncategorised terms count twice as much as preferred terms. Skill mentions that are negated or aspirational ("no SQL experience", "learning SQL") do not count as evidence anywhere, including role fit, career paths and posting ranking. Nothing is saved to the device unless the user downloads a workspace file.

## Optional GitHub automatic deployment

`.github/workflows/deploy.yml` deploys the exact main-branch commit that passed
Verify Rolecraft. It never deploys pull-request code. It is disabled until the
following repository settings exist:

- Secret `CLOUDFLARE_API_TOKEN`: a Cloudflare API token scoped to the deployment
  account with Workers Scripts Edit and Account Settings Read. Do not paste this
  token into chat or commit it to source control.
- Variable `CLOUDFLARE_ACCOUNT_ID`: the account ID used for Rolecraft.
- Variable `CLOUDFLARE_DEPLOY_ENABLED`: `true`, after the secret is configured.

Create the token in Cloudflare and enter it directly in GitHub Settings →
Secrets and variables → Actions. The interactive Wrangler OAuth credential is
not copied to GitHub. Keep the account on Workers Free. This workflow does not
create subscriptions or enable paid storage services. If Workers Builds is used
instead, leave the GitHub deployment switch disabled to avoid duplicate deploys.

## Verification scope

Regression tests cover short and paragraph-based CVs, empty-content scores,
negation and affirmative clauses, grouped projects and PDF font coverage.
Automated checks do not establish recruiter accuracy or accessibility compliance.
Niche suggestions use predefined categories rather than live labour-market data.
