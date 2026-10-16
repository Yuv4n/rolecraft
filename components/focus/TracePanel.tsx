'use client';

import './directions-plan.css';
import type {TraceEntry} from '../../lib/focus/types.ts';

export function TracePanel(props: {trace: TraceEntry[]; title?: string}) {
  const {trace, title} = props;
  if (!trace || trace.length === 0) return null;

  return (
    <details className="disclosure">
      <summary>{title ?? 'How this was produced'}</summary>
      <div className="disclosure__body">
        <div className="table-wrap">
          <table className="table">
            <caption className="visually-hidden">Steps that produced this result</caption>
            <thead>
              <tr>
                <th scope="col">Agent</th>
                <th scope="col">Role</th>
                <th scope="col">Model</th>
                <th scope="col">Seconds</th>
                <th scope="col">Kept</th>
                <th scope="col">Removed</th>
                <th scope="col">Attempts</th>
              </tr>
            </thead>
            <tbody>
              {trace.map((entry, i) => (
                <tr key={i}>
                  <td>{entry.agent}</td>
                  <td>{entry.role}</td>
                  <td>{entry.model}</td>
                  <td>{(entry.ms / 1000).toFixed(1)}</td>
                  <td>{entry.kept}</td>
                  <td>{entry.dropped}</td>
                  <td>{entry.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted">
          Removed means a claim whose quote could not be found in your own text, so it was not shown.
        </p>
      </div>
    </details>
  );
}
