'use client';

import type {ReactNode} from 'react';

type Props = {
  /** Short status text. Announced politely, so busy and success messages reach screen reader users. */
  status?: ReactNode;
  busy?: boolean;
  children: ReactNode;
};

/** Sticky bar with the back link and the one primary action for the screen. */
export function ActionBar({status, busy, children}: Props) {
  return (
    <div className="action-bar">
      <div className="action-bar__status" role="status" aria-live="polite" data-busy={busy ? 'true' : 'false'}>
        {status}
      </div>
      <div className="action-bar__buttons">{children}</div>
    </div>
  );
}
