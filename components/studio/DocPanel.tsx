'use client';
import { useMemo, useState } from 'react';
import { Download, Eye, FileText, Layers, Lock, Save, Undo2 } from 'lucide-react';
import { applyChange, diffSnapshots } from '../../lib/cv/ops';
import { acceptedCount, isDirty } from '../../lib/cv/workspace';
import { exportDocx, exportPdf } from '../../lib/cv/export';
import { ContentEditor } from './ContentEditor';
import { HistoryPanel } from './HistoryPanel';
import { LayoutEditor } from './LayoutEditor';
import { PaperPreview, PdfPreview } from './PaperPreview';
import { useStudio } from './context';
import { saveBlob } from './extract';

export type DocTab = 'preview' | 'content' | 'layout' | 'history';
const tabs: [DocTab, string][] = [['preview', 'Preview'], ['content', 'Content'], ['layout', 'Layout'], ['history', 'History']];

export function DocPanel({ tab, setTab }: { tab: DocTab; setTab: (t: DocTab) => void }) {
  const { ws, dispatch, variant, snap, head, eff, peek, setPeek, viewVersionId, setViewVersionId, notify } = useStudio();
  const [exact, setExact] = useState(false);
  const [focusNode, setFocusNode] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState('');
  const accepted = acceptedCount(variant);
  const manual = variant.working !== head;
  const dirty = isDirty(ws, variant);
  const viewing = viewVersionId ? ws.versions[viewVersionId] : null;

  const shown = useMemo(() => {
    if (viewing) return viewing.snapshot;
    if (peek) return applyChange(snap, peek) ?? snap;
    return snap;
  }, [viewing, peek, snap]);
  const peekIds = useMemo(() => (peek && !viewing ? new Set(diffSnapshots(snap, shown).map((d) => d.nodeId)) : undefined), [peek, viewing, snap, shown]);

  const edit = (next: typeof snap) => { setViewVersionId(null); dispatch({ type: 'edit', snapshot: next }); };
  const fileBase = variant.name.replace(/[^\w.-]+/g, '-').toLowerCase() || 'cv';
  const download = async (kind: 'docx' | 'pdf') => {
    setBusy(kind);
    try { saveBlob(kind === 'docx' ? await exportDocx(snap) : await exportPdf(snap), `${fileBase}.${kind}`); }
    catch { notify('The download could not be created. Please try again.'); }
    finally { setBusy(''); }
  };
  const save = () => {
    const name = label.trim() || (accepted ? `Accepted ${accepted} change${accepted > 1 ? 's' : ''}` : 'Manual edits');
    dispatch({ type: 'commit', label: name, now: Date.now() });
    setLabel('');
    setPeek(null);
    notify(`Saved “${name}”. You can restore any earlier version from History.`);
  };

  return (
    <div className="doc-panel">
      <div className="doc-top">
        <div className="doc-title">
          <Layers size={16} />
          <div><strong>{variant.name}</strong><small>{variant.roleId ? `Variant for ${ws.roles[variant.roleId]?.name ?? 'a role'}` : 'General CV'} · version {variant.history.length}</small></div>
        </div>
        <div className="doc-export">
          <button className="btn secondary small" disabled={!!busy} onClick={() => download('docx')}><Download size={14} /> DOCX</button>
          <button className="btn primary small" disabled={!!busy} onClick={() => download('pdf')}><Download size={14} /> PDF</button>
        </div>
      </div>

      {dirty && (
        <div className="dirty-bar" role="status">
          <div>
            <strong>Unsaved</strong>
            <span>{[accepted ? `${accepted} accepted change${accepted > 1 ? 's' : ''}` : '', manual ? 'manual edits' : ''].filter(Boolean).join(' and ')}</span>
            {eff.skipped.length > 0 && <span className="warn-text"> · {eff.skipped.length} could not apply because the text changed</span>}
          </div>
          <div className="dirty-actions">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Name this version (optional)" aria-label="Version name" />
            <button className="btn primary small" onClick={save}><Save size={14} /> Save version</button>
            <button className="btn quiet small" onClick={() => confirm('Discard unsaved changes in this variant?') && (dispatch({ type: 'discard' }), setPeek(null))}><Undo2 size={14} /> Discard</button>
          </div>
        </div>
      )}

      <div className="tabs doc-tabs" role="tablist">
        {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'selected' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      <div className="doc-body">
        {tab === 'preview' && (
          <>
            {viewing && (
              <div className="banner view">
                <Lock size={14} /> <span>Viewing “{viewing.label}”. Read only.</span>
                <button className="btn quiet small" onClick={() => setViewVersionId(null)}>Back to working copy</button>
              </div>
            )}
            {peek && !viewing && <div className="banner peek"><Eye size={14} /> <span>Showing a proposed change. It is not applied yet.</span><button className="btn quiet small" onClick={() => setPeek(null)}>Clear</button></div>}
            <div className="preview-bar">
              <div className="seg" role="group" aria-label="Preview type">
                <button className={!exact ? 'on' : ''} aria-pressed={!exact} onClick={() => setExact(false)}><FileText size={13} /> Live</button>
                <button className={exact ? 'on' : ''} aria-pressed={exact} onClick={() => setExact(true)}>Exact PDF</button>
              </div>
              {!exact && <span className="legend"><i className="lg changed" /> changed since last version <i className="lg peek" /> proposed</span>}
            </div>
            {exact ? <PdfPreview snap={shown} /> : <PaperPreview snap={shown} base={viewing ? undefined : head} peekIds={peekIds} onSelect={(id) => { setFocusNode(id); if (!viewing) setTab('content'); }} />}
            {!exact && <p className="field-help">The live view uses the same styles as the exports. Page breaks are approximate here; the exact PDF shows true pagination. Click a line to edit it.</p>}
          </>
        )}
        {tab === 'content' && <ContentEditor snap={snap} onEdit={edit} focusNode={focusNode} />}
        {tab === 'layout' && <LayoutEditor snap={snap} onEdit={edit} />}
        {tab === 'history' && <HistoryPanel />}
      </div>
    </div>
  );
}
