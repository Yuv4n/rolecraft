'use client';

import './directions-plan.css';
import {useId, useMemo} from 'react';
import {Alert} from '../kit/Alert';
import type {Direction, PlanTask} from '../../lib/focus/types.ts';
import {fitPlan} from '../../lib/focus/plan.ts';

function weekRange(start: number, end: number): string {
  return start === end ? `Week ${start}` : `Weeks ${start} to ${end}`;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function PlanView(props: {
  direction: Direction;
  tasks: PlanTask[];
  hoursPerWeek: number;
  weeks: number;
  onHoursChange: (h: number) => void;
}) {
  const {direction, tasks, hoursPerWeek, weeks, onHoursChange} = props;
  const sliderId = useId();
  const plan = useMemo(() => fitPlan(tasks, hoursPerWeek, weeks), [tasks, hoursPerWeek, weeks]);
  const sliderValue = Math.min(40, Math.max(1, Math.round(hoursPerWeek) || 1));
  const fit = plan.scheduled.length;
  const moved = plan.deferred.length;

  let summary: string;
  if (tasks.length === 0) {
    summary = `At ${sliderValue} ${sliderValue === 1 ? 'hour' : 'hours'} a week: there are no tasks to schedule.`;
  } else if (moved === 0) {
    summary = `At ${sliderValue} ${sliderValue === 1 ? 'hour' : 'hours'} a week: all ${plural(fit, 'task fits', 'tasks fit')}.`;
  } else if (fit === 0) {
    summary = `At ${sliderValue} ${sliderValue === 1 ? 'hour' : 'hours'} a week: no task fits and ${plural(moved, 'task moves', 'tasks move')} to after you apply.`;
  } else {
    summary = `At ${sliderValue} ${sliderValue === 1 ? 'hour' : 'hours'} a week: ${plural(fit, 'task fits', 'tasks fit')} and ${moved} ${moved === 1 ? 'moves' : 'move'} to after you apply.`;
  }

  return (
    <div className="plan stack-lg">
      <h2>Your plan for {direction.title}</h2>

      <div className="card">
        <div className="field">
          <label className="field__label" htmlFor={sliderId}>
            Hours per week
          </label>
          <span className="field__hint">
            for {plural(plan.weeks, 'week', 'weeks')}. That is {plan.budgetHours} hours in total.
          </span>
          <div className="plan-slider field__control">
            <input
              id={sliderId}
              className="range"
              type="range"
              min={1}
              max={40}
              step={1}
              value={sliderValue}
              onChange={(e) => onHoursChange(Number(e.target.value))}
            />
            <output htmlFor={sliderId} className="plan-slider__value">
              {sliderValue}
            </output>
          </div>
          <p className="plan-summary" aria-live="polite">
            {summary}
          </p>
        </div>

        <dl className="plan-stats">
          <div className="plan-stat">
            <dt>Budget</dt>
            <dd>{plan.budgetHours} h</dd>
          </div>
          <div className="plan-stat">
            <dt>Held for CV and outreach</dt>
            <dd>{plan.reserveHours} h</dd>
          </div>
          <div className="plan-stat">
            <dt>Scheduled</dt>
            <dd>{plan.usedHours} h</dd>
          </div>
        </dl>
      </div>

      {tasks.length === 0 ? (
        <Alert kind="info">No plan tasks were produced for this direction.</Alert>
      ) : (
        <>
          <section aria-labelledby={`${sliderId}-weeks`} className="stack">
            <h3 id={`${sliderId}-weeks`}>Week by week</h3>
            {fit === 0 ? (
              <Alert kind="warning" title="No task fits in this budget">
                Raise the hours per week to schedule work. Each task needs more time than is left after the hours held for your CV and outreach.
              </Alert>
            ) : (
              <ol className="plan-list">
                {plan.scheduled.map((task) => {
                  const left = ((task.startWeek - 1) / plan.weeks) * 100;
                  const width = Math.max(2, ((task.endWeek - task.startWeek + 1) / plan.weeks) * 100);
                  const range = weekRange(task.startWeek, task.endWeek);
                  return (
                    <li key={task.id} className="card plan-task">
                      <div className="plan-task__meta">
                        <span className="badge">{range}</span>
                        <span className="muted">{task.hours} h</span>
                      </div>
                      <h4>{task.title}</h4>
                      <p>
                        <span className="badge badge--none plan-task__addr">Addresses: {task.requirement}</span>
                      </p>
                      <dl className="plan-defs">
                        <div>
                          <dt>Deliverable</dt>
                          <dd>{task.deliverable}</dd>
                        </div>
                        <div>
                          <dt>Why it matters</dt>
                          <dd>{task.why}</dd>
                        </div>
                      </dl>
                      <div
                        className="plan-bar"
                        role="img"
                        aria-label={`${range} of ${plan.weeks}`}
                      >
                        <div
                          className="plan-bar__fill"
                          style={{left: `${left}%`, width: `${Math.min(width, 100 - left)}%`}}
                        />
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section aria-labelledby={`${sliderId}-after`} className="stack">
            <h3 id={`${sliderId}-after`}>After you apply</h3>
            {moved === 0 ? (
              <p>Everything fits in your budget.</p>
            ) : (
              <ul className="plan-list">
                {plan.deferred.map(({task, reason}) => (
                  <li key={task.id} className="card card--tint plan-task plan-task--later">
                    <div className="plan-task__meta">
                      <h4>{task.title}</h4>
                      <span className="muted">{task.hours} h</span>
                    </div>
                    <p>{reason}</p>
                    <p className="muted">Addresses: {task.requirement}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <p className="muted">
        Add a project to your CV only after you have finished it, and label independent projects as independent.
      </p>
    </div>
  );
}
