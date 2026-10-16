// Server-only configuration. Secrets stay on the server and are never sent to the browser.

import {env} from 'cloudflare:workers';

export function getSecret(name: string): string | undefined {
  const bound = (env as unknown as Record<string, unknown>)?.[name];
  if (typeof bound === 'string' && bound) return bound;
  const fromProcess = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  return fromProcess || undefined;
}

export const DEFAULT_MODEL = 'claude-opus-5-5';

/** ANTHROPIC_MODEL sets every agent. FOCUS_MODEL_<AGENT> overrides one, for example FOCUS_MODEL_EVIDENCE_READER. */
export function modelFor(agent: string): string {
  const key = 'FOCUS_MODEL_' + agent.toUpperCase().replace(/-/g, '_');
  return getSecret(key) || getSecret('ANTHROPIC_MODEL') || DEFAULT_MODEL;
}
