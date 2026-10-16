# Hackathon submission materials

The 3-minute pitch video and slides from the hackathon.

- [rolecraft-demo.mp4](rolecraft-demo.mp4): the demo video (2:42, 1080p, burned-in captions, no voiceover). Captions are in [rolecraft-demo.srt](rolecraft-demo.srt).
- [rolecraft-pitch-deck.pdf](rolecraft-pitch-deck.pdf): the 13-slide deck.
- `deck/` and `assets/`: the slide sources (HTML) and screenshots. `build.mjs` renders them to frames and assembles the video with ffmpeg.

## What differs from this repository

The video and deck present the hackathon version of Rolecraft, a focus-plan tool with an optional live mode that used a hosted AI service. That version is archived at the git tag `archive/hackathon-live-analysis` and is not in `main`, because it needs paid API access. In this repository:

- The five-agent live mode, the outreach email and the "focus plan" flow shown in the video do not exist.
- The video's offline engine, evidence-quoting and "claims must trace to your own words" principles do carry over. The interface has since been redesigned around five workflows.
- Figures quoted in the video (34 role families, 136 skill terms, 816 test checks) describe the hackathon build, not the current code.

## Rebuilding the video

```sh
npm i --prefix /some/dir @fontsource/manrope @fontsource/dm-sans
FONT_ROOT=/some/dir/node_modules node docs/hackathon/build.mjs
```

This needs Playwright and ffmpeg. Set `PLAYWRIGHT_MODULES` to the `node_modules` folder that holds Playwright. Output goes to `docs/hackathon/out/` and is not committed.
