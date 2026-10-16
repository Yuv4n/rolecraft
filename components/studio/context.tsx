'use client';
import { createContext, useContext } from 'react';
import type { Change, Decision, SavedRole, Snapshot, Variant, Workspace } from '../../lib/cv/types';
import type { Action, Effective } from '../../lib/cv/workspace';

export type Workflow = 'home' | 'careers' | 'tailor' | 'roles' | 'plan' | 'review';

export interface StudioApi {
  ws: Workspace;
  dispatch: (action: Action) => void;
  variant: Variant;
  /** Working copy with accepted changes applied. Every workflow reads this. */
  eff: Effective;
  snap: Snapshot;
  head: Snapshot;
  workflow: Workflow;
  go: (w: Workflow) => void;
  stage: (change: Change, decision: Decision | null) => void;
  decisionOf: (changeId: string) => Decision | undefined;
  /** A change being previewed in the document panel, or null. */
  peek: Change | null;
  setPeek: (c: Change | null) => void;
  activeRoleId: string | null;
  setActiveRoleId: (id: string | null) => void;
  activeRole: SavedRole | null;
  planTargetIds: string[];
  setPlanTargetIds: (ids: string[]) => void;
  viewVersionId: string | null;
  setViewVersionId: (id: string | null) => void;
  /** Opens the document panel on a tab. */
  showDoc: (tab?: 'preview' | 'content' | 'layout' | 'history') => void;
  notify: (message: string) => void;
}

export const StudioContext = createContext<StudioApi | null>(null);

export function useStudio(): StudioApi {
  const api = useContext(StudioContext);
  if (!api) throw new Error('useStudio must be used inside the studio');
  return api;
}
