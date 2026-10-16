"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  ClipboardCheck,
  Compass,
  FileDown,
  FileUp,
  Home,
  Layers,
  ListChecks,
  PanelRightOpen,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  X,
} from "lucide-react";
import { sampleCV, sampleJob } from "../../lib/engine";
import { wordCount, renderText } from "../../lib/cv/render";
import {
  reduce,
  createWorkspace,
  effective,
  hasUnsavedWork,
  parseWorkspace,
} from "../../lib/cv/workspace";
import type { Action } from "../../lib/cv/workspace";
import type { Change, Decision, Workspace } from "../../lib/cv/types";
import { StudioContext } from "./context";
import type { StudioApi, Workflow } from "./context";
import { DocPanel } from "./DocPanel";
import type { DocTab } from "./DocPanel";
import { CareersView } from "./CareersView";
import { PlanView } from "./PlanView";
import { ReviewView } from "./ReviewView";
import { RolesView } from "./RolesView";
import { TailorView } from "./TailorView";
import { extractCvText, saveBlob } from "./extract";
import { Alert } from "./shared";

const goals: {
  id: Exclude<Workflow, "home">;
  title: string;
  blurb: string;
  icon: typeof Target;
  short: string;
}[] = [
  {
    id: "careers",
    short: "Careers",
    icon: Briefcase,
    title: "Explore careers and find jobs",
    blurb:
      "See the career paths, industries and specific roles your experience points to, with the reasoning, then get live job postings ranked against your CV.",
  },
  {
    id: "tailor",
    short: "Tailor",
    icon: Target,
    title: "Tailor my CV to a specific role",
    blurb:
      "Paste a job description or pick a saved role. See what you already evidence, what is missing, and the edits that would strengthen the application.",
  },
  {
    id: "roles",
    short: "Find roles",
    icon: Compass,
    title: "Find roles that fit my CV",
    blurb:
      "See the roles your CV supports today, the stretch roles worth a look, and the exact gaps for each.",
  },
  {
    id: "plan",
    short: "Plan",
    icon: ListChecks,
    title: "Plan experience to strengthen my CV",
    blurb:
      "Get projects, responsibilities and work experience ranked by likely impact, with the evidence each would add.",
  },
  {
    id: "review",
    short: "Review",
    icon: ClipboardCheck,
    title: "Review and improve my CV",
    blurb:
      "A detailed assessment with section and line feedback, starting with the changes that matter most.",
  },
];

function Intake({
  onCreate,
}: {
  onCreate: (text: string, name: string, sample?: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const upload = async (file?: File) => {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      setText(await extractCvText(file));
      setName(file.name);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not read this document. Paste your CV text instead.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="intake card" aria-labelledby="intake-h">
      <div className="kicker">Start here</div>
      <h2 id="intake-h">Bring your CV</h2>
      <p className="muted">
        Upload it or paste the text. It is read in your browser and kept in this
        tab only. You choose what to do with it next.
      </p>
      <label
        className="drop"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          upload(e.dataTransfer.files[0]);
        }}
      >
        <Upload size={22} />
        <strong>
          {busy ? "Reading your CV…" : name || "Drop a PDF or DOCX here"}
        </strong>
        <span>
          or <u>browse files</u>. Up to 8 MB, text-based documents.
        </span>
        <input
          type="file"
          accept=".pdf,.docx,.txt,.md"
          aria-label="Upload CV"
          onChange={(e) => upload(e.target.files?.[0])}
        />
      </label>
      {error && (
        <Alert kind="error" focusOnMount>
          {error}
        </Alert>
      )}
      <div className="field-heading">
        <label htmlFor="cv-text">
          {text ? "Check the extracted text" : "Or paste your CV text"}
        </label>
        <span>{text.length.toLocaleString()} / 30,000</span>
      </div>
      <textarea
        id="cv-text"
        rows={text ? 12 : 5}
        maxLength={30000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Name, contact line, then sections such as Experience, Education and Skills…"
      />
      <p className="field-help">
        Check headings, dates and bullet breaks. Rolecraft reads structure from
        the text, so what you fix here is what you get. Fonts, columns and
        spacing from the original file are not read; they start from a clean
        single-column layout that you can change later.
      </p>
      <div className="row-end">
        <button
          className="btn secondary"
          onClick={() => onCreate(sampleCV, "Alex Morgan · sample CV", true)}
        >
          <Sparkles size={15} /> Try a sample
        </button>
        <button
          className="btn primary"
          disabled={text.trim().length < 80 || busy}
          onClick={() => onCreate(text, name || "Pasted CV")}
        >
          Continue <ArrowRight size={15} />
        </button>
      </div>
      <p className="privacy-line">
        <ShieldCheck size={14} /> No upload, no account, no logging. Refreshing
        clears the workspace unless you save a file.
      </p>
    </section>
  );
}

function GoalNav({
  className,
  workflow,
  go,
}: {
  className: string;
  workflow: Workflow;
  go: (w: Workflow) => void;
}) {
  return (
    <nav className={className} aria-label="What do you want to do?">
      <button
        className={workflow === "home" ? "active" : ""}
        aria-current={workflow === "home" ? "page" : undefined}
        onClick={() => go("home")}
      >
        <Home size={17} />
        <span>Home</span>
      </button>
      {goals.map((g) => (
        <button
          key={g.id}
          className={workflow === g.id ? "active" : ""}
          aria-current={workflow === g.id ? "page" : undefined}
          onClick={() => go(g.id)}
        >
          <g.icon size={17} />
          <span className="full">{g.title}</span>
          <span className="short">{g.short}</span>
        </button>
      ))}
    </nav>
  );
}

/** A short-lived message. The timer lives inside the hook so components never touch it during render. */
function useToast(): [string, (message: string) => void] {
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 4500);
  }, []);
  return [toast, notify];
}

