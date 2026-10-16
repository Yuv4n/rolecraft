'use client';

import {useRef, type KeyboardEvent} from 'react';

type Tab = {id: string; label: string};

export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
export const panelId = (prefix: string, id: string) => `${prefix}-panel-${id}`;

/**
 * Tab list following the ARIA tabs pattern: one tab stop, arrow keys, Home and End move between tabs.
 * The parent renders the panel with role="tabpanel", id={panelId(prefix, value)} and aria-labelledby={tabId(prefix, value)}.
 */
export function Tabs({tabs, value, onChange, prefix, label}: {tabs: Tab[]; value: string; onChange: (id: string) => void; prefix: string; label: string}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  function onKeyDown(event: KeyboardEvent) {
    const i = tabs.findIndex((t) => t.id === value);
    let next = -1;
    if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    event.preventDefault();
    onChange(tabs[next].id);
    refs.current[tabs[next].id]?.focus();
  }
  return (
    <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {tabs.map((t) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[t.id] = el;
          }}
          type="button"
          role="tab"
          id={tabId(prefix, t.id)}
          aria-selected={t.id === value}
          aria-controls={panelId(prefix, t.id)}
          tabIndex={t.id === value ? 0 : -1}
          className="tabs__tab"
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
