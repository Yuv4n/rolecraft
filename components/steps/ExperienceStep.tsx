'use client';

import './steps.css';
import {ArrowRight, CheckCircle2, ShieldCheck, Upload} from 'lucide-react';

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
  onUpload: (file?: File) => void;
  onContinue: () => void;
};

export function ExperienceStep(p: Props) {
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(p.applyBy);
  const ready = p.cv.trim().length >= 80 && validDate && p.hours >= 1 && p.hours <= 40 && !p.busy;
  return (
    <div className="input-grid">
      <section className="card">
        <div className="section-kicker">STEP 01 / YOUR EXPERIENCE</div>
        <h2>Start with what you have</h2>
        <p className="muted">Add your CV, anything you are working on, and the time you can give. The rest of the flow is built from this.</p>

        <label className="drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); p.onUpload(e.dataTransfer.files[0]); }}>
          <div className="upload-icon"><Upload size={24} /></div>
          <h3>{p.filename || 'Drop your CV here'}</h3>
          <p>or <span>browse files</span> to get started</p>
          <small>PDF or DOCX · Up to 8 MB · Text-based documents</small>
          <input type="file" accept=".pdf,.docx" aria-label="Upload CV" onChange={(e) => p.onUpload(e.target.files?.[0])} />
        </label>

        <div className="field-heading">
          <label htmlFor="cv">{p.cv ? 'Review your extracted text' : 'Or paste your CV text'}</label>
          <span>{p.cv.length.toLocaleString()} / 30,000</span>
        </div>
        <textarea id="cv" value={p.cv} maxLength={30000} onChange={(e) => p.setCV(e.target.value)} placeholder="Your name, experience, education and skills…" rows={p.cv ? 12 : 4} />
        <p className="field-help">Check headings, dates and bullet breaks before continuing. You can edit everything here.</p>

        <div className="field-heading">
          <label htmlFor="projects">Projects you are working on (optional)</label>
          <span>{p.projects.length} / 4,000</span>
        </div>
        <textarea id="projects" value={p.projects} maxLength={4000} rows={3} onChange={(e) => p.setProjects(e.target.value)} placeholder="Side projects, volunteering, coursework. Include what each one is and what you did." />

        <div className="field-heading">
          <label htmlFor="interests">Interests (optional)</label>
          <span>{p.interests.length} / 1,500</span>
        </div>
        <textarea id="interests" value={p.interests} maxLength={1500} rows={2} onChange={(e) => p.setInterests(e.target.value)} placeholder="Topics or kinds of work you want more of." />

        <div className="focus-time-grid">
          <div>
            <label htmlFor="hours">Hours per week you can spare</label>
            <div className="focus-hours-row">
              <input id="hours" type="range" min={1} max={40} value={p.hours} onChange={(e) => p.setHours(Number(e.target.value))} />
              <output htmlFor="hours">{p.hours}h</output>
            </div>
          </div>
          <div>
            <label htmlFor="apply-by">Start applying by</label>
            <input id="apply-by" type="date" value={p.applyBy} onChange={(e) => p.setApplyBy(e.target.value)} />
          </div>
        </div>

        <div className="card-footer">
          <span>
            <ShieldCheck size={14} />{' '}
            {p.live === false
              ? 'Offline engine: everything stays in your browser.'
              : 'Files are read in your browser. Text is sent for analysis only after you agree.'}
          </span>
          <button disabled={!ready} className="primary" onClick={p.onContinue}>
            Find my direction <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <div className="right-column">
        <div className="expect">
          <h3>What you get</h3>
          {[
            ['01', 'Three directions', 'A best fit, an adjacent field and a stretch, each backed by quotes from your own text, with the gaps stated.'],
            ['02', 'A plan that fits your hours', 'Tasks sized to your weekly time. What does not fit is listed separately.'],
            ['03', 'A tailored CV', 'Your own wording, tightened for the direction you choose. No new facts are added.'],
            ['04', 'One email to send', 'A short draft built from a line of your CV and a line from the company.'],
          ].map(([n, t, d]) => (
            <div className="expect-row" key={n}>
              <span>{n}</span>
              <div>
                <h4>{t}</h4>
                <p>{d}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="notice">
          <CheckCircle2 size={18} />
          <p>Scores and matches are guidance for revising your CV. They do not predict whether anyone will hire you.</p>
        </div>
      </div>
    </div>
  );
}
