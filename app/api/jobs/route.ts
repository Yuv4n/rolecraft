import { createLimiter } from '../../../lib/jobs/limiter.ts';
import { parseJobRequest, searchJobs } from '../../../lib/jobs/search.ts';

// Takes role keywords only. Never accepts CV text or arbitrary URLs: every outbound
// request is built from a fixed list of public job-feed hosts.
//
// Live feeds are OFF unless JOB_FEEDS_ENABLED is "true". The public demo makes no
// outbound requests, so this route answers 410 until production egress controls
// and platform rate limiting are in place.
const allow = createLimiter(20, 10 * 60 * 1000);

function enabled(): boolean {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.JOB_FEEDS_ENABLED === 'true';
}

export async function POST(request: Request) {
  if (!enabled()) {
    return Response.json({ error: 'Live job search is turned off in this deployment. Use the sample postings, or paste a job description in the Tailor workflow.', disabled: true }, { status: 410, headers: { 'Cache-Control': 'no-store' } });
  }
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = request.headers.get('cf-connecting-ip') ?? forwarded ?? 'anonymous';
  if (!allow(ip, Date.now())) return Response.json({ error: 'Too many searches. Try again in a few minutes.' }, { status: 429 });
  const raw = await request.text();
  if (raw.length > 4096) return Response.json({ error: 'Request too large.' }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return Response.json({ error: 'Send valid JSON.' }, { status: 400 }); }
  const parsed = parseJobRequest(body);
  if ('error' in parsed) return Response.json({ error: parsed.error }, { status: 400 });
  return Response.json(await searchJobs(parsed));
}
