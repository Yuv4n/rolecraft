# Rolecraft

[Open the live demo](https://rolecraft.yuv4n-apps.workers.dev/)

A hackathon CV studio built with React 19, TypeScript and Vinext on Vite. The server route deploys to Cloudflare Workers through Sites.

## Run locally

Use Node.js 24 or later. `.node-version` pins the CI major version.

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite, usually http://127.0.0.1:5173. Click Try a sample to populate the CV and job description, then continue through the four steps. The sample also works without any external job website.

## Environment variables

None required. No AI provider keys are used. The demo uses deterministic matching and conservative text transformations, rather than a language model. If you extend it with an AI service, keep its API key in a server-only environment variable and never prefix it with NEXT_PUBLIC_ or VITE_.

## Checks

```sh
npm run check
npm run build:cloudflare
npm run benchmark
```

## Flow and architecture

- PDF.js extracts text-based PDFs in the browser; Bounded ZIP/XML extraction reads DOCX paragraphs, including Word list markers, headers and footers. Maximum upload size is 8 MB, with a 20-page PDF limit. Users can correct or paste text.
- The public demo accepts pasted job descriptions. `/api/job` returns HTTP 410 without making outbound requests.
- lib/engine.ts contains the requirement vocabulary, niche suggestions, evidence matching, conservative bullet rewrites and transparent scoring rubric.
- Source and tailored text appear side by side. Rewritten and moved lines are highlighted. The final editor updates both exports and scores.
- DOCX and PDF are generated locally with docx and jsPDF. CV files and text never go to the server. By default, refreshing clears the workspace. Users can opt in to a local draft, stored only in this browser, and remove it from the interface.
- All extracted content is rendered as text. Nothing in an uploaded CV or job posting is executed or treated as an instruction. There is no content logging.

## Known limits

This is a working demo with bounded heuristics. The vocabulary includes product, analytics, operations, design and common software roles, with a small alias dictionary. It does not perform broad semantic understanding, verify facts, or infer unstated qualifications. Niche recommendations are exploratory. Indented and numbered bullets are recognised. Rewrites apply only to known grammatical forms; other wording is preserved. Scores measure term coverage and textual proxies; they are not hiring predictions or actual employer ATS scores. Scores require at least 12 words, 60 letters and one statement of six words. Paragraphs and bullets are both accepted. Impact scoring requires both a number and an outcome verb; it still cannot verify the outcome. Negated and aspirational claims are excluded conservatively, which can miss valid evidence in complex sentences.

Job URL fetching is disabled for the public demo. Add production egress controls and rate limiting before restoring it.

Scanned PDFs need OCR outside this app. Complex layouts may extract out of order. Exports use a plain single-column layout. PDF exports embed the openly licensed Noto Sans font. The exporter checks character coverage and directs users to DOCX if the text includes unsupported characters. Review exports before sending. Downloads were exercised in the browser; DOCX text was re-extracted to check preservation.

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

Required and uncategorised terms receive twice the relevance weight of preferred
terms. Short requirement lines are retained, and section headings determine the
category rather than words within a requirement. The full gap list appears in
Rating & priorities; related project suggestions are grouped and limited to five so users can choose
one manageable next step. Each project cites the target requirements it addresses. Analysis is memoized and generation has no artificial
waiting period. Draft storage is opt-in and local to the device.


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
