"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  HelpCircle,
  Info,
  RotateCcw,
  X,
  XCircle,
} from "lucide-react";
import type { Change } from "../../lib/cv/types";
import { describeChange, wordDiff } from "../../lib/cv/describe";
import { children, nodeText, sections } from "../../lib/cv/render";
import { dimensionLabels } from "../../lib/analysis/review";
import type { Finding, Severity } from "../../lib/analysis/review";
import { composeAsk } from "../../lib/analysis/tailor";
import { useStudio } from "./context";

export const severityLabel: Record<Severity, string> = {
  high: "High impact",
  medium: "Worth fixing",
  low: "Polish",
};

export function SeverityChip({ severity }: { severity: Severity }) {
  return (
    <span className={`chip sev-${severity}`}>{severityLabel[severity]}</span>
  );
}

export function Quote({ children: text }: { children: string }) {
  return <blockquote className="quote">{text}</blockquote>;
}

function DiffLine({ before, after }: { before: string; after: string }) {
  const parts = useMemo(() => wordDiff(before, after), [before, after]);
  return (
    <p className="diff">
      {parts.map((p, i) =>
        p.op === "same" ? (
          <span key={i}>{p.text}</span>
        ) : p.op === "del" ? (
          <del key={i}>{p.text}</del>
        ) : (
          <ins key={i}>{p.text}</ins>
        ),
      )}
    </p>
  );
}

/** Shows one proposed change as a before and after preview with accept and reject controls. */
export function ChangeCard({
  change,
  onDecide,
  lead,
}: {
  change: Change;
  onDecide?: (d: "accepted" | "rejected" | null) => void;
  lead?: string;
}) {
  const { snap, decisionOf, stage, peek, setPeek, showDoc } = useStudio();
  const view = useMemo(() => describeChange(snap, change), [snap, change]);
  const decision = decisionOf(change.id);
  const peeking = peek?.id === change.id;
  const decide = (d: "accepted" | "rejected" | null) =>
    onDecide ? onDecide(d) : stage(change, d);
  return (
    <div className={`change ${decision ?? ""}`} data-kind={change.kind}>
      <div className="change-head">
        <span className="change-where">{lead ?? view.where}</span>
        {"userSupplied" in change && change.userSupplied && (
          <span className="chip neutral">Your wording</span>
        )}
        {decision === "accepted" && (
          <span className="chip good">
            <Check size={12} /> Accepted
          </span>
        )}
        {decision === "rejected" && (
          <span className="chip neutral">Rejected</span>
        )}
      </div>
      <div className="change-body">
        {view.rows.map((row, i) => (
          <div key={i} className="change-row">
            {row.label && <small className="change-label">{row.label}</small>}
            {row.list ? (
              <div className="order-compare">
                <ol>
                  {row.list.before.map((t, k) => (
                    <li key={k}>{t}</li>
                  ))}
                </ol>
                <span aria-hidden>→</span>
                <ol>
                  {row.list.after.map((t, k) => (
                    <li key={k}>{t}</li>
                  ))}
                </ol>
              </div>
            ) : row.before !== undefined &&
              row.after !== undefined &&
              change.kind !== "layout" ? (
              <DiffLine before={row.before} after={row.after} />
            ) : (
              <>
                {row.before && (
                  <p className="diff">
                    <del>{row.before}</del>
                  </p>
                )}
                {row.after && (
                  <p className="diff">
                    <ins>{row.after}</ins>
                  </p>
                )}
              </>
            )}
          </div>
        ))}
        <p className="change-reason">{change.reason}</p>
      </div>
      <div className="change-actions">
        {decision ? (
          <button className="btn quiet" onClick={() => decide(null)}>
            <RotateCcw size={14} /> Undo
          </button>
        ) : (
          <>
            <button
              className="btn primary small"
              onClick={() => decide("accepted")}
            >
              <Check size={14} /> Accept
            </button>
            <button
              className="btn secondary small"
              onClick={() => decide("rejected")}
            >
              <X size={14} /> Reject
            </button>
          </>
        )}
        <button
          className="btn quiet"
          aria-pressed={peeking}
          onClick={() => {
            setPeek(peeking ? null : change);
            if (!peeking) showDoc("preview");
          }}
        >
          {peeking ? <EyeOff size={14} /> : <Eye size={14} />}{" "}
          {peeking ? "Hide in CV" : "Show in CV"}
        </button>
      </div>
    </div>
  );
}

