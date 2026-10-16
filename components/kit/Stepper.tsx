'use client';

import {Check} from 'lucide-react';

type Props = {
  steps: string[];
  current: number;
  /** Furthest step the person has reached. Steps up to here can be revisited. */
  reached: number;
  disabled?: boolean;
  onGo: (index: number) => void;
};

/**
 * Progress through the flow. Labels are one to three words. Steps already reached are buttons, so a person
 * can go back and forth; steps not yet reached are plain text and cannot be skipped to. On narrow screens the
 * list collapses into "Step 2 of 5: Directions" and a progress bar.
 */
export function Stepper({steps, current, reached, disabled, onGo}: Props) {
  return (
    <nav className="stepper" aria-label="Progress">
      <p className="stepper__summary">
        Step {current + 1} of {steps.length}: <strong>{steps[current]}</strong>
      </p>
      <div className="stepper__bar" aria-hidden="true">
        <span style={{width: `${((current + 1) / steps.length) * 100}%`}} />
      </div>
      <ol className="stepper__list">
        {steps.map((label, i) => {
          const isCurrent = i === current;
          const visited = i <= reached && !isCurrent;
          const marker = visited ? <Check size={16} aria-hidden="true" /> : i + 1;
          const classes = 'stepper__item' + (isCurrent ? ' is-current' : visited ? ' is-complete' : '');
          return (
            <li key={label} className={classes}>
              {visited ? (
                <button type="button" className="stepper__step" disabled={disabled} onClick={() => onGo(i)}>
                  <span className="stepper__marker">{marker}</span>
                  <span className="stepper__label">
                    {label}
                    <span className="visually-hidden"> (completed, go to this step)</span>
                  </span>
                </button>
              ) : (
                <span className="stepper__step" aria-current={isCurrent ? 'step' : undefined}>
                  <span className="stepper__marker">{marker}</span>
                  <span className="stepper__label">
                    {label}
                    {!isCurrent && <span className="visually-hidden"> (not reached yet)</span>}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
