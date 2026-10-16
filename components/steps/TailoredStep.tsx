'use client';

import './steps.css';
import {ArrowUpRight, Download, Link, ShieldCheck, Sparkles, Target} from 'lucide-react';
import {analyse, rate} from '../../lib/engine';
import type {Direction, Question, Rewrite} from '../../lib/focus/types.ts';

type Props = {
  cv: string;
  result: string;
  setResult: (v: string) => void;
  direction: Direction;
  rewrites: Rewrite[];
  questions: Question[];
  job: string;
  setJob: (v: string) => void;
  url: string;
  setUrl: (v: string) => void;
  busy: string;
  tab: string;
  setTab: (v: string) => void;
  onFetchJob: () => void;
  onDownload: (format: 'docx' | 'pdf') => void;
};

const overall = (r: ReturnType<typeof rate>) => Math.round(r.reduce((n, x) => n + x.score, 0) / 4);

export function TailoredStep(p: Props) {
  // With no posting, the direction's own requirements stand in as the target.
  const target = p.job.trim().length >= 80 ? p.job : 'Required skills\n' + p.direction.gaps.map((g) => g.requirement).join('\n');
  const a = analyse(p.cv, target);
  const original = rate(p.cv, target);
  const revised = rate(p.result, target);
  const cvLines = p.cv.split('\n');

  return (
    <>
      <div className="review-heading">
        <div>
          <div className="section-kicker">STEP 04 / TAILORED CV</div>
          <h2>Your wording, aimed at {p.direction.title.toLowerCase()}</h2>
        </div>
        <div className="download-buttons">
          <button className="secondary" disabled={!!p.busy} onClick={() => p.onDownload('docx')}><Download size={16} /> DOCX</button>
          <button className="primary" disabled={!!p.busy} onClick={() => p.onDownload('pdf')}><Download size={16} /> Download PDF</button>
        </div>
      </div>

      <div className="result-summary">
        <div><span className="score-big">{overall(revised)}<small>/100</small></span><p>Revision guidance score</p></div>
        <div><span className="score-before">{overall(original)} → {overall(revised)}</span><p>Equal weighting across four criteria</p></div>
        <div><ShieldCheck size={24} /><p>Uses only your existing evidence<br />No new facts added</p></div>
      </div>

      <details className="focus-optional">
        <summary>Refine against a specific job posting (optional)</summary>
        <p className="field-help">Without a posting, the requirements of the chosen direction are used for the rating.</p>
        <div className="url-row">
          <Link size={18} />
          <input type="url" aria-label="Job posting URL" placeholder="https://company.com/careers/your-next-role" value={p.url} onChange={(e) => p.setUrl(e.target.value)} />
          <button className="secondary" disabled={!p.url || !!p.busy} onClick={p.onFetchJob}>Read posting <ArrowUpRight size={16} /></button>
        </div>
        <div className="field-heading"><label htmlFor="job">Job description</label><span>Paste or correct the text</span></div>
        <textarea id="job" rows={8} maxLength={20000} value={p.job} onChange={(e) => p.setJob(e.target.value)} placeholder="Paste the responsibilities, required skills and preferred experience here…" />
      </details>

      <div className="tabs">
        {[['comparison', 'CV comparison'], ['rating', 'Rating & priorities']].map(([v, l]) => (
          <button key={v} className={p.tab === v ? 'selected' : ''} onClick={() => p.setTab(v)}>{l}</button>
        ))}
      </div>

      {p.tab === 'comparison' && (
        <>
          <div className="notice"><Sparkles size={18} /><p>Highlights show rewritten or moved lines. Review the wording, then edit the final CV below before downloading.</p></div>
          <div className="comparison">
            {[[p.cv, 'Original CV'], [p.result, 'Tailored CV']].map(([text, title], i) => (
              <section className="card document" key={title}>
                <div className="title-row"><h3>{title}</h3><span className="pill">{i ? 'Editable below' : 'Your source'}</span></div>
                <div className="cv-text">
                  {text.split('\n').map((line, j) => {
                    const changed = i === 1 && (!cvLines.includes(line) || cvLines[j] !== line);
                    return <div key={j} className={changed ? 'changed' : ''}>{line || ' '}</div>;
                  })}
                </div>
              </section>
            ))}
          </div>

          {(p.rewrites.length > 0 || p.questions.length > 0) && (
            <section className="card">
              <h3>What changed and what to check</h3>
              <div className="focus-changes">
                {p.rewrites.map((r) => (
                  <div key={r.original}>
                    <blockquote>{r.original.replace(/^\s*[•*-]\s*/, '')}</blockquote>
                    <h4>{r.revised.replace(/^\s*[•*-]\s*/, '')}</h4>
                    <p>{r.why}</p>
                  </div>
                ))}
                {p.questions.map((q) => (
                  <div key={q.line}>
                    <blockquote>{q.line.replace(/^\s*[•*-]\s*/, '')}</blockquote>
                    <p>{q.ask} Add the answer in the final editor only if you can confirm it.</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="card edit-final">
            <label htmlFor="final">Final review & edits</label>
            <textarea id="final" rows={14} value={p.result} onChange={(e) => p.setResult(e.target.value)} maxLength={30000} />
            <p className="field-help">Your edits update the scores and both exports. Check that every claim remains accurate.</p>
          </section>
        </>
      )}

      {p.tab === 'rating' && (
        <>
          <p className="muted">Guidance for revision, not a prediction of hiring success. These deterministic checks do not simulate an employer&apos;s ATS.</p>
          <div className="score-grid">
            {revised.map((r, i) => (
              <section className="card" key={r.name}>
                <div className="title-row"><h3>{r.name}</h3><Target size={18} /></div>
                <div className="score-display">{r.score}<small>/100</small><span>was {original[i].score}</span></div>
                <div className="score-track"><div style={{width: r.score + '%'}} /></div>
                <p className="muted">{r.why}</p>
              </section>
            ))}
          </div>
          <section className="card">
            <h3>Your most useful next edits</h3>
            <ol className="priorities">
              <li>Check missing requirements: {a.gaps.join(', ') || 'all recognised terms appear in your CV'}. Add evidence only if you have it.</li>
              <li>For each bullet without an outcome, ask: What changed? Who benefited? How was it measured? Add a metric only if you can verify it.</li>
              <li>Check extracted section headings, contact information and dates. Keep the final document in one column.</li>
            </ol>
          </section>
        </>
      )}
    </>
  );
}
