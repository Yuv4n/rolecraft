export interface JobPosting {
  id: string;
  /** Provider name shown to the user as attribution. */
  source: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  /** Always an https link to the original posting. */
  url: string;
  postedAt: number | null;
  /** Plain text, capped. Treat as untrusted data. */
  description: string;
  tags: string[];
  /** True for built-in demo postings that are not real vacancies. */
  sample?: boolean;
}

export interface JobQuery {
  /** Short role keywords. Never CV content. */
  queries: string[];
  location: string;
  remoteOnly: boolean;
  boards: { greenhouse: string[]; lever: string[] };
}

export interface SourceStatus {
  name: string;
  ok: boolean;
  count: number;
  error?: string;
}

export interface JobSearchResult {
  postings: JobPosting[];
  sources: SourceStatus[];
}
