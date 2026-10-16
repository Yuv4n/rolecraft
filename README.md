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
node --experimental-strip-types tests/engine.test.mjs
npm run build
```

## Flow and architecture

- PDF.js extracts text-based PDFs in the browser; Mammoth extracts DOCX text. Maximum upload size is 8 MB, with a 20-page PDF limit. Users can correct or paste text.
- The public demo accepts pasted job descriptions. `/api/job` returns HTTP 410 without making outbound requests.
- lib/engine.ts contains the requirement vocabulary, niche suggestions, evidence matching, conservative bullet rewrites and transparent scoring rubric.
- Source and tailored text appear side by side. Rewritten and moved lines are highlighted. The final editor updates both exports and scores.
- DOCX and PDF are generated locally with docx and jsPDF. CV files and text never go to the server and are not persisted. Refreshing clears the workspace.
- All extracted content is rendered as text. Nothing in an uploaded CV or job posting is executed or treated as an instruction. There is no content logging.

## Known limits

This is a working demo with bounded heuristics. The vocabulary focuses on product, analytics, operations, design and frontend roles. It does not perform broad semantic understanding, verify facts, or infer unstated qualifications. Niche recommendations are exploratory. CVs without standard bullet markers receive fewer rewrites. Scores measure term coverage and textual proxies; they are not hiring predictions or actual employer ATS scores. Impact scoring counts numbers and can overvalue non-outcome numbers.

Job URL fetching is disabled for the public demo. Add production egress controls and rate limiting before restoring it.

Scanned PDFs need OCR outside this app. Complex layouts may extract out of order. Exports use a plain single-column layout. The PDF uses built-in Helvetica and supports Western text best; some Unicode characters may not render correctly. Review exports before sending. Downloads were exercised in the browser; DOCX text was re-extracted to check preservation.

No database, accounts, history, LLM integration or persistent uploads are included. The hosted Site is owner-private by default.


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
