'use client';

import './directions-plan.css';
import {useId} from 'react';
import {Check, CircleDashed, Minus} from 'lucide-react';
import {Alert} from '../kit/Alert';
import type {Direction, FocusMode, Gap, Strength, Tier} from '../../lib/focus/types.ts';

const TIER_LABEL: Record<Tier, string> = {
  primary: 'Best fit now',
  adjacent: 'Adjacent field',
  stretch: 'Stretch',
};

const TIER_ORDER: Record<Tier, number> = {primary: 0, adjacent: 1, stretch: 2};

const STRENGTH_LABEL: Record<Strength, string> = {
  strong: 'Strong evidence',
  partial: 'Partial evidence',
  none: 'Not shown yet',
};

const TALLY_LABEL: Record<Strength, string> = {
  strong: 'strong',
  partial: 'partial',
  none: 'not shown yet',
};

const STRENGTH_CLASS: Record<Strength, string> = {
  strong: 'badge badge--ok',
  partial: 'badge badge--warn',
  none: 'badge badge--none',
};

const STRENGTHS: Strength[] = ['strong', 'partial', 'none'];

function StrengthIcon({strength}: {strength: Strength}) {
  if (strength === 'strong') return <Check size={14} aria-hidden="true" />;
  if (strength === 'partial') return <Minus size={14} aria-hidden="true" />;
  return <CircleDashed size={14} aria-hidden="true" />;
}

function tally(gaps: Gap[]): {strength: Strength; count: number}[] {
  return STRENGTHS.map((strength) => ({
    strength,
    count: gaps.filter((g) => g.strength === strength).length,
  })).filter((t) => t.count > 0);
}

function DirectionCard(props: {
  direction: Direction;
  selected: boolean;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  const {direction, selected, onSelect, disabled} = props;
  const uid = useId();
  const inputId = `${uid}-input`;
  const summaryId = `${uid}-summary`;
  const counts = tally(direction.gaps);
  const quotes = direction.reasons.slice(0, 2);
  const showTransfer = direction.tier !== 'primary' && Boolean(direction.transferNote);
  const hasDetails = direction.gaps.length > 0 || direction.searchTitles.length > 0 || showTransfer;

  return (
    <div className={'dir-card card' + (selected ? ' dir-card--selected' : '')}>
      <input
        id={inputId}
        className="dir-input visually-hidden"
        type="radio"
        name="direction"
        value={direction.id}
        checked={selected}
        disabled={disabled}
        aria-describedby={summaryId}
        onChange={() => onSelect(direction.id)}
      />

      <div className="dir-card__top">
        <span className="badge">{TIER_LABEL[direction.tier]}</span>
        {selected && (
          <span className="badge badge--ok dir-selected-badge">
            <Check size={14} aria-hidden="true" /> Selected
          </span>
        )}
      </div>

      <h3 className="dir-card__title">
        <label htmlFor={inputId} className="dir-card__label">
          {direction.title}
        </label>
      </h3>
      <p className="dir-card__field muted">{direction.field}</p>
      <p id={summaryId} className="dir-card__summary">
        {direction.summary}
      </p>

      {quotes.length > 0 && (
        <div className="dir-card__block">
          <p className="dir-card__subhead">From your own words</p>
          {quotes.map((reason, i) => (
            <blockquote key={i} className="quote">
              {reason.quote}
              <span className="quote__why">{reason.why}</span>
            </blockquote>
          ))}
        </div>
      )}

      {counts.length > 0 && (
        <p className="dir-tally">
          <span className="visually-hidden">Evidence for this direction: </span>
          {counts.map(({strength, count}) => (
            <span key={strength} className={STRENGTH_CLASS[strength]}>
              <StrengthIcon strength={strength} />
              {count} {TALLY_LABEL[strength]}
            </span>
          ))}
        </p>
      )}

      {hasDetails && (
        <details className="disclosure dir-details">
          <summary>Requirements, gaps and job titles</summary>
          <div className="disclosure__body stack">
            {direction.gaps.length > 0 && (
              <div>
                <h4 className="dir-sub">Requirements and gaps</h4>
                <ul className="dir-gaps">
                  {direction.gaps.map((gap, i) => (
                    <li key={i} className="dir-gap">
                      <div className="dir-gap__head">
                        <span>{gap.requirement}</span>
                        <span className={STRENGTH_CLASS[gap.strength]}>
                          <StrengthIcon strength={gap.strength} />
                          {STRENGTH_LABEL[gap.strength]}
                        </span>
                      </div>
                      {gap.evidence.map((ev, j) => (
                        <blockquote key={j} className="quote">
                          {ev.quote}
                        </blockquote>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showTransfer && (
              <div>
                <h4 className="dir-sub">What carries over</h4>
                <p>{direction.transferNote}</p>
              </div>
            )}

            {direction.searchTitles.length > 0 && (
              <div>
                <h4 className="dir-sub">Job titles to search for</h4>
                <ul className="dir-titles">
                  {direction.searchTitles.map((t, i) => (
                    <li key={i} className="badge">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

export function Directions(props: {
  directions: Direction[];
  selectedId?: string;
  onSelect: (id: string) => void;
  mode: FocusMode;
  disabled?: boolean;
}) {
  const {directions, selectedId, onSelect, mode, disabled} = props;
  const ordered = [...directions].sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);

  return (
    <div className="dir-wrap">
      {mode === 'offline' && (
        <Alert kind="info">
          Directions come from a limited keyword engine, not a language model. Check each one against your own CV.
        </Alert>
      )}
      {ordered.length === 0 ? (
        <Alert kind="warning" title="No direction could be matched">
          Add more detail about your experience, projects or interests and try again.
        </Alert>
      ) : (
        <>
        <h2 className="visually-hidden">Directions to prepare for</h2>
        <div role="radiogroup" aria-label="Directions to prepare for" className="dir-list">
          {ordered.map((direction) => (
            <DirectionCard
              key={direction.id}
              direction={direction}
              selected={direction.id === selectedId}
              onSelect={onSelect}
              disabled={disabled}
            />
          ))}
        </div>
        </>
      )}
    </div>
  );
}
