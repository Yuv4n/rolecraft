// Single source of truth for the verb swaps. The rewrite rules in lib/engine.ts use this table, and the
// grounding check allows exactly these verbs as replacements, so a rule can never produce a word the
// check would reject. Every swap keeps the meaning: the person did the thing, now said directly.

/** "Responsible for building X" becomes "Built X". Gerund on the left, past tense on the right. */
export const GERUND_TO_PAST: Record<string, string> = {
  administering: 'Administered', advising: 'Advised', analysing: 'Analysed', analyzing: 'Analyzed',
  answering: 'Answered', assessing: 'Assessed', auditing: 'Audited', building: 'Built', cleaning: 'Cleaned',
  coaching: 'Coached', conducting: 'Conducted', cooking: 'Cooked', coordinating: 'Coordinated',
  counselling: 'Counselled', counseling: 'Counseled', creating: 'Created', delivering: 'Delivered',
  designing: 'Designed', developing: 'Developed', documenting: 'Documented', drafting: 'Drafted',
  driving: 'Drove', editing: 'Edited', ensuring: 'Ensured', evaluating: 'Evaluated', handling: 'Handled',
  implementing: 'Implemented', investigating: 'Investigated', launching: 'Launched', leading: 'Led',
  maintaining: 'Maintained', managing: 'Managed', mentoring: 'Mentored', monitoring: 'Monitored',
  negotiating: 'Negotiated', onboarding: 'Onboarded', operating: 'Operated', organising: 'Organised',
  organizing: 'Organized', overseeing: 'Oversaw', performing: 'Performed', planning: 'Planned',
  preparing: 'Prepared', presenting: 'Presented', processing: 'Processed', producing: 'Produced',
  providing: 'Provided', publishing: 'Published', recruiting: 'Recruited', reporting: 'Reported',
  researching: 'Researched', resolving: 'Resolved', reviewing: 'Reviewed', running: 'Ran', scheduling: 'Scheduled',
  selling: 'Sold', serving: 'Served', supervising: 'Supervised', supporting: 'Supported', teaching: 'Taught',
  testing: 'Tested', tracking: 'Tracked', training: 'Trained', updating: 'Updated', writing: 'Wrote',
};

/** Openers that claim ownership of a task and can be followed by a gerund. */
export const OWNERSHIP_OPENERS = [
  'responsible for', 'was responsible for', 'tasked with', 'charged with', 'in charge of', 'accountable for',
  'duties included', 'duties include', 'role involved', 'my role was',
];

/** Openers swapped for a fixed phrase. The new phrase is never stronger than the old one. */
export const FIXED_SWAPS: Record<string, string> = {
  'worked on': 'Contributed to',
  'helped with': 'Supported',
  'assisted with': 'Supported',
  'assisted in': 'Supported',
};

/** Empty intensifiers at the start of a line. Removing them drops words and adds none. */
export const FILLER_STARTS = ['successfully', 'effectively', 'efficiently', 'proactively', 'actively', 'diligently'];

export const WEAK_OPENER_PATTERN = new RegExp(
  `\\b(?:${[...OWNERSHIP_OPENERS, ...Object.keys(FIXED_SWAPS)].map((s) => s.replace(/ /g, '\\s+')).join('|')})\\b`,
  'gi',
);

/** Words a rewrite is allowed to introduce. Past tense forms from the table plus the fixed swaps. */
export const REPLACEMENT_VERBS = new Set<string>([
  ...Object.values(GERUND_TO_PAST).map((v) => v.toLowerCase()),
  'contributed', 'supported', 'used', 'applied', 'increased', 'improved', 'raised', 'rose', 'grew', 'reduced', 'cut', 'owned',
]);

const ACTION_WORDS = new Set<string>([
  ...Object.keys(GERUND_TO_PAST),
  ...Object.values(GERUND_TO_PAST).map((v) => v.toLowerCase()),
  'achieved', 'built', 'coordinated', 'delivered', 'improved', 'increased', 'launched', 'reduced', 'saved', 'grew',
  'helped', 'assisted', 'worked', 'responsible', 'tasked', 'charged', 'accountable', 'supported', 'contributed',
  'created', 'tutored', 'taught', 'wrote', 'led', 'ran', 'managed', 'processed', 'resolved', 'trained',
]);

/** True when the first word of a line looks like the start of an achievement or duty. */
export function startsWithAction(line: string): boolean {
  const first = line.replace(/^[\s•*·▪●◦-]+/, '').split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? '';
  return ACTION_WORDS.has(first);
}
