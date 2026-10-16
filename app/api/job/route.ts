import {clientIp, readCappedBody, sameOrigin} from '../../../lib/http';
import {checkJobUrl, resolvesToPublicAddresses} from '../../../lib/net-guard';
import {createLimiter} from '../../../lib/rate-limit';

// Fetches a public job posting for the user. This is a server-side request to a URL the user typed, so it is
// restricted: HTTPS only, public addresses only, no redirects, a time limit and a size cap.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limiter = createLimiter({windowMs: 60_000, max: 6});
const MAX_HTML_BYTES = 1_000_000;
const generic = 'This site could not be read. It may block automated access or redirect. Paste the job description to continue.';

function fail(status: number, error: string, headers?: Record<string, string>) {
  return Response.json({error}, {status, headers});
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail(403, 'This request came from another site.');
  const rate = limiter.hit(clientIp(request));
  if (rate.limited) return fail(429, 'Too many requests. Wait a minute and try again.', {'Retry-After': String(rate.retryAfterSeconds)});
  try {
    const body = await readCappedBody(request, 4096);
    if (body === null) return fail(413, 'The request is too large.');
    const {url} = JSON.parse(body) as {url?: unknown};
    if (typeof url !== 'string' || url.length > 2048) return fail(400, 'Use a public HTTPS job posting URL, or paste the description below.');
    const problem = checkJobUrl(url);
    if (problem) return fail(400, problem);
    const u = new URL(url);
    if (!(await resolvesToPublicAddresses(u.hostname))) throw new Error('address');

    const res = await fetch(u, {redirect: 'manual', signal: AbortSignal.timeout(10000), headers: {Accept: 'text/html'}});
    if (!res.ok || res.status >= 300) throw new Error('unavailable');
    const type = res.headers.get('content-type') ?? '';
    if (type && !/text\/html|application\/xhtml|text\/plain/i.test(type)) throw new Error('type');
    const reader = res.body?.getReader();
    if (!reader) throw new Error('empty');
    let html = '';
    let size = 0;
    const decoder = new TextDecoder();
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_HTML_BYTES) {
        await reader.cancel();
        throw new Error('large');
      }
      html += decoder.decode(value, {stream: true});
    }
    const text = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<\/(?:p|div|li|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;|&#160;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim()
      .slice(0, 20000);
    if (text.length < 100) throw new Error('empty');
    return Response.json({text});
  } catch {
    return fail(422, generic);
  }
}
