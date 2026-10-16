'use client';
import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { ContentNode, Snapshot } from '../../lib/cv/types';
import { children, sections } from '../../lib/cv/render';
import { addNode, moveWithin, removeNode, setParts, setText } from '../../lib/cv/ops';

/** Edits wording only. Order moves are layout changes and are applied through the layout order. */
export function ContentEditor({ snap, onEdit, focusNode }: { snap: Snapshot; onEdit: (s: Snapshot) => void; focusNode: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focusNode) return;
    const el = ref.current?.querySelector<HTMLElement>(`[data-edit="${focusNode}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el?.focus();
  }, [focusNode]);

  const mover = (n: ContentNode) => {
    const siblings = snap.layout.order[n.parent] ?? [];
    const i = siblings.indexOf(n.id);
    return (
      <span className="mover">
        <button className="icon-btn" aria-label="Move up" disabled={i <= 0} onClick={() => onEdit(moveWithin(snap, n.id, -1))}><ArrowUp size={14} /></button>
        <button className="icon-btn" aria-label="Move down" disabled={i >= siblings.length - 1} onClick={() => onEdit(moveWithin(snap, n.id, 1))}><ArrowDown size={14} /></button>
        <button className="icon-btn" aria-label="Delete" onClick={() => onEdit(removeNode(snap, n.id))}><Trash2 size={14} /></button>
      </span>
    );
  };

  const field = (n: ContentNode) => {
    if (n.parts) {
      return (
        <div className="parts">
          {n.parts.map((p, i) => <input key={i} data-edit={i === 0 ? n.id : undefined} aria-label={`${n.type} part ${i + 1}`} value={p} onChange={(e) => onEdit(setParts(snap, n.id, n.parts!.map((x, k) => (k === i ? e.target.value : x))))} />)}
        </div>
      );
    }
    const long = n.type === 'bullet' || n.type === 'paragraph' || n.type === 'skills';
    return long
      ? <textarea data-edit={n.id} rows={n.text.length > 90 ? 3 : 2} aria-label={n.type} value={n.text} onChange={(e) => onEdit(setText(snap, n.id, e.target.value))} />
      : <input data-edit={n.id} aria-label={n.type} value={n.text} onChange={(e) => onEdit(setText(snap, n.id, e.target.value))} />;
  };

  const addBullet = (parent: ContentNode) => {
    const last = children(snap, parent.id).filter((c) => c.type === 'bullet').at(-1);
    const [next] = addNode(snap, { type: 'bullet', parent: parent.id, text: '' }, last?.id);
    onEdit(next);
  };

  const renderChild = (n: ContentNode, depth = 0) => (
    <div key={n.id} className={`ce-node ce-${n.type}`} style={{ marginLeft: depth * 14 }}>
      <div className="ce-row">{field(n)}{mover(n)}</div>
      {n.type === 'entry' && (
        <>
          {children(snap, n.id).map((c) => renderChild(c, depth + 1))}
          <button className="btn quiet small" style={{ marginLeft: (depth + 1) * 14 }} onClick={() => addBullet(n)}><Plus size={13} /> Add bullet</button>
        </>
      )}
    </div>
  );

  return (
    <div className="content-editor" ref={ref}>
      <p className="field-help">This tab changes wording only. Appearance lives in the Layout tab, and both stay linked by the same ids.</p>
      {sections(snap).map((s) => (
        <section key={s.id} className="ce-section">
          {s.kind !== 'header' && <div className="ce-row"><input className="ce-title" data-edit={s.id} aria-label="Section heading" value={s.text} onChange={(e) => onEdit(setText(snap, s.id, e.target.value))} />{mover(s)}</div>}
          {children(snap, s.id).map((c) => renderChild(c))}
          {s.kind !== 'header' && s.kind !== 'experience' && s.kind !== 'education' && <button className="btn quiet small" onClick={() => addBullet(s)}><Plus size={13} /> Add bullet</button>}
        </section>
      ))}
    </div>
  );
}
