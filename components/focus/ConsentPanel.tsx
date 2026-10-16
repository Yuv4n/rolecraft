'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { Profile } from '../../lib/focus/types.ts';
import './consent.css';

function Sent({ id, label, text }: { id: string; label: string; text: string }) {
  return (
    <details className="disclosure">
      <summary>
        <span id={id}>{label}</span>
        <span className="consent-count">{text.length.toLocaleString()} {text.length === 1 ? 'character' : 'characters'}</span>
      </summary>
      <div className="disclosure__body">
        <pre className="consent-pre" tabIndex={0} aria-label={`${label} that will be sent`}>
          {text.length > 0 ? text : '(empty)'}
        </pre>
      </div>
    </details>
  );
}

export function ConsentPanel(props: { profile: Profile; onAccept: () => void; onUseOffline: () => void; onBack: () => void }) {
  const { profile, onAccept, onUseOffline, onBack } = props;
  // The checkbox is tied to the exact text it was ticked for, so any edit clears it.
  const signature = JSON.stringify([profile.cv, profile.projects, profile.interests, profile.hoursPerWeek, profile.applyBy]);
  const [ackedFor, setAckedFor] = useState<string | null>(null);
  const checked = ackedFor === signature;

  return (
    <section className="consent-panel" aria-labelledby="consent-title">
      <h2 id="consent-title">Before we send anything</h2>
      <p>
        The text below will be sent to Anthropic&apos;s API through this app&apos;s server for analysis. The server does
        not log or store it. Nothing else is sent. That includes your file, its name and data from your browser.
      </p>

      <div className="card">
        <h3 className="card__title">What will be sent</h3>
        <div className="consent-list">
          <Sent id="consent-cv" label="CV text" text={profile.cv} />
          <Sent id="consent-projects" label="Projects" text={profile.projects} />
          <Sent id="consent-interests" label="Interests" text={profile.interests} />
          <dl className="consent-meta">
            <div>
              <dt>Hours per week</dt>
              <dd>{profile.hoursPerWeek}</dd>
            </div>
            <div>
              <dt>Apply-by date</dt>
              <dd>{profile.applyBy || '(empty)'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <label className="check">
        <input type="checkbox" checked={checked} onChange={(e) => setAckedFor(e.target.checked ? signature : null)} />
        <span>I understand this text will be sent for analysis</span>
      </label>

      <div className="consent-actions">
        <button
          type="button"
          className="btn btn--primary"
          disabled={!checked}
          aria-describedby={checked ? undefined : 'consent-hint'}
          onClick={onAccept}
        >
          <ShieldCheck size={18} aria-hidden="true" /> Send and analyse
        </button>
        {!checked && <span className="consent-hint" id="consent-hint">Tick the box to continue.</span>}
      </div>

      <div className="consent-offline">
        <button type="button" className="btn btn--secondary" aria-describedby="consent-offline-note" onClick={onUseOffline}>
          Use the offline engine instead
        </button>
        <p id="consent-offline-note">Stays in your browser. It understands a limited vocabulary.</p>
      </div>

      <div className="consent-actions">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          Back to edit
        </button>
      </div>
    </section>
  );
}
