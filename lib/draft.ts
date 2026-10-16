import { parseWorkspace } from "./cv/workspace.ts";
import type { Workspace } from "./cv/types.ts";
export const DRAFT_KEY = "rolecraft-draft";
export const WORKSPACE_DRAFT_KEY = "rolecraft-workspace-draft";
// localStorage holds about 5 MB per origin. Refuse anything near that.
export const MAX_WORKSPACE_DRAFT = 2_000_000;
export type Draft = {
  version: 1;
  cv: string;
  job: string;
  result: string;
  filename: string;
};
export function readDraft(raw: string | null): Draft | null {
  if (!raw || raw.length > 100000) return null;
  try {
    const d: unknown = JSON.parse(raw);
    if (!d || typeof d !== "object") return null;
    const value = d as Record<string, unknown>;
    if (
      value.version !== 1 ||
      typeof value.cv !== "string" ||
      typeof value.job !== "string" ||
      typeof value.result !== "string" ||
      typeof value.filename !== "string" ||
      value.cv.length > 30000 ||
      value.job.length > 20000 ||
      value.result.length > 30000 ||
      value.filename.length > 255
    )
      return null;
    return value as Draft;
  } catch {
    return null;
  }
}

export function readWorkspaceDraft(raw: string | null): Workspace | null {
  if (!raw || raw.length > MAX_WORKSPACE_DRAFT) return null;
  try {
    return parseWorkspace(raw);
  } catch {
    return null;
  }
}
