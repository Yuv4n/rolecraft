'use client';

import { CalendarClock } from 'lucide-react';
import type { ScheduledTask } from '../../lib/focus/types.ts';
import './consent-outreach.css';

function daysLine(days: number): string {
  if (days < 0) return 'Your apply-by date has passed.';
  if (days === 0) return 'Your apply-by date is today.';
  return days === 1 ? '1 day remains until your apply-by date.' : `${days} days remain until your apply-by date.`;
}

export function NextAction(props: { task?: ScheduledTask; daysToApply: number }) {
  const { task, daysToApply } = props;
  return (
    <section className="card focus-next" aria-labelledby="focus-next-title">
      <span className="section-kicker">NEXT ACTION</span>
      <h2 id="focus-next-title">Your task for this week</h2>
      {task ? (
        <>
          <h3>{task.title}</h3>
          <p className="focus-next-meta">
            <span className="pill">{task.hours} {task.hours === 1 ? 'hour' : 'hours'}</span>
          </p>
          <p className="focus-next-box">Deliverable: {task.deliverable}</p>
          <p>{task.why}</p>
        </>
      ) : (
        <p>
          No project task is scheduled for this week. Use the first week to finish your tailored CV, so it is ready
          when you start to apply.
        </p>
      )}
      <p className="focus-next-days">
        <CalendarClock size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }} />
        {daysLine(daysToApply)}
      </p>
    </section>
  );
}
