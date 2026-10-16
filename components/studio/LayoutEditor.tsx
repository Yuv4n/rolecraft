'use client';
import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { NodeLayout, Role, Snapshot, TextStyle } from '../../lib/cv/types';
import { children, nodeText, sections } from '../../lib/cv/render';
import { moveWithin, setOverride, setPage, setRoleStyle } from '../../lib/cv/ops';

const roleNames: Record<Role, string> = { name: 'Name', headline: 'Headline', contact: 'Contact line', sectionTitle: 'Section headings', entry: 'Role and school lines', bullet: 'Bullets', paragraph: 'Paragraphs', skills: 'Skills list' };

function Num({ label, value, onChange, step = 1, min = 0, max = 99 }: { label: string; value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number }) {
  return (
    <label className="num"><span>{label}</span>
      <input type="number" value={value} step={step} min={min} max={max} onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n))); }} />
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="check"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}</label>;
}

function Group({ title, children: body, open }: { title: string; children: ReactNode; open?: boolean }) {
  return <details className="lay-group" open={open}><summary>{title}</summary><div className="lay-body">{body}</div></details>;
}

/** Edits appearance only. Content nodes are never touched, so wording and layout stay independent. */
export function LayoutEditor({ snap, onEdit }: { snap: Snapshot; onEdit: (s: Snapshot) => void }) {
  const { page, styles, overrides } = snap.layout;
  const style = (role: Role, patch: Partial<TextStyle>) => onEdit(setRoleStyle(snap, role, patch));
  const override = (id: string, patch: NodeLayout) => onEdit(setOverride(snap, id, patch));
  const secs = sections(snap);
  return (
    <div className="layout-editor">
      <p className="field-help">This tab changes appearance only. Your wording is not touched.</p>
      <Group title="Page" open>
        <div className="lay-grid">
          <label className="num"><span>Paper</span><select value={page.size} onChange={(e) => onEdit(setPage(snap, { size: e.target.value as 'A4' | 'Letter' }))}><option>A4</option><option>Letter</option></select></label>
          <label className="num"><span>Columns</span><select value={page.columns} onChange={(e) => onEdit(setPage(snap, { columns: Number(e.target.value) as 1 | 2 }))}><option value={1}>1 (best for ATS)</option><option value={2}>2</option></select></label>
          <Num label="Column gap mm" value={page.columnGap} onChange={(n) => onEdit(setPage(snap, { columnGap: n }))} max={30} />
          {(['top', 'right', 'bottom', 'left'] as const).map((k) => <Num key={k} label={`Margin ${k} mm`} value={page.margins[k]} max={50} onChange={(n) => onEdit(setPage(snap, { margins: { ...page.margins, [k]: n } }))} />)}
        </div>
      </Group>
      <Group title="Typography and spacing">
        {(Object.keys(roleNames) as Role[]).map((role) => {
          const s = styles[role];
          return (
            <fieldset key={role} className="lay-role">
              <legend>{roleNames[role]}</legend>
              <div className="lay-grid">
                <label className="num"><span>Font</span><select value={s.font} onChange={(e) => style(role, { font: e.target.value as TextStyle['font'] })}><option value="sans">Sans (Arial)</option><option value="serif">Serif (Times)</option></select></label>
                <Num label="Size pt" value={s.size} step={0.5} min={6} max={40} onChange={(n) => style(role, { size: n })} />
                <label className="num"><span>Align</span><select value={s.align} onChange={(e) => style(role, { align: e.target.value as TextStyle['align'] })}><option>left</option><option>center</option><option>right</option><option>justify</option></select></label>
                <Num label="Space before pt" value={s.spaceBefore} step={0.5} max={60} onChange={(n) => style(role, { spaceBefore: n })} />
                <Num label="Space after pt" value={s.spaceAfter} step={0.5} max={60} onChange={(n) => style(role, { spaceAfter: n })} />
                <Num label="Line height" value={s.lineHeight} step={0.05} min={0.9} max={2.5} onChange={(n) => style(role, { lineHeight: n })} />
                <Num label="Indent mm" value={s.indent} step={0.5} max={40} onChange={(n) => style(role, { indent: n })} />
                <label className="num"><span>Colour</span><input type="color" value={s.color} onChange={(e) => style(role, { color: e.target.value })} /></label>
              </div>
              <div className="lay-checks">
                <Check label="Bold" checked={s.bold} onChange={(v) => style(role, { bold: v })} />
                <Check label="Italic" checked={s.italic} onChange={(v) => style(role, { italic: v })} />
                {role === 'sectionTitle' && <Check label="Capitals" checked={s.uppercase} onChange={(v) => style(role, { uppercase: v })} />}
                {role === 'bullet' && <label className="num inline"><span>Bullet</span><select value={s.bulletGlyph} onChange={(e) => style(role, { bulletGlyph: e.target.value })}>{['•', '-', '–', '*', '▪'].map((g) => <option key={g}>{g}</option>)}</select></label>}
                {(role === 'entry' || role === 'contact') && <label className="num inline"><span>Separator</span><select value={s.separator} onChange={(e) => style(role, { separator: e.target.value })}>{[' | ', ' · ', ' — ', ', '].map((g) => <option key={g} value={g}>{g.trim() || 'space'}</option>)}</select></label>}
              </div>
            </fieldset>
          );
        })}
      </Group>
      <Group title="Section order and breaks">
        <ol className="lay-sections">
          {secs.map((s, i) => (
            <li key={s.id}>
              <div className="lay-line">
                <strong>{s.kind === 'header' ? 'Name and contact' : s.text}</strong>
                <span className="mover">
                  <button className="icon-btn" aria-label={`Move ${s.text || 'header'} up`} disabled={i === 0} onClick={() => onEdit(moveWithin(snap, s.id, -1))}><ArrowUp size={14} /></button>
                  <button className="icon-btn" aria-label={`Move ${s.text || 'header'} down`} disabled={i === secs.length - 1} onClick={() => onEdit(moveWithin(snap, s.id, 1))}><ArrowDown size={14} /></button>
                </span>
              </div>
              <div className="lay-checks">
                <Check label="Page break before" checked={!!overrides[s.id]?.pageBreakBefore} onChange={(v) => override(s.id, { pageBreakBefore: v || undefined })} />
                {page.columns > 1 && <Check label="Column break before" checked={!!overrides[s.id]?.columnBreakBefore} onChange={(v) => override(s.id, { columnBreakBefore: v || undefined })} />}
                {s.kind !== 'header' && <Check label="Hide heading" checked={!!overrides[s.id]?.hidden} onChange={(v) => override(s.id, { hidden: v || undefined })} />}
                {s.kind !== 'header' && <Check label="Capitals" checked={overrides[s.id]?.uppercase ?? styles.sectionTitle.uppercase} onChange={(v) => override(s.id, { uppercase: v })} />}
              </div>
              {children(snap, s.id).filter((c) => c.type === 'entry').map((e) => (
                <div key={e.id} className="lay-line sub"><span>{nodeText(e, snap.layout).split(' | ').slice(0, 2).join(' · ')}</span><Check label="Page break before" checked={!!overrides[e.id]?.pageBreakBefore} onChange={(v) => override(e.id, { pageBreakBefore: v || undefined })} /></div>
              ))}
            </li>
          ))}
        </ol>
        <p className="field-help">Order lives in the layout, so moving a section never rewrites its text.</p>
      </Group>
    </div>
  );
}
