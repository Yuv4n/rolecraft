'use client';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ExternalLink, MapPin, Search, ShieldCheck, X } from 'lucide-react';
import { planCareers } from '../../lib/analysis/careers';
import type { IndustryRec, PathRec, RoleRec } from '../../lib/analysis/careers';
import { rankJobs } from '../../lib/analysis/jobmatch';
import type { JobMatch } from '../../lib/analysis/jobmatch';
import { samplePostings } from '../../lib/jobs/samples';
import type { JobPosting, SourceStatus } from '../../lib/jobs/types';
import { Quote, ScoreBar } from './shared';
import { useStudio } from './context';

const readinessLabel = { ready: 'Ready now', stretch: 'Stretch', explore: 'Little overlap' } as const;
const readinessClass = { ready: 'good', stretch: 'warn', explore: 'neutral' } as const;

function RoleRow({ role, checked, onToggle }: { role: RoleRec; checked: boolean; onToggle: () => void }) {
  return (
    <div className="role-row">
      <label className="check-card">
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <span className="role-row-main">
          <strong>{role.title}</strong>
          <span className={`chip ${readinessClass[role.readiness]}`}>{readinessLabel[role.readiness]}</span>
          <span className="muted">{role.fit}% of vocabulary supported</span>
        </span>
      </label>
      <p className="role-why">{role.why}{role.gaps.length > 0 && <> Still to show: {role.gaps.map((g) => g.term).join(', ')}.</>}</p>
    </div>
  );
}

function Industry({ ind, selected, toggle }: { ind: IndustryRec; selected: Set<string>; toggle: (q: string) => void }) {
  return (
    <div className="industry">
      <div className="industry-head">
        <h5>{ind.name}</h5>
        <span className="muted">{ind.fit}% fit</span>
      </div>
      <p className="muted">{ind.blurb}</p>
      <ul className="reasons">{ind.reasoning.map((r) => <li key={r}>{r}</li>)}</ul>
      {ind.roles.map((r) => <RoleRow key={r.query} role={r} checked={selected.has(r.query)} onToggle={() => toggle(r.query)} />)}
    </div>
  );
}

function PathCard({ path, rank, selected, toggle }: { path: PathRec; rank: number; selected: Set<string>; toggle: (q: string) => void }) {
  return (
    <details className="card path" open={rank < 2}>
      <summary>
        <span className="rank big">{rank + 1}</span>
        <span className="path-title"><h3>{path.title}</h3><small>{path.summary}</small></span>
        <span className="path-fit"><strong>{path.fit}%</strong><span className={`chip ${readinessClass[path.readiness]}`}>{readinessLabel[path.readiness]}</span></span>
      </summary>
      <div className="path-body">
        <ScoreBar value={path.fit} label={`${path.title} fit`} />
        <h4>Why this path</h4>
        <ul className="reasons">{path.reasoning.map((r) => <li key={r}>{r}</li>)}</ul>
        {path.evidence.slice(0, 3).map((e) => <div key={e.term}><span className="term hit">{e.term}</span><Quote>{e.quote}</Quote></div>)}
        {path.gaps.length > 0 && (<><h4>Evidence that would open more doors</h4><ul className="reasons">{path.gaps.map((g) => <li key={g.term}><strong>{g.term}.</strong> {g.closeWith}</li>)}</ul></>)}
        <h4>Industries and specific roles</h4>
        <p className="field-help">Tick the roles you want to search live postings for.</p>
        <div className="stack tight">{path.industries.map((i) => <Industry key={i.name} ind={i} selected={selected} toggle={toggle} />)}</div>
      </div>
    </details>
  );
}

const when = (t: number | null) => { if (!t) return ''; const d = Math.round((Date.now() - t) / 86400000); return d <= 0 ? 'today' : d === 1 ? '1 day ago' : d < 60 ? `${d} days ago` : ''; };

