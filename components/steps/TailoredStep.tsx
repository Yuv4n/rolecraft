'use client';

import {RubricExplainer} from '../kit/RubricExplainer';
import './cv.css';
import {useId} from 'react';
import {Download} from 'lucide-react';
import {analyse, rate} from '../../lib/engine';
import {Alert} from '../kit/Alert';
import {Tabs, panelId, tabId} from '../kit/Tabs';
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
  downloadNotice?: string;
};

const PREFIX = 'cv';
const overall = (r: ReturnType<typeof rate>) => Math.round(r.reduce((n, x) => n + x.score, 0) / 4);
const stripBullet = (s: string) => s.replace(/^\s*[•*-]\s*/, '');

function Meter({value, label, id}: {value: number; label: string; id: string}) {
  return (
    <div className="cv-meter-row">
      <div className="cv-meter-row__text" id={id}>
        <span>{label}</span>
        <span>{value} out of 100</span>
      </div>
      <meter className="cv-meter" min={0} max={100} value={value} aria-labelledby={id}>{value} out of 100</meter>
    </div>
  );
}

export function TailoredStep(p: Props) {
  const uid = useId();
  // With no posting, the direction's own requirements stand in as the target.
  const target = p.job.trim().length >= 80 ? p.job : 'Required skills\n' + p.direction.gaps.map((g) => g.requirement).join('\n');
  const a = analyse(p.cv, target);
  const original = rate(p.cv, target);
  const revised = rate(p.result, target);
  const cvLines = p.cv.split('\n');
  const before = overall(original);
  const after = overall(revised);
  const tab = p.tab === 'rating' ? 'rating' : 'comparison';
  const panes: {title: string; text: string; tailored: boolean}[] = [
    {title: 'Original', text: p.cv, tailored: false},
    {title: 'Tailored', text: p.result, tailored: true},
  ];

  return (
    <div>
      <section className="card" aria-labelledby={`${uid}-summary`}>
        <h2 id={`${uid}-summary`} className="card__title">Guidance score</h2>
        <div className="cv-summary__score">
          <span className="cv-summary__figure">from {before} to {after} out of 100</span>
        </div>
        <Meter value={after} label="Tailored CV" id={`${uid}-m-after`} />
        <Meter value={before} label="Original CV" id={`${uid}-m-before`} />
        <p className="cv-summary__note">Guidance for revising your CV. Not a prediction of hiring success.</p>
        <div className="cv-summary__actions">
          <button type="button" className="btn btn--secondary" disabled={!!p.busy} onClick={() => p.onDownload('docx')}>
            <Download size={18} aria-hidden="true" /> Download DOCX
          </button>
          <button type="button" className="btn btn--primary" disabled={!!p.busy} onClick={() => p.onDownload('pdf')}>
            <Download size={18} aria-hidden="true" /> Download PDF
          </button>
        </div>
        {p.downloadNotice && (
          <div className="cv-section" role="status">
            <Alert kind="success">{p.downloadNotice}</Alert>
          </div>
        )}
      </section>

      <details className="disclosure cv-section">
        <summary>Rate against a specific job posting (optional)</summary>
        <div className="disclosure__body">
          <p className="field__hint" id={`${uid}-job-hint`}>Without a posting, the requirements of the chosen direction are used.</p>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-url`}>Job posting URL <span className="field__optional">(optional)</span></label>
            <div className="cv-url-row">
              <input
                id={`${uid}-url`}
                className="input"
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://company.com/careers/your-next-role"
                value={p.url}
                onChange={(e) => p.setUrl(e.target.value)}
              />
              <button type="button" className="btn btn--secondary" disabled={!p.url || !!p.busy} onClick={p.onFetchJob}>
                Read posting
              </button>
            </div>
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-job`}>Job description <span className="field__optional">(optional)</span></label>
            <span className="field__hint" id={`${uid}-job-desc-hint`}>Paste or correct the text. The posting needs at least 80 characters to be used.</span>
            <textarea
              id={`${uid}-job`}
              className="textarea field__control"
              rows={8}
              maxLength={20000}
              aria-describedby={`${uid}-job-hint ${uid}-job-desc-hint`}
              value={p.job}
              onChange={(e) => p.setJob(e.target.value)}
            />
          </div>
        </div>
      </details>

      <div className="cv-section">
        <Tabs
          prefix={PREFIX}
          label="CV review views"
          value={tab}
          onChange={p.setTab}
          tabs={[
            {id: 'comparison', label: 'CV comparison'},
            {id: 'rating', label: 'Rating and priorities'},
          ]}
        />

        <div role="tabpanel" id={panelId(PREFIX, 'comparison')} aria-labelledby={tabId(PREFIX, 'comparison')} hidden={tab !== 'comparison'}>
          <Alert kind="info">Highlighted lines in the tailored CV have been rewritten or moved. Review the wording, then edit the final CV below before you download it.</Alert>

          <div className="cv-panes">
            {panes.map((pane) => (
              <section className="card" key={pane.title} aria-labelledby={`${uid}-pane-${pane.title}`}>
                <h3 id={`${uid}-pane-${pane.title}`} className="card__title">
                  {pane.title}
                  <span className="badge badge--none">{pane.tailored ? 'Editable below' : 'Your source'}</span>
                </h3>
                <div className="cv-pane__text" tabIndex={0} role="region" aria-label={`${pane.title} CV text, scrollable`}>
                  {pane.text.split('\n').map((line, j) => {
                    const changed = pane.tailored && (!cvLines.includes(line) || cvLines[j] !== line);
                    return (
                      <div key={j} className={`cv-line${changed ? ' cv-line--changed' : ''}`}>
                        {changed && <span className="visually-hidden">Changed: </span>}
                        {line || ' '}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {(p.rewrites.length > 0 || p.questions.length > 0) && (
            <section className="card" aria-labelledby={`${uid}-changes`}>
              <h3 id={`${uid}-changes`} className="card__title">What changed and what to check</h3>
              <ul className="cv-changes">
                {p.rewrites.map((r) => (
                  <li key={`r-${r.original}`}>
                    <p className="muted">Original line</p>
                    <blockquote className="quote">{stripBullet(r.original)}</blockquote>
                    <p className="cv-changes__revised">{stripBullet(r.revised)}</p>
                    <p className="cv-changes__why">{r.why}</p>
                  </li>
                ))}
                {p.questions.map((q) => (
                  <li key={`q-${q.line}`}>
                    <p className="muted">Line to check</p>
                    <blockquote className="quote">{stripBullet(q.line)}</blockquote>
                    <p className="cv-changes__why">{q.ask} Add the answer in the final editor only if you can confirm it.</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card">
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-final`}>Final review and edits</label>
              <span className="field__hint" id={`${uid}-final-hint`}>Your edits update the scores and both downloads. Check that every claim stays accurate.</span>
              <textarea
                id={`${uid}-final`}
                className="textarea field__control"
                rows={14}
                maxLength={30000}
                aria-describedby={`${uid}-final-hint`}
                value={p.result}
                onChange={(e) => p.setResult(e.target.value)}
              />
            </div>
          </section>
        </div>

        <div role="tabpanel" id={panelId(PREFIX, 'rating')} aria-labelledby={tabId(PREFIX, 'rating')} hidden={tab !== 'rating'}>
          <div className="cv-scores">
            {revised.map((r, i) => (
              <section className="card" key={r.name} aria-labelledby={`${uid}-s-${i}`}>
                <h3 id={`${uid}-s-${i}`} className="card__title">{r.name}</h3>
                <p className="cv-score__figure">
                  {r.score} out of 100
                  <span className="cv-score__was">was {original[i].score}</span>
                </p>
                <meter className="cv-meter" min={0} max={100} value={r.score} aria-labelledby={`${uid}-s-${i}`}>{r.score} out of 100</meter>
                <p className="muted cv-meter-row">{r.why}</p>
              </section>
            ))}
          </div>

          <div style={{marginTop: 'var(--s-4)'}}><RubricExplainer /></div>

          <section className="card cv-next" aria-labelledby={`${uid}-next`}>
            <h3 id={`${uid}-next`} className="card__title">Your most useful next edits</h3>
            <ol>
              <li>Check missing requirements: {a.gaps.join(', ') || 'all recognised terms appear in your CV'}. Add evidence only if you have it.</li>
              <li>For each bullet without an outcome, ask what changed, who benefited and how it was measured. Add a metric only if you can verify it.</li>
              <li>Check extracted section headings, contact information and dates. Keep the final document in one column.</li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