/** The tab title follows the screen, and focus moves to the new heading so keyboard and screen reader users land at the top. */
function useScreenAnnouncement(workflow: Workflow, hasCv: boolean) {
  const first = useRef(true);
  useEffect(() => {
    const goal = goals.find((g) => g.id === workflow);
    document.title = `${hasCv ? (goal ? goal.title : "Your CV is ready") : "Bring your CV"} · Rolecraft`;
    if (first.current) {
      first.current = false;
      return;
    }
    const heading = document.querySelector<HTMLElement>(
      ".work-col > div:not([hidden]) h1, .work-col > div:not([hidden]) h2",
    );
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }, [workflow, hasCv]);
}

export default function Studio() {
  const [ws, setWs] = useState<Workspace | null>(null);
  const [workflow, setWorkflow] = useState<Workflow>("home");
  const [peek, setPeek] = useState<Change | null>(null);
  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);
  const [planTargetIds, setPlanTargetIds] = useState<string[]>([]);
  const [viewVersionId, setViewVersionId] = useState<string | null>(null);
  const [docTab, setDocTab] = useState<DocTab>("preview");
  const [docOpen, setDocOpen] = useState(false);
  const [toast, notify] = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const dispatch = useCallback((action: Action) => {
    setWs((prev) =>
      action.type === "load"
        ? action.workspace
        : prev
          ? reduce(prev, action)
          : prev,
    );
    // A different variant or version should never leave a stale preview on screen.
    if (
      [
        "switchVariant",
        "newVariant",
        "deleteVariant",
        "load",
        "restore",
      ].includes(action.type)
    ) {
      setPeek(null);
      setViewVersionId(null);
    }
  }, []);

  useEffect(() => {
    if (!ws) return;
    const risky =
      hasUnsavedWork(ws) ||
      Object.keys(ws.versions).length > 1 ||
      ws.roleOrder.length > 0;
    if (!risky) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [ws]);

  const variant = ws?.variants[ws.activeVariantId];
  const eff = useMemo(() => (variant ? effective(variant) : null), [variant]);
  const head = ws && variant ? ws.versions[variant.headId].snapshot : null;

  useScreenAnnouncement(workflow, ws !== null);

  if (!ws || !variant || !eff || !head) {
    return (
      <div className="app solo">
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <div className="solo-wrap" id="main" tabIndex={-1}>
          <Link className="brand" href="/">
            <span className="brand-icon">
              <Layers size={22} />
            </span>
            rolecraft<span className="brand-dot">.</span>
          </Link>
          <h1>
            What do you want your CV to do<span>?</span>
          </h1>
          <p className="lede">
            Rolecraft helps you explore careers and find postings, tailor a CV
            to a role, plan the experience you are missing, or review the CV you
            have. Every suggestion stays tied to what you actually wrote.
          </p>
          <Intake
            onCreate={(text, name, sample) => {
              let next = createWorkspace(text, name, Date.now());
              if (sample) {
                next = reduce(next, {
                  type: "saveRole",
                  role: {
                    name: "Orbit · Product Analyst (sample)",
                    text: sampleJob,
                  },
                });
                setActiveRoleId(next.roleOrder[0]);
              }
              setWs(next);
              setWorkflow("home");
            }}
          />
          <div className="goal-preview">
            {goals.map((g) => (
              <div key={g.id} className="goal-mini">
                <g.icon size={18} />
                <span>{g.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const api: StudioApi = {
    ws,
    dispatch,
    variant,
    eff,
    snap: eff.snapshot,
    head,
    workflow,
    go: (w) => {
      setWorkflow(w);
      window.scrollTo({ top: 0 });
    },
    stage: (change, decision: Decision | null) =>
      dispatch({ type: "stage", change, decision }),
    decisionOf: (id) => variant.staged[id]?.decision,
    peek,
    setPeek,
    activeRoleId,
    setActiveRoleId,
    activeRole: activeRoleId ? (ws.roles[activeRoleId] ?? null) : null,
    planTargetIds,
    setPlanTargetIds,
    viewVersionId,
    setViewVersionId,
    showDoc: (tab) => {
      if (tab) setDocTab(tab);
      setDocOpen(true);
    },
    notify,
  };

  const words = wordCount(renderText(api.snap));
  const secCount = api.snap.layout.order.root.length - 1;
  const saveFile = () => {
    saveBlob(
      new Blob([JSON.stringify(ws)], { type: "application/json" }),
      "rolecraft-workspace.json",
    );
    notify(
      "Saved a workspace file. It contains your CV text, so store it somewhere private.",
    );
  };
  const openFile = async (file?: File) => {
    if (!file) return;
    try {
      const loaded = parseWorkspace(await file.text());
      dispatch({ type: "load", workspace: loaded });
      setActiveRoleId(loaded.roleOrder[0] ?? null);
      setPlanTargetIds([]);
      setWorkflow("home");
      notify("Workspace opened.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "That file could not be opened.");
    }
  };

  return (
    <StudioContext.Provider value={api}>
      <div className="app">
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <aside className="side">
          <Link className="brand" href="/">
            <span className="brand-icon">
              <Layers size={22} />
            </span>
            rolecraft<span className="brand-dot">.</span>
          </Link>
          <div className="side-label">WHAT DO YOU WANT TO DO?</div>
          <GoalNav className="goal-nav" workflow={workflow} go={api.go} />
          <div className="side-foot">
            <ShieldCheck size={16} />
            <span>
              Private by design
              <small>Your CV is read and edited in this browser tab</small>
            </span>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <GoalNav className="goal-tabs" workflow={workflow} go={api.go} />
            <div className="top-actions">
              <button className="btn quiet small" onClick={saveFile}>
                <FileDown size={14} /> Save workspace
              </button>
              <button
                className="btn quiet small"
                onClick={() => fileInput.current?.click()}
              >
                <FileUp size={14} /> Open workspace
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  openFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                className="btn quiet small"
                onClick={() => {
                  if (
                    confirm(
                      "Start over with a different CV? Unsaved work in this tab will be lost.",
                    )
                  ) {
                    setWs(null);
                    setActiveRoleId(null);
                    setPlanTargetIds([]);
                    setPeek(null);
                  }
                }}
              >
                <RotateCcw size={14} /> Start over
              </button>
            </div>
          </header>

          <div className="grid">
            <main className="work-col" id="main" tabIndex={-1}>
              <div hidden={workflow !== "home"}>
                <section className="home">
                  <div className="kicker">Your CV is ready</div>
                  <h1>
                    What would you like to do<span>?</span>
                  </h1>
                  <p className="lede">
                    Pick a starting point. You can switch at any time, and the
                    first one is the widest lens. Changes you accept, edits you
                    make and the roles you save stay with you across all four.
                  </p>
                  <div className="goal-grid">
                    {goals.map((g, i) => (
                      <button
                        key={g.id}
                        className={`goal-card ${i === 0 ? "wide" : ""}`}
                        onClick={() => api.go(g.id)}
                      >
                        <span className="goal-icon">
                          <g.icon size={22} />
                        </span>
                        <span className="goal-num">0{i + 1}</span>
                        <h3>{g.title}</h3>
                        <p>{g.blurb}</p>
                        <span className="goal-go">
                          Start <ArrowRight size={15} />
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="card status-card">
                    <div>
                      <strong>{ws.fileName}</strong>
                      <small>
                        {secCount} sections · about {words} words ·{" "}
                        {ws.roleOrder.length} saved role
                        {ws.roleOrder.length === 1 ? "" : "s"} ·{" "}
                        {ws.variantOrder.length} variant
                        {ws.variantOrder.length === 1 ? "" : "s"}
                      </small>
                    </div>
                    <button
                      className="btn secondary small"
                      onClick={() => api.showDoc("preview")}
                    >
                      <PanelRightOpen size={14} /> See the CV
                    </button>
                  </div>
                </section>
              </div>
              <div hidden={workflow !== "careers"}>
                <CareersView active={workflow === "careers"} />
              </div>
              <div hidden={workflow !== "tailor"}>
                <TailorView active={workflow === "tailor"} />
              </div>
              <div hidden={workflow !== "roles"}>
                <RolesView active={workflow === "roles"} />
              </div>
              <div hidden={workflow !== "plan"}>
                <PlanView active={workflow === "plan"} />
              </div>
              <div hidden={workflow !== "review"}>
                <ReviewView active={workflow === "review"} />
              </div>
              <footer className="foot">
                Scores and suggestions are revision guidance. They do not
                predict hiring outcomes or simulate an employer’s tracking
                system. Matching uses a fixed vocabulary and no language model.
              </footer>
            </main>

            <aside
              className={`doc-col ${docOpen ? "open" : ""}`}
              aria-label="Your CV"
            >
              <button
                className="doc-close"
                onClick={() => setDocOpen(false)}
                aria-label="Close CV panel"
              >
                <X size={18} />
              </button>
              <DocPanel tab={docTab} setTab={setDocTab} />
            </aside>
          </div>
          <button className="doc-fab" onClick={() => setDocOpen(true)}>
            <PanelRightOpen size={16} /> CV
            {variant.working !== head ||
            Object.values(variant.staged).some((s) => s.decision === "accepted")
              ? " · unsaved"
              : ""}
          </button>
        </div>
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </div>
    </StudioContext.Provider>
  );
}
