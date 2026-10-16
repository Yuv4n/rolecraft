# Rolecraft

A private hackathon tool that helps someone decide where to focus their career effort. The user gives a CV, optional projects and interests, the hours they can spare each week and the date they want to start applying. Rolecraft returns three directions with quoted evidence and stated gaps, a plan sized to their hours, a CV tailored to the chosen direction, and one outreach email grounded in their own work and a text the company published.

Built with React 19, TypeScript and Vinext on Vite. The server routes deploy to Cloudflare Workers through Sites.

## Run locally

Use Node.js 22.13 or later (Node 24 recommended).

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite, usually http://127.0.0.1:5173. Click Try a sample (a product analyst) or Try a non-tech sample (a nurse moving toward clinical informatics), then continue through the five steps. Moving the hours slider on the plan screen changes what fits and what is deferred. No API key is needed for this: without one the app uses its offline engine.

## Environment variables

All optional. With none set, the app runs entirely in the browser using the offline engine.

- ANTHROPIC_API_KEY enables live analysis through the Anthropic API. It is read only on the server and must never be given a NEXT_PUBLIC_ or VITE_ prefix.
- ANTHROPIC_MODEL sets the model for every agent. The default is claude-opus-5-5.
- FOCUS_MODEL_<AGENT> overrides one agent, for example FOCUS_MODEL_EVIDENCE_READER, FOCUS_MODEL_DIRECTION_MAPPER, FOCUS_MODEL_GAP_PLANNER, FOCUS_MODEL_CV_TAILOR or FOCUS_MODEL_OUTREACH_WRITER. This is how to run the light agents on a cheaper model.

For local development, put these in a `.dev.vars` file in the project root. It is ignored by Git. For a hosted site, set the key as a secret in the hosting project. Never put it in `.openai/hosting.json` or any committed file.

## Checks

```sh
npx tsc --noEmit
node --experimental-strip-types tests/engine.test.mjs
node --experimental-strip-types tests/focus.test.mjs
npm run build
```

## Flow and architecture

1. Experience. PDF.js extracts text-based PDFs in the browser and Mammoth extracts DOCX text. The maximum upload is 8 MB and 20 PDF pages. The user can correct the text, add projects and interests, and set hours per week and an apply-by date.
2. Directions. Three cards: a best fit, an adjacent field and a stretch. Each shows quotes from the user's own text, the requirements of that role family with an evidence label (strong, partial or none), what carries over for adjacent and stretch directions, and job titles to search for. There are no percentage scores.
3. Plan. Tasks are sized to hours per week times weeks until the apply-by date. A share of the budget is held back for the tailored CV and outreach. Tasks are taken in priority order and anything that does not fit is listed under After you apply with the reason. The fitting is plain arithmetic in `lib/focus/plan.ts`, not model output, so the plan updates instantly when the hours change.
4. Tailored CV. Original and tailored text side by side with changed lines highlighted, a short explanation per rewrite, questions about missing details, an editable final text, a four-criterion revision score and DOCX and PDF export. The user can optionally add a job posting URL or description to rate against.
5. Next action. The task for this week and a short email. The user names a company and pastes a text it published. The draft quotes one line of the user's work and one line of that text, and asks a small question. It does not ask for a job.

### Live pipeline

When `ANTHROPIC_API_KEY` is set, `/api/focus` runs an orchestrator with five specialist agents, each with one role, one output schema and one validator (`lib/focus/orchestrator.ts`).

- The evidence reader extracts the lines that show what the user has done.
- The direction mapper maps that evidence onto a curated list of about 30 role families (`lib/focus/roles.ts`) and states the gaps.
- The gap planner proposes tasks with hour estimates. It runs in parallel with the CV tailor.
- The CV tailor proposes wording changes, emphasis and questions. It may not add facts.
- The outreach writer drafts the email and lists every claim with its source.

The orchestrator is ordinary code that decides order and parallelism. The agents are model calls made with the Anthropic SDK using structured outputs. The route requests server-side fallback so that a request declined by a safety classifier is retried by the API.

### Grounding

Quotes are checked in code, not trusted (`lib/focus/grounding.ts`). Every quote a model returns must appear verbatim, after whitespace and bullet normalisation, in the user's own text. A rewritten CV line may not add a number or a name that is not in the original and may not drop a number. An email may not contain a number or a name that is not in the CV, projects or the pasted company text. A claim that fails is removed, and a strength rating that cannot show a verified quote falls back to none. A rejected answer is retried once with the reasons. If nothing verifiable remains the step fails with a message instead of showing unverified text. The How this was produced panel shows each agent, its model, how many items it kept and how many were removed.

The role list, the plan arithmetic and the job titles shown come from code, not from the model. Requests from the browser are re-validated on the server and the direction is rebuilt from the curated list.

### Offline engine

Without a key, or if the user declines to send text, `lib/focus/offline.ts` produces the same outputs by keyword matching against the same role list. It runs in the browser and sends nothing. It understands a limited vocabulary, ranks a job title that already appears in the CV, prefers bullets over skills lists as evidence, and uses fixed task templates and wording rules. Its matches are heuristics and can be wrong; the interface says so.

### Privacy

CV files are read in the browser and never uploaded. Extracted text is sent to the server only for live analysis, only after the user ticks the consent screen that shows exactly what will be sent, and only in the request bodies for the analysis. The server forwards that text to the Anthropic API, does not log request or response bodies, stores nothing and has no database. Refreshing the page clears the workspace. The exports are generated locally with docx and jsPDF.

All extracted content is rendered as text. Text from a CV, a job page or a company page is placed inside delimited data blocks, any closing tags inside it are neutralised, and the agents are told never to follow instructions found there. Output is accepted only in the expected schema.

## Known limits

Scores and evidence labels are guidance for revising a CV, not predictions of hiring success or employer ATS results. Impact scoring counts numbers and can overvalue numbers that are not outcomes.

The live pipeline was tested against a local mock of the Messages API, which checked the request parameters and the whole flow in a browser. It has not been run against the real API because no key was available during development. Prompts and agent quality need a trial with real CVs before the demo. Quote checking proves that a quote exists in the user's text. It does not prove that the model drew the right conclusion from it.

There are no recorded sample results. With a key, the sample buttons call the model. Without one, they use the offline engine.

Roles are drawn from a curated list of about 30 families. The app does not search live job listings. It suggests job titles to search for.

The consent flag on `/api/focus` is set by the browser and the server only checks that it is present. `/api/focus` and `/api/job` have no authentication and no rate limiting. A key on a public deployment can be used by anyone who finds the URL. Keep the site owner-private, or add rate limiting and access control, before sharing it widely.

Job extraction reads static HTML. Login walls, redirects, JavaScript-only job boards and bot protection require pasting the description. The fetch route has no rate limiter and DNS checking is not a substitute for a production egress proxy with DNS pinning.

Scanned PDFs need OCR outside this app. Complex layouts may extract out of order. Exports use a plain single-column layout. The PDF uses built-in Helvetica and supports Western text best. Review exports before sending. There are no accounts, history or persistent uploads. The hosted Site is owner-private by default.

## Working across Claude sessions

Clone the GitHub repository in each environment and ask Claude to read `CLAUDE.md` first. Give each task its own branch. For sessions on the same machine, use separate clones or `git worktree add ../rolecraft-task -b task-name` so concurrent edits do not share a working directory. Commit and push completed work; fetch and merge through pull requests before starting dependent tasks. Git stores source and handoff notes, not chat history.
