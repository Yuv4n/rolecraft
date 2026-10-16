'use client';

import './directions-plan.css';
import {Check, Info} from 'lucide-react';
import type {Direction, FocusMode, Strength, Tier} from '../../lib/focus/types.ts';

const TIER_LABEL: Record<Tier, string> = {
  primary: 'Best fit now',
  adjacent: 'Adjacent field',
  stretch: 'Stretch',
};

const STRENGTH_LABEL: Record<Strength, string> = {
  strong: 'Strong evidence',
  partial: 'Partial evidence',
  none: 'No evidence yet',
};

const TIER_ORDER: Record<Tier, number> = {primary: 0, adjacent: 1, stretch: 2};

export function Directions(props: {
  directions: Direction[];
  selectedId?: string;
  onSelect: (id: string) => void;
  mode: FocusMode;
}) {
  const {directions, selectedId, onSelect, mode} = props;
  const ordered = [...directions].sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);

  return (
    <section aria-label="Suggested directions">
      {mode === 'offline' && (
        <div className="notice">
          <Info size={16} aria-hidden="true" />
          <p>Directions come from a limited built-in keyword engine rather than a language model.</p>
        </div>
      )}
      <div className="focus-directions">
        {ordered.map((direction) => {
          const selected = direction.id === selectedId;
          const showTransfer = direction.tier !== 'primary' && Boolean(direction.transferNote);
          return (
            <article
              key={direction.id}
              className={'card focus-direction' + (selected ? ' focus-selected' : '')}
            >
              <div className="focus-tier">
                <span>{TIER_LABEL[direction.tier]}</span>
                {selected && (
                  <span className="focus-chosen">
                    <Check size={14} aria-hidden="true" /> Chosen
                  </span>
                )}
              </div>
              <h3>{direction.title}</h3>
              <p className="focus-field">{direction.field}</p>
              <p className="focus-summary">{direction.summary}</p>

              {direction.reasons.length > 0 && (
                <>
                  <h4 className="focus-subhead">From your own words</h4>
                  {direction.reasons.map((reason, i) => (
                    <div key={i}>
                      <blockquote>{reason.quote}</blockquote>
                      <p className="focus-why">{reason.why}</p>
                    </div>
                  ))}
                </>
              )}

              {direction.gaps.length > 0 && (
                <>
                  <h4 className="focus-subhead">Requirements and gaps</h4>
                  <ul className="focus-gaps">
                    {direction.gaps.map((gap, i) => (
                      <li key={i} className="focus-gap">
                        <div className="focus-gap-head">
                          <span>{gap.requirement}</span>
                          <span className={'focus-strength focus-strength-' + gap.strength}>
                            {STRENGTH_LABEL[gap.strength]}
                          </span>
                        </div>
                        {gap.evidence.map((ev, j) => (
                          <blockquote key={j}>{ev.quote}</blockquote>
                        ))}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {showTransfer && (
                <>
                  <h4 className="focus-subhead">What carries over</h4>
                  <p className="focus-why">{direction.transferNote}</p>
                </>
              )}

              {direction.searchTitles.length > 0 && (
                <>
                  <h4 className="focus-subhead">Job titles to search for</h4>
                  <ul className="focus-titles">
                    {direction.searchTitles.map((t, i) => (
                      <li key={i} className="pill">
                        {t}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <button
                type="button"
                className={'primary focus-choose'}
                aria-pressed={selected}
                onClick={() => onSelect(direction.id)}
              >
                {selected ? 'Chosen' : 'Choose this direction'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
