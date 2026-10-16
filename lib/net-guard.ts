// Decides whether a job-posting URL is safe to fetch from the server. Pure functions with an injectable
// fetch, so the rules can be tested without a network.
//
// Limit: the hostname is resolved here and again by the later fetch. A DNS answer that changes between the two
// (rebinding) is not prevented. Closing that gap needs the connection itself to be pinned to the checked address.

const BLOCKED_SUFFIXES = ['.local', '.internal', '.localhost', '.test', '.invalid', '.example', '.lan', '.home', '.corp', '.intranet', '.onion', '.arpa', '.localdomain'];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

const V4_BLOCKED: [string, number][] = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
];

/** True only for a syntactically valid IPv4 address outside every reserved, private or special-use range. */
export function isPublicIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return false;
  return !V4_BLOCKED.some(([base, bits]) => {
    const b = ipv4ToInt(base)!;
    const size = 2 ** (32 - bits);
    return n >= b && n < b + size;
  });
}

/** Expands an IPv6 address into eight 16-bit groups, or null when it is not valid. Accepts a dotted IPv4 tail. */
export function parseIPv6(ip: string): number[] | null {
  let text = ip.toLowerCase().replace(/^\[|\]$/g, '');
  const zone = text.indexOf('%');
  if (zone >= 0) text = text.slice(0, zone);
  const tail = text.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (tail) {
    const v4 = ipv4ToInt(tail[1]);
    if (v4 === null) return null;
    text = text.slice(0, -tail[1].length) + ((v4 >>> 16) & 0xffff).toString(16) + ':' + (v4 & 0xffff).toString(16);
  }
  const halves = text.split('::');
  if (halves.length > 2) return null;
  const toGroups = (s: string) => (s === '' ? [] : s.split(':'));
  const head = toGroups(halves[0]);
  const rest = halves.length === 2 ? toGroups(halves[1]) : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 1) return null;
  const groups = halves.length === 1 ? head : [...head, ...Array(missing).fill('0'), ...rest];
  const out = groups.map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN));
  return out.length === 8 && out.every((n) => Number.isFinite(n)) ? out : null;
}

const embeddedV4 = (hi: number, lo: number) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;

/**
 * IPv6 is an allow-list: only global unicast (2000::/3) is public, minus documentation, Teredo, benchmarking and
 * ORCHID ranges. Addresses that embed an IPv4 address (mapped, compatible, 6to4) are judged by that address.
 */
export function isPublicIPv6(ip: string): boolean {
  const g = parseIPv6(ip);
  if (!g) return false;
  if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) return isPublicIPv4(embeddedV4(g[6], g[7])); // ::ffff:a.b.c.d and ::a.b.c.d
  if (g[0] === 0x2002) return isPublicIPv4(embeddedV4(g[1], g[2])); // 6to4
  if ((g[0] & 0xe000) !== 0x2000) return false; // outside 2000::/3: loopback, unique local, link local, multicast, NAT64, and so on
  if (g[0] === 0x2001 && (g[1] === 0x0db8 || g[1] === 0x0000 || g[1] === 0x0002 || (g[1] & 0xfff0) === 0x0010 || (g[1] & 0xfff0) === 0x0020)) return false;
  return true;
}

export function isPublicIp(ip: string): boolean {
  return ip.includes(':') ? isPublicIPv6(ip) : isPublicIPv4(ip);
}

/** Returns an error message, or null when the URL looks like an ordinary public HTTPS address. */
export function checkJobUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return 'That does not look like a web address.';
  }
  const fail = 'Use a public HTTPS job posting URL, or paste the description below.';
  if (u.protocol !== 'https:' || u.port || u.username || u.password) return fail;
  const host = u.hostname.toLowerCase();
  if (!host || host.length > 253 || host.endsWith('.')) return fail;
  if (host.startsWith('[') || host.includes(':')) return fail; // IPv6 literal
  if (/^[\d.]+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) return fail; // IPv4 literal in any notation the URL parser normalises
  if (!host.includes('.')) return fail;
  if (BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) return fail;
  if (!host.split('.').every((l) => l.length > 0 && l.length <= 63 && /^[a-z0-9-]+$/.test(l) && !l.startsWith('-') && !l.endsWith('-'))) return fail;
  return null;
}

/** Returns every address a hostname resolves to. Uses the operating system resolver. */
export type Resolver = (hostname: string) => Promise<string[]>;

const systemResolver: Resolver = async (hostname) => {
  const {lookup} = await import('node:dns/promises');
  const records = await lookup(hostname, {all: true, verbatim: true});
  return records.map((r) => r.address);
};

/**
 * True only when the hostname resolves to at least one address and every address is public. Both IPv4 and IPv6
 * answers are checked. A failing lookup throws, so it is never read as a pass.
 */
export async function resolvesToPublicAddresses(hostname: string, resolve: Resolver = systemResolver): Promise<boolean> {
  const addresses = await resolve(hostname);
  return addresses.length > 0 && addresses.every(isPublicIp);
}
