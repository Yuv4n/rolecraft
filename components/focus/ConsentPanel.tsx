'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { Profile } from '../../lib/focus/types.ts';
import './consent-outreach.css';

function Sent({ id, label, text }: { id: string; label: string; text: string }) {
  return (
    <div className="focus-sent-field">
      <div className="focus-sent-head">
        <h4 id={id}>{label}</h4>
        <span className="focus-count">{text.length.toLocaleString()} characters</span>
      </div>
      <pre className="focus-pre" tabIndex={0} aria-labelledby={id}>
        {text.length > 0 ? text : '(empty)'}
      </pre>
    </div>
  );
}

export function ConsentPanel(props: { profile: Profile; onAccept: () => void; onUseOffline: () => void }) {
  const { profile, onAccept, onUseOffline } = props;
  // The checkbox is tied to the exact text it was ticked for, so any edit clears it.
  const signature = JSON.stringify([profile.cv, profile.projects, profile.interests, profile.hoursPerWeek, profile.applyBy]);
  const [ackedFor, setAckedFor] = useState<string | null>(null);
  const checked = ackedFor === signature;

  return (
    <section className="card focus-consent" aria-labelledby="focus-consent-title">
      <span className="section-kicker">BEFORE WE ANALYSE</span>
      <h2 id="focus-consent-title">Review what will be sent</h2>
      <p>
        Analysis sends the text below to Anthropic&apos;s API through this app&apos;s server. The server does not log or
        store it. Nothing else is sent: not your file, not the name of your file, and not data from your browser.
      </p>

      <Sent id="focus-sent-cv" label="CV text" text={profile.cv} />
      <Sent id="focus-sent-projects" label="Projects" text={profile.projects} />
      <Sent id="focus-sent-interests" label="Interests" text={profile.interests} />

      <div className="focus-sent-meta">
        <div>
          <h4 id="focus-sent-hours">Hours per week</h4>
          <pre className="focus-pre" aria-labelledby="focus-sent-hours">{String(profile.hoursPerWeek)}</pre>
        </div>
        <div>
          <h4 id="focus-sent-date">Apply-by date</h4>
          <pre className="focus-pre" aria-labelledby="focus-sent-date">{profile.applyBy || '(empty)'}</pre>
        </div>
      </div>

      <label className="focus-check">
        <input type="checkbox" checked={checked} onChange={(e) => setAckedFor(e.target.checked ? signature : null)} required />
        <span>I understand this text will be sent for analysis</span>
      </label>

      <div className="focus-actions">
        <button type="button" className="primary" disabled={!checked} onClick={onAccept}>
          <ShieldCheck size={14} aria-hidden="true" /> Send and analyse
        </button>
        <button type="button" className="secondary" onClick={onUseOffline}>
          Use the offline engine instead
        </button>
      </div>
      <p className="focus-offline-note">
        The offline engine keeps everything in the browser. It understands a limited vocabulary, so it will miss
        skills and roles that it has no word for.
      </p>
    </section>
  );
}
