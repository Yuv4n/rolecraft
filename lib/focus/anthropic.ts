// The only file that talks to the Anthropic API. It never logs prompts or responses.

import Anthropic from '@anthropic-ai/sdk';
import type {AgentCall} from './orchestrator.ts';

export class ModelRefusal extends Error {}
export class ModelTruncated extends Error {}
export class ModelBadOutput extends Error {}

/**
 * A user-level key is not tied to a workspace, so the API needs the workspace ID in a header. Workspace-scoped keys
 * do not need it. The ID is not a secret, and anything that is not a plain identifier is ignored.
 */
export function workspaceHeaders(workspaceId?: string): Record<string, string> | undefined {
  return workspaceId && /^[\w-]{4,80}$/.test(workspaceId) ? {'anthropic-workspace-id': workspaceId} : undefined;
}

export function makeAnthropicCall(apiKey: string, workspaceId?: string): AgentCall {
  const client = new Anthropic({apiKey, maxRetries: 1, timeout: 150_000, defaultHeaders: workspaceHeaders(workspaceId)});
  return async (req) => {
    const response = await client.beta.messages.create({
      model: req.model,
      max_tokens: req.maxTokens,
      // Server-side fallback reroutes a request that a safety classifier declines.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: {type: 'adaptive'},
      system: req.system,
      messages: [{role: 'user', content: req.user}],
      output_config: {effort: req.effort, format: {type: 'json_schema', schema: req.schema}},
    });
    if (response.stop_reason === 'refusal') throw new ModelRefusal();
    if (response.stop_reason === 'max_tokens') throw new ModelTruncated();
    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') throw new Error('empty response');
    try {
      return JSON.parse(block.text) as unknown;
    } catch {
      throw new ModelBadOutput();
    }
  };
}
