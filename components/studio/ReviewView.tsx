'use client';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, Info } from 'lucide-react';
import { dimensionLabels, groups, reviewCv } from '../../lib/analysis/review';
import type { Dimension, Finding, GroupScore, Review } from '../../lib/analysis/review';
import { renderBlocks } from '../../lib/cv/render';
import { FindingCard, ScoreBar, SeverityChip } from './shared';
import { useStudio } from './context';

function ScoreCard({ score, onJump }: { score: GroupScore; onJump: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="card score-card">
      <div className="title-row"><h4>{score.label}</h4><span className="weight">weight {score.weight}</span></div>
      <div className="score-display">{score.score === null ? '–' : score.score}<small>{score.score === null ? '' : '/100'}</small></div>
      <ScoreBar value={score.score} label={score.label} />
      <p className="muted">{score.note}</p>
      <button className="disclose" aria-expanded={open} onClick={() => setOpen(!open)}>How this is scored <ChevronDown size={14} className={open ? 'flip' : ''} /></button>
      {open && (
        <div className="score-detail">
          <p>{score.criteria}</p>
          {score.deductions.length ? (
            <ul>{score.deductions.map((d) => <li key={d.findingId}><button className="link" onClick={() => onJump(d.findingId)}>{d.title}</button>{d.points ? <span className="minus">−{d.points}</span> : null}</li>)}</ul>
          ) : <p className="muted">No deductions.</p>}
        </div>
      )}
    </section>
  );
}

type Tab = 'sections' | 'lines' | 'checks';

