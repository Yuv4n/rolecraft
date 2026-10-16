'use client';
import Link from 'next/link';
import {useEffect, useMemo, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, Layers} from 'lucide-react';
import {sampleCV, sampleJob, sampleProjects, sampleInterests, sampleNurseCV, sampleNurseProjects, sampleNurseInterests} from '../lib/engine';
import {extractCvText, downloadCv} from '../lib/files';
import {applyTailoring} from '../lib/focus/grounding';
import {fitPlan, weeksUntil} from '../lib/focus/plan';
import {discoverOffline, outreachOffline, packageOffline} from '../lib/focus/offline';
import type {
  DiscoverResponse, Direction, Email, FocusMode, OutreachInput, OutreachResponse, PackageResponse, PlanTask, Profile, TailorResult, TraceEntry,
} from '../lib/focus/types';
import {Stepper} from '../components/kit/Stepper';
import {ActionBar} from '../components/kit/ActionBar';
import {Alert} from '../components/kit/Alert';
import {ExperienceStep} from '../components/steps/ExperienceStep';
import {TailoredStep} from '../components/steps/TailoredStep';
import {ConsentPanel} from '../components/focus/ConsentPanel';
import {Directions} from '../components/focus/Directions';
import {PlanView} from '../components/focus/PlanView';
import {Outreach} from '../components/focus/Outreach';
import {NextAction} from '../components/focus/NextAction';
import {TracePanel} from '../components/focus/TracePanel';

const STEPS = ['Your experience', 'Directions', 'Plan', 'Tailored CV', 'Next step'];
const DAY = 86_400_000;

const isoIn = (days: number) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10);

