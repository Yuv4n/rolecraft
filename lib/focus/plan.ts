import type {Plan, PlanTask, ScheduledTask} from './types.ts';

const DAY = 86_400_000;

/** Whole weeks from `today` until `applyBy`, clamped to 1..26. Invalid dates give 6. */
export function weeksUntil(applyBy: string, today: Date = new Date()): number {
  const target = new Date(applyBy + 'T00:00:00Z').getTime();
  if (!Number.isFinite(target)) return 6;
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.min(26, Math.max(1, Math.ceil((target - start) / (7 * DAY))));
}

/**
 * Fits proposed tasks into hoursPerWeek x weeks. This is plain arithmetic and is deliberately
 * not done by the model. A share of the budget is held back for the tailored CV and outreach.
 * Tasks are taken in priority order; one that no longer fits is deferred and smaller,
 * lower-priority tasks are still tried.
 */
export function fitPlan(tasks: PlanTask[], hoursPerWeek: number, weeks: number): Plan {
  const perWeek = Number.isFinite(hoursPerWeek) ? Math.max(1, Math.round(hoursPerWeek)) : 1;
  const span = Number.isFinite(weeks) ? Math.max(1, Math.round(weeks)) : 1;
  const budgetHours = perWeek * span;
  const reserveHours = Math.min(budgetHours, Math.max(2, Math.round(budgetHours * 0.15)));
  let remaining = budgetHours - reserveHours;
  const ordered = [...tasks].sort((a, b) => a.priority - b.priority || a.hours - b.hours);
  const scheduled: ScheduledTask[] = [];
  const deferred: Plan['deferred'] = [];
  let cursor = 0; // hours already placed on the calendar
  for (const task of ordered) {
    const hours = Math.max(0.5, Math.round(task.hours * 2) / 2);
    if (hours > remaining) {
      deferred.push({
        task,
        reason: budgetHours - reserveHours <= 0
          ? `Your whole budget is no larger than the ${reserveHours}h held for the tailored CV and outreach. Add hours or move the date.`
          : remaining <= 0
          ? `No hours left after higher-priority tasks. This needs ${hours}h.`
          : `Needs ${hours}h and only ${remaining}h remain after higher-priority tasks and the CV and outreach reserve.`,
      });
      continue;
    }
    const startWeek = Math.floor(cursor / perWeek) + 1;
    const endWeek = Math.max(startWeek, Math.ceil((cursor + hours) / perWeek));
    scheduled.push({...task, hours, startWeek, endWeek});
    cursor += hours;
    remaining -= hours;
  }
  return {weeks: span, hoursPerWeek: perWeek, budgetHours, reserveHours, usedHours: cursor, scheduled, deferred};
}
