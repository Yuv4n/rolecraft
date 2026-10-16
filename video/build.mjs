// Renders the 13 deck slides to PNG and assembles a captioned 3:00 MP4.
// Usage: node video/build.mjs   (needs Playwright, ffmpeg, @fontsource fonts; see video/README.md)
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const req = createRequire(process.env.PLAYWRIGHT_MODULES ?? '/opt/node-tools/node_modules/')
const { chromium } = req('playwright')
const fontRoot = process.env.FONT_ROOT
if (!fontRoot) throw new Error('Set FONT_ROOT to the node_modules folder holding @fontsource/manrope and @fontsource/dm-sans')

const OVERLAP = 0.4
const slides = [
  ['cover', 6, 'Rolecraft helps you decide where to focus, not just how your CV reads.'],
  ['problem', 12, 'A CV optimiser polishes wording for a job you have already chosen. But first you have to decide which role to aim for, what your experience is missing, and what to do with the weeks you have.'],
  ['odds', 15, 'The odds are long. UK employers report about 140 applications per graduate vacancy and around 100 per internship, roughly one in 140. By sector it runs from 69 in legal to 290 in retail.'],
  ['demand', 15, 'Competition is rising while guidance is thin. US internship applications went from 43 to 109 per posting, and 38 per cent of UK students are unsure of their plans. More applications is not the answer. Knowing where you are strong is.'],
  ['journey', 8, 'You give a CV, your hours and a date. Five screens take you from directions to a next step.'],
  ['directions', 18, 'First, three directions: a best fit, an adjacent field and a stretch. Every reason is a line copied from your own CV, evidence is labelled strong, partial or not shown yet, and the gaps are stated plainly.'],
  ['plan', 18, 'Then a plan sized to your time. At four hours a week for six weeks, a twelve-hour project does not fit, so it moves to after you apply. At eight hours it fits. This is plain arithmetic in code.'],
  ['outputs', 20, 'Next, your CV is tailored using only your own words. Responsible for building becomes Built. Every number stays unchanged, and each change shows its reason. Then one short email, quoting a line of your work and a line the company published, with the source of each claim.'],
  ['breadth', 10, 'It works beyond tech. A nurse is pointed to clinical informatics. The engine covers 34 role families and 136 skill terms.'],
  ['agents', 28, 'Behind the live mode, an orchestrator coordinates five agents. An evidence reader finds what you have done. A direction mapper matches it to 34 roles and names the gaps. A gap planner and a CV tailor run in parallel. An outreach writer drafts the email. Each agent has one job and its own checker. It is tested against a stand-in API, and this demo runs the offline engine.'],
  ['grounding', 18, 'Agents propose, code verifies. Adding the word five is rejected. So is doubled conversion, a made-up employer and extra tools. Simply tightening the line is accepted. Every quote must appear in your CV, or it is removed.'],
  ['trust', 6, 'Private by default, accessible, guarded, and covered by 816 test checks.'],
  ['close', 6, 'Decide where to spend your hours, with every claim traced to your own words.'],
]
const total = slides.reduce((s, x) => s + x[1], 0)
if (total !== 180) throw new Error(`durations sum to ${total}, expected 180`)

const blobs = {
  '1dd0a9e26d34db661af4ec6161881d09': 'd1-directions.png',
  '5fd6a4622f7b7bb60c302ee55c2a75d3': 'd2-plan4.png',
  'b56cb0555ffd67b035b9f0ae9c1559f3': 'd3-plan8.png',
  '0cd9c402f629407c91cd63e7491394ca': 'd5-changes.png',
  '4dd8e5696cd8776fb0d5cb107e57351a': 'd6-claims.png',
  'f22b014a86cac2a41ba640f1dc7aaf1b': 'd7-nurse.png',
}
const icons = {
  Lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  Users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 5a3.5 3.5 0 0 1 0 7M18 14.4c2 .7 3.5 2.6 3.5 5.6"/>',
  Verified: '<path d="M12 2.5l2.4 1.8 3-.1 1 2.8 2.4 1.8-.9 2.9.9 2.9-2.4 1.8-1 2.8-3-.1L12 21.5l-2.4-1.8-3 .1-1-2.8-2.4-1.8.9-2.9-.9-2.9 2.4-1.8 1-2.8 3 .1z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  Tool: '<path d="M14.5 6.5a4 4 0 0 0 5 5L9 22l-3-3L16.5 8.5"/><path d="M14.5 6.5l3-3"/>',
}

const build = path.join(here, '.build')
const out = path.join(here, 'out')
mkdirSync(build, { recursive: true })
mkdirSync(out, { recursive: true })

const face = (family, pkg, weights) =>
  weights.map(w => `@font-face{font-family:'${family}';font-weight:${w};src:url('${pathToFileURL(path.join(fontRoot, '@fontsource', pkg, 'files', `${pkg}-latin-${w}-normal.woff2`))}') format('woff2')}`).join('')
