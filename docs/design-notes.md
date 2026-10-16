# Rolecraft design notes

Detailed behaviour, limits and design decisions. For an overview see the [README](../README.md).

## Checks

```sh
npm run check
npm run build:cloudflare
npm run benchmark
```

The test script also runs the data model, review, job feed and export suites (`tests/model.test.mjs`, `tests/analysis.test.mjs`, `tests/jobs.test.mjs`, `tests/export.test.mjs`).

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

Scanned PDFs need OCR outside this app. Complex layouts may extract out of order. Exports use a plain single-column layout. PDF exports embed the openly licensed Noto Sans font. The exporter checks character coverage and directs users to DOCX if the text includes unsupported characters. Review exports before sending. Downloads were exercised in the browser; DOCX text was re-extracted to check preservation.

No server database, accounts, LLM integration or persistent uploads are included. The hosted demo is a static-style Cloudflare Worker with no bindings, secrets or AI calls.

## Scoring and matching limits

Review scores start at 100 per group and lose points for the findings listed under it, with at most 40 points lost per check. Relevance is the share of a role's recognised terms that the CV supports. Skill mentions that are negated or aspirational ("no SQL experience", "learning SQL") do not count as evidence anywhere, including role fit, career paths and posting ranking. The studio keeps work in the browser tab and saves nothing to the device unless the user downloads a workspace file. `lib/draft.ts` (opt-in device drafts) is retained and tested, but the studio does not use it yet.

## Verification scope

Regression tests cover short and paragraph-based CVs, empty-content scores,
negation and affirmative clauses, grouped projects and PDF font coverage.
Automated checks do not establish recruiter accuracy or accessibility compliance.
Niche suggestions use predefined categories rather than live labour-market data.

## Repository checks and performance

`npm run check` runs TypeScript, regression tests, ESLint and formatting checks.
`npm run format` formats the application page, styles and analysis modules.
Generated TypeScript build metadata and vendored browser assets are excluded from
source linting. CI cancels superseded checks and uses the same Node major version
as local development.

The job model is parsed once per description. CV line matches are reused across
requirements, ratings and niche suggestions. The final editor updates its own
evidence analysis and project recommendations. `npm run benchmark` exercises
near-limit CV and job text locally; timings vary by hardware.

Indented continuation lines move with their bullet. Ambiguous unindented
continuations keep the source run in order. Conditional achievements retain their
wording. Requirements involving licences, degrees or experience length are flagged
for manual assessment and receive no automatic relevance credit. Scores with
unassessed requirements are provisional. The engine cannot verify eligibility or
truthfulness, and the vocabulary remains limited.

DOCX extraction ignores deleted tracked-change text and rejects XML declarations.
Expanded selected document parts are capped at 2 MB, and extracted text is capped
at 30,000 characters. Scanned documents still require pasted text or external OCR.
