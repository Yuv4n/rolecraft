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
npm test
npm run build
```

`npm test` runs four suites: `tests/engine.test.mjs` (matching and rubric), `tests/focus.test.mjs` (grounding, plan fitting, request validation, offline engine and orchestrator with a fake model), `tests/depth.test.mjs` (vocabulary, rewrite rules, plain-text CVs, impact scoring, and a property check that tailoring adds no word or number that is not in the source CV) and `tests/net.test.mjs` (IP and URL guard, rate limiter, body cap, origin check).

## Flow and architecture

1. Experience. PDF.js extracts text-based PDFs in the browser and Mammoth extracts DOCX text. The maximum upload is 8 MB and 20 PDF pages. The user can correct the text, add projects and interests, and set hours per week and an apply-by date.
2. Directions. Three cards: a best fit, an adjacent field and a stretch. Each shows quotes from the user's own text, the requirements of that role family with an evidence label (strong, partial or none), what carries over for adjacent and stretch directions, and job titles to search for. There are no percentage scores.
3. Plan. Tasks are sized to hours per week times weeks until the apply-by date. A share of the budget is held back for the tailored CV and outreach. Tasks are taken in priority order and anything that does not fit is listed under After you apply with the reason. The fitting is plain arithmetic in `lib/focus/plan.ts`, not model output, so the plan updates instantly when the hours change.
4. Tailored CV. Original and tailored text side by side with changed lines highlighted, a short explanation per rewrite, questions about missing details, an editable final text, a four-criterion revision score and DOCX and PDF export. The user can optionally add a job posting URL or description to rate against.
5. Next action. The task for this week and a short email. The user names a company and pastes a text it published. The draft quotes one line of the user's work and one line of that text, and asks a small question. It does not ask for a job.

### Interface and accessibility

The interface is a five-step flow with one task per screen. A stepper shows where you are; steps you have reached are buttons and steps you have not reached are plain text, so nothing can be skipped. On narrow screens the stepper collapses to "Step 2 of 5" and a progress bar. A sticky action bar holds Back and the one primary action, so the next step is always in view. Required fields are checked when you press the button, not by disabling it: an error summary at the top takes focus and links to each field, and each field shows its own message. Optional fields say so instead of marking required ones with an asterisk.

On each step change focus moves to the page heading and the tab title updates. There is a skip link, a visible focus ring on every control, 44 px targets, a 16 px base size with no text below 14 px, and a reduced-motion setting is respected. Text greys were darkened so body and hint text meet WCAG AA contrast on the original palette. The directions are a real radio group, the comparison and rating views are an ARIA tab list with arrow keys, and loading, error and success messages are announced through live regions. Changing the CV, projects or interests clears earlier results and locks the later steps, and a slow reply for old text is discarded.

This was checked with an axe-core audit of every step at 1280 px and 390 px (no violations) and a scripted keyboard pass. Neither replaces a test with a screen reader and real users.

### Live pipeline

When `ANTHROPIC_API_KEY` is set, `/api/focus` runs an orchestrator with five specialist agents, each with one role, one output schema and one validator (`lib/focus/orchestrator.ts`).

- The evidence reader extracts the lines that show what the user has done.
- The direction mapper maps that evidence onto a curated list of about 30 role families (`lib/focus/roles.ts`) and states the gaps.
- The gap planner proposes tasks with hour estimates. It runs in parallel with the CV tailor.
- The CV tailor proposes wording changes, emphasis and questions. It may not add facts.
- The outreach writer drafts the email and lists every claim with its source.

The orchestrator is ordinary code that decides order and parallelism. The agents are model calls made with the Anthropic SDK using structured outputs. The route requests server-side fallback so that a request declined by a safety classifier is retried by the API.

### Grounding

Quotes are checked in code, not trusted (`lib/focus/grounding.ts`).

- Every quote a model returns must appear verbatim, after whitespace, bullet and case normalisation, inside one bullet or paragraph of the user's own text. A quote cannot span two bullets, and a minus sign in front of a number is kept.
- A rewritten CV line must replace one whole line, must be a single line, may not add a number (digits in any script, or words such as "five" or "double") and may not drop one. It may not contain any content word that is not in the original line, apart from a short list of replacement verbs such as built, led or supported. This is stricter than the capitalisation check it replaced, which let lowercase tools and seniority words through.
- Summaries, transfer notes and explanations are checked for numbers, names and links that are not in the user's text or the curated role description. A failing one is replaced with the curated text.
- An email may not contain a number, name, link or address that is not in the CV, the projects or the pasted company text. Every sentence except the greeting, the sign-off and a closing question must be listed as a claim, and each claim must restate most of its own quote.
- A claim that fails is removed. A strength rating that cannot show a verified quote falls back to none. A rejected answer is retried once with the reasons. If nothing verifiable remains the step fails with a message instead of showing unverified text.

The How this was produced panel shows each agent, its model, how many items it kept and how many were removed. Quote checking proves that a quote exists in the user's text. A quote may be a fragment of a longer sentence, and it does not prove that the model drew the right conclusion from it.

The role list, the plan arithmetic and the job titles shown come from code, not from the model. Requests from the browser are re-validated on the server. The direction is rebuilt from the curated list, and its evidence quotes are re-checked against the profile sent with the request.

### Offline engine

Without a key, or if the user declines to send text, `lib/focus/offline.ts` produces the same outputs by keyword matching against the same role list. It runs in the browser and sends nothing. Matching uses a vocabulary of about 140 terms with their synonyms and inflections (`lib/vocab.ts`), covering data, software, design, marketing, finance, operations, project management, people, education, healthcare, research and customer service. To support a new field, add lines to that file. The engine ranks a job title that already appears in the CV, prefers bullets over skills lists as evidence, and uses fixed task templates.

Tailoring uses generic rewrite rules (`rewriteLine` in `lib/engine.ts`, verbs in `lib/focus/verbs.ts`). It drops empty openers such as "Successfully", turns "Responsible for building X" or "Tasked with resolving X" into "Built X" or "Resolved X" for about 70 verbs, and swaps "Worked on", "Helped with" and "Assisted with" for a fixed phrase. A line it cannot map safely is left alone, including ambiguous cases such as "developing curriculum and training staff". Lines are found with or without bullet markers, so plain-text and PDF-extracted CVs are tailored too. The grounding check allows exactly the verbs in the table, so a rule cannot produce a word the check would reject. Matches are heuristics and can be wrong, and the interface says so.

### Privacy

CV files are read in the browser and never uploaded. Extracted text is sent to the server only for live analysis, only after the user ticks the consent screen that shows exactly what will be sent, and only in the request bodies for the analysis. The server forwards that text to the Anthropic API, does not log request or response bodies, stores nothing and has no database. Refreshing the page clears the workspace. The exports are generated locally with docx and jsPDF.

All extracted content is rendered as text. Text from a CV, a job page or a company page is placed inside delimited data blocks. Every angle bracket inside it is replaced with a look-alike character, so it cannot open or close a tag, and the agents are told never to follow instructions found there. Output is accepted only in the expected schema.

## Known limits

Scores and evidence labels are guidance for revising a CV, not predictions of hiring success or employer ATS results. The rubric is explained on the rating tab and is defined in `rubric` in `lib/engine.ts`. Impact scoring counts a percentage, an amount of money, a multiple or a number with a counted unit, and ignores years, dates and bare numbers. A counted scale such as "30 pupils" is not always an outcome, so the score can still overvalue it.

The live pipeline was tested against a local mock of the Messages API, which checked the request parameters and the whole flow in a browser. It has not been run against the real API because no key was available during development. Prompts and agent quality need a trial with real CVs before the demo. Quote checking proves that a quote exists in the user's text. It does not prove that the model drew the right conclusion from it.

There are no recorded sample results. With a key, the sample buttons call the model. Without one, they use the offline engine.

Roles are drawn from a curated list of about 30 families. The app does not search live job listings. It suggests job titles to search for.

The consent flag on `/api/focus` is set by the browser and the server only checks that it is present. The route accepts same-origin requests only, caps the body at 120 KB (checked while reading, not after) and allows 12 requests a minute per client address. Each Worker isolate keeps its own count, so this slows casual abuse and is not a substitute for platform rate limiting. There is no authentication, and a `package` request makes two model calls. A key on a public deployment can still be used by anyone who finds the URL. Keep the site owner-private, or add access control and platform rate limiting, before sharing it widely. 

Job extraction reads static HTML. Login walls, redirects, JavaScript-only job boards and bot protection require pasting the description. `/api/job` accepts same-origin requests only, caps the body at 4 KB, allows 6 requests a minute per client address in each Worker isolate, allows only public HTTPS hostnames, resolves both A and AAAA records and refuses the request if any answer is private, reserved, loopback, link-local, multicast, documentation or unique-local (IPv6 is an allow-list of global unicast, and addresses that embed IPv4 are judged by that address), refuses redirects, and caps the response size and time. The hostname is resolved once by the check and again by the fetch, so DNS rebinding between the two is not prevented. That needs an egress proxy that pins the resolved address, which has to be set up at deployment.

Scanned PDFs need OCR outside this app. Complex layouts may extract out of order. Exports use a plain single-column layout. The PDF uses built-in Helvetica and supports Western text best. Review exports before sending. There are no accounts, history or persistent uploads. The hosted Site is owner-private by default.

## Working across Claude sessions

Clone the GitHub repository in each environment and ask Claude to read `CLAUDE.md` first. Give each task its own branch. For sessions on the same machine, use separate clones or `git worktree add ../rolecraft-task -b task-name` so concurrent edits do not share a working directory. Commit and push completed work; fetch and merge through pull requests before starting dependent tasks. Git stores source and handoff notes, not chat history.
