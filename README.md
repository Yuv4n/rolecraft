# Rolecraft

A CV studio that runs entirely in the browser. Load a CV, then explore careers, tailor it to a role, find gaps, or get an explainable score. There is no AI service, no account and no server-side storage, and every suggestion points back to a line you wrote.

![Review workflow: a scored CV review with six weighted groups](docs/review.png)

## Features

- **Explore careers:** career paths, industries and specific roles ranked by fit, each justified with quoted CV lines.
- **Tailor to a role:** paste a job description for requirement-by-requirement evidence and proposed edits. Edits show a word-level before and after, and missing facts become questions rather than invented claims.
- **Find roles and plan experience:** roles grouped as ready, stretch or low overlap with the specific gaps, and projects ranked by how much demand they cover.
- **Review:** 15 checks feed six weighted score groups, and every deduction is shown.
- **Export:** PDF, DOCX and text come from the same render model as the live preview. Versions are immutable snapshots, so you can branch a variant per role.

## Engineering notes

- **Deterministic and explainable:** matching uses a fixed vocabulary and negation-aware term matching, so results are repeatable. "Learning SQL" does not count as SQL experience. Scores are revision guidance, not hiring predictions.
- **Private by design:** parsing, scoring and export all run in the browser. Nothing is logged or stored unless you save a workspace file.
- **Content and layout are separate:** the CV is a flat map of nodes with stable ids, and layout holds order and styles. Editing one never rewrites the other (`lib/cv/types.ts`, tested in `tests/model.test.mjs`).
- **Untrusted input:** DOCX extraction is bounded (2 MB expanded, no DTDs, 30,000 characters), PDFs are capped at 20 pages, and uploaded text is only ever rendered as text. See [SECURITY.md](SECURITY.md).
- **CI:** typecheck, eight test suites, lint, formatting, dependency audit and a production build run on every push.

![Career paths with evidence quoted from the CV](docs/careers.png)

## Stack

React 19, TypeScript, Next.js app router on Vite (vinext), Cloudflare Workers config, PDF.js, jsPDF and docx.

## Run locally

Node.js 24 or later.

```sh
npm ci
npm run dev       # http://localhost:5173, then click "Try a sample"
npm run check     # typecheck, tests, lint, formatting
```

No environment variables are needed, and there is no hosted demo. The Worker config has no bindings, secrets or logging, and the app makes no outbound requests, so deploying it would cost nothing to run.

## Known limits

Scanned PDFs need OCR elsewhere. The vocabulary covers product, analytics, operations, design and common software roles, so niche suggestions are exploratory. Live job feeds are written against documented provider formats but are untested live and switched off. Details are in [docs/design-notes.md](docs/design-notes.md).

## Hackathon

Rolecraft began as a hackathon project. The [pitch deck](docs/hackathon/rolecraft-pitch-deck.pdf) shows an earlier variant with live AI analysis, which is archived at the tag `archive/hackathon-live-analysis` and not part of `main`.

## Licence

MIT, see [LICENSE](LICENSE). The bundled Noto Sans font is under the SIL Open Font License.
