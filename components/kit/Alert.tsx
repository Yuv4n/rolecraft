'use client';

import {useEffect, useRef, type ReactNode} from 'react';
import {AlertTriangle, CheckCircle2, Info, XCircle} from 'lucide-react';

type Props = {
  kind?: 'info' | 'error' | 'success' | 'warning';
  title?: string;
  /** Moves keyboard focus to the alert when it appears. Used for errors so they are not missed. */
  focusOnMount?: boolean;
  children?: ReactNode;
};

const icons = {info: Info, error: XCircle, success: CheckCircle2, warning: AlertTriangle};

export function Alert({kind = 'info', title, focusOnMount, children}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusOnMount) ref.current?.focus();
  }, [focusOnMount]);
  const Icon = icons[kind];
  return (
    <div
      ref={ref}
      className={`alert${kind === 'info' ? '' : ` alert--${kind}`}`}
      role={kind === 'error' ? 'alert' : undefined}
      tabIndex={focusOnMount ? -1 : undefined}
    >
      <Icon className="alert__icon" size={20} aria-hidden="true" />
      <div className="alert__body">
        {title && <p className="alert__title">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}