async function callFocus<T>(body: object): Promise<T> {
  const response = await fetch('/api/focus', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const data = (await response.json().catch(() => ({}))) as {error?: string};
  if (!response.ok) throw new Error(data.error || 'The analysis could not be completed.');
  return data as T;
}

type FieldErrors = Partial<Record<'cv' | 'hours' | 'applyBy', string>>;

function validate(cv: string, hours: number, applyBy: string): FieldErrors {
  const errors: FieldErrors = {};
  if (cv.trim().length < 80) errors.cv = 'Add at least 80 characters of CV text. Upload a file or paste it into the box.';
  if (!(hours >= 1 && hours <= 40)) errors.hours = 'Choose between 1 and 40 hours a week.';
  const date = Date.parse(applyBy + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(applyBy) || Number.isNaN(date)) errors.applyBy = 'Enter the date you want to start applying by.';
  else if (date < Date.parse(isoIn(0) + 'T00:00:00Z')) errors.applyBy = 'Choose today or a later date.';
  return errors;
}

const FIELD_IDS: Record<keyof FieldErrors, string> = {cv: 'cv', hours: 'hours', applyBy: 'apply-by'};

export default function Home() {
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [cv, setCVRaw] = useState('');
  const [projects, setProjectsRaw] = useState('');
  const [interests, setInterestsRaw] = useState('');
  const [hours, setHours] = useState(4);
  const [applyBy, setApplyBy] = useState(() => isoIn(42));
  const [today] = useState(() => Date.now());
  const [filename, setFilename] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState('');

  const [live, setLive] = useState<boolean | null>(null); // is a model configured on the server
  const [mode, setMode] = useState<FocusMode>('offline'); // how the current results were produced
  const [consentFor, setConsentFor] = useState(''); // profile text the user agreed to send
  const [askConsent, setAskConsent] = useState(false);

  const [directions, setDirections] = useState<Direction[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [tailor, setTailor] = useState<TailorResult>({rewrites: [], emphasis: [], questions: []});
  const [result, setResult] = useState('');
  const [discoverTrace, setDiscoverTrace] = useState<TraceEntry[]>([]);
  const [packageTrace, setPackageTrace] = useState<TraceEntry[]>([]);
  const [outreachTrace, setOutreachTrace] = useState<TraceEntry[]>([]);
  const [planFor, setPlanFor] = useState<string | undefined>();
  const [job, setJob] = useState('');
  const [url, setUrl] = useState('');
  const [tab, setTab] = useState('comparison');
  const [email, setEmail] = useState<Email | undefined>();
  const [emailError, setEmailError] = useState('');

  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  // Bumped whenever the profile changes, so an answer to an older request is never shown.
  const run = useRef(0);

  useEffect(() => {
    fetch('/api/focus')
      .then((r) => r.json() as Promise<{live?: boolean}>)
      .then((d) => setLive(Boolean(d.live)))
      .catch(() => setLive(false));
  }, []);

  const profile: Profile = useMemo(() => ({cv, projects, interests, hoursPerWeek: hours, applyBy}), [cv, projects, interests, hours, applyBy]);
  const consentKey = JSON.stringify([cv, projects, interests]);
  const direction = directions.find((d) => d.id === selectedId);
  const trace = [...discoverTrace, ...(planFor === selectedId ? packageTrace : []), ...outreachTrace];
  const weeks = weeksUntil(applyBy);
  const parsedDate = Date.parse(applyBy + 'T00:00:00Z');
  const daysToApply = Number.isNaN(parsedDate) ? NaN : Math.ceil((parsedDate - (today - (today % DAY))) / DAY);
  const weekOne = useMemo(() => {
    const plan = fitPlan(tasks, hours, weeks);
    return plan.scheduled.find((t) => t.startWeek === 1) ?? plan.scheduled[0];
  }, [tasks, hours, weeks]);

  // Move focus to the new page heading and keep the tab title in step with the screen.
  useEffect(() => {
    document.title = `${STEPS[step]} · Step ${step + 1} of ${STEPS.length} · Rolecraft`;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({top: 0});
    heading.current?.focus({preventScroll: true});
  }, [step, askConsent]);

  /** Any change to the text we analyse makes earlier results stale, so they are cleared and the later steps lock again. */
  function invalidate() {
    run.current += 1;
    setDirections([]);
    setSelectedId(undefined);
    setTasks([]);
    setPlanFor(undefined);
    setEmail(undefined);
    setResult('');
    setDiscoverTrace([]);
    setPackageTrace([]);
    setOutreachTrace([]);
    setReached(0);
    setAskConsent(false);
  }
  function afterEdit() {
    if (reached > 0 || directions.length) invalidate();
  }
  function setCV(v: string) {
    setCVRaw(v);
    afterEdit();
  }
  function setProjects(v: string) {
    setProjectsRaw(v);
    afterEdit();
  }
  function setInterests(v: string) {
    setInterestsRaw(v);
    afterEdit();
  }

  function go(next: number) {
    setError('');
    setNotice('');
    setStep(next);
    setReached((r) => Math.max(r, next));
  }

  async function upload(file?: File) {
    if (!file) return;
    setError('');
    setBusy('Reading your CV…');
    try {
      setCV(await extractCvText(file));
      setFilename(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read this document. Paste your CV text instead.');
    } finally {
      setBusy('');
    }
  }

  function loadSample(kind: 'product' | 'clinical') {
    const alex = kind === 'product';
    invalidate();
    setCVRaw(alex ? sampleCV : sampleNurseCV);
    setProjectsRaw(alex ? sampleProjects : sampleNurseProjects);
    setInterestsRaw(alex ? sampleInterests : sampleNurseInterests);
    setJob(alex ? sampleJob : '');
    setHours(4);
    setApplyBy(isoIn(42));
    setFilename(alex ? 'Alex Morgan · example CV' : 'Priya Shah · example CV');
    setFieldErrors({});
    setError('');
    setNotice(alex ? 'Example loaded: a product analyst.' : 'Example loaded: a nurse moving into data.');
    setStep(0);
  }

  async function discover(useLive: boolean) {
    const mine = run.current;
    setAskConsent(false);
    setError('');
    setBusy(useLive ? 'Reading your evidence and matching it to role families. This can take up to a minute.' : 'Matching your text to role families…');
    try {
      const res = useLive ? await callFocus<DiscoverResponse>({action: 'discover', consent: true, profile}) : discoverOffline(profile);
      if (mine !== run.current) return;
      if (!res.directions.length) {
        setError('No direction could be supported by your text. Add more detail about what you have done, then try again.');
        return;
      }
      setMode(useLive ? 'live' : 'offline');
      setDirections(res.directions);
      setSelectedId(res.directions[0].id);
      setDiscoverTrace(res.trace);
      setPackageTrace([]);
      setOutreachTrace([]);
      setTasks([]);
      setPlanFor(undefined);
      setEmail(undefined);
      setReached(1);
      go(1);
    } catch (e) {
      if (mine === run.current) setError(e instanceof Error ? e.message : 'The analysis could not be completed.');
    } finally {
      setBusy('');
    }
  }

  function start() {
    setError('');
    const errors = validate(cv, hours, applyBy);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    if (live && consentFor !== consentKey) {
      setAskConsent(true);
      return;
    }
    void discover(Boolean(live));
  }

  async function buildPlan() {
    if (!direction) return;
    const mine = run.current;
    const id = direction.id;
    setError('');
    setBusy(mode === 'live' ? 'Planning tasks and tailoring your CV. This can take up to a minute.' : 'Building your plan…');
    try {
      const res = mode === 'live' ? await callFocus<PackageResponse>({action: 'package', consent: true, profile, direction}) : packageOffline(profile, direction);
      if (mine !== run.current) return;
      setTasks(res.tasks);
      setTailor(res.tailor);
      setResult(applyTailoring(cv, res.tailor.rewrites, res.tailor.emphasis));
      setPackageTrace(res.trace);
      setOutreachTrace([]);
      setPlanFor(id);
      setEmail(undefined);
      go(2);
    } catch (e) {
      if (mine === run.current) setError(e instanceof Error ? e.message : 'The plan could not be built.');
    } finally {
      setBusy('');
    }
  }

  async function fetchJob() {
    setBusy('Reading job posting…');
    setError('');
    try {
      const r = await fetch('/api/job', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({url})});
      const d = (await r.json()) as {error?: string; text: string};
      if (!r.ok) throw new Error(d.error);
      setJob(d.text);
      setNotice('Job posting read. The rating now uses it.');
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Could not read the URL. Paste the description instead.');
    } finally {
      setBusy('');
    }
  }

  async function download(format: 'docx' | 'pdf') {
    setBusy('Preparing ' + format.toUpperCase() + '…');
    setError('');
    setNotice('');
    try {
      await downloadCv(format, result);
      setNotice(`Downloaded tailored-cv.${format}. Check it before you send it.`);
    } catch {
      setError('The download could not be created. Please try again.');
    } finally {
      setBusy('');
    }
  }

  async function draftEmail(input: OutreachInput) {
    if (!direction) return;
    const mine = run.current;
    setEmailError('');
    setBusy('Drafting your email…');
    try {
      const res = mode === 'live' ? await callFocus<OutreachResponse>({action: 'outreach', consent: true, profile, direction, input}) : outreachOffline(profile, direction, input);
      if (mine !== run.current) return;
      setEmail(res.email);
      setOutreachTrace(res.trace);
    } catch (e) {
      if (mine === run.current) setEmailError(e instanceof Error ? e.message : 'The email could not be drafted.');
    } finally {
      setBusy('');
    }
  }

  function startOver() {
    invalidate();
    setStep(0);
  }

  const summaryErrors = (Object.keys(fieldErrors) as (keyof FieldErrors)[]).filter((k) => fieldErrors[k]);
  const heads: {title: string; lead: string}[] = [
    {title: 'Start with what you have', lead: 'Add your CV and the time you can give. Everything else is built from this.'},
    {title: 'Where your experience points', lead: 'Choose the direction you want to prepare for. Each one is based on lines from your own text.'},
    {title: 'A plan that fits your hours', lead: 'Tasks are sized to the time you have. Change the hours to see what fits and what moves to after you apply.'},
    {title: direction ? `Your CV, aimed at ${direction.title.toLowerCase()}` : 'Your tailored CV', lead: 'Wording is tightened without adding facts. Review it, then edit it freely before you download.'},
    {title: 'Your next step', lead: 'Do this week’s task, then send one email that is grounded in your own work.'},
  ];
  const head = askConsent ? {title: 'Before we send anything', lead: 'You decide whether your text leaves this browser.'} : heads[step];
  const spinner = <span className="spinner" aria-hidden="true" />;
  const statusText = busy
    ? <span style={{display: 'inline-flex', gap: 'var(--s-2)', alignItems: 'center'}}>{spinner}{busy}</span>
    : notice && !notice.startsWith('Downloaded') ? notice : step === 1 && direction ? `Selected: ${direction.title}` : '';

  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="site-header">
        <div className="site-header__inner">
          <Link className="brand" href="/" aria-label="Rolecraft home">
            <span className="brand__icon"><Layers size={20} aria-hidden="true" /></span>
            rolecraft<span className="brand__dot">.</span>
          </Link>
          <span className={`mode-badge${directions.length ? (mode === 'live' ? ' mode-badge--live' : '') : live ? ' mode-badge--live' : ''}`}>
            <span className="mode-badge__dot" aria-hidden="true" />
            {directions.length ? (mode === 'live' ? 'Live analysis' : 'Offline engine') : live ? 'Live analysis available' : 'Offline engine'}
          </span>
        </div>
      </header>

      <div className="page">
        <Stepper steps={STEPS} current={askConsent ? 0 : step} reached={reached} disabled={!!busy} onGo={go} />

        <main id="main" className={`page__main${step === 3 && !askConsent ? ' page__main--wide' : ''}`} aria-busy={busy ? 'true' : 'false'}>
          <div className="screen-head">
            <p className="eyebrow">Step {(askConsent ? 0 : step) + 1} of {STEPS.length}</p>
            <h1 ref={heading} tabIndex={-1}>{head.title}</h1>
            <p className="lead">{head.lead}</p>
          </div>

          {summaryErrors.length > 0 && step === 0 && !askConsent && (
            <Alert kind="error" title="Fix these before you continue" focusOnMount>
              <ul>
                {summaryErrors.map((k) => (
                  <li key={k}>
                    <a
                      href={`#${FIELD_IDS[k]}`}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(FIELD_IDS[k])?.focus();
                      }}
                    >
                      {fieldErrors[k]}
                    </a>
                  </li>
                ))}
              </ul>
            </Alert>
          )}
          {error && <Alert kind="error" title="Something went wrong" focusOnMount>{error}</Alert>}

          {step === 0 && !askConsent && (
            <ExperienceStep
              cv={cv} setCV={setCV} projects={projects} setProjects={setProjects} interests={interests} setInterests={setInterests}
              hours={hours} setHours={setHours} applyBy={applyBy} setApplyBy={setApplyBy} filename={filename} busy={busy} live={live}
              errors={fieldErrors} weeks={weeks} onUpload={upload} onSample={loadSample}
            />
          )}
          {step === 0 && askConsent && (
            <ConsentPanel
              profile={profile}
              onAccept={() => {
                setConsentFor(consentKey);
                void discover(true);
              }}
              onUseOffline={() => {
                setAskConsent(false);
                void discover(false);
              }}
              onBack={() => setAskConsent(false)}
            />
          )}

          {step === 1 && (
            <>
              <Directions directions={directions} selectedId={selectedId} onSelect={setSelectedId} mode={mode} disabled={!!busy} />
              <div style={{marginTop: 'var(--s-5)'}}><TracePanel trace={trace} /></div>
            </>
          )}

          {step === 2 && direction && (
            <>
              <PlanView direction={direction} tasks={tasks} hoursPerWeek={hours} weeks={weeks} onHoursChange={setHours} />
              <div style={{marginTop: 'var(--s-5)'}}><TracePanel trace={trace} /></div>
            </>
          )}

          {step === 3 && direction && (
            <TailoredStep
              cv={cv} result={result} setResult={setResult} direction={direction} rewrites={tailor.rewrites} questions={tailor.questions}
              job={job} setJob={setJob} url={url} setUrl={setUrl} busy={busy} tab={tab} setTab={setTab} onFetchJob={fetchJob} onDownload={download}
              downloadNotice={notice.startsWith('Downloaded') ? notice : undefined}
            />
          )}

          {step === 4 && direction && (
            <div className="stack-lg">
              <NextAction task={weekOne} daysToApply={daysToApply} />
              {mode === 'live' && (
                <Alert kind="info" title="Drafting sends text for analysis">
                  Your CV text and the company text you paste below are sent to the analysis service. Nothing is stored.
                </Alert>
              )}
              <Outreach
                direction={direction} busy={!!busy} error={emailError} email={email} mode={mode}
                onGenerate={draftEmail} onBodyChange={(body) => setEmail((e) => (e ? {...e, body} : e))}
              />
              <TracePanel trace={trace} />
            </div>
          )}

          {!askConsent && (
            <ActionBar busy={!!busy} status={statusText}>
              {step > 0 && (
                <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => go(step - 1)}>
                  <ArrowLeft size={18} aria-hidden="true" /> Back
                </button>
              )}
              {step === 0 && (
                <button type="button" className="btn btn--primary" disabled={!!busy} onClick={start}>
                  Find my directions <ArrowRight size={18} aria-hidden="true" />
                </button>
              )}
              {step === 1 && (
                <button type="button" className="btn btn--primary" disabled={!direction || !!busy} onClick={buildPlan}>
                  Build my plan <ArrowRight size={18} aria-hidden="true" />
                </button>
              )}
              {step === 2 && (
                <button type="button" className="btn btn--primary" disabled={!!busy} onClick={() => go(3)}>
                  See the tailored CV <ArrowRight size={18} aria-hidden="true" />
                </button>
              )}
              {step === 3 && (
                <button type="button" className="btn btn--primary" disabled={!!busy} onClick={() => go(4)}>
                  Choose your next step <ArrowRight size={18} aria-hidden="true" />
                </button>
              )}
              {step === 4 && (
                <button type="button" className="btn btn--secondary" disabled={!!busy} onClick={startOver}>
                  Start a new plan
                </button>
              )}
            </ActionBar>
          )}
        </main>
      </div>

      <footer className="site-footer">
        <span>Every claim on screen comes from your own text.</span>
        <span>Scores are guidance for revising a CV, not predictions of hiring success.</span>
      </footer>
    </>
  );
}
