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
npm test
npm run build
```

`npm test` runs three suites: the original engine rubric (`tests/engine.test.mjs`), the data model, versions and variants (`tests/model.test.mjs`), and review, grounding, role fit and plan (`tests/analysis.test.mjs`).

## Four starting points

After loading a CV the user chooses a goal. All four share one workspace, so accepted changes, saved roles and variants carry across them.

- Tailor my CV to a specific role: saved roles, requirement-by-requirement evidence, missing-evidence questions and proposed edits.
- Find roles that fit my CV: 12 role profiles split into ready, stretch and low overlap, with evidence quotes and specific gaps.
- Plan experience to strengthen my CV: projects, responsibilities and work experience ranked by weighted demand across chosen roles. CV lines stay locked until every [bracket] is replaced with a real fact.
- Review and improve my CV: 15 checks (relevance, action verbs, specificity, outcomes, ownership, repetition, credibility, grammar, tense, section order, bullet order, density, readability, formatting consistency, ATS), six scored groups with deductions shown, and section, line and check views.

Every proposed edit shows a word-level before and after, can be previewed in the CV panel, and is accepted or rejected individually. Edits that need a fact ask for it and use only the user's answer.

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

This is a working demo with bounded heuristics. The vocabulary focuses on product, analytics, operations, design and frontend roles. It does not perform broad semantic understanding, verify facts, or infer unstated qualifications. Niche recommendations are exploratory. CVs without standard bullet markers receive fewer rewrites. Scores measure term coverage and textual proxies; they are not hiring predictions or actual employer ATS scores. Impact scoring counts numbers and can overvalue non-outcome numbers.

Job extraction reads static HTML. Login walls, redirects, JavaScript-only job boards and bot protection require pasting the description. HTML navigation text may need manual removal. The fetch route has no rate limiter and DNS checking is not a substitute for a production egress proxy with DNS pinning; add both before public, high-volume hosting.

Scanned PDFs need OCR outside this app. Complex layouts may extract out of order. Exports use a plain single-column layout. The PDF uses built-in Helvetica and supports Western text best; some Unicode characters may not render correctly. Review exports before sending. Downloads were exercised in the browser; DOCX text was re-extracted to check preservation.

No database, accounts, LLM integration or server-side storage are included. Version history lives in the browser tab and in saved workspace files. The hosted Site is owner-private by default.

## Working across Claude sessions

Clone the GitHub repository in each environment and ask Claude to read `CLAUDE.md` first. Give each task its own branch. For sessions on the same machine, use separate clones or `git worktree add ../rolecraft-task -b task-name` so concurrent edits do not share a working directory. Commit and push completed work; fetch and merge through pull requests before starting dependent tasks. Git stores source and handoff notes, not chat history.
