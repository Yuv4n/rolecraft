'use client';
import { useMemo, useState } from 'react';
import { Check, Clock, Plus } from 'lucide-react';
import { defaultSuggestedTargets, planExperience, targetFromFit, targetFromRoleText } from '../../lib/analysis/plan';
import type { PlanItem, PlanTarget } from '../../lib/analysis/plan';
import type { ExperienceKind } from '../../lib/analysis/playbook';
import { findRoles } from '../../lib/analysis/roles';
import { projectBullet } from '../../lib/analysis/tailor';
import { children, sections } from '../../lib/cv/render';
import { ROOT } from '../../lib/cv/types';
import { useStudio } from './context';

const kindLabel: Record<ExperienceKind, string> = { project: 'Project', responsibility: 'Responsibility at work', 'work experience': 'Work experience' };

function PlanCard({ item, rank }: { item: PlanItem; rank: number }) {
  const { snap, stage, decisionOf, notify } = useStudio();
  const [text, setText] = useState(item.template);
  const [planned, setPlanned] = useState(false);
  const unfilled = /\[[^\]]*\]/.test(text);
  const latestEntry = useMemo(() => {
    for (const s of sections(snap)) if (s.kind === 'experience') { const e = children(snap, s.id).find((n) => n.type === 'entry'); if (e) return e.id; }
    return null;
  }, [snap]);
  const change = useMemo(() => {
    if (unfilled || !text.trim()) return null;
    if (item.kind === 'project' || !latestEntry) return projectBullet(text.trim());
    return { kind: 'add' as const, id: `c:plan:${item.term}:${text.length}:${text.slice(0, 12)}`, parentId: latestEntry, text: text.trim(), reason: 'Adds a line you wrote after doing the work.', userSupplied: true };
  }, [text, unfilled, item, latestEntry]);
  const staged = change ? decisionOf(change.id) : undefined;
  return (
    <article className="card plan">
      <div className="plan-head">
        <span className="rank big">{rank}</span>
        <div className="plan-title">
          <div className="chips"><span className={`chip impact-${item.impact.toLowerCase()}`}>{item.impact} impact</span><span className="chip neutral">{kindLabel[item.kind]}</span><span className="chip neutral"><Clock size={11} /> about {item.hours} hours</span></div>
          <h3>{item.title}</h3>
        </div>
      </div>
      <p>{item.rationale}</p>
      <div className="terms">{item.targets.map((t) => <span key={t.name} className={`term ${t.weight >= 3 ? 'hit' : ''}`}>{t.name}{t.weight >= 3 ? ' · required' : ''}</span>)}</div>
      <h4>What this adds to your CV</h4>
      <p>{item.evidence}</p>
      <h4>How to do it</h4>
      <ol className="steps-list">{item.steps.map((s) => <li key={s}>{s}</li>)}</ol>
      <details className="draft">
        <summary>Draft the CV line (after you have done it)</summary>
        <p className="field-help">The brackets mark facts only you can supply. The button stays off until every bracket is replaced with something true.</p>
        <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} aria-label={`CV line for ${item.term}`} />
        <div className="row-end">
          {staged === 'accepted' ? (
            <button className="btn quiet" onClick={() => change && stage(change, null)}>Added. Undo</button>
          ) : (
            <button className="btn primary small" disabled={!change} onClick={() => { if (change) { stage(change, 'accepted'); notify('Added to your working copy. Review it in the CV panel.'); } }}><Plus size={14} /> Add to my CV</button>
          )}
        </div>
      </details>
      <div className="row-end">
        <button className={`btn small ${planned ? 'secondary' : 'quiet'}`} aria-pressed={planned} onClick={() => setPlanned(!planned)}>{planned ? <><Check size={14} /> Planned</> : 'Mark as planned'}</button>
      </div>
    </article>
  );
}

export function PlanView({ active }: { active: boolean }) {
  const { ws, snap, planTargetIds, setPlanTargetIds } = useStudio();
  const [filter, setFilter] = useState<'all' | ExperienceKind>('all');
  const fits = useMemo(() => (active ? findRoles(snap) : []), [active, snap]);

  const options = useMemo(() => {
    const list: { id: string; target: PlanTarget }[] = [];
    for (const id of ws.roleOrder) list.push({ id: `role:${id}`, target: targetFromRoleText(id, ws.roles[id].name, ws.roles[id].text) });
    for (const f of fits.filter((x) => x.readiness !== 'explore').slice(0, 6)) list.push({ id: `fit:${f.def.id}`, target: targetFromFit(f) });
    return list;
  }, [ws.roleOrder, ws.roles, fits]);

  const defaults = useMemo(() => {
    const saved = options.filter((o) => o.id.startsWith('role:')).map((o) => o.id);
    return saved.length ? saved : defaultSuggestedTargets(snap, 2).map((t) => `fit:${t.id}`);
  }, [options, snap]);
  const chosen = planTargetIds.length ? planTargetIds : defaults;
  const targets = options.filter((o) => chosen.includes(o.id)).map((o) => o.target);
  const items = useMemo(() => (active ? planExperience(snap, targets) : []), [active, snap, targets.map((t) => t.id).join('|')]);
  const shown = items.filter((i) => filter === 'all' || i.kind === filter);

  const toggle = (id: string) => setPlanTargetIds(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);
  return (
    <div className="workflow">
      <header className="wf-head">
        <div>
          <div className="kicker">Plan experience to strengthen my CV</div>
          <h2>What to do next, in order of likely impact</h2>
          <p className="lede">Pick the roles you are aiming for. We rank the projects, responsibilities and experience that would add the most missing evidence, and say what each would show.</p>
        </div>
      </header>

      <section className="stack">
        <div className="section-title"><h3>Target roles</h3><span className="muted">{targets.length} selected</span></div>
        <div className="chip-row" role="group" aria-label="Target roles">
          {options.map((o) => <button key={o.id} className={`toggle ${chosen.includes(o.id) ? 'on' : ''}`} aria-pressed={chosen.includes(o.id)} onClick={() => toggle(o.id)}>{chosen.includes(o.id) && <Check size={13} />}{o.target.name}<small>{o.id.startsWith('role:') ? 'saved role' : 'suggested'}</small></button>)}
        </div>
        <div className="notice"><p>Impact is a weighted count of how many chosen roles ask for a skill (required counts most), discounted if your CV already lists it, and raised if you already show related skills. It ranks effort, it does not predict hiring.</p></div>
      </section>

      <section className="stack">
        <div className="section-title">
          <h3>Recommended next steps</h3>
          <div className="chip-row">{(['all', 'project', 'responsibility', 'work experience'] as const).map((k) => <button key={k} className={`toggle small ${filter === k ? 'on' : ''}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>{k === 'all' ? 'All' : kindLabel[k]}</button>)}</div>
        </div>
        {shown.length ? shown.map((item, i) => <PlanCard key={item.term + chosen.join()} item={item} rank={i + 1} />) : (
          <div className="empty"><h4>{targets.length ? 'Nothing left to add' : 'Choose at least one role'}</h4><p>{targets.length ? 'Your CV shows evidence for every term these roles ask for. Deepen your strongest evidence with outcomes in the Review workflow.' : 'Select a saved role or a suggested role above.'}</p></div>
        )}
      </section>
    </div>
  );
}
