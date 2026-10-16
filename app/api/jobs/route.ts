import { createLimiter } from '../../../lib/jobs/limiter.ts';
import { parseJobRequest, searchJobs } from '../../../lib/jobs/search.ts';

// Takes role keywords only. Never accepts CV text or arbitrary URLs: every outbound
// request is built from a fixed list of public job-feed hosts.
const allow = createLimiter(20, 10 * 60 * 1000);

export async function POST(request: Request) {
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
