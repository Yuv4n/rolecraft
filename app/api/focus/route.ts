import Anthropic from '@anthropic-ai/sdk';
import {getSecret, modelFor} from '../../../lib/focus/env';
import {makeAnthropicCall, ModelRefusal, ModelTruncated} from '../../../lib/focus/anthropic';
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

export async function POST(request: Request) {
  const apiKey = getSecret('ANTHROPIC_API_KEY');
  if (!apiKey) return fail(503, 'Live analysis is not configured on this server. Use the offline engine.');
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return fail(400, 'Could not read the request.');
  }
  if (raw.length > LIMITS.total) return fail(413, 'The request is too large.');
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
    if (error instanceof ModelTruncated) return fail(502, 'The analysis was cut short. Try again.');
    if (error instanceof Anthropic.AuthenticationError) return fail(500, 'The server API key was rejected.');
    if (error instanceof Anthropic.RateLimitError) return fail(429, 'The analysis service is busy. Wait a moment and try again.');
    if (error instanceof Anthropic.APIConnectionError) return fail(502, 'Could not reach the analysis service.');
    return fail(502, 'The analysis could not be completed.');
  }
}
