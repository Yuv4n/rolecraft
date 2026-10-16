'use client';
import { useMemo, useState } from 'react';
import { ArrowUpRight, Check, GitBranch, Link as LinkIcon, Plus, Trash2 } from 'lucide-react';
import { tailorCv } from '../../lib/analysis/tailor';
import type { RequirementStatus } from '../../lib/analysis/tailor';
import { FindingCard, EmptyNote, Quote, ScoreBar } from './shared';
import { useStudio } from './context';
import { fetchJobText } from './extract';

const statusLabel: Record<RequirementStatus, string> = { evidenced: 'Evidenced', partial: 'Partly evidenced', missing: 'No evidence', unrecognised: 'Read manually' };

function guessName(text: string): string {
  const first = text.split('\n').map((l) => l.trim()).find(Boolean) ?? '';
  return first.slice(0, 60) || 'Untitled role';
}

function RoleForm({ onDone }: { onDone: () => void }) {
  const { ws, dispatch, setActiveRoleId } = useStudio();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const read = async () => {
    setBusy(true);
    setError('');
    try { setText(await fetchJobText(url)); } catch (e) { setError(e instanceof Error ? e.message : 'Could not read the URL.'); } finally { setBusy(false); }
  };
  const save = () => {
    const id = `r${ws.seq + 1}`;
    dispatch({ type: 'saveRole', role: { name: name.trim() || guessName(text), text, url: url || undefined } });
    setActiveRoleId(id);
    onDone();
  };
  return (
    <div className="card form-card">
      <h3>Add a role</h3>
      <label htmlFor="role-name">Name</label>
      <input id="role-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Orbit · Product Analyst" />
      <label htmlFor="role-url">Job posting URL (optional)</label>
      <div className="url-row">
        <LinkIcon size={16} />
        <input id="role-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://company.com/careers/role" />
        <button className="btn secondary small" disabled={!url || busy} onClick={read}>{busy ? 'Reading…' : 'Read posting'}</button>
      </div>
      {error && <p role="alert" className="error-text">{error}</p>}
      <label htmlFor="role-text">Job description</label>
      <textarea id="role-text" rows={9} maxLength={20000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the responsibilities, required skills and preferred experience. Some job boards block automatic reading, and pasting works just as well." />
      <div className="row-end">
        <button className="btn quiet" onClick={onDone}>Cancel</button>
        <button className="btn primary" disabled={text.trim().length < 80} onClick={save}><Plus size={15} /> Save role</button>
      </div>
    </div>
  );
}

export function TailorView({ active }: { active: boolean }) {
  const { ws, dispatch, snap, variant, activeRoleId, setActiveRoleId, activeRole, go } = useStudio();
  const [adding, setAdding] = useState(false);
  const data = useMemo(() => (active && activeRole ? tailorCv(snap, activeRole.text) : null), [active, snap, activeRole]);
  const roles = ws.roleOrder.map((id) => ws.roles[id]);
  const variantForRole = Object.values(ws.variants).find((v) => v.roleId === activeRoleId);
  const showForm = adding || roles.length === 0;
  const rest = data ? data.changes.filter((f) => !data.top.includes(f)) : [];

  return (
    <div className="workflow">
      <header className="wf-head">
        <div>
          <div className="kicker">Tailor my CV to a specific role</div>
          <h2>Match your real experience to one role</h2>
          <p className="lede">Choose a role. We show where your CV already answers it, what evidence is missing, and the edits that would help. Every edit is grounded in a line you wrote or an answer you give.</p>
        </div>
      </header>

      <section className="stack">
        <div className="section-title"><h3>1. Choose the role</h3>{!showForm && <button className="btn secondary small" onClick={() => setAdding(true)}><Plus size={14} /> Add a role</button>}</div>
        {!showForm && (
          <div className="role-list" role="radiogroup" aria-label="Saved roles">
            {roles.map((r) => (
              <div key={r.id} className={`role-pick ${r.id === activeRoleId ? 'selected' : ''}`}>
                <button role="radio" aria-checked={r.id === activeRoleId} onClick={() => setActiveRoleId(r.id)}>
                  <span className="radio-dot">{r.id === activeRoleId && <Check size={12} />}</span>
                  <span><strong>{r.name}</strong><small>{r.text.length.toLocaleString()} characters{Object.values(ws.variants).some((v) => v.roleId === r.id) ? ' · has a CV variant' : ''}</small></span>
                </button>
                <button className="icon-btn" aria-label={`Remove ${r.name}`} onClick={() => { if (confirm(`Remove “${r.name}”? Its CV variant, if any, stays in history.`)) { dispatch({ type: 'removeRole', id: r.id }); if (activeRoleId === r.id) setActiveRoleId(null); } }}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}
        {showForm && <RoleForm onDone={() => setAdding(false)} />}
      </section>

      {!activeRole && !showForm && <EmptyNote title="Pick a role to begin">Select a saved role above, or add a new one by pasting a job description.</EmptyNote>}

      {data && activeRole && (
        <>
          <section className="card summary-card">
            <div>
              <h3>{activeRole.name}</h3>
              <p className="muted">{data.coverage.matched} of {data.coverage.total} recognised role terms already appear in your CV. This counts vocabulary and is not a prediction of how an employer will respond.</p>
              <ScoreBar value={data.coverage.total ? Math.round((data.coverage.matched / data.coverage.total) * 100) : 0} label="Term coverage" />
            </div>
            <div className="variant-callout">
              <GitBranch size={18} />
              {variant.roleId === activeRoleId ? (
                <p>Edits go to <strong>{variant.name}</strong>. Your general CV and the original import are untouched.</p>
              ) : variantForRole ? (
                <><p>You have a variant for this role.</p><button className="btn secondary small" onClick={() => dispatch({ type: 'switchVariant', id: variantForRole.id })}>Switch to “{variantForRole.name}”</button></>
              ) : (
                <><p>Edits currently go to <strong>{variant.name}</strong>. Keep a role-specific copy so your general CV stays as it is.</p><button className="btn primary small" onClick={() => dispatch({ type: 'newVariant', name: activeRole.name, roleId: activeRole.id, now: Date.now() })}>Create a variant for this role</button></>
              )}
            </div>
          </section>

          <section className="stack">
            <div className="section-title"><h3>2. Highest-impact changes</h3><span className="muted">{data.top.length} to start with</span></div>
            {data.top.length ? data.top.map((f, i) => <FindingCard key={f.id} finding={f} defaultOpen={i === 0} />) : <EmptyNote title="Nothing urgent">Your CV already answers this role well by the checks we run.</EmptyNote>}
          </section>

          <section className="stack">
            <div className="section-title"><h3>3. Requirement by requirement</h3><span className="muted">{data.requirements.length} lines read from the posting</span></div>
            <div className="card flush">
              {data.requirements.map((r, i) => (
                <details key={i} className={`req req-${r.status}`}>
                  <summary>
                    <span className={`chip ${r.status === 'evidenced' ? 'good' : r.status === 'missing' ? 'warn' : 'neutral'}`}>{statusLabel[r.status]}</span>
                    <span className="req-text">{r.text}</span>
                    <small className="req-cat">{r.category}</small>
                  </summary>
                  <div className="req-body">
                    {r.terms.length ? <p className="muted">Recognised terms: {r.terms.map((t) => <span key={t} className={`term ${r.matched.includes(t) ? 'hit' : 'miss'}`}>{t}</span>)}</p> : <p className="muted">No recognised terms in this line. Read it yourself and decide whether you have matching experience.</p>}
                    {r.evidence.map((e) => <Quote key={e.nodeId}>{e.text}</Quote>)}
                    {r.terms.length > 0 && !r.evidence.length && <p className="field-help">No bullet in your CV supports this. See “Missing evidence” below. It is a gap to consider, not something to claim.</p>}
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section className="stack">
            <div className="section-title"><h3>4. Your most relevant experience</h3></div>
            {data.relevant.length ? (
              <div className="card flush">
                {data.relevant.slice(0, 6).map((r, i) => (
                  <div className="relevant" key={r.node.id}>
                    <span className="rank">{i + 1}</span>
                    <div><p>{r.node.text}</p><small className="muted">{r.entryTitle}</small><div className="terms">{r.terms.map((t) => <span key={t} className="term hit">{t}</span>)}</div></div>
                  </div>
                ))}
              </div>
            ) : <EmptyNote title="No bullets match yet">None of your bullets mention terms from this role.</EmptyNote>}
          </section>

          <section className="stack">
            <div className="section-title"><h3>5. Missing evidence</h3><span className="muted">Answer only where you have real experience</span></div>
            {data.missing.length ? data.missing.map((f) => <FindingCard key={f.id} finding={f} />) : <EmptyNote title="No gaps found">Every recognised term in the posting appears in your CV.</EmptyNote>}
          </section>

          {rest.length > 0 && (
            <section className="stack">
              <div className="section-title"><h3>6. More suggested edits</h3><span className="muted">{rest.length}</span></div>
              {rest.map((f) => <FindingCard key={f.id} finding={f} />)}
            </section>
          )}

          <div className="next-steps">
            <button className="btn secondary" onClick={() => go('review')}>Review the whole CV for this role <ArrowUpRight size={15} /></button>
            <button className="btn secondary" onClick={() => go('plan')}>Plan experience for the gaps <ArrowUpRight size={15} /></button>
          </div>
        </>
      )}
    </div>
  );
}