function JobCard({ m }: { m: JobMatch }) {
  const { ws, dispatch, setActiveRoleId, go, notify } = useStudio();
  const p = m.posting;
  const tailor = () => {
    const name = `${p.title} · ${p.company}`.slice(0, 80);
    const existing = Object.values(ws.roles).find((r) => r.name === name);
    const text = `${p.title}\n${p.company}\n\n${p.description}`;
    if (existing) setActiveRoleId(existing.id);
    else { const id = `r${ws.seq + 1}`; dispatch({ type: 'saveRole', role: { name, text, url: p.sample ? undefined : p.url } }); setActiveRoleId(id); }
    notify('Saved as a role. Tailoring starts from this posting.');
    go('tailor');
  };
  return (
    <article className="card job">
      <div className="job-head">
        <div>
          <h4>{p.title}</h4>
          <p className="muted"><strong>{p.company}</strong> · <MapPin size={12} /> {p.location}{p.remote && <span className="chip neutral">Remote</span>} {when(p.postedAt) && <>· {when(p.postedAt)}</>} · via {p.source}</p>
        </div>
        <div className="job-score"><strong>{m.score}</strong><small>match</small></div>
      </div>
      <ScoreBar value={m.score} label={`${p.title} match`} />
      <h5>Why it fits</h5>
      <ul className="reasons">{m.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
      {m.caveats.length > 0 && <ul className="reasons caveats">{m.caveats.map((c) => <li key={c}>{c}</li>)}</ul>}
      {m.matched.length > 0 && (
        <details className="draft"><summary>The CV lines behind the match</summary>{m.matched.slice(0, 4).map((x) => <div key={x.term}><span className="term hit">{x.term}</span><Quote>{x.quote}</Quote></div>)}</details>
      )}
      <details className="draft"><summary>Read the posting text</summary><pre className="posting-text">{p.description.slice(0, 2500)}</pre></details>
      <div className="row-end">
        {!p.sample && <a className="btn secondary small" href={p.url} target="_blank" rel="noopener noreferrer">View posting <ExternalLink size={13} /></a>}
        <button className="btn primary small" onClick={tailor}>Tailor my CV to this posting <ArrowUpRight size={14} /></button>
      </div>
    </article>
  );
}

export function CareersView({ active }: { active: boolean }) {
  const { snap } = useStudio();
  const plan = useMemo(() => (active ? planCareers(snap) : null), [active, snap]);
  const [queries, setQueries] = useState<string[] | null>(null);
  const [location, setLocation] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [greenhouse, setGreenhouse] = useState('');
  const [lever, setLever] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ postings: JobPosting[]; sources: SourceStatus[]; sample: boolean } | null>(null);
  const [minScore, setMinScore] = useState(0);

  // Preselect the best roles of the best path the first time the plan is ready.
  useEffect(() => {
    if (plan && queries === null) {
      const first = plan.paths[0]?.industries[0]?.roles ?? [];
      setQueries(first.slice(0, 3).map((r) => r.query));
    }
  }, [plan, queries]);

  const selected = useMemo(() => new Set(queries ?? []), [queries]);
  const toggle = (q: string) => setQueries((prev) => { const cur = prev ?? []; return cur.includes(q) ? cur.filter((x) => x !== q) : [...cur, q].slice(0, 6); });
  const titleFor = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of plan?.paths ?? []) for (const i of p.industries) for (const r of i.roles) map.set(r.query, r.title);
    return map;
  }, [plan]);
  const targets = (queries ?? []).map((q) => titleFor.get(q) ?? q);
  const matches = useMemo(() => (result && active ? rankJobs(snap, result.postings, { targets }) : []), [result, snap, active, targets.join('|')]);
  const shown = matches.filter((m) => m.score >= minScore);

  const tokens = (s: string) => s.split(/[,\s]+/).map((t) => t.trim().toLowerCase()).filter(Boolean);
  const search = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queries, location, remoteOnly, boards: { greenhouse: tokens(greenhouse), lever: tokens(lever) } }) });
      const d = (await r.json()) as { error?: string; postings?: JobPosting[]; sources?: SourceStatus[] };
      if (!r.ok || !d.postings) throw new Error(d.error || 'The search failed.');
      setResult({ postings: d.postings, sources: d.sources ?? [], sample: false });
    } catch (e) { setError(e instanceof Error ? e.message : 'The search failed.'); }
    finally { setBusy(false); }
  };

  if (!plan) return null;
  const sent = { queries: queries ?? [], location, remoteOnly };
  return (
    <div className="workflow">
      <header className="wf-head">
        <div>
          <div className="kicker">Explore careers and find jobs</div>
          <h2>From your experience to specific roles and live postings</h2>
          <p className="lede">We start with what your CV supports, suggest career paths, then industries and specific roles inside them, each with the reasoning. When you are ready, we search public job feeds and rank real postings against your CV.</p>
        </div>
      </header>
      <div className="notice"><p><ShieldCheck size={14} /> Your CV stays in this browser. Searches send only the role keywords, place and board names shown below. Ranking happens on your device. Matching uses a fixed vocabulary, so treat it as a shortlist to read, not a verdict.</p></div>

      <section className="stack">
        <div className="section-title"><h3>1. Career paths that fit you</h3><span className="muted">{plan.years !== null ? `${plan.years} years of dated experience` : 'No dated roles found'}</span></div>
        {plan.paths.slice(0, 5).map((p, i) => <PathCard key={p.id} path={p} rank={i} selected={selected} toggle={toggle} />)}
        {plan.paths.length > 5 && (
          <details className="card flush more-paths"><summary>{plan.paths.length - 5} more paths with less overlap</summary><div className="stack tight pad">{plan.paths.slice(5).map((p, i) => <PathCard key={p.id} path={p} rank={i + 5} selected={selected} toggle={toggle} />)}</div></details>
        )}
      </section>

      <section className="stack">
        <div className="section-title"><h3>2. Find live job postings</h3></div>
        <div className="card form-card">
          <h4>Roles to search</h4>
          {(queries ?? []).length ? (
            <div className="chip-row">{(queries ?? []).map((q) => <span key={q} className="toggle on small">{titleFor.get(q) ?? q}<button aria-label={`Remove ${q}`} onClick={() => toggle(q)}><X size={12} /></button></span>)}</div>
          ) : <p className="muted">Tick roles above to choose what to search for.</p>}
          <div className="two-col">
            <div><label htmlFor="job-loc">Location (optional)</label><input id="job-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. London" maxLength={60} /></div>
            <label className="check inline-check"><input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} /> Remote only</label>
          </div>
          <details className="draft"><summary>Add specific company job boards (optional)</summary>
            <p className="field-help">Companies that publish on Greenhouse or Lever have open boards. Enter the name from the board address, for example “stripe” from boards.greenhouse.io/stripe. Separate several with commas.</p>
            <label htmlFor="gh">Greenhouse boards</label><input id="gh" value={greenhouse} onChange={(e) => setGreenhouse(e.target.value)} placeholder="stripe, airbnb" />
            <label htmlFor="lv">Lever boards</label><input id="lv" value={lever} onChange={(e) => setLever(e.target.value)} placeholder="spotify" />
          </details>
          <p className="field-help">Sent: {JSON.stringify(sent)}. Not sent: your CV.</p>
          <div className="row-end">
            <button className="btn secondary" onClick={() => setResult({ postings: samplePostings, sources: [{ name: 'Built-in sample postings (fictional)', ok: true, count: samplePostings.length }], sample: true })}>Show sample postings</button>
            <button className="btn primary" disabled={busy || !(queries ?? []).length} onClick={search}><Search size={15} /> {busy ? 'Searching…' : 'Search job boards'}</button>
          </div>
          {error && <p role="alert" className="error-text">{error}</p>}
        </div>

        {result && (
          <>
            <div className="card sources">
              <h4>Sources</h4>
              <ul>{result.sources.map((s) => <li key={s.name}><span className={`chip ${s.ok ? 'good' : 'warn'}`}>{s.ok ? `${s.count} found` : 'Unavailable'}</span> {s.name}{s.error ? <span className="muted"> · {s.error}</span> : null}</li>)}</ul>
              {result.sample && <p className="field-help">These are fictional postings for a demo. They are not real vacancies and have no links.</p>}
              {!result.sample && result.postings.length === 0 && <p className="field-help">No postings came back. Job boards limit automated reads, and the open feeds cover mostly remote and tech roles. Try broader keywords, remove the location, add company boards, or paste a posting in the Tailor workflow.</p>}
            </div>
            {matches.length > 0 && (
              <div className="section-title"><h3>{shown.length} of {matches.length} postings, best match first</h3>
                <label className="inline-select">Minimum match <select value={minScore} onChange={(e) => setMinScore(Number(e.target.value))}><option value={0}>Any</option><option value={30}>30</option><option value={50}>50</option><option value={65}>65</option></select></label>
              </div>
            )}
            {shown.map((m) => <JobCard key={m.posting.id} m={m} />)}
          </>
        )}
      </section>
    </div>
  );
}
