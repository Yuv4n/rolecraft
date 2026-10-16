// A bounded in-memory sliding-window limiter. Each Worker isolate has its own counts, so this slows casual
// abuse and does not replace platform rate limiting. The map is capped so it cannot grow without limit.

export type Limiter = {hit: (key: string, now?: number) => {limited: boolean; retryAfterSeconds: number}; size: () => number};

export function createLimiter(options: {windowMs: number; max: number; maxKeys?: number}): Limiter {
  const {windowMs, max, maxKeys = 500} = options;
  const hits = new Map<string, number[]>();
  return {
    hit(key, now = Date.now()) {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      recent.push(now);
      hits.delete(key); // re-insert so the oldest key is always first
      hits.set(key, recent);
      while (hits.size > maxKeys) {
        const oldest = hits.keys().next().value as string;
        hits.delete(oldest);
      }
      const limited = recent.length > max;
      return {limited, retryAfterSeconds: limited ? Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) : 0};
    },
    size: () => hits.size,
  };
}
