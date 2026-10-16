'use client';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {ArrowLeft, ArrowRight, Check, Layers, ShieldCheck, Sparkles, ArrowUpRight, FileText} from 'lucide-react';
import {sampleCV, sampleJob, sampleProjects, sampleInterests, sampleNurseCV, sampleNurseProjects, sampleNurseInterests} from '../lib/engine';
import {extractCvText, downloadCv} from '../lib/files';
import {applyTailoring} from '../lib/focus/grounding';
import {fitPlan, weeksUntil} from '../lib/focus/plan';
import {discoverOffline, outreachOffline, packageOffline} from '../lib/focus/offline';
import type {
  DiscoverResponse, Direction, Email, FocusMode, OutreachInput, OutreachResponse, PackageResponse, PlanTask, Profile, TailorResult, TraceEntry,
} from '../lib/focus/types';
import {ExperienceStep} from '../components/steps/ExperienceStep';
import {TailoredStep} from '../components/steps/TailoredStep';
import {ConsentPanel} from '../components/focus/ConsentPanel';
import {Directions} from '../components/focus/Directions';
import {PlanView} from '../components/focus/PlanView';
import {Outreach} from '../components/focus/Outreach';
import {NextAction} from '../components/focus/NextAction';
import {TracePanel} from '../components/focus/TracePanel';

const STEPS = ['Your experience', 'Directions', 'Plan', 'Tailored CV', 'Next action'];
const DAY = 86_400_000;

function isoIn(days: number) {
  return new Date(Date.now() + days * DAY).toISOString().slice(0, 10);
}

