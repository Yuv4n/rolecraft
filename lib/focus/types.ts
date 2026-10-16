// Shared contracts for the Focus Plan flow. Pure types, no runtime code.

export type Profile = {
  cv: string;
  projects: string;
  interests: string;
  hoursPerWeek: number;
  /** ISO date (YYYY-MM-DD) the user wants to start applying by. */
  applyBy: string;
};

export type Strength = 'strong' | 'partial' | 'none';

/** A reason that points at the user's own words. `quote` is verbatim from the profile text. */
export type Evidence = { quote: string; why: string };

export type Gap = {
  requirement: string;
  strength: Strength;
  /** Empty when strength is 'none'. */
  evidence: Evidence[];
};

export type Tier = 'primary' | 'adjacent' | 'stretch';

export type Direction = {
  id: string;
  /** Id from lib/focus/roles.ts. */
  roleFamilyId: string;
  title: string;
  field: string;
  tier: Tier;
  summary: string;
  reasons: Evidence[];
  gaps: Gap[];
  /** For adjacent and stretch tiers: what carries over from the user's current field. */
  transferNote?: string;
  /** Job titles worth searching for. Taken from the role family, not generated. */
  searchTitles: string[];
};

export type TaskKind = 'project' | 'experience' | 'learning' | 'cv';

export type PlanTask = {
  id: string;
  title: string;
  /** The role requirement this task addresses. */
  requirement: string;
  /** What the user will have when it is done. */
  deliverable: string;
  /** What it demonstrates to a reader. */
  why: string;
  hours: number;
  /** 1 is most important. */
  priority: number;
  kind: TaskKind;
};

export type ScheduledTask = PlanTask & { startWeek: number; endWeek: number };

export type Plan = {
  weeks: number;
  hoursPerWeek: number;
  budgetHours: number;
  /** Hours held back for the tailored CV and outreach. */
  reserveHours: number;
  usedHours: number;
  scheduled: ScheduledTask[];
  deferred: { task: PlanTask; reason: string }[];
};

export type Rewrite = { original: string; revised: string; why: string };
export type Question = { line: string; ask: string };

export type TailorResult = {
  rewrites: Rewrite[];
  /** CV lines (verbatim) that matter most for the direction; moved first within their bullet group. */
  emphasis: string[];
  questions: Question[];
};

export type EmailClaim = {
  /** The sentence in the email body that makes the claim. */
  sentence: string;
  source: 'cv' | 'page';
  /** Verbatim text from the CV or the pasted page that supports it. */
  quote: string;
};

export type Email = { subject: string; body: string; claims: EmailClaim[] };

export type TraceEntry = {
  agent: string;
  role: string;
  /** 'offline' for the deterministic engine. */
  model: string;
  ms: number;
  kept: number;
  /** Items removed because their quotes or numbers could not be verified. */
  dropped: number;
  attempts: number;
};

export type FocusMode = 'live' | 'offline';

export type DiscoverResponse = { directions: Direction[]; trace: TraceEntry[] };
export type PackageResponse = { tasks: PlanTask[]; tailor: TailorResult; trace: TraceEntry[] };
export type OutreachInput = { company: string; contact: string; page: string };
export type OutreachResponse = { email: Email; trace: TraceEntry[] };

/** `consent` must be true. It is set only after the user accepts the consent screen. */
export type FocusRequest =
  | {action: 'discover'; consent: true; profile: Profile}
  | {action: 'package'; consent: true; profile: Profile; direction: Direction}
  | {action: 'outreach'; consent: true; profile: Profile; direction: Direction; input: OutreachInput};
