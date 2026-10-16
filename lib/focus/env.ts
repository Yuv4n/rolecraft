// Server-only configuration, read from the process environment. Secrets stay on the server and are never sent to the
// browser. Next.js loads .env.local at startup, so a key placed there (see scripts/sync-env.mjs) is available here.

export function getSecret(name: string): string | undefined {
  const value = process.env[name];
  return value ? value : undefined;
}

export const DEFAULT_MODEL = 'claude-opus-5-5';

/** ANTHROPIC_MODEL sets every agent. FOCUS_MODEL_<AGENT> overrides one, for example FOCUS_MODEL_EVIDENCE_READER. */
export function modelFor(agent: string): string {
  const key = 'FOCUS_MODEL_' + agent.toUpperCase().replace(/-/g, '_');
  return getSecret(key) || getSecret('ANTHROPIC_MODEL') || DEFAULT_MODEL;
}
