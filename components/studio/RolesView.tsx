"use client";
import { useMemo, useState } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { findRoles } from "../../lib/analysis/roles";
import type { RoleFit } from "../../lib/analysis/roles";
import { Quote, ScoreBar } from "./shared";
import { useStudio } from "./context";

function FitCard({ fit }: { fit: RoleFit }) {
  const { go, setPlanTargetIds } = useStudio();
  const [open, setOpen] = useState(false);
  const core = fit.gaps.filter((g) => g.importance === "core");
  const helpful = fit.gaps.filter((g) => g.importance === "helpful");
  const best = fit.evidence.filter((e) => !e.listedOnly).slice(0, 2);
  return (
    <article className="card fit">
      <div className="fit-head">
        <div>
          <h3>{fit.def.title}</h3>
          <p className="sector">{fit.def.sector}</p>
        </div>
        <div className="fit-score">
          <strong>{fit.fit}%</strong>
          <small>of this role’s vocabulary supported</small>
        </div>
      </div>
      <ScoreBar value={fit.fit} label={`${fit.def.title} fit`} />
      <p className="muted">{fit.def.blurb}</p>
      <p>
        <strong>Why it fits.</strong> {fit.why}
      </p>
      {best.map((e) => (
        <div key={e.term}>
          <span className="term hit">{e.term}</span>
          <Quote>{e.quote}</Quote>
        </div>
      ))}
      <h4 className="gap-title">
        {fit.readiness === "ready"
          ? "To be a stronger candidate"
          : "What is missing for this role"}
      </h4>
      {core.length === 0 && helpful.length === 0 && (
        <p className="muted">No gaps found in this role’s vocabulary.</p>
      )}
      <ul className="gap-list">
        {core.map((g) => (
          <li key={g.term}>
            <span className="chip warn">Core</span> <strong>{g.term}</strong>
            <span className="muted"> · {g.closeWith}</span>
          </li>
        ))}
        {helpful.map((g) => (
          <li key={g.term}>
            <span className="chip neutral">Helpful</span>{" "}
            <strong>{g.term}</strong>
          </li>
        ))}
      </ul>
      <button
        className="disclose"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        All evidence we used{" "}
        <ChevronDown size={14} className={open ? "flip" : ""} />
      </button>
      {open && (
        <ul className="evidence-list">
          {fit.evidence.map((e) => (
            <li key={e.term}>
              <strong>{e.term}</strong>{" "}
              {e.listedOnly ? <em>skills list only</em> : null}
              <br />
              <span className="muted">{e.quote}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="row-end">
        <button
          className="btn secondary small"
          onClick={() => {
            setPlanTargetIds([`fit:${fit.def.id}`]);
            go("plan");
          }}
        >
          Plan experience for this role <ArrowUpRight size={14} />
        </button>
        <button className="btn secondary small" onClick={() => go("tailor")}>
          Tailor to a posting <ArrowUpRight size={14} />
        </button>
      </div>
    </article>
  );
}

export function RolesView({ active }: { active: boolean }) {
  const { snap } = useStudio();
  const [showAll, setShowAll] = useState(false);
  const fits = useMemo(() => (active ? findRoles(snap) : []), [active, snap]);
  const ready = fits.filter((f) => f.readiness === "ready");
  const stretch = fits.filter((f) => f.readiness === "stretch");
  const explore = fits.filter((f) => f.readiness === "explore");
  return (
    <div className="workflow">
      <header className="wf-head">
        <div>
          <div className="kicker">Find roles that fit my CV</div>
          <h2>Where your experience already points</h2>
          <p className="lede">
            We compare your CV with {fits.length} role profiles. Roles you are
            ready for are separated from stretch roles, and each stretch comes
            with the specific evidence you would still need.
          </p>
        </div>
      </header>
      <div className="notice">
        <p>
          Matching uses a fixed vocabulary of role terms and counts only what
          your CV says. It does not know your preferences, seniority or the job
          market, and it does not predict hiring outcomes.
        </p>
      </div>

      <section className="stack">
        <div className="section-title">
          <h3>Ready for now</h3>
          <span className="chip good">{ready.length}</span>
        </div>
        <p className="muted">
          Your CV supports most of the core skills these roles ask for.
        </p>
        {ready.length ? (
          ready.map((f) => <FitCard key={f.def.id} fit={f} />)
        ) : (
          <div className="empty">
            <h4>No role is a clear match yet</h4>
            <p>
              Your CV supports few of the vocabulary terms we track. Add detail
              to your bullets, or look at the stretch roles below.
            </p>
          </div>
        )}
      </section>

      <section className="stack">
        <div className="section-title">
          <h3>Stretch opportunities</h3>
          <span className="chip warn">{stretch.length}</span>
        </div>
        <p className="muted">
          You have a foothold, but core evidence is missing. The gaps listed are
          what a recruiter would look for next.
        </p>
        {stretch.map((f) => (
          <FitCard key={f.def.id} fit={f} />
        ))}
      </section>

      {explore.length > 0 && (
        <section className="stack">
          <button
            className="disclose"
            aria-expanded={showAll}
            onClick={() => setShowAll(!showAll)}
          >
            {explore.length} roles with little overlap{" "}
            <ChevronDown size={14} className={showAll ? "flip" : ""} />
          </button>
          {showAll && explore.map((f) => <FitCard key={f.def.id} fit={f} />)}
        </section>
      )}
    </div>
  );
}
