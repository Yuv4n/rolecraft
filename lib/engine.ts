export const sampleCV = `Alex Morgan
Product Analyst
alex.morgan@example.com | London, UK

PROFILE
Analyst with 3 years of experience turning customer and product data into practical recommendations.

EXPERIENCE
Product Analyst | Finch Digital | 2022–present
• Responsible for building SQL dashboards tracking activation and retention for 12,000 monthly users.
• Worked on onboarding experiments with product managers and designers; activation increased from 31% to 39%.
• Used Python to automate weekly reporting, saving the team 6 hours each week.
• Presented customer research and analysis to stakeholders to prioritise product improvements.

Operations Associate | North Studio | 2020–2022
• Helped with customer support analysis and documented recurring issues in Excel.
• Coordinated delivery across a team of 5 and maintained project documentation.

EDUCATION
BSc Economics | University of Leeds | 2020

SKILLS
SQL, Python, Excel, Tableau, data analysis, customer research, stakeholder communication`;
export const sampleJob = `Product Analyst — Growth\nOrbit • London / Hybrid\n\nResponsibilities\nBuild SQL dashboards to monitor activation and retention.\nAnalyse product data and communicate recommendations to stakeholders.\nPartner with product managers on experimentation and A/B testing.\n\nRequired skills\nSQL and Python for data analysis.\nExperience with dashboards and stakeholder communication.\nAbility to translate customer research into product improvements.\n\nPreferred experience\nA/B testing and statistical significance.\nExperience with dbt and a modern data warehouse.\nKnowledge of SaaS growth metrics.`;
const aliases: Record<string, string[]> = {
  SQL: ["SQL"],
  Python: ["Python"],
  Excel: ["Excel"],
  Tableau: ["Tableau"],
  "Power BI": ["Power BI", "PowerBI"],
  JavaScript: ["JavaScript", "JS"],
  TypeScript: ["TypeScript"],
  React: ["React", "React.js", "ReactJS"],
  Figma: ["Figma"],
  AWS: ["AWS", "Amazon Web Services"],
  dbt: ["dbt"],
  SaaS: ["SaaS"],
  "A/B testing": ["A/B testing", "AB testing", "split testing"],
  "statistical significance": ["statistical significance"],
  "data warehouse": ["data warehouse", "data warehousing"],
  dashboards: ["dashboard"],
  activation: ["activation"],
  retention: ["retention"],
  "customer research": ["customer research", "user research"],
  stakeholder: ["stakeholder"],
  experimentation: ["experimentation", "experiment"],
  "project management": ["project management"],
  "customer support": ["customer support"],
  "data analysis": ["data analysis", "data analytics"],
  communication: ["communication"],
  leadership: ["leadership"],
  marketing: ["marketing"],
  sales: ["sales"],
  design: ["design"],
  Git: ["Git"],
  Docker: ["Docker"],
  Kubernetes: ["Kubernetes", "K8s"],
  Java: ["Java"],
  "C++": ["C++"],
  "C#": ["C#"],
  Go: ["Golang", "Go programming"],
  Rust: ["Rust"],
  "Node.js": ["Node.js", "NodeJS"],
  PostgreSQL: ["PostgreSQL", "Postgres"],
  MongoDB: ["MongoDB"],
  "machine learning": ["machine learning"],
  "product management": ["product management"],
  accessibility: ["accessibility", "WCAG"],
  testing: ["unit testing", "integration testing", "automated testing"],
};
const catalog = Object.keys(aliases);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Compile once. Matching never retains uploaded text in a module-level cache.
const patterns = new Map(
  catalog.map((term) => [
    term,
    new RegExp(
      "(?<![a-z0-9])(?:" +
        aliases[term].map(escape).join("|") +
        ")s?(?![a-z0-9])",
      "gi",
    ),
  ]),
);
function pattern(term: string) {
  return (
    patterns.get(term) ??
    new RegExp("(?<![a-z0-9])" + escape(term) + "s?(?![a-z0-9])", "gi")
  );
}
export function has(text: string, term: string) {
  return [...text.matchAll(pattern(term))].length > 0;
}
const negative =
  /\b(no|not|never|cannot|can[’']t|couldn[’']t|without|lack(?:s|ing)?|unfamiliar|haven[’']t|hadn[’']t|don[’']t|doesn[’']t|learning|aspir(?:e|ing)|plan(?:ning)? to|want to)\b/i;
