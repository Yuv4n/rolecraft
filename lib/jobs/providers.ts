// Public job feeds only. Each provider documents an open JSON API for reading
// vacancies; none needs a login or HTML scraping. Parsers accept unknown input
// and skip anything malformed, because feed shapes can change without notice.

import type { JobPosting } from "./types.ts";
import { htmlToText } from "./text.ts";

export const ALLOWED_HOSTS = new Set([
  "remotive.com",
  "www.arbeitnow.com",
  "boards-api.greenhouse.io",
  "api.lever.co",
]);

export const providerNames = {
  remotive: "Remotive",
  arbeitnow: "Arbeitnow",
  greenhouse: "Greenhouse",
  lever: "Lever",
} as const;

export const boardToken = /^[a-z0-9][a-z0-9_-]{0,49}$/;

export const urls = {
  remotive: (query: string) =>
    `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=40`,
  arbeitnow: () => "https://www.arbeitnow.com/api/job-board-api",
  greenhouse: (token: string) =>
    `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`,
  lever: (company: string) =>
    `https://api.lever.co/v0/postings/${company}?mode=json`,
};

export function isAllowedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      !u.port &&
      !u.username &&
      !u.password &&
      ALLOWED_HOSTS.has(u.hostname)
    );
  } catch {
    return false;
  }
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 300): string =>
  typeof v === "string" ? v.slice(0, max).trim() : "";
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function safeLink(v: unknown): string | null {
  const s = str(v, 600);
  try {
    const u = new URL(s);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function toTime(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v))
    return v < 1e12 ? v * 1000 : v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

const looksRemote = (...parts: string[]) =>
  /\bremote|anywhere|worldwide\b/i.test(parts.join(" "));

export function parseRemotive(json: unknown): JobPosting[] {
  if (!isObj(json)) return [];
  return arr(json.jobs).flatMap((j): JobPosting[] => {
    if (!isObj(j)) return [];
    const url = safeLink(j.url);
    const title = str(j.title);
    if (!url || !title) return [];
    const location = str(j.candidate_required_location) || "Remote";
    return [
      {
        id: `remotive:${str(j.id, 40) || url}`,
        source: providerNames.remotive,
        title,
        company: str(j.company_name) || "Unknown company",
        location,
        remote: true,
        url,
        postedAt: toTime(j.publication_date),
        description: htmlToText(str(j.description, 60000)),
        tags: arr(j.tags)
          .map((t) => str(t, 40))
          .filter(Boolean)
          .slice(0, 12),
      },
    ];
  });
}

export function parseArbeitnow(json: unknown): JobPosting[] {
  if (!isObj(json)) return [];
  return arr(json.data).flatMap((j): JobPosting[] => {
    if (!isObj(j)) return [];
    const url = safeLink(j.url);
    const title = str(j.title);
    if (!url || !title) return [];
    const location = str(j.location);
    return [
      {
        id: `arbeitnow:${str(j.slug, 120) || url}`,
        source: providerNames.arbeitnow,
        title,
        company: str(j.company_name) || "Unknown company",
        location: location || (j.remote === true ? "Remote" : "Not stated"),
        remote: j.remote === true || looksRemote(location),
        url,
        postedAt: toTime(j.created_at),
        description: htmlToText(str(j.description, 60000)),
        tags: arr(j.tags)
          .map((t) => str(t, 40))
          .filter(Boolean)
          .slice(0, 12),
      },
    ];
  });
}

export function parseGreenhouse(json: unknown, token: string): JobPosting[] {
  if (!isObj(json)) return [];
  return arr(json.jobs).flatMap((j): JobPosting[] => {
    if (!isObj(j)) return [];
    const url = safeLink(j.absolute_url);
    const title = str(j.title);
    if (!url || !title) return [];
    const location = isObj(j.location) ? str(j.location.name) : "";
    return [
      {
        id: `greenhouse:${token}:${str(j.id, 40) || url}`,
        source: providerNames.greenhouse,
        title,
        company: str(j.company_name) || token,
        location: location || "Not stated",
        remote: looksRemote(location, title),
        url,
        postedAt: toTime(j.updated_at),
        description: htmlToText(str(j.content, 60000)),
        tags: [],
      },
    ];
  });
}

export function parseLever(json: unknown, company: string): JobPosting[] {
  return arr(json).flatMap((j): JobPosting[] => {
    if (!isObj(j)) return [];
    const url = safeLink(j.hostedUrl);
    const title = str(j.text);
    if (!url || !title) return [];
    const cat = isObj(j.categories) ? j.categories : {};
    const location = str(cat.location);
    const desc =
      str(j.descriptionPlain, 60000) || htmlToText(str(j.description, 60000));
    const extra = arr(j.lists)
      .map((l) =>
        isObj(l) ? `${str(l.text)}\n${htmlToText(str(l.content, 20000))}` : "",
      )
      .join("\n");
    return [
      {
        id: `lever:${company}:${str(j.id, 60) || url}`,
        source: providerNames.lever,
        title,
        company,
        location: location || "Not stated",
        remote: looksRemote(location, str(j.workplaceType, 30)),
        url,
        postedAt: toTime(j.createdAt),
        description: `${desc}\n${extra}`.trim().slice(0, 8000),
        tags: [str(cat.team, 40), str(cat.commitment, 40)].filter(Boolean),
      },
    ];
  });
}

const words = (s: string) => s.toLowerCase().match(/[a-z0-9+#&]+/g) ?? [];

/** Board feeds list every vacancy, so keep only those that mention all words of at least one query. */
export function matchesQueries(p: JobPosting, queries: string[]): boolean {
  const haystack = ` ${words(`${p.title} ${p.tags.join(" ")} ${p.description.slice(0, 600)}`).join(" ")} `;
  const title = ` ${words(p.title).join(" ")} `;
  return queries.some((q) => {
    const tokens = words(q).filter((t) => t.length > 1);
    if (!tokens.length) return false;
    const inTitle = tokens.filter((t) => title.includes(` ${t}`)).length;
    return (
      inTitle >= Math.max(1, tokens.length - 1) ||
      tokens.every((t) => haystack.includes(` ${t}`))
    );
  });
}

export function matchesPlace(
  p: JobPosting,
  location: string,
  remoteOnly: boolean,
): boolean {
  if (remoteOnly && !p.remote) return false;
  if (!location) return true;
  return p.remote || p.location.toLowerCase().includes(location.toLowerCase());
}
