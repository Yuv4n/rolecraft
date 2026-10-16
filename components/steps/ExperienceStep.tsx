'use client';

import './experience.css';
import {useState} from 'react';
import {CheckCircle2, ShieldCheck, Upload} from 'lucide-react';

type Props = {
  cv: string;
  setCV: (v: string) => void;
  projects: string;
  setProjects: (v: string) => void;
  interests: string;
  setInterests: (v: string) => void;
  hours: number;
  setHours: (v: number) => void;
  applyBy: string;
  setApplyBy: (v: string) => void;
  filename: string;
  busy: string;
  live: boolean | null;
  errors: Partial<Record<'cv' | 'hours' | 'applyBy', string>>;
  weeks: number;
  onUpload: (file?: File) => void;
  onSample: (kind: 'product' | 'clinical') => void;
};

function describedBy(...ids: (string | false | undefined)[]) {
  const out = ids.filter(Boolean).join(' ');
  return out || undefined;
}

export function ExperienceStep(p: Props) {
  const [over, setOver] = useState(false);
  const reading = p.busy !== '';
  const loaded = !reading && p.filename !== '';
  const total = p.hours * p.weeks;

  return (
    <div className="exp-step">
      <div className="exp-samples">
        <span className="exp-samples__label" id="exp-samples-label">No CV to hand?</span>
        <button type="button" className="btn btn--secondary btn--sm" aria-describedby="exp-samples-label" onClick={() => p.onSample('product')}>
          Try a product analyst example
        </button>
        <button type="button" className="btn btn--secondary btn--sm" aria-describedby="exp-samples-label" onClick={() => p.onSample('clinical')}>
          Try a nurse moving into data example
        </button>
      </div>

      <section className="card" aria-labelledby="exp-cv-title">
        <h2 id="exp-cv-title" className="exp-card__title">Your CV</h2>

        <label
          className={`exp-drop${over ? ' is-over' : ''}${reading ? ' is-busy' : ''}${loaded ? ' is-loaded' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            p.onUpload(e.dataTransfer.files[0]);
          }}
        >
          <input
            type="file"
            className="visually-hidden"
            accept=".pdf,.docx"
            aria-describedby="exp-drop-status"
            onChange={(e) => {
              p.onUpload(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          {reading ? (
            <>
              <span className="spinner exp-drop__icon" aria-hidden="true" />
              <span className="exp-drop__title">{p.busy}</span>
            </>
          ) : loaded ? (
            <>
              <CheckCircle2 size={28} aria-hidden="true" />
              <span className="exp-drop__title">{p.filename}</span>
              <span className="exp-drop__hint">Read from your file. Check it below.</span>
            </>
          ) : (
            <>
              <Upload className="exp-drop__icon" size={28} aria-hidden="true" />
              <span className="exp-drop__title">Drop your CV here or choose a file</span>
              <span className="exp-drop__hint">PDF or DOCX, up to 8 MB, text-based</span>
            </>
          )}
        </label>
        <span id="exp-drop-status" className="visually-hidden" role="status">
          {reading ? p.busy : loaded ? `${p.filename} read. Check the text below.` : ''}
        </span>

        <div className="field exp-cv">
          <label className="field__label" htmlFor="cv">CV text</label>
          <span className="field__hint" id="cv-hint">Check headings, dates and bullets. You can edit everything here.</span>
          <textarea
            id="cv"
            className="textarea field__control"
            value={p.cv}
            maxLength={30000}
            rows={p.cv ? 12 : 5}
            onChange={(e) => p.setCV(e.target.value)}
            aria-invalid={p.errors.cv ? true : undefined}
            aria-describedby={describedBy('cv-hint', p.errors.cv && 'cv-error', 'cv-count')}
          />
          {p.errors.cv && <p className="field__error" id="cv-error">{p.errors.cv}</p>}
          <div className="field__meta" id="cv-count">
            <span>{p.cv.length.toLocaleString()} / 30,000</span>
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="exp-more-title">
        <h2 id="exp-more-title" className="exp-card__title">Anything else we should know?</h2>
        <div className="field">
          <label className="field__label" htmlFor="projects">
            Projects you are working on <span className="field__optional">(optional)</span>
          </label>
          <span className="field__hint" id="projects-hint">
            Side projects, volunteering or coursework. Say what each one is and what you did.
          </span>
          <textarea
            id="projects"
            className="textarea field__control"
            value={p.projects}
            maxLength={4000}
            rows={4}
            onChange={(e) => p.setProjects(e.target.value)}
            aria-describedby="projects-hint projects-count"
          />
          <div className="field__meta" id="projects-count"><span>{p.projects.length.toLocaleString()} / 4,000</span></div>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="interests">
            Interests <span className="field__optional">(optional)</span>
          </label>
          <span className="field__hint" id="interests-hint">Kinds of work or topics you want more of.</span>
          <textarea
            id="interests"
            className="textarea field__control"
            value={p.interests}
            maxLength={1500}
            rows={3}
            onChange={(e) => p.setInterests(e.target.value)}
            aria-describedby="interests-hint interests-count"
          />
          <div className="field__meta" id="interests-count"><span>{p.interests.length.toLocaleString()} / 1,500</span></div>
        </div>
      </section>

      <section className="card" aria-labelledby="exp-time-title">
        <h2 id="exp-time-title" className="exp-card__title">Your time</h2>
        <div className="field">
          <label className="field__label" htmlFor="hours">Hours you can spare each week</label>
          <div className="exp-hours field__control">
            <input
              id="hours"
              type="range"
              className="range"
              min={1}
              max={40}
              value={p.hours}
              onChange={(e) => p.setHours(Number(e.target.value))}
              aria-invalid={p.errors.hours ? true : undefined}
              aria-describedby={describedBy(p.errors.hours && 'hours-error')}
            />
            <output htmlFor="hours">{p.hours} {p.hours === 1 ? 'hour' : 'hours'}</output>
          </div>
          {p.errors.hours && <p className="field__error" id="hours-error">{p.errors.hours}</p>}
        </div>
        <div className="field">
          <label className="field__label" htmlFor="apply-by">Date you want to start applying</label>
          <span className="field__hint" id="apply-by-hint">For example, six weeks from today.</span>
          <input
            id="apply-by"
            type="date"
            className="input field__control exp-date"
            value={p.applyBy}
            onChange={(e) => p.setApplyBy(e.target.value)}
            aria-invalid={p.errors.applyBy ? true : undefined}
            aria-describedby={describedBy('apply-by-hint', p.errors.applyBy && 'apply-by-error')}
          />
          {p.errors.applyBy && <p className="field__error" id="apply-by-error">{p.errors.applyBy}</p>}
        </div>
        <p className="exp-budget" aria-live="polite">
          That is about {total} {total === 1 ? 'hour' : 'hours'} over {p.weeks} {p.weeks === 1 ? 'week' : 'weeks'}.
        </p>
      </section>

      <p className="exp-privacy">
        <ShieldCheck size={18} aria-hidden="true" />
        <span>
          {p.live === false
            ? 'Everything stays in your browser. The offline engine matches your text to a fixed list of roles with keywords.'
            : 'Your file is read in your browser. If live analysis is available, you will see exactly what will be sent and must agree before anything leaves your browser.'}
        </span>
      </p>
    </div>
  );
}
