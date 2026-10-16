import type {Direction, Evidence, FocusRequest, Gap, OutreachInput, Profile, Strength, Tier} from './types.ts';
import {roleById} from './roles.ts';
import {normalise, quoteInSource} from './grounding.ts';

export const LIMITS = {cv: 30000, projects: 4000, interests: 1500, page: 20000, name: 120, total: 120000};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');
const tiers: Tier[] = ['primary', 'adjacent', 'stretch'];
const strengths: Strength[] = ['strong', 'partial', 'none'];

export class BadRequest extends Error {}

export function parseProfile(v: unknown): Profile {
  if (!isObj(v)) throw new BadRequest('Missing profile.');
  const cv = str(v.cv, LIMITS.cv);
  if (cv.trim().length < 80) throw new BadRequest('The CV text is too short.');
  const hours = Number(v.hoursPerWeek);
  const applyBy = str(v.applyBy, 10);
  return {
    cv,
    projects: str(v.projects, LIMITS.projects),
    interests: str(v.interests, LIMITS.interests),
    hoursPerWeek: Number.isFinite(hours) ? Math.min(40, Math.max(1, Math.round(hours))) : 5,
    applyBy: /^\d{4}-\d{2}-\d{2}$/.test(applyBy) ? applyBy : '',
  };
}

function parseEvidence(v: unknown): Evidence[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 6).flatMap((e) => (isObj(e) ? [{quote: str(e.quote, 600), why: str(e.why, 400)}] : []));
}

/** Rebuilds a direction from untrusted client data, pinned to the curated role list. */
export function parseDirection(v: unknown): Direction {
  if (!isObj(v)) throw new BadRequest('Missing direction.');
  const family = roleById.get(str(v.roleFamilyId, 60));
  if (!family) throw new BadRequest('Unknown role family.');
  const gaps: Gap[] = Array.isArray(v.gaps)
    ? v.gaps.slice(0, 12).flatMap((g) => {
        if (!isObj(g)) return [];
        const requirement = str(g.requirement, 200);
        const strength = strengths.find((s) => s === g.strength);
        if (!requirement || !strength) return [];
        return [{requirement, strength, evidence: parseEvidence(g.evidence)}];
      })
    : [];
  return {
    id: family.id,
    roleFamilyId: family.id,
    title: family.title,
    field: family.field,
    tier: tiers.find((t) => t === v.tier) ?? 'primary',
    summary: str(v.summary, 600),
    reasons: parseEvidence(v.reasons),
    gaps,
    transferNote: str(v.transferNote, 600) || undefined,
    searchTitles: family.searchTitles,
  };
}

/**
 * The browser sends the direction back, so the server re-checks it against the profile it also received:
 * evidence quotes must be in the person's text and gaps must be the role family's own requirements.
 */
export function groundDirection(d: Direction, p: Profile): Direction {
  const family = roleById.get(d.roleFamilyId);
  if (!family) throw new BadRequest('Unknown role family.');
  const sources = [p.cv, p.projects, p.interests];
  const allowed = new Map(family.requirements.map((r) => [normalise(r.text), r.text]));
  const keep = (items: Evidence[]) => items.filter((e) => quoteInSource(e.quote, ...sources));
  const gaps: Gap[] = d.gaps.flatMap((g) => {
    const requirement = allowed.get(normalise(g.requirement));
    if (!requirement) return [];
    const evidence = keep(g.evidence);
    const strength: Strength = g.strength !== 'none' && !evidence.length ? 'none' : g.strength;
    return [{requirement, strength, evidence: strength === 'none' ? [] : evidence}];
  });
  return {...d, reasons: keep(d.reasons), gaps};
}

export function parseOutreachInput(v: unknown): OutreachInput {
  if (!isObj(v)) throw new BadRequest('Missing company details.');
  const input = {
    company: str(v.company, LIMITS.name).trim(),
    contact: str(v.contact, LIMITS.name).trim(),
    page: str(v.page, LIMITS.page),
  };
  if (!input.company) throw new BadRequest('Add a company name.');
  if (input.page.trim().length < 80) throw new BadRequest('Paste at least a few sentences from the company.');
  return input;
}

export function parseRequest(body: unknown): FocusRequest {
  if (!isObj(body)) throw new BadRequest('Invalid request.');
  if (body.consent !== true) throw new BadRequest('Consent is required before text is sent for analysis.');
  const profile = parseProfile(body.profile);
  switch (body.action) {
    case 'discover':
      return {action: 'discover', consent: true, profile};
    case 'package':
      return {action: 'package', consent: true, profile, direction: groundDirection(parseDirection(body.direction), profile)};
    case 'outreach':
      return {
        action: 'outreach', consent: true, profile,
        direction: groundDirection(parseDirection(body.direction), profile),
        input: parseOutreachInput(body.input),
      };
    default:
      throw new BadRequest('Unknown action.');
  }
}
