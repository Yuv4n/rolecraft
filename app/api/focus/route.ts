import Anthropic from '@anthropic-ai/sdk';
import {getSecret, modelFor} from '../../../lib/focus/env';
import {makeAnthropicCall, ModelBadOutput, ModelRefusal, ModelTruncated} from '../../../lib/focus/anthropic';
import {AgentFailure, createOrchestrator} from '../../../lib/focus/orchestrator';
import {BadRequest, LIMITS, parseRequest} from '../../../lib/focus/validate';

// This route handles CV text. It must never log request or response bodies.

/** Tells the browser whether live analysis is configured. Reveals nothing else. */
export async function GET() {
  return Response.json({live: Boolean(getSecret('ANTHROPIC_API_KEY'))});
}

function fail(status: number, error: string) {
  return Response.json({error}, {status});
}

// Best-effort limits. Each Worker isolate keeps its own counts, so this slows casual abuse but is not
// a substitute for platform rate limiting.
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;
const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) for (const [key, times] of hits) if (!times.some((t) => now - t < WINDOW_MS)) hits.delete(key);
  return recent.length > MAX_REQUESTS;
}

function clientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

/** Reads the body but stops once it passes the byte limit, so an oversized request is never buffered whole. */
async function readBody(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > LIMITS.total) return null;
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > LIMITS.total) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const apiKey = getSecret('ANTHROPIC_API_KEY');
  if (!apiKey) return fail(503, 'Live analysis is not configured on this server. Use the offline engine.');
  if (!sameOrigin(request)) return fail(403, 'This request came from another site.');
  if (limited(clientIp(request))) return fail(429, 'Too many requests. Wait a minute and try again.');
  let raw: string | null;
  try {
    raw = await readBody(request);
  } catch {
    return fail(400, 'Could not read the request.');
  }
  if (raw === null) return fail(413, 'The request is too large.');
  try {
    const req = parseRequest(JSON.parse(raw));
    const orchestrator = createOrchestrator({call: makeAnthropicCall(apiKey), modelFor});
    switch (req.action) {
      case 'discover':
        return Response.json(await orchestrator.discover(req.profile));
      case 'package':
        return Response.json(await orchestrator.buildPackage(req.profile, req.direction));
      case 'outreach':
        return Response.json(await orchestrator.outreach(req.profile, req.direction, req.input));
    }
  } catch (error) {
    if (error instanceof SyntaxError) return fail(400, 'Invalid request.');
    if (error instanceof BadRequest) return fail(400, error.message);
    if (error instanceof AgentFailure) return fail(422, error.message + ' Try again, or use the offline engine.');
    if (error instanceof ModelRefusal) return fail(422, 'The model declined this request. Try the offline engine.');
    if (error instanceof ModelTruncated || error instanceof ModelBadOutput) return fail(502, 'The analysis was cut short or unreadable. Try again.');
    if (error instanceof Anthropic.AuthenticationError) return fail(500, 'The server API key was rejected.');
    if (error instanceof Anthropic.RateLimitError) return fail(429, 'The analysis service is busy. Wait a moment and try again.');
    if (error instanceof Anthropic.APIConnectionError) return fail(502, 'Could not reach the analysis service.');
    return fail(502, 'The analysis could not be completed.');
  }
}
