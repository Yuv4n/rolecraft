# Rolecraft

A private hackathon CV studio built with React 19, TypeScript and Vinext on Vite. The server route deploys to Cloudflare Workers through Sites.

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
- /api/job reads public HTTPS HTML with a timeout, response size cap, redirect rejection and public-address checks. Pasting a description is the fallback.
- lib/engine.ts contains the requirement vocabulary, niche suggestions, evidence matching, conservative bullet rewrites and transparent scoring rubric.
- Source and tailored text appear side by side. Rewritten and moved lines are highlighted. The final editor updates both exports and scores.
- DOCX and PDF are generated locally with docx and jsPDF. CV files and text never go to the server and are not persisted. Refreshing clears the workspace.
- All extracted content is rendered as text. Nothing in an uploaded CV or job posting is executed or treated as an instruction. There is no content logging.

## Known limits

This is a working demo with bounded heuristics. The vocabulary focuses on product, analytics, operations, design and frontend roles. It does not perform broad semantic understanding, verify facts, or infer unstated qualifications. Niche recommendations are exploratory. CVs without standard bullet markers receive fewer rewrites. Scores measure term coverage and textual proxies; they are not hiring predictions or actual employer ATS scores. Impact scoring counts numbers and can overvalue non-outcome numbers.

Job extraction reads static HTML. Login walls, redirects, JavaScript-only job boards and bot protection require pasting the description. HTML navigation text may need manual removal. The fetch route has no rate limiter and DNS checking is not a substitute for a production egress proxy with DNS pinning; add both before public, high-volume hosting.

Scanned PDFs need OCR outside this app. Complex layouts may extract out of order. Exports use a plain single-column layout. The PDF uses built-in Helvetica and supports Western text best; some Unicode characters may not render correctly. Review exports before sending. Downloads were exercised in the browser; DOCX text was re-extracted to check preservation.

No database, accounts, history, LLM integration or persistent uploads are included. The hosted Site is owner-private by default.

