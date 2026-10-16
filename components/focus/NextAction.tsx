'use client';

import './outreach.css';
import type {ScheduledTask} from '../../lib/focus/types.ts';

function daysLine(days: number): string | null {
  if (!Number.isFinite(days)) return null;
  if (days < 0) return 'Your apply-by date has passed.';
  if (days === 0) return 'Your apply-by date is today.';
  return days === 1 ? '1 day until your apply-by date.' : `${days} days until your apply-by date.`;
}

export function NextAction({task, daysToApply}: {task?: ScheduledTask; daysToApply: number}) {
  const days = daysLine(daysToApply);
  return (
    <section className="card card--tint" aria-labelledby="next-title">
      <h2 id="next-title">Your task for this week</h2>
      {task ? (
        <>
          <h3 className="next-task__title">{task.title}</h3>
          <p className="next-task__meta">
            <span className="badge">{task.hours} {task.hours === 1 ? 'hour' : 'hours'}</span>
          </p>
          <dl className="next-details">
            <dt>Deliverable</dt>
            <dd>{task.deliverable}</dd>
            <dt>Why it matters</dt>
            <dd>{task.why}</dd>
          </dl>
        </>
      ) : (
        <p className="next-task__title">No project task is scheduled for this week. The week is best used to finish and check your tailored CV, so it is ready when you start to apply.</p>
      )}
      {days && <p className="next-days">{days}</p>}
    </section>
  );
}