/** Asks the user for a fact, then previews the edit their answer would make. */
export function AskForm({ finding }: { finding: Finding }) {
  const { snap, stage, decisionOf } = useStudio();
  const ask = finding.ask!;
  const node = snap.content.nodes[ask.nodeId];
  const entries = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    for (const s of sections(snap)) {
      if (s.kind !== "experience" && s.kind !== "projects") continue;
      for (const e of children(snap, s.id))
        if (e.type === "entry")
          list.push({
            id: e.id,
            label: nodeText(e, snap.layout)
              .split(" | ")
              .slice(0, 2)
              .join(" · "),
          });
    }
    return list;
  }, [snap]);
  const [answer, setAnswer] = useState(
    ask.mode === "replace" ? (node?.text ?? "") : "",
  );
  const [parent, setParent] = useState(ask.nodeId);
  const last = useRef<Change | null>(null);
  const composed = useMemo(
    () =>
      composeAsk(
        snap,
        ask,
        answer,
        ask.mode === "newBullet" ? parent : undefined,
      ),
    [snap, ask, answer, parent],
  );
  if (!node) return null;
  const onDecide = (d: "accepted" | "rejected" | null) => {
    if (!composed) return;
    if (last.current && last.current.id !== composed.id)
      stage(last.current, null);
    stage(composed, d);
    last.current = d ? composed : null;
  };
  const accepted = composed ? decisionOf(composed.id) : undefined;
  return (
    <div className="ask">
      <label className="ask-prompt">
        <HelpCircle size={15} /> {ask.prompt}
      </label>
      {ask.mode === "newBullet" && entries.length > 1 && (
        <select
          aria-label="Role to add the bullet to"
          value={parent}
          onChange={(e) => setParent(e.target.value)}
        >
          {entries.map((e) => (
            <option key={e.id} value={e.id}>
              Add under: {e.label}
            </option>
          ))}
        </select>
      )}
      {ask.mode === "contact" ? (
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={ask.placeholder}
        />
      ) : (
        <textarea
          rows={ask.mode === "replace" ? 3 : 2}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={ask.placeholder}
        />
      )}
      <p className="field-help">
        Nothing is added until you accept. Only write what you can stand behind.
      </p>
      {composed && (
        <ChangeCard
          change={composed}
          onDecide={onDecide}
          lead={accepted ? undefined : "Preview of your edit"}
        />
      )}
    </div>
  );
}

export function FindingCard({
  finding,
  defaultOpen = false,
}: {
  finding: Finding;
  defaultOpen?: boolean;
}) {
  const { decisionOf } = useStudio();
  const [open, setOpen] = useState(defaultOpen);
  const decision = finding.change ? decisionOf(finding.change.id) : undefined;
  return (
    <article
      className={`finding sev-border-${finding.severity} ${decision ?? ""}`}
    >
      <button
        className="finding-head"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <SeverityChip severity={finding.severity} />
        <span className="finding-title">{finding.title}</span>
        <span className="finding-dim">
          {dimensionLabels[finding.dimension]}
        </span>
        {decision && (
          <span
            className={`chip ${decision === "accepted" ? "good" : "neutral"}`}
          >
            {decision === "accepted" ? "Accepted" : "Rejected"}
          </span>
        )}
        <ChevronDown size={16} className={open ? "flip" : ""} />
      </button>
      {open && (
        <div className="finding-body">
          <p>{finding.why}</p>
          {finding.evidence.map((e, i) => (
            <Quote key={i}>{e}</Quote>
          ))}
          {finding.change && <ChangeCard change={finding.change} />}
          {finding.ask && <AskForm finding={finding} />}
          {!finding.change && !finding.ask && (
            <p className="field-help">
              No automatic fix. This needs your judgement.
            </p>
          )}
        </div>
      )}
    </article>
  );
}

export function ScoreBar({
  value,
  label,
}: {
  value: number | null;
  label: string;
}) {
  return (
    <div
      className="score-track"
      role="img"
      aria-label={
        value === null
          ? `${label}: not scored`
          : `${label}: ${value} out of 100`
      }
    >
      <div style={{ width: `${value ?? 0}%` }} />
    </div>
  );
}

export function EmptyNote({
  title,
  children: body,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <h4>{title}</h4>
      {body && <p>{body}</p>}
    </div>
  );
}

export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
export const panelId = (prefix: string, id: string) => `${prefix}-panel-${id}`;

/**
 * Tab list following the ARIA tabs pattern: one tab stop, arrow keys, Home and End move between tabs.
 * The parent renders its panel with role="tabpanel", id={panelId(prefix, value)} and aria-labelledby={tabId(prefix, value)}.
 */
export function Tabs({
  tabs,
  value,
  onChange,
  prefix,
  label,
  className = "",
}: {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  prefix: string;
  label: string;
  className?: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKeyDown = (event: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === value);
    let next = -1;
    if (event.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (event.key === "ArrowLeft")
      next = (i - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    event.preventDefault();
    onChange(tabs[next].id);
    refs.current[tabs[next].id]?.focus();
  };
  return (
    <div
      className={`tabs ${className}`}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[t.id] = el;
          }}
          type="button"
          role="tab"
          id={tabId(prefix, t.id)}
          aria-selected={t.id === value}
          aria-controls={panelId(prefix, t.id)}
          tabIndex={t.id === value ? 0 : -1}
          className={t.id === value ? "selected" : ""}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

const alertIcons = {
  info: Info,
  error: XCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
};

/** Status message that pairs an icon with text, so meaning never depends on colour alone. */
export function Alert({
  kind = "info",
  title,
  focusOnMount,
  children,
}: {
  kind?: "info" | "error" | "success" | "warning";
  title?: string;
  focusOnMount?: boolean;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusOnMount) ref.current?.focus();
  }, [focusOnMount]);
  const Icon = alertIcons[kind];
  return (
    <div
      ref={ref}
      className={`alert alert--${kind}`}
      role={kind === "error" ? "alert" : undefined}
      tabIndex={focusOnMount ? -1 : undefined}
    >
      <Icon className="alert__icon" size={20} aria-hidden="true" />
      <div className="alert__body">
        {title && <p className="alert__title">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}
