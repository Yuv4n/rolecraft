# Rolecraft

A CV studio that runs entirely in the browser. Load a CV, then explore careers, tailor it to a role, find gaps, or get a scored review. Every suggestion points back to a line you wrote, and the tool asks you for facts instead of inventing them.

[Live demo](https://rolecraft.yuv4n-apps.workers.dev/) (click "Try a sample", no sign-in needed)

![Review workflow: a scored CV review with six weighted groups](docs/review.png)

## What it does

After loading a CV (PDF, DOCX or pasted text) you pick a starting point. All five share one workspace, so accepted edits and saved roles carry across them.

- Explore careers and find jobs. Career paths ranked by fit, then industries and specific roles, each with reasoning tied to quoted CV lines.
- Tailor to a specific role. Paste a job description and get requirement-by-requirement evidence, questions where evidence is missing, and proposed edits shown as a word-level before and after that you accept or reject one by one.
- Find roles that fit. Role profiles split into ready, stretch and low overlap, with the specific gaps.
- Plan experience. Projects and responsibilities ranked by how much demand they would cover across your chosen roles.
- Review and improve. Fifteen checks (relevance, action verbs, specificity, outcomes, tense, ATS readability and others) feed six weighted score groups. Every deduction is shown.

Exports (PDF, DOCX, plain text) are generated in the browser from the same render model as the live preview, so what you see is what you download. Versions are immutable snapshots, so you can branch per role and restore any earlier state.

![Career paths with evidence quoted from the CV](docs/careers.png)

## Design choices

- No AI service. Matching is deterministic: a fixed vocabulary, negation-aware term matching and conservative text rewrites. This makes results repeatable and explainable, and it means the hosted demo cannot incur API costs. The limits are real and documented: it recognises a bounded set of roles and skills and does not understand text semantically.
- Nothing leaves the browser. There are no accounts, no database and no logging of CV contents. Refreshing clears the workspace unless you save a workspace file yourself.
- Content and layout are separate. The CV is a flat map of nodes with stable ids; layout holds ordering, styles and page setup. Editing text never rewrites layout and the reverse (`lib/cv/types.ts`, asserted in `tests/model.test.mjs`).
- Honest scores. Scores are revision guidance, not predictions of hiring success or of any employer's ATS. Claims that are negated or aspirational ("learning SQL") do not count as evidence. Requirements the tool cannot assess, such as degrees or licences, are flagged for you instead of scored.
- Untrusted input. DOCX extraction is bounded (2 MB of expanded XML, no DTDs or entities, 30,000 characters) and PDFs are limited to 20 pages. Uploaded text is always rendered as text. See [SECURITY.md](SECURITY.md).

## Stack

React 19, TypeScript, Next.js app router running on Vite via vinext, deployed to Cloudflare Workers. PDF.js for reading PDFs, jsPDF and docx for exports. Eight test suites run as plain Node scripts using `assert`, with no test framework. GitHub Actions runs typecheck, tests, lint, formatting, a dependency audit and the production build on every push and pull request.

## Run locally

Node.js 24 or later.

```sh
npm ci
npm run dev
```

Open http://localhost:5173 and click "Try a sample".

```sh
npm run check     # typecheck, tests, lint, formatting
npm run build     # production build
npm run benchmark # timing on near-limit CV and job text
```

No environment variables are needed.

## Hosting and cost

The demo is a Cloudflare Worker with no bindings, no secrets and no variables, and Workers Logs is switched off in `vite.config.ts`. It makes no outbound requests: the live job-feed route (`/api/jobs`) answers 410 unless `JOB_FEEDS_ENABLED=true` is set, and the URL-fetch route (`/api/job`) is permanently disabled. Deployment needs a Cloudflare login (`npm run build && npm run deploy:cloudflare`). The optional workflow `.github/workflows/deploy.yml` stays inactive unless a token and `CLOUDFLARE_DEPLOY_ENABLED` are configured in the repository.

## Known limits

- Scanned PDFs need OCR elsewhere, and complex layouts can extract out of order. Imports start from a clean single-column layout.
- The vocabulary covers product, analytics, operations, design and common software roles. Niche recommendations are exploratory.
- Live job postings were written against each provider's documented JSON feed and tested with fixtures, not against the live services, and are off in the demo. Sample postings show the feature.
- The interface aims for AA contrast, visible focus and 44px targets, but it has not been audited with assistive technology.

More detail is in [docs/design-notes.md](docs/design-notes.md).

## How it was built


## Licence

MIT, see [LICENSE](LICENSE). The bundled Noto Sans font is under the SIL Open Font License (`public/fonts/OFL.txt`).
