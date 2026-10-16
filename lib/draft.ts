export const DRAFT_KEY = "rolecraft-draft";
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