export function ReviewView({ active }: { active: boolean }) {
  const { ws, snap, activeRoleId } = useStudio();
  const [roleId, setRoleId] = useState<string | null>(activeRoleId);
  const [tab, setTab] = useState<Tab>('sections');
  const [focus, setFocus] = useState<string | null>(null);
  const [openLine, setOpenLine] = useState<string | null>(null);
  useEffect(() => { setRoleId(activeRoleId); }, [activeRoleId]);
  const roleText = roleId ? ws.roles[roleId]?.text : undefined;
  const review: Review | null = useMemo(() => (active ? reviewCv(snap, { roleText }) : null), [active, snap, roleText]);

  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(`finding-${focus}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focus, tab]);

  if (!review) return null;
  const byNode = new Map<string, Finding[]>();
  for (const f of review.findings) if (f.nodeId) byNode.set(f.nodeId, [...(byNode.get(f.nodeId) ?? []), f]);
  const jump = (id: string) => { setTab('checks'); setFocus(id); };
  const wrap = (f: Finding) => <FindingCard key={f.id} finding={f} defaultOpen={focus === f.id} />;
  const anchored = (f: Finding) => <div id={`finding-${f.id}`} key={f.id}><FindingCard finding={f} defaultOpen={focus === f.id} /></div>;
  const docFindings = review.findings.filter((f) => f.scope === 'document');
  const blocks = renderBlocks(snap);
  const counts = { high: review.findings.filter((f) => f.severity === 'high').length, medium: review.findings.filter((f) => f.severity === 'medium').length, low: review.findings.filter((f) => f.severity === 'low').length };

  return (
    <div className="workflow">
      <header className="wf-head">
        <div>
          <div className="kicker">Review and improve my CV</div>
          <h2>How strong is this CV, and what to fix first</h2>
          <p className="lede">A full read of the CV against {Object.keys(dimensionLabels).length - (review.hasRole ? 0 : 1)} checks. The most useful changes come first, and every finding explains itself and shows a concrete improvement.</p>
        </div>
      </header>

      <section className="card overview">
        <div className="overall">
          <span className="score-big">{review.overall ?? '–'}<small>/100</small></span>
          <p>Revision guidance score</p>
          <p className="muted">{counts.high} high impact · {counts.medium} worth fixing · {counts.low} polish</p>
        </div>
        <div className="overview-side">
          <label htmlFor="review-role">Target role</label>
          <select id="review-role" value={roleId ?? ''} onChange={(e) => setRoleId(e.target.value || null)}>
            <option value="">None. Review the CV on its own.</option>
            {ws.roleOrder.map((id) => <option key={id} value={id}>{ws.roles[id].name}</option>)}
          </select>
          <p className="field-help">{review.hasRole ? 'Relevance is scored against this role.' : 'Pick a role to add a relevance score.'}</p>
          <details className="how">
            <summary><Info size={14} /> How the score works</summary>
            <p>Each group starts at 100 and loses points for the findings listed under it: 12 for high impact, 6 for worth fixing, 3 for polish, with at most 40 points lost per check. Relevance is the share of the role’s recognised terms your CV supports. The overall score is the weighted average of the scored groups ({groups.map((g) => `${g.label} ${g.weight}`).join(', ')}).</p>
            <p>The score guides revision. It is not a prediction of hiring success or a simulation of any employer’s tracking system.</p>
          </details>
        </div>
      </section>

      <div className="score-grid">{review.scores.map((s) => <ScoreCard key={s.id} score={s} onJump={jump} />)}</div>

      <section className="stack">
        <div className="section-title"><h3>Start with these {review.top.length}</h3><span className="muted">highest impact first</span></div>
        {review.top.length ? review.top.map((f, i) => <FindingCard key={f.id} finding={f} defaultOpen={i === 0} />) : <div className="empty"><h4>Nothing to fix</h4><p>No findings from the checks below.</p></div>}
      </section>

      <section className="stack">
        <div className="section-title"><h3>Explore every finding</h3><span className="muted">{review.findings.length} in total</span></div>
        <div className="tabs" role="tablist">
          {([['sections', 'By section'], ['lines', 'Line by line'], ['checks', 'By check']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'selected' : ''} onClick={() => setTab(k)}>{l}</button>)}
        </div>

        {tab === 'sections' && (
          <div className="stack">
            {docFindings.length > 0 && (
              <section className="card"><h4>Whole document</h4><div className="stack tight">{docFindings.map(wrap)}</div></section>
            )}
            {review.sections.map((s) => {
              const own = review.findings.filter((f) => f.sectionId === s.id && f.scope !== 'document');
              return (
                <details key={s.id} className="card section-card" open={own.length > 0 && own.length <= 3}>
                  <summary>
                    <h4>{s.title}</h4>
                    <span className="meta">{s.words} words{s.bullets ? ` · ${s.quantified} of ${s.bullets} bullets quantified` : ''}</span>
                    <span className="dots">{(['high', 'medium', 'low'] as const).map((k) => s.findings[k] > 0 && <span key={k} className={`chip sev-${k}`}>{s.findings[k]}</span>)}{own.length === 0 && <CheckCircle2 size={16} className="ok" />}</span>
                  </summary>
                  <div className="stack tight">{own.length ? own.map(wrap) : <p className="muted">No findings in this section.</p>}</div>
                </details>
              );
            })}
          </div>
        )}

        {tab === 'lines' && (
          <div className="card flush lines">
            {blocks.map((b) => {
              const fs = byNode.get(b.nodeId) ?? [];
              const open = openLine === b.nodeId;
              return (
                <div key={b.nodeId} className={`line role-${b.role} ${fs.length ? 'flagged' : ''}`}>
                  <button className="line-text" disabled={!fs.length} aria-expanded={open} onClick={() => setOpenLine(open ? null : b.nodeId)}>
                    <span>{b.prefix ? `${b.prefix} ` : ''}{b.text || ' '}</span>
                    <span className="dots">{fs.map((f) => <SeverityChip key={f.id} severity={f.severity} />)}</span>
                  </button>
                  {open && <div className="stack tight line-findings">{fs.map(wrap)}</div>}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'checks' && (
          <div className="stack">
            {review.checks.map((c) => {
              const fs = review.findings.filter((f) => f.dimension === (c.dimension as Dimension));
              return (
                <details key={c.dimension} className="card section-card" open={fs.some((f) => f.id === focus)}>
                  <summary><h4>{c.label}</h4><span className="dots">{c.count ? <span className="chip neutral">{c.count}</span> : <><CheckCircle2 size={16} className="ok" /> <small className="muted">Passed</small></>}</span></summary>
                  <div className="stack tight">{fs.map(anchored)}</div>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
