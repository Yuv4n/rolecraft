import Anthropic from '@anthropic-ai/sdk';
import {getSecret, modelFor} from '../../../lib/focus/env';
import {makeAnthropicCall, ModelBadOutput, ModelRefusal, ModelTruncated} from '../../../lib/focus/anthropic';
import {AgentFailure, createOrchestrator} from '../../../lib/focus/orchestrator';
import {BadRequest, LIMITS, parseRequest} from '../../../lib/focus/validate';
import {clientIp, readCappedBody, sameOrigin} from '../../../lib/http';
import {createLimiter} from '../../../lib/rate-limit';

// This route handles CV text. It must never log request or response bodies.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Tells the browser whether live analysis is configured. Reveals nothing else. */
export async function GET() {
  return Response.json({live: Boolean(getSecret('ANTHROPIC_API_KEY'))});
}

function fail(status: number, error: string) {
  return Response.json({error}, {status});
}

const limiter = createLimiter({windowMs: 60_000, max: 12});

export async function POST(request: Request) {
  const apiKey = getSecret('ANTHROPIC_API_KEY');
  if (!apiKey) return fail(503, 'Live analysis is not configured on this server. Use the offline engine.');
  if (!sameOrigin(request)) return fail(403, 'This request came from another site.');
  const rate = limiter.hit(clientIp(request));
  if (rate.limited) return Response.json({error: 'Too many requests. Wait a minute and try again.'}, {status: 429, headers: {'Retry-After': String(rate.retryAfterSeconds)}});
  let raw: string | null;
  try {
    raw = await readCappedBody(request, LIMITS.total);
  } catch {
    return fail(400, 'Could not read the request.');
  }
  if (raw === null) return fail(413, 'The request is too large.');
  try {
    const req = parseRequest(JSON.parse(raw));
    const orchestrator = createOrchestrator({call: makeAnthropicCall(apiKey, getSecret('ANTHROPIC_WORKSPACE_ID')), modelFor});
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
    if (error instanceof Anthropic.BadRequestError || error instanceof Anthropic.NotFoundError || error instanceof Anthropic.PermissionDeniedError) {
      return fail(500, 'The analysis service rejected the server settings. The owner should check the API key, workspace ID and model name.');
    }
    if (error instanceof Anthropic.RateLimitError) return fail(429, 'The analysis service is busy. Wait a moment and try again.');
    if (error instanceof Anthropic.APIConnectionError) return fail(502, 'Could not reach the analysis service.');
    return fail(502, 'The analysis could not be completed.');
  }
}
