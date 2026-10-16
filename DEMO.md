# Demo script: offline engine

This runs with no API key and no network. Everything stays in the browser, and the header badge reads "Offline engine". Say that out loud at the start, because it is the honest description of what the judges are looking at.

## Set up

```sh
npm ci
npm run dev
```

Open the printed address, usually http://localhost:3000. Do a full run once before you present, so the fonts and the first page load are cached.

## The two-minute walkthrough

Start with one sentence: Rolecraft helps someone decide where to put their next few weeks of effort, and it never claims anything that is not already in their CV.

1. Click "Try a product analyst example", then "Find my directions". The three cards show a best fit, an adjacent field and a stretch. Point at the quoted lines. Each one is copied from the CV, and the badges say in words how strong the evidence is. Point at "not shown yet": the tool says what is missing instead of hiding it.
2. Press "Build my plan". The budget is four hours a week for six weeks. Drag the hours down to 2 and let the room see the data project move under "After you apply". Drag it up to 8 and watch everything fit. This is the moment to say that the tool makes a trade-off, and that the arithmetic is plain code.
3. Open the tailored CV. Highlighted lines are the ones that changed. Read one change aloud: "Responsible for building" became "Built", and no number or name was added. Open the Rating tab and then "How these scores work", and say plainly that the scores are guidance for revising a CV and do not predict hiring.
4. Go to the next step. Paste two or three sentences from any company page, enter a name and press "Draft email". Show "Where each claim comes from": one line from the CV and one from the company text, each with its source.
5. To show it works outside tech, go back to the start and try the nurse example. It lands on clinical informatics with data analysis as the adjacent field.

If a judge offers their own CV, paste the text rather than uploading a file. Text-based PDFs and DOCX files work, but a scanned PDF has no text to read.

## Questions to expect

Is this AI? Not in this mode. It is a keyword engine over a list of about 35 role families and 140 skill terms, with fixed rewrite rules. A language-model mode is built and tested against a stand-in for the API, and it is off for this demo.

What if my CV is unusual? The engine says so and asks for more detail. It returns nothing before it returns a guess.

Where does my CV go? Nowhere. Files are read in the browser, nothing is stored and nothing is sent.

How do you stop it inventing experience? Rewrites may only reorder and tighten the words already in a line, and a test confirms that no word or number appears in the output that was not in the CV.

## What to avoid

Do not call it a prediction of hiring success. Do not upload a scanned PDF. Do not claim it understands every field: it covers the roles it lists, and it will say when it cannot match.