async function callFocus<T>(body: object): Promise<T> {
  const response = await fetch('/api/focus', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const data = (await response.json().catch(() => ({}))) as {error?: string};
  if (!response.ok) throw new Error(data.error || 'The analysis could not be completed.');
  return data as T;
}

export default function Home() {
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [cv, setCV] = useState('');
  const [projects, setProjects] = useState('');
  const [interests, setInterests] = useState('');
  const [hours, setHours] = useState(4);
  const [applyBy, setApplyBy] = useState(() => isoIn(42));
  const [today] = useState(() => Date.now());
  const [filename, setFilename] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

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
  const daysToApply = Math.ceil((Date.parse(applyBy + 'T00:00:00Z') - (today - (today % DAY))) / DAY);
  const weekOne = useMemo(() => {
    const plan = fitPlan(tasks, hours, weeks);
    return plan.scheduled.find((t) => t.startWeek === 1) ?? plan.scheduled[0];
  }, [tasks, hours, weeks]);

  function selectDirection(id: string) {
    setSelectedId(id);
    // A plan, CV and email built for another direction no longer apply.
    if (id !== planFor) setReached((r) => Math.min(r, 1));
  }

  function go(next: number) {
    setError('');
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
      setError(e instanceof Error ? e.message : 'Could not read this document. Paste your CV text below.');
    } finally {
      setBusy('');
    }
  }

  function loadSample(kind: 'product' | 'clinical') {
    const alex = kind === 'product';
    setCV(alex ? sampleCV : sampleNurseCV);
    setProjects(alex ? sampleProjects : sampleNurseProjects);
    setInterests(alex ? sampleInterests : sampleNurseInterests);
    setJob(alex ? sampleJob : '');
    setHours(4);
    setApplyBy(isoIn(42));
    setFilename(alex ? 'Alex Morgan · sample CV' : 'Priya Shah · sample CV');
    setDirections([]);
    setSelectedId(undefined);
    setError('');
    setAskConsent(false);
    setStep(0);
  }

  async function discover(useLive: boolean) {
    setAskConsent(false);
    setError('');
    setBusy(useLive ? 'Reading your evidence and matching it to role families…' : 'Matching your text to role families…');
    try {
      const res = useLive
        ? await callFocus<DiscoverResponse>({action: 'discover', consent: true, profile})
        : discoverOffline(profile);
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
      setError(e instanceof Error ? e.message : 'The analysis could not be completed.');
    } finally {
      setBusy('');
    }
  }

  function start() {
    setError('');
    if (live && consentFor !== consentKey) {
      setAskConsent(true);
      return;
    }
    void discover(Boolean(live));
  }

  async function buildPlan() {
    if (!direction) return;
    setError('');
    setBusy(mode === 'live' ? 'Planning tasks and tailoring your CV…' : 'Building your plan…');
    try {
      const res = mode === 'live'
        ? await callFocus<PackageResponse>({action: 'package', consent: true, profile, direction})
        : packageOffline(profile, direction);
      setTasks(res.tasks);
      setTailor(res.tailor);
      setResult(applyTailoring(cv, res.tailor.rewrites, res.tailor.emphasis));
      setPackageTrace(res.trace);
      setOutreachTrace([]);
      setPlanFor(direction.id);
      setEmail(undefined);
      go(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The plan could not be built.');
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the URL. Paste the description below.');
    } finally {
      setBusy('');
    }
  }

  async function download(format: 'docx' | 'pdf') {
    setBusy('Preparing ' + format.toUpperCase() + '…');
    setError('');
    try {
      await downloadCv(format, result);
    } catch {
      setError('The download could not be created. Please try again.');
    } finally {
      setBusy('');
    }
  }

  async function draftEmail(input: OutreachInput) {
    if (!direction) return;
    setEmailError('');
    setBusy('Drafting your email…');
    try {
      const res = mode === 'live'
        ? await callFocus<OutreachResponse>({action: 'outreach', consent: true, profile, direction, input})
        : outreachOffline(profile, direction, input);
      setEmail(res.email);
      setOutreachTrace(res.trace);
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : 'The email could not be drafted.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="app">
      <aside>
        <Link className="brand" href="/"><span className="brand-icon"><Layers size={22} /></span>rolecraft<span className="brand-dot">.</span></Link>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <div className="nav-active"><FileText size={18} /> Focus plan <span>01</span></div>
        <div className="aside-note">
          <div className="mini-orbit"><Sparkles size={20} /></div>
          <h3>Decide where to put your hours.</h3>
          <p>Every claim on screen comes from your own text.</p>
        </div>
        <div className="aside-bottom">
          <ShieldCheck size={17} />
          <span>Private by design<br /><small>Files are read in your browser. Nothing is stored.</small></span>
        </div>
      </aside>

      <div className="main">
        <header>
          <span>Workspace <span className="slash">/</span> <strong>Focus plan</strong></span>
          <span className="demo-tag"><span /> HACKATHON EDITION</span>
        </header>
        <main>
          <div className="intro">
            <div>
              <div className="eyebrow">DECIDE WHERE TO FOCUS</div>
              <h1>Know where to focus next<span>.</span></h1>
              <p>Upload your CV and say how much time you have. Get a direction, a plan that fits your hours, a tailored CV and one email to send.</p>
            </div>
            <div className="focus-sample-row">
              <button className="sample-button" onClick={() => loadSample('product')}><Sparkles size={16} /> Try a sample <ArrowUpRight size={16} /></button>
              <button className="sample-button" onClick={() => loadSample('clinical')}>Try a non-tech sample <ArrowUpRight size={16} /></button>
            </div>
          </div>

          <nav className="steps">
            {STEPS.map((s, i) => (
              <button key={s} disabled={i > reached || !!busy} onClick={() => go(i)} className={i === step ? 'current' : i < step ? 'complete' : ''}>
                <span>{i < step ? <Check size={14} /> : String(i + 1).padStart(2, '0')}</span>{s}
                {i < STEPS.length - 1 && <ArrowRight className="step-arrow" size={15} />}
              </button>
            ))}
          </nav>

          {error && <div role="alert" className="error">{error}</div>}
          {busy && <div role="status" className="loading"><span className="spinner" />{busy}</div>}

          {step === 0 && !askConsent && (
            <ExperienceStep
              cv={cv} setCV={setCV} projects={projects} setProjects={setProjects} interests={interests} setInterests={setInterests}
              hours={hours} setHours={setHours} applyBy={applyBy} setApplyBy={setApplyBy} filename={filename} busy={busy} live={live}
              onUpload={upload} onContinue={start}
            />
          )}
          {step === 0 && askConsent && (
            <ConsentPanel
              profile={profile}
              onAccept={() => { setConsentFor(consentKey); void discover(true); }}
              onUseOffline={() => { setAskConsent(false); void discover(false); }}
            />
          )}

          {step === 1 && (
            <>
              <div className="review-heading">
                <div>
                  <div className="section-kicker">STEP 02 / DIRECTIONS</div>
                  <h2>Where your experience points</h2>
                </div>
              </div>
              <Directions directions={directions} selectedId={selectedId} onSelect={selectDirection} mode={mode} />
              <TracePanel trace={trace} />
              <div className="focus-footer">
                <button className="text-button" onClick={() => go(0)}><ArrowLeft size={16} /> Back</button>
                <button className="primary" disabled={!direction || !!busy} onClick={buildPlan}>
                  Build my plan{direction ? ` for ${direction.title.toLowerCase()}` : ''} <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}

          {step === 2 && direction && (
            <>
              <PlanView direction={direction} tasks={tasks} hoursPerWeek={hours} weeks={weeks} onHoursChange={setHours} />
              <TracePanel trace={trace} />
              <div className="focus-footer">
                <button className="text-button" onClick={() => go(1)}><ArrowLeft size={16} /> Back</button>
                <button className="primary" onClick={() => go(3)}>See the tailored CV <ArrowRight size={16} /></button>
              </div>
            </>
          )}

          {step === 3 && direction && (
            <>
              <TailoredStep
                cv={cv} result={result} setResult={setResult} direction={direction} rewrites={tailor.rewrites} questions={tailor.questions}
                job={job} setJob={setJob} url={url} setUrl={setUrl} busy={busy} tab={tab} setTab={setTab} onFetchJob={fetchJob} onDownload={download}
              />
              <div className="focus-footer">
                <button className="text-button" onClick={() => go(2)}><ArrowLeft size={16} /> Back</button>
                <button className="primary" onClick={() => go(4)}>Choose your next action <ArrowRight size={16} /></button>
              </div>
            </>
          )}

          {step === 4 && direction && (
            <>
              <NextAction task={weekOne} daysToApply={daysToApply} />
              {mode === 'live' && (
                <div className="notice">
                  <ShieldCheck size={18} />
                  <p>Drafting sends your CV text and the company text you paste below to the analysis service. Nothing is stored.</p>
                </div>
              )}
              <Outreach
                direction={direction} busy={!!busy} error={emailError} email={email} mode={mode}
                onGenerate={draftEmail} onBodyChange={(body) => setEmail((e) => (e ? {...e, body} : e))}
              />
              <TracePanel trace={trace} />
              <div className="focus-footer">
                <button className="text-button" onClick={() => go(3)}><ArrowLeft size={16} /> Back</button>
              </div>
            </>
          )}

          <footer><span>Made for your next move.</span><span>Grounded in evidence. Always yours.</span></footer>
        </main>
      </div>
    </div>
  );
}
