"use client";
import { useMemo, useState } from "react";
import {
  Copy,
  Eye,
  GitBranch,
  History,
  Lock,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { diffSnapshots } from "../../lib/cv/ops";
import { wordDiff } from "../../lib/cv/describe";
import { isDirty } from "../../lib/cv/workspace";
import { nodeText } from "../../lib/cv/render";
import { useStudio } from "./context";

const originLabel: Record<string, string> = {
  import: "Import",
  fork: "Fork",
  edit: "Manual edit",
  "accepted-changes": "Accepted changes",
  restore: "Restore",
};

function when(t: number) {
  try {
    return new Date(t).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

export function HistoryPanel() {
  const {
    ws,
    dispatch,
    variant,
    snap,
    viewVersionId,
    setViewVersionId,
    showDoc,
  } = useStudio();
  const [compareId, setCompareId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  // The untouched original is reachable from every variant, even those forked from a later version.
  const ids = variant.history.includes(ws.originalVersionId)
    ? variant.history
    : [ws.originalVersionId, ...variant.history];
  const versions = [...ids].reverse().map((id) => ws.versions[id]);
  const currentId = variant.headId;
  const compare = compareId ? ws.versions[compareId] : null;
  const diff = useMemo(
    () => (compare ? diffSnapshots(compare.snapshot, snap) : []),
    [compare, snap],
  );

  return (
    <div className="history">
      <section>
        <h4>
          <GitBranch size={15} /> CV variants
        </h4>
        <p className="field-help">
          A variant is a separate copy of your CV, for example one per role.
          Each keeps its own version history.
        </p>
        <ul className="variant-list">
          {ws.variantOrder.map((id) => {
            const v = ws.variants[id];
            const active = id === ws.activeVariantId;
            return (
              <li key={id} className={active ? "active" : ""}>
                {renaming === id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (draftName.trim())
                        dispatch({
                          type: "renameVariant",
                          id,
                          name: draftName.trim(),
                        });
                      setRenaming(null);
                    }}
                  >
                    <input
                      autoFocus
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      aria-label="Variant name"
                    />
                    <button className="btn small primary" type="submit">
                      Save
                    </button>
                  </form>
                ) : (
                  <>
                    <button
                      className="variant-name"
                      aria-current={active}
                      onClick={() => dispatch({ type: "switchVariant", id })}
                    >
                      <strong>{v.name}</strong>
                      <small>
                        {v.roleId
                          ? `Role: ${ws.roles[v.roleId]?.name ?? "removed"}`
                          : "General"}{" "}
                        · {v.history.length} version
                        {v.history.length > 1 ? "s" : ""}
                        {isDirty(ws, v) ? " · unsaved changes" : ""}
                      </small>
                    </button>
                    <button
                      className="icon-btn"
                      aria-label={`Rename ${v.name}`}
                      onClick={() => {
                        setRenaming(id);
                        setDraftName(v.name);
                      }}
                    >
                      Rename
                    </button>
                    {v.roleId !== null && (
                      <button
                        className="icon-btn"
                        aria-label={`Delete ${v.name}`}
                        onClick={() =>
                          confirm(
                            `Delete the variant “${v.name}”? Its saved versions stay in the file history.`,
                          ) && dispatch({ type: "deleteVariant", id })
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
        <div className="row-end">
          <button
            className="btn secondary small"
            onClick={() =>
              dispatch({
                type: "newVariant",
                name: `Variant ${ws.variantOrder.length + 1}`,
                roleId: null,
                now: Date.now(),
              })
            }
          >
            <Copy size={13} /> Copy general CV
          </button>
          <button
            className="btn secondary small"
            onClick={() =>
              dispatch({
                type: "newVariant",
                name: `From original ${ws.variantOrder.length + 1}`,
                roleId: null,
                now: Date.now(),
                fromVersionId: ws.originalVersionId,
              })
            }
          >
            <Lock size={13} /> Start from original
          </button>
        </div>
      </section>

      <section>
        <h4>
          <History size={15} /> Versions of “{variant.name}”
        </h4>
        <ol className="version-list">
          {versions.map((v) => (
            <li key={v.id} className={viewVersionId === v.id ? "viewing" : ""}>
              <div className="version-head">
                <strong>{v.label}</strong>
                {v.id === ws.originalVersionId && (
                  <span className="chip neutral">
                    <Lock size={11} /> Original, never edited
                  </span>
                )}
                {v.id === currentId && (
                  <span className="chip good">Current</span>
                )}
              </div>
              <small className="muted">
                {when(v.createdAt)} · {originLabel[v.origin]} · {v.note}
              </small>
              <div className="version-actions">
                <button
                  className="btn quiet small"
                  onClick={() => {
                    setViewVersionId(viewVersionId === v.id ? null : v.id);
                    showDoc("preview");
                  }}
                >
                  <Eye size={13} />{" "}
                  {viewVersionId === v.id ? "Stop viewing" : "View"}
                </button>
                <button
                  className="btn quiet small"
                  aria-pressed={compareId === v.id}
                  onClick={() => setCompareId(compareId === v.id ? null : v.id)}
                >
                  Compare with working copy
                </button>
                {v.id !== currentId && (
                  <button
                    className="btn quiet small"
                    onClick={() => {
                      dispatch({
                        type: "restore",
                        versionId: v.id,
                        now: Date.now(),
                      });
                      setViewVersionId(null);
                    }}
                  >
                    <RotateCcw size={13} /> Restore as new version
                  </button>
                )}
                <button
                  className="btn quiet small"
                  onClick={() =>
                    dispatch({
                      type: "newVariant",
                      name: `Copy of ${v.label}`.slice(0, 40),
                      roleId: null,
                      now: Date.now(),
                      fromVersionId: v.id,
                    })
                  }
                >
                  <Copy size={13} /> Branch
                </button>
              </div>
              {compareId === v.id && (
                <div className="compare">
                  {diff.length === 0 ? (
                    <p className="muted">
                      The working copy matches this version.
                    </p>
                  ) : (
                    diff.map((d) => (
                      <div key={d.nodeId + d.kind} className="compare-row">
                        <span className="chip neutral">{d.kind}</span>
                        {d.kind === "changed" ? (
                          <p className="diff">
                            {wordDiff(d.before, d.after).map((p, k) =>
                              p.op === "same" ? (
                                <span key={k}>{p.text}</span>
                              ) : p.op === "del" ? (
                                <del key={k}>{p.text}</del>
                              ) : (
                                <ins key={k}>{p.text}</ins>
                              ),
                            )}
                          </p>
                        ) : (
                          <p className="diff">
                            {d.after ||
                              d.before ||
                              (snap.content.nodes[d.nodeId]
                                ? nodeText(
                                    snap.content.nodes[d.nodeId],
                                    snap.layout,
                                  )
                                : "")}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section>
        <details>
          <summary>Original text as imported</summary>
          <pre className="original">{ws.originalText}</pre>
        </details>
      </section>
    </div>
  );
}
