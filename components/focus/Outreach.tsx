'use client';

import { useState } from 'react';
import { Copy, Send } from 'lucide-react';
import type { Direction, Email, FocusMode, OutreachInput } from '../../lib/focus/types.ts';
import './consent-outreach.css';

const MIN_PAGE = 80;
const MAX_PAGE = 20000;

export function Outreach(props: {
  direction: Direction;
  busy: boolean;
  error?: string;
  email?: Email;
  mode: FocusMode;
  onGenerate: (input: OutreachInput) => void;
  onBodyChange: (body: string) => void;
}) {
  const { direction, busy, error, email, mode, onGenerate, onBodyChange } = props;
  const [company, setCompany] = useState('');
  const [contact, setContact] = useState('');
  const [page, setPage] = useState('');
  const [copyMsg, setCopyMsg] = useState('');

  const pageLen = page.trim().length;
  const pageBad = pageLen > 0 && (pageLen < MIN_PAGE || page.length > MAX_PAGE);
  const valid = company.trim().length > 0 && pageLen >= MIN_PAGE && page.length <= MAX_PAGE;

  async function copy() {
    if (!email) return;
    const text = `Subject: ${email.subject}\n\n${email.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg('Copied to the clipboard.');
    } catch {
      setCopyMsg('Copying failed in this browser. Select the text in the box and copy it by hand.');
    }
  }

  return (
    <section className="card focus-outreach" aria-labelledby="focus-outreach-title" aria-busy={busy}>
      <span className="section-kicker">OUTREACH</span>
      <h2 id="focus-outreach-title">Draft a short email for {direction.title}</h2>
      <p className="muted">
        The email asks one question about the company&apos;s work. It does not ask for a job.
      </p>

      <form
        className="focus-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && !busy) onGenerate({ company: company.trim(), contact: contact.trim(), page });
        }}
      >
        <div className="focus-field-row">
          <div className="focus-field">
            <label htmlFor="focus-company">Company name (required)</label>
            <input id="focus-company" type="text" value={company} required maxLength={200} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div className="focus-field">
            <label htmlFor="focus-contact">Contact name or role (optional)</label>
            <input id="focus-contact" type="text" value={contact} maxLength={200} onChange={(e) => setContact(e.target.value)} />
          </div>
        </div>
        <div className="focus-field">
          <label htmlFor="focus-page">Paste something the company published</label>
          <textarea
            id="focus-page"
            value={page}
            required
            aria-describedby="focus-page-help focus-page-count"
            onChange={(e) => setPage(e.target.value)}
          />
          <p className="field-help" id="focus-page-help">
            A careers page, a blog post, or an announcement. The email may only refer to what is in this text.
          </p>
          <div id="focus-page-count" className={`focus-counter${pageBad ? ' focus-bad' : ''}`}>
            {pageLen.toLocaleString()} of {MAX_PAGE.toLocaleString()} characters. At least {MIN_PAGE} are needed.
          </div>
        </div>
        <div className="focus-actions">
          <button type="submit" className="primary" disabled={busy || !valid}>
            <Send size={14} aria-hidden="true" /> {busy ? 'Drafting...' : 'Draft email'}
          </button>
        </div>
      </form>

      {error ? (
        <div className="error" role="alert" style={{ marginTop: 18 }}>
          {error}
        </div>
      ) : null}

      {email ? (
        <div className="focus-result">
          <h3>Draft</h3>
          <span className="section-kicker">SUBJECT</span>
          <p className="focus-subject">{email.subject}</p>
          <label htmlFor="focus-body">Email body (you can edit it)</label>
          <textarea
            id="focus-body"
            className="focus-body"
            value={email.body}
            onChange={(e) => {
              setCopyMsg('');
              onBodyChange(e.target.value);
            }}
          />
          <div className="focus-actions" style={{ marginTop: 12 }}>
            <button type="button" className="secondary" onClick={copy}>
              <Copy size={14} aria-hidden="true" /> Copy
            </button>
            <span className="focus-status" role="status">{copyMsg}</span>
          </div>

          <p className="focus-warn">
            Check every sentence before you send it. The draft asks a question and does not ask for a job.
            {mode === 'offline' ? ' This draft is assembled from templates and your own words.' : ''}
          </p>

          <h4 style={{ marginTop: 24 }}>Where each claim comes from</h4>
          {email.claims.length === 0 ? (
            <p className="muted">This draft makes no factual claims.</p>
          ) : (
            <ul className="focus-claims">
              {email.claims.map((c, i) => (
                <li key={i}>
                  <p className="focus-claim-sentence">{c.sentence}</p>
                  <span className="pill">{c.source === 'cv' ? 'From your CV' : 'From the company text'}</span>
                  <blockquote>{c.quote}</blockquote>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