const action =
  /\b(?:built|developed|created|managed|used|led|implemented|delivered|analysed|analyzed|designed|maintained|automated|proficient in|experienced in)\b/gi;
function supportsClause(clause: string, term: string) {
  for (const match of clause.matchAll(pattern(term))) {
    const index = match.index ?? 0;
    const prefix = clause.slice(0, index).replace(/\bnot only\b/gi, "");
    const pivots = [...prefix.matchAll(action)];
    const pivot = pivots.at(-1)?.index ?? 0;
    const beforePivot = prefix.slice(0, pivot);
    // Inspect the prefix, not the skill itself: “machine learning” is a skill.
    const local = prefix.slice(pivot);
    const suffix = clause.slice(index + match[0].length);
    const negatedSuffix =
      /^\s+(?:(?:is|was|are|were|experience is)\s+)?(?:not|unfamiliar|lacking|never)\b/i.test(
        suffix,
      );
    const negatedAction =
      /\b(?:no|not|never|cannot|can[’']t|couldn[’']t|without|haven[’']t|hadn[’']t|don[’']t|doesn[’']t)\s+(?:\w+\s+){0,2}$/i.test(
        beforePivot,
      );
    if (!negative.test(local) && !negatedAction && !negatedSuffix) return true;
  }
  return false;
}
function clauses(text: string) {
  return text.split(/\n|[;!?]|\.(?:\s|$)|\bbut\b|\bhowever\b/i);
}
export function supports(text: string, term: string) {
  return clauses(text).some((clause) => supportsClause(clause, term));
}
function skillsIn(text: string) {
  const parts = clauses(text);
  return new Set(
    catalog.filter((term) =>
      parts.some((clause) => supportsClause(clause, term)),
    ),
  );
}
export const bulletPattern = /^\s*(?:[•*\-–▪◦]|\d+[.)])\s+/;
function section(line: string): string | undefined {
  const heading = line
    .trim()
    .replace(/^[•*\-]\s*/, "")
    .replace(/[:：]\s*$/, "");
  if (
    /^(responsibilities|key responsibilities|what you(?:'|’)ll do|duties)$/i.test(
      heading,
    )
  )
    return "Responsibilities";
  if (
    /^(required(?: skills| qualifications| experience)?|requirements|essential(?: skills| criteria)?|must.haves?)$/i.test(
      heading,
    )
  )
    return "Required skills";
  if (
    /^(preferred(?: skills| qualifications| experience)?|nice.to.haves?|desirable(?: skills| criteria)?)$/i.test(
      heading,
    )
  )
    return "Preferred experience";
}
export function parseJob(job: string) {
  let category = "Review manually";
  const requirements = job.split("\n").flatMap((raw) => {
    const text = raw.trim();
    const heading = section(text);
    if (heading) {
      category = heading;
      return [];
    }
    if (!text) return [];
    const terms = [...skillsIn(text)];
    const constraint =
      /\b(?:\d+\+?\s*(?:years?|months?)|licen[cs]e|licen[cs]ed|certif\w*|degree|bachelor|master|phd|right to work|work authori[sz]ation|clearance)\b/i.test(
        text,
      );
    if (
      !terms.length &&
      category === "Review manually" &&
      !constraint &&
      !/\b(?:must|required|essential)\b/i.test(text)
    )
      return [];
    return [
      {
        text,
        category,
        terms,
        preferred: category === "Preferred experience",
        manualReview: !terms.length || constraint,
      },
    ];
  });
  const skills = catalog.filter((term) =>
    requirements.some((r) => r.terms.includes(term)),
  );
  const weights = Object.fromEntries(
    skills.map((t) => [
      t,
      requirements.some((r) => !r.preferred && r.terms.includes(t)) ? 2 : 1,
    ]),
  );
  return { requirements, skills, weights };
}
export type JobModel = ReturnType<typeof parseJob>;
const niches = [
  {
    title: "Product & growth analytics",
    sector: "SaaS · Digital products",
    terms: [
      "SQL",
      "activation",
      "retention",
      "experimentation",
      "data analysis",
    ],
  },
  {
    title: "Customer insights",
    sector: "Consumer services · Research",
    terms: ["customer research", "customer support", "communication"],
  },
  {
    title: "Business operations",
    sector: "Technology · Professional services",
    terms: ["Excel", "project management", "stakeholder", "leadership"],
  },
  {
    title: "Frontend development",
    sector: "Software · Digital agencies",
    terms: ["React", "JavaScript", "TypeScript", "accessibility"],
  },
  {
    title: "Product design",
    sector: "Digital products · Design studios",
    terms: ["Figma", "design", "customer research"],
  },
  {
    title: "Backend & platform engineering",
    sector: "Software · Infrastructure",
    terms: ["Node.js", "PostgreSQL", "Docker", "Kubernetes", "Java", "Rust"],
  },
];
export function analyse(cv: string, job: string | JobModel) {
  const model = typeof job === "string" ? parseJob(job) : job;
  // Reuse each distinct line's matches across requirements, evidence and niches.
  const unique = [
    ...new Set(
      cv
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  ];
  const lines = unique.map((text) => ({ text, terms: skillsIn(text) }));
  const present = new Set(lines.flatMap((l) => [...l.terms]));
  const requirements = model.requirements.map((r) => ({
    ...r,
    evidence: lines
      .map((l) => ({
        text: l.text,
        count: r.terms.filter((t) => l.terms.has(t)).length,
      }))
      .filter((l) => l.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((l) => l.text),
    matched: r.terms.filter((t) => present.has(t)),
  }));
  const matched = model.skills.filter((t) => present.has(t));
  const gaps = model.skills
    .filter((t) => !present.has(t))
    .sort((a, b) => model.weights[b] - model.weights[a]);
  const suggestions = niches
    .map((s) => ({
      ...s,
      strength: s.terms.filter((t) => present.has(t)).length,
      evidence: lines
        .filter((l) => s.terms.some((t) => l.terms.has(t)))
        .slice(0, 2)
        .map((l) => l.text),
    }))
    .filter((s) => s.strength > 0)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3);
  return {
    requirements,
    skills: model.skills,
    matched,
    gaps,
    suggestions,
    weights: model.weights,
    unassessed: requirements.filter((r) => r.manualReview),
  };
}
export type Analysis = ReturnType<typeof analyse>;
function rewrite(line: string, context = line) {
  const body = line.replace(bulletPattern, "");
  const verbs: Record<string, string> = {
    building: "Built",
    managing: "Managed",
    developing: "Developed",
    creating: "Created",
    leading: "Led",
    analysing: "Analysed",
    analyzing: "Analyzed",
    coordinating: "Coordinated",
    implementing: "Implemented",
    maintaining: "Maintained",
    designing: "Designed",
    delivering: "Delivered",
    supporting: "Supported",
  };
  const m = body.match(/^Responsible for (\w+)\s+(.+)$/i);
  const uncertain =
    /\b(if|would|could|should|may|might|will|planned|planning|expected|proposed|potential|future|learning|intend|aim)\b/i.test(
      context,
    );
  if (m && verbs[m[1].toLowerCase()] && !uncertain && !negative.test(context))
    return "• " + verbs[m[1].toLowerCase()] + " " + m[2];
  return "• " + body;
}
export function tailor(cv: string, job: string | JobModel) {
  const model = typeof job === "string" ? parseJob(job) : job;
  const weight = (text: string) => {
    const terms = skillsIn(text);
    return model.skills.reduce(
      (n, t) => n + (terms.has(t) ? model.weights[t] : 0),
      0,
    );
  };
  const lines = cv.split("\n"),
    output: string[] = [];
  for (let i = 0; i < lines.length;) {
    if (!bulletPattern.test(lines[i])) {
      output.push(lines[i++]);
      continue;
    }
    const run: { lines: string[]; index: number; score: number }[] = [];
    while (i < lines.length && bulletPattern.test(lines[i])) {
      const first = lines[i++],
        continuation: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !bulletPattern.test(lines[i]) &&
        /^\s+\S/.test(lines[i])
      )
        continuation.push(lines[i++]);
      run.push({
        lines: [first, ...continuation],
        index: run.length,
        score: weight([first, ...continuation].join(" ")),
      });
    }
    // Ambiguous unindented continuation: leave this whole run in source order.
    const next = lines[i]?.trim() ?? "";
    const sectionBoundary =
      /^(?:[A-Z][A-Z &/]{2,}:?|(?:work |professional )?experience:?|education:?|qualifications:?|(?:technical |core |key )?skills:?|projects:?|certifications:?|references:?)$/.test(
        next,
      ) ||
      /^(?:(?:work |professional )?experience|education|qualifications|(?:technical |core |key )?skills|projects|certifications|references):?$/i.test(
        next,
      );
    const ambiguous = !!next && !bulletPattern.test(next) && !sectionBoundary;
    if (!ambiguous) run.sort((a, b) => b.score - a.score || a.index - b.index);
    output.push(
      ...run.flatMap((x) =>
        ambiguous
          ? x.lines
          : [rewrite(x.lines[0], x.lines.join(" ")), ...x.lines.slice(1)],
      ),
    );
  }
  return output.join("\n");
}
export function rate(cv: string, job: string | JobModel, analysis?: Analysis) {
  const a = analysis ?? analyse(cv, job);
  const bullets = cv.split("\n").filter((l) => bulletPattern.test(l));
  const content = cv
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const substantive =
    cv.trim().split(/\s+/).length >= 12 &&
    cv.replace(/[^\p{L}]/gu, "").length >= 60 &&
    content.some((l) => l.split(/\s+/).length >= 6);
  const units = bullets.length
    ? bullets
    : content.filter((l) => l.split(/\s+/).length >= 6);
  const impact = units.filter(
    (l) =>
      /\d/.test(l) &&
      /\b(increas|reduc|sav|improv|grew|growth|cut|boost|decreas|generat|deliver|achiev|retain|convert)\w*/i.test(
        l,
      ) &&
      !/\b(nothing|none|never|no|not|cannot|can[’']t|would|could|if|might|will|planned)\b/i.test(
        l,
      ),
  ).length;
  const knownTotal = a.skills.reduce((n, t) => n + a.weights[t], 0);
  const pendingWeight = a.unassessed.reduce(
    (n, r) => n + (r.preferred ? 1 : 2),
    0,
  );
  const total = knownTotal + pendingWeight;
  const quality = substantive ? 1 : 0;
  const clarity = Math.max(
    0,
    100 -
      units.filter((l) => l.split(/\s+/).length > 30).length * 10 -
      (cv.match(/responsible for|worked on|helped with/gi) || []).length * 8,
  );
  const heading = (re: RegExp) => cv.split("\n").some((l) => re.test(l.trim()));
  const structure =
    (heading(/^(?:work |professional )?experience:?$/i) ? 25 : 0) +
    (heading(/^(?:education|qualifications):?$/i) ? 20 : 0) +
    (heading(/^(?:(?:technical|core|key) )?skills(?: & strengths)?:?$/i)
      ? 20
      : 0) +
    (units.length ? 20 : 0) +
    (!/\t|│/.test(cv) ? 15 : 0);
  return [
    {
      name: "Relevance",
      score:
        quality && total
          ? Math.round(
              (a.matched.reduce((n, t) => n + a.weights[t], 0) / total) * 100,
            )
          : 0,
      why: `${a.matched.length} of ${a.skills.length} recognised terms supported; ${a.unassessed.length} requirements need manual assessment. Required terms and unresolved required requirements count twice; preferred items count once. Unassessed requirements receive no automatic credit. This is evidence coverage, not an eligibility decision.`,
    },
    {
      name: "Evidence of impact",
      score:
        quality && units.length ? Math.round((impact / units.length) * 100) : 0,
      why: `${impact} of ${units.length} experience statements pair a number with an outcome verb without explicit negation or conditional wording. This proxy cannot verify results.`,
    },
    {
      name: "Clarity",
      score: quality * clarity,
      why: "Requires at least 12 words, 60 letters and one statement of six words. Paragraphs and bullets are accepted. Subtracts 10 per statement over 30 words and 8 per vague opening.",
    },
    {
      name: "ATS readability",
      score: quality * structure,
      why: "Checks standalone section headings, readable statements and tabular separators. Requires substantive content. Does not inspect the uploaded layout or simulate an employer ATS.",
    },
  ];
}

export function recommendProjects(
  cv: string,
  job: string | JobModel,
  analysis?: Analysis,
) {
  const { gaps, requirements } = analysis ?? analyse(cv, job);
  const families = [
    {
      id: "pipeline",
      terms: ["dbt", "data warehouse", "SQL", "PostgreSQL"],
      title: "Build a reproducible analytics pipeline",
      brief:
        "Use an open dataset. Model raw data into reporting tables, add data-quality tests, and document the pipeline.",
      deliverable:
        "A repository with setup instructions, tested models and a dashboard answering one business question.",
    },
    {
      id: "experiment",
      terms: ["A/B testing", "statistical significance", "experimentation"],
      title: "Design and evaluate a product experiment",
      brief:
        "Use simulated or open experiment data. Define a hypothesis, primary metric and sample size. Report uncertainty and the decision you would make.",
      deliverable:
        "An analysis notebook with reproducible results and a decision memo explaining limitations.",
    },
    {
      id: "saas",
      terms: ["SaaS", "activation", "retention"],
      title: "Investigate a SaaS activation or retention problem",
      brief:
        "Use a public or simulated product-event dataset. Define activation, build a cohort analysis and explain one potential improvement.",
      deliverable:
        "A metric dictionary, cohort dashboard and short recommendation supported by the analysis.",
    },
    {
      id: "frontend",
      terms: ["React", "JavaScript", "TypeScript", "accessibility"],
      title: "Build an accessible task-focused web app",
      brief:
        "Choose one practical workflow, implement it with the missing technologies and test keyboard access, mobile layout and error states.",
      deliverable:
        "A deployed app, source repository and documented usability and accessibility checks.",
    },
    {
      id: "platform",
      terms: ["Docker", "Kubernetes", "AWS", "Node.js", "MongoDB"],
      title: "Deploy a small service with operational checks",
      brief:
        "Build a small API using public sample data. Add automated tests, health checks and repeatable deployment instructions.",
      deliverable:
        "A repository with a working service, CI checks and a deployment runbook. Use local or free resources.",
    },
    {
      id: "research",
      terms: ["customer research", "Figma", "design"],
      title: "Research and prototype a specific user problem",
      brief:
        "Choose a volunteer brief. Record consent for interviews, synthesise findings and test a focused prototype with a few participants.",
      deliverable:
        "An anonymised research summary, prototype and explanation of how feedback changed the design.",
    },
  ];
  const projects: {
    id: string;
    title: string;
    brief: string;
    deliverable: string;
    terms: string[];
    requirements: string[];
  }[] = [];
  for (const gap of gaps) {
    const family = families.find((f) => f.terms.includes(gap));
    const id = family?.id ?? gap;
    const existing = projects.find((p) => p.id === id);
    const related = requirements
      .filter((r) => r.terms.includes(gap))
      .map((r) => r.text);
    if (existing) {
      existing.terms.push(gap);
      existing.requirements = [
        ...new Set([...existing.requirements, ...related]),
      ];
      continue;
    }
    projects.push({
      id,
      title: family?.title ?? `Demonstrate ${gap} in a small practical project`,
      brief:
        family?.brief ??
        `Choose a public dataset or volunteer brief where ${gap} solves a specific problem. Define the outcome, document your method and ask a practitioner to review the result.`,
      deliverable:
        family?.deliverable ??
        "A finished artifact, reproducible instructions and a short account of results and limitations.",
      terms: [gap],
      requirements: related,
    });
  }
  return projects;
}
