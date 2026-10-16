# Demo video

`build.mjs` renders the 13 pitch-deck slides in `deck/` to 1920x1080 frames with Playwright, builds captions from the narration in the script, and assembles a 3:00 MP4 with ffmpeg (cross-fades, burned-in captions, silent audio track).

```
npm i --prefix /some/dir @fontsource/manrope @fontsource/dm-sans
FONT_ROOT=/some/dir/node_modules node video/build.mjs
```

Output goes to `video/out/` and is not committed: `rolecraft-demo.mp4`, `rolecraft-demo.srt` and `narration.txt`. The narration file is timed per slide and ready for a voiceover.
