'use client';

import './outreach.css';
import {useId, useState} from 'react';
import {Copy, Send} from 'lucide-react';
import {Alert} from '../kit/Alert';
import type {Direction, Email, FocusMode, OutreachInput} from '../../lib/focus/types.ts';

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
  const {busy, error, email, mode, onGenerate, onBodyChange} = props;
  const uid = useId();
  const [company, setCompany] = useState('');
  const [contact, setContact] = useState('');
  const [page, setPage] = useState('');
  const [copyMsg, setCopyMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const pageLen = page.trim().length;
  const companyError = submitted && company.trim().length === 0 ? 'Enter the company name.' : '';
  const pageError =
    submitted && pageLen < MIN_PAGE
      ? `Paste at least ${MIN_PAGE} characters from the company. You have ${pageLen}.`
      : page.length > MAX_PAGE
        ? `Shorten the text to ${MAX_PAGE.toLocaleString()} characters or fewer.`
        : '';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setSubmitted(true);
    if (company.trim().length === 0 || pageLen < MIN_PAGE || page.length > MAX_PAGE) return;
    onGenerate({company: company.trim(), contact: contact.trim(), page});
  }

  async function copy() {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
      setCopyMsg('Copied to the clipboard.');
    } catch {
      setCopyMsg('Copying failed in this browser. Select the text in the box and copy it by hand.');
    }
  }

  const ids = {
    company: `${uid}-company`,
    contact: `${uid}-contact`,
    page: `${uid}-page`,
    body: `${uid}-body`,
  };

  return (
    <div>
      <h2>Draft an email to a company</h2>
      <p className="lead">It asks one small question about their work. It does not ask for a job.</p>

      <form className="card out-form" onSubmit={submit} noValidate aria-busy={busy} style={{marginTop: 'var(--s-4)'}}>
        <div className="out-form-row">
          <div className="field">
            <label className="field__label" htmlFor={ids.company}>Company name</label>
            <input
              id={ids.company}
              className="input field__control"
              type="text"
              maxLength={200}
              required
              aria-required="true"
              aria-invalid={companyError ? true : undefined}
              aria-describedby={companyError ? `${ids.company}-error` : undefined}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            {companyError && <p className="field__error" id={`${ids.company}-error`}>{companyError}</p>}
          </div>
          <div className="field">
            <label className="field__label" htmlFor={ids.contact}>
              Who you are writing to <span className="field__optional">(optional)</span>
            </label>
            <input
              id={ids.contact}
              className="input field__control"
              type="text"
              maxLength={200}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label className="field__label" htmlFor={ids.page}>Something the company published</label>
          <span className="field__hint" id={`${ids.page}-hint`}>
            Paste a few sentences from a careers page, blog post or announcement. The email can only refer to what is in this text.
          </span>
          <textarea
            id={ids.page}
            className="textarea field__control"
            rows={8}
            required
            aria-required="true"
            aria-invalid={pageError ? true : undefined}
            aria-describedby={`${ids.page}-hint ${ids.page}-count${pageError ? ` ${ids.page}-error` : ''}`}
            value={page}
            onChange={(e) => setPage(e.target.value)}
          />
          <div className="field__meta">
            <span id={`${ids.page}-count`}>
              {pageLen.toLocaleString()} of {MAX_PAGE.toLocaleString()} characters. At least {MIN_PAGE} are needed.
            </span>
          </div>
          {pageError && <p className="field__error" id={`${ids.page}-error`}>{pageError}</p>}
        </div>

        <div className="out-actions">
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? <span className="spinner" aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
            {busy ? 'Drafting…' : 'Draft email'}
          </button>
        </div>
      </form>

      {error && (
        <div className="out-alert">
          <Alert kind="error" title="The draft could not be created" focusOnMount>{error}</Alert>
        </div>
      )}

      <div aria-live="polite" className="visually-hidden">{email ? 'Draft ready' : ''}</div>

      {email && (
        <section className="card out-preview" aria-labelledby={`${uid}-draft`}>
          <h3 id={`${uid}-draft`} className="card__title">Your draft</h3>

          {mode === 'offline' && (
            <div className="out-alert" style={{marginTop: 0, marginBottom: 'var(--s-3)'}}>
              <Alert kind="info">This draft is assembled from a template and your own words. Read every sentence before you send it.</Alert>
            </div>
          )}
          <Alert kind="warning">Check every sentence before you send it.</Alert>

          <div className="out-preview__subject" style={{marginTop: 'var(--s-4)'}}>
            <span className="out-preview__label">Subject</span>
            <span className="out-preview__value">{email.subject}</span>
          </div>

          <div className="field">
            <label className="field__label" htmlFor={ids.body}>Email body (you can edit it)</label>
            <textarea
              id={ids.body}
              className="textarea field__control out-body"
              rows={12}
              value={email.body}
              onChange={(e) => {
                setCopyMsg('');
                onBodyChange(e.target.value);
              }}
            />
          </div>

          <div className="out-actions">
            <button type="button" className="btn btn--secondary" onClick={copy}>
              <Copy size={18} aria-hidden="true" /> Copy email
            </button>
            <span className="out-copy-status" role="status">{copyMsg}</span>
          </div>

          <h4 style={{marginTop: 'var(--s-6)', marginBottom: 'var(--s-3)'}}>Where each claim comes from</h4>
          {email.claims.length === 0 ? (
            <p className="muted">This draft makes no factual claims.</p>
          ) : (
            <ul className="out-claims">
              {email.claims.map((c, i) => (
                <li key={i}>
                  <p className="out-claims__sentence">{c.sentence}</p>
                  <span className={`badge${c.source === 'cv' ? ' badge--ok' : ''}`}>
                    {c.source === 'cv' ? 'From your CV' : 'From the company text'}
                  </span>
                  <blockquote className="quote">{c.quote}</blockquote>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
