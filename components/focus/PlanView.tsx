'use client';

import './directions-plan.css';
import {useId, useMemo} from 'react';
import type {Direction, PlanTask} from '../../lib/focus/types.ts';
import {fitPlan} from '../../lib/focus/plan.ts';

function weekRange(start: number, end: number): string {
  return start === end ? `Week ${start}` : `Weeks ${start} to ${end}`;
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

  return (
    <section className="card focus-plan" aria-label="Preparation plan">
      <div className="section-kicker">PREPARATION PLAN</div>
      <h2>{direction.title}</h2>

      <div className="focus-budget">
        <div>
          <strong>{plan.budgetHours}h</strong>
          <span>
            Budget: {plan.hoursPerWeek} hours per week for {plan.weeks} {plan.weeks === 1 ? 'week' : 'weeks'}
          </span>
        </div>
        <div>
          <strong>{plan.reserveHours}h</strong>
          <span>Held for the tailored CV and outreach</span>
        </div>
        <div>
          <strong>{plan.usedHours}h</strong>
          <span>Scheduled on the tasks below</span>
        </div>
      </div>

      <div className="focus-slider">
        <label htmlFor={sliderId}>
          <span>Hours per week</span>
          <span>{sliderValue}</span>
        </label>
        <input
          id={sliderId}
          type="range"
          min={1}
          max={40}
          step={1}
          value={sliderValue}
          onChange={(e) => onHoursChange(Number(e.target.value))}
        />
      </div>

      {tasks.length === 0 ? (
        <p className="focus-empty">No plan tasks were produced for this direction.</p>
      ) : (
        <>
          <h3>Week by week</h3>
          {plan.scheduled.length === 0 ? (
            <p className="focus-empty">
              No task fits in this budget. Raise the hours per week to schedule work.
            </p>
          ) : (
            <ol className="focus-timeline">
              {plan.scheduled.map((task) => {
                const left = ((task.startWeek - 1) / plan.weeks) * 100;
                const width = Math.max(2, ((task.endWeek - task.startWeek + 1) / plan.weeks) * 100);
                return (
                  <li key={task.id} className="focus-task">
                    <div className="focus-task-head">
                      <span>{weekRange(task.startWeek, task.endWeek)}</span>
                      <span>{task.hours}h</span>
                    </div>
                    <h4>{task.title}</h4>
                    <div
                      className="focus-bar"
                      role="img"
                      aria-label={`${weekRange(task.startWeek, task.endWeek)} of ${plan.weeks}`}
                    >
                      <div
                        className="focus-bar-fill"
                        style={{left: `${left}%`, width: `${Math.min(width, 100 - left)}%`}}
                      />
                    </div>
                    <p>
                      <span className="focus-label">Requirement:</span> {task.requirement}
                    </p>
                    <p>
                      <span className="focus-label">Deliverable:</span> {task.deliverable}
                    </p>
                    <p>
                      <span className="focus-label">Why it matters:</span> {task.why}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="focus-after">
            <h3>After you apply</h3>
            {plan.deferred.length === 0 ? (
              <p className="focus-note">Nothing is deferred. Every task fits in your budget.</p>
            ) : (
              <ul className="focus-timeline">
                {plan.deferred.map(({task, reason}) => (
                  <li key={task.id} className="focus-task">
                    <h4>{task.title}</h4>
                    <p>{reason}</p>
                    <p>
                      <span className="focus-label">Requirement:</span> {task.requirement}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <p className="focus-fine">
        Add a project to your CV only after you have finished it, and label independent projects as independent.
      </p>
    </section>
  );
}
