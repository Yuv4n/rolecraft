import type { JobPosting, JobQuery, JobSearchResult, SourceStatus } from './types.ts';
import { boardToken, isAllowedUrl, matchesPlace, matchesQueries, parseArbeitnow, parseGreenhouse, parseLever, parseRemotive, providerNames, urls } from './providers.ts';

const MAX_BYTES = 4 * 1024 * 1024;
const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; value: unknown }>();

const clean = (s: string, max: number) => s.replace(/[^\p{L}\p{N} +#&/.-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/** Validates a request body. Only short role keywords, a place and public board names are accepted. */
export function parseJobRequest(body: unknown): JobQuery | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Send a JSON object.' };
  const b = body as Record<string, unknown>;
  const queries = (Array.isArray(b.queries) ? b.queries : []).filter((q): q is string => typeof q === 'string').map((q) => clean(q, 60)).filter((q) => q.length >= 2).slice(0, 6);
  if (!queries.length) return { error: 'Add at least one role keyword.' };
  const boards = (typeof b.boards === 'object' && b.boards !== null ? b.boards : {}) as Record<string, unknown>;
  const tokens = (v: unknown) => (Array.isArray(v) ? v : []).filter((t): t is string => typeof t === 'string').map((t) => t.trim().toLowerCase()).filter((t) => boardToken.test(t)).slice(0, 8);
  return { queries: [...new Set(queries)], location: typeof b.location === 'string' ? clean(b.location, 60) : '', remoteOnly: b.remoteOnly === true, boards: { greenhouse: tokens(boards.greenhouse), lever: tokens(boards.lever) } };
}

async function fetchJson(url: string, f: typeof fetch, now: number): Promise<unknown> {
  if (!isAllowedUrl(url)) throw new Error('Blocked address');
  const hit = cache.get(url);
  if (hit && now - hit.at < TTL_MS) return hit.value;
  const res = await f(url, { redirect: 'manual', signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json', 'User-Agent': 'Rolecraft/1.0 (job discovery demo)' } });
  if (res.status >= 300) throw new Error(res.status >= 300 && res.status < 400 ? 'Redirected, not followed' : `HTTP ${res.status}`);
  const reader = res.body?.getReader();
  if (!reader) throw new Error('Empty response');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_BYTES) { await reader.cancel(); throw new Error('Response too large'); }
    chunks.push(value);
  }
  const text = new TextDecoder().decode(concatBytes(chunks, size));
  const value = JSON.parse(text) as unknown;
  if (cache.size > 100) cache.clear();
  cache.set(url, { at: now, value });
  return value;
}

function concatBytes(chunks: Uint8Array[], size: number): Uint8Array {
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}

const knownErrors = /^(Blocked address|Redirected, not followed|Empty response|Response too large|HTTP \d{3})$/;

/** Reduces failures to short fixed messages so internal error text never reaches the page. */
function friendly(reason: unknown): string {
  if (reason instanceof Error) {
    if (knownErrors.test(reason.message)) return reason.message;
    if (reason.name === 'TimeoutError' || reason.name === 'AbortError') return 'Timed out';
    if (reason.name === 'SyntaxError') return 'Unexpected response';
  }
  return 'Could not be reached';
}

export function clearJobCache() { cache.clear(); }

/** Reads open job feeds for the given keywords. The CV never reaches this function. */
export async function searchJobs(q: JobQuery, f: typeof fetch = fetch, now = Date.now()): Promise<JobSearchResult> {
  type Task = { name: string; run: () => Promise<JobPosting[]> };
  const tasks: Task[] = [
    { name: providerNames.remotive, run: async () => (await Promise.all(q.queries.slice(0, 4).map(async (k) => parseRemotive(await fetchJson(urls.remotive(k), f, now))))).flat() },
    { name: providerNames.arbeitnow, run: async () => parseArbeitnow(await fetchJson(urls.arbeitnow(), f, now)) },
    ...q.boards.greenhouse.map((t): Task => ({ name: `${providerNames.greenhouse} · ${t}`, run: async () => parseGreenhouse(await fetchJson(urls.greenhouse(t), f, now), t) })),
    ...q.boards.lever.map((t): Task => ({ name: `${providerNames.lever} · ${t}`, run: async () => parseLever(await fetchJson(urls.lever(t), f, now), t) })),
  ];
  const settled = await Promise.allSettled(tasks.map((t) => t.run()));
  const sources: SourceStatus[] = [];
  const all: JobPosting[] = [];
  settled.forEach((r, i) => {
    const name = tasks[i].name;
    if (r.status === 'rejected') { sources.push({ name, ok: false, count: 0, error: friendly(r.reason) }); return; }
    const unique = [...new Map(r.value.map((p) => [p.url, p])).values()];
    const kept = unique.filter((p) => matchesQueries(p, q.queries) && matchesPlace(p, q.location, q.remoteOnly))
      .sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0)).slice(0, 25);
    sources.push({ name, ok: true, count: kept.length });
    all.push(...kept);
  });
  const seen = new Set<string>();
  const postings = all.filter((p) => (seen.has(p.url) ? false : (seen.add(p.url), true)));
  return { postings, sources };
}
