'use client';

import {rubric} from '../../lib/engine';

/**
 * Explains each score in plain words: what it measures, how it is calculated, what it cannot see and how to improve it.
 * The text comes from `rubric` in lib/engine.ts, the same module that calculates the scores, so the two cannot drift apart.
 */
export function RubricExplainer() {
  return (
    <details className="disclosure">
      <summary>How these scores work</summary>
      <div className="disclosure__body">
        <p>
          There are four scores, each out of 100. The headline number is their plain average. They are checks for revising a CV. They do not predict whether anyone will
          hire you and they do not simulate any employer&apos;s system.
        </p>
        <div className="rubric-list">
          {rubric.map((r) => (
            <section key={r.name} className="rubric-item" aria-labelledby={`rubric-${r.name.replace(/\s+/g, '-')}`}>
              <h4 id={`rubric-${r.name.replace(/\s+/g, '-')}`}>{r.name}</h4>
              <dl>
                <dt>What it measures</dt>
                <dd>{r.measures}</dd>
                <dt>How it is calculated</dt>
                <dd>{r.method}</dd>
                <dt>What it cannot see</dt>
                <dd>{r.limits}</dd>
                <dt>How to improve it</dt>
                <dd>{r.improve}</dd>
              </dl>
            </section>
          ))}
        </div>
      </div>
    </details>
  );
}