const css = `${face('Manrope', 'manrope', [500, 600, 700, 800])}${face('DM Sans', 'dm-sans', [400, 500, 600, 700])}
*{margin:0;box-sizing:border-box}html,body{width:1920px;height:1080px;overflow:hidden}
section{width:1920px;height:1080px;position:relative;overflow:hidden}
table{border-collapse:collapse}th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #d7ddd2;vertical-align:top}`

function prepare(html) {
  html = html.replace(/<aside>[\s\S]*?<\/aside>/g, '')
  html = html.replace(/\/_blob\/([0-9a-f]+)/g, (_, id) => {
    if (!blobs[id]) throw new Error(`unknown blob ${id}`)
    return pathToFileURL(path.join(here, 'assets', blobs[id])).href
  })
  html = html.replace(/<x-shape kind="arrow-right" style="([^"]*)"><\/x-shape>/g,
    (_, s) => `<div style="${s};clip-path:polygon(0 32%,58% 32%,58% 0,100% 50%,58% 100%,58% 68%,0 68%)"></div>`)
  html = html.replace(/<x-icon name="(\w+)" style="([^"]*)"><\/x-icon>/g, (_, n, s) => {
    if (!icons[n]) throw new Error(`unknown icon ${n}`)
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="${s}">${icons[n]}</svg>`
  })
  if (/<x-/.test(html)) throw new Error('unconverted custom element')
  return `<!doctype html><meta charset="utf-8"><style>${css}</style><body>${html}</body>`
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
for (const [i, [name]] of slides.entries()) {
  const file = path.join(build, `${name}.html`)
  writeFileSync(file, prepare(readFileSync(path.join(here, 'deck', `${name}.html`), 'utf8')))
  await page.goto(pathToFileURL(file).href)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => [...document.images].every(im => im.complete && im.naturalWidth > 0))
  await page.screenshot({ path: path.join(build, `${String(i).padStart(2, '0')}-${name}.png`) })
}
await browser.close()

// Captions: cues of at most 12 words, spread by word count across each slide.
const stamp = (t, srt) => {
  const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60
  const p = (n, w = 2) => String(n).padStart(w, '0')
  return srt ? `${p(h)}:${p(m)}:${p(Math.floor(s))},${p(Math.round(s % 1 * 1000), 3)}`
             : `${h}:${p(m)}:${p(Math.floor(s))}.${p(Math.floor(s % 1 * 100))}`
}
const cues = []
let start = 0
for (const [, d, text] of slides) {
  const words = text.split(/\s+/)
  const n = Math.ceil(words.length / 12)
  const per = Math.ceil(words.length / n)
  const groups = Array.from({ length: n }, (_, k) => words.slice(k * per, (k + 1) * per))
  const from = start + 0.5, span = d - 0.7
  let used = 0
  for (const g of groups) {
    const a = from + span * used / words.length
    used += g.length
    cues.push([a, from + span * used / words.length, g.join(' ')])
  }
  start += d
}
writeFileSync(path.join(out, 'rolecraft-demo.srt'),
  cues.map(([a, b, t], i) => `${i + 1}\n${stamp(a, true)} --> ${stamp(b, true)}\n${t}\n`).join('\n'))
writeFileSync(path.join(out, 'narration.txt'),
  slides.map(([n, d, t]) => `[${n}, ${d}s]\n${t}\n`).join('\n'))
const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Default,Liberation Sans,40,&H00F5F9F8,&H00F5F9F8,&H10393F21,&H00000000,0,0,0,0,100,100,0,0,3,14,0,2,160,160,84,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
${cues.map(([a, b, t]) => `Dialogue: 0,${stamp(a)},${stamp(b)},Default,,0,0,0,,${t}`).join('\n')}
`
writeFileSync(path.join(build, 'captions.ass'), ass)

// Assemble: xfade chain, silent AAC track, burned-in captions.
const pngs = readdirSync(build).filter(f => f.endsWith('.png')).sort()
if (pngs.length !== slides.length) throw new Error('frame count mismatch')
const args = ['-y', '-v', 'error']
slides.forEach(([, d], i) => args.push('-loop', '1', '-framerate', '30', '-t', String(i === slides.length - 1 ? d : d + OVERLAP), '-i', path.join(build, pngs[i])))
args.push('-f', 'lavfi', '-t', '180', '-i', 'anullsrc=r=44100:cl=stereo')
let chain = '', prev = '[0:v]', acc = 0
for (let i = 1; i < slides.length; i++) {
  acc += slides[i - 1][1]
  const label = i === slides.length - 1 ? '[x]' : `[v${i}]`
  chain += `${prev}[${i}:v]xfade=transition=fade:duration=${OVERLAP}:offset=${acc}${label};`
  prev = label
}
chain += `[x]format=yuv420p,subtitles=${path.join(build, 'captions.ass')}:fontsdir=${path.join(fontRoot, '@fontsource/dm-sans/files')}[v]`
args.push('-filter_complex', chain, '-map', '[v]', '-map', `${slides.length}:a`, '-r', '30',
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-t', '180', '-movflags', '+faststart',
  path.join(out, 'rolecraft-demo.mp4'))
execFileSync('ffmpeg', args, { stdio: 'inherit' })
console.log('done')
