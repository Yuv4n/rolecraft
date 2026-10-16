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
 SQL: ['SQL'], Python: ['Python'], Excel: ['Excel'], Tableau: ['Tableau'],
 'Power BI': ['Power BI', 'PowerBI'], JavaScript: ['JavaScript', 'JS'],
 TypeScript: ['TypeScript'], React: ['React', 'React.js', 'ReactJS'], Figma: ['Figma'],
 AWS: ['AWS', 'Amazon Web Services'], dbt: ['dbt'], SaaS: ['SaaS'],
 'A/B testing': ['A/B testing', 'AB testing', 'split testing'],
 'statistical significance': ['statistical significance'],
 'data warehouse': ['data warehouse', 'data warehousing'], dashboards: ['dashboard'],
 activation: ['activation'], retention: ['retention'], 'customer research': ['customer research', 'user research'],
 stakeholder: ['stakeholder'], experimentation: ['experimentation', 'experiment'],
 'project management': ['project management'], 'customer support': ['customer support'],
 'data analysis': ['data analysis', 'data analytics'], communication: ['communication'],
 leadership: ['leadership'], marketing: ['marketing'], sales: ['sales'], design: ['design'],
 Git: ['Git'], Docker: ['Docker'], Kubernetes: ['Kubernetes', 'K8s'],
 Java: ['Java'], 'C++': ['C++'], 'C#': ['C#'], Go: ['Golang', 'Go programming'],
 Rust: ['Rust'], 'Node.js': ['Node.js', 'NodeJS'], PostgreSQL: ['PostgreSQL', 'Postgres'],
 MongoDB: ['MongoDB'], 'machine learning': ['machine learning'],
 'product management': ['product management'], accessibility: ['accessibility', 'WCAG'],
 testing: ['unit testing', 'integration testing', 'automated testing'],
 "Looker": ["Looker"],
 "Google Analytics": ["Google Analytics", "GA4"],
 "HTML": ["HTML"],
 "CSS": ["CSS"],
 "prototyping": ["prototyping", "prototype"],
 "roadmap": ["roadmap"],
 "reporting": ["reporting"],
 "forecasting": ["forecasting", "forecast"],
 "SEO": ["SEO"],
 "CRM": ["CRM", "Salesforce", "HubSpot"],
 "Agile": ["Agile", "Scrum"],
 "financial modelling": ["financial modelling", "financial modeling"],
 "customer success": ["customer success"],
 "onboarding": ["onboarding"],
 "process improvement": ["process improvement", "process improvements"],
 "vendor management": ["vendor management", "supplier management"],
 "negotiation": ["negotiation", "negotiating"],
 "budgeting": ["budgeting", "budget management"],
 "healthcare": ["healthcare", "NHS"],
 "clinical": ["clinical"],
 "public sector": ["public sector"],
 "supply chain": ["supply chain"],
 "logistics": ["logistics"],
 "e-commerce": ["e-commerce", "ecommerce"],
 "fintech": ["fintech"],
 "payments": ["payments"],
 "compliance": ["compliance"],
 "consulting": ["consulting", "consultancy"],
 "retail": ["retail"],
};
export const catalog = Object.keys(aliases);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function has(text: string, term: string) {
 return (aliases[term] ?? [term]).some(t =>
  new RegExp('(?<![a-z0-9])' + escape(t) + 's?(?![a-z0-9])', 'i').test(text));
}
// Restrict negative claims to their local phrase. An explicit affirmative
// action starts new evidence even when it appears in the same sentence.
export function supports(text: string, term: string) {
 const parts = text.split(/\n|[;!?]|\.(?:\s|$)|\bbut\b|\bhowever\b/i);
 const negative = /\b(no|not|never|without|lack(?:s|ing)?|unfamiliar|haven[’']t|don[’']t|doesn[’']t|learning|aspir(?:e|ing)|plan(?:ning)? to|want to)\b/i;
 const action = /\b(?:built|developed|created|managed|used|led|implemented|delivered|analysed|analyzed|designed|maintained|automated|proficient in|experienced in)\b/gi;
 return parts.some(clause => {
  const variants = aliases[term] ?? [term];
  return variants.some(t => {
   const matches = clause.matchAll(new RegExp('(?<![a-z0-9])' + escape(t) + 's?(?![a-z0-9])', 'gi'));
   for (const match of matches) {
    const index = match.index ?? 0;
    const prefix = clause.slice(0, index);
    const pivots = [...prefix.matchAll(action)];
    const pivot = pivots.at(-1)?.index ?? 0;
    const beforePivot = prefix.slice(0, pivot);
    const local = clause.slice(pivot, index + match[0].length);
    const suffix = clause.slice(index + match[0].length);
    const negatedSuffix = /^\s+(?:(?:is|was|are|were|experience is)\s+)?(?:not|unfamiliar|is lacking|never)\b/i.test(suffix);
    // “never used SQL” must retain the negation before the action.
    const negatedAction = /\b(?:no|not|never|without|haven[’']t|don[’']t|doesn[’']t)\s+(?:\w+\s+){0,2}$/i.test(beforePivot);
    if (!negative.test(local) && !negatedAction && !negatedSuffix) return true;
   }
   return false;
  });
 });
}
export const bulletPattern = /^\s*(?:[•*\-–▪◦]|\d+[.)])\s+/;
function section(line: string): string | undefined {
 const heading = line.trim().replace(/^[•*\-]\s*/, '').replace(/[:：]\s*$/, '');
 if (/^(responsibilities|key responsibilities|what you(?:'|’)ll do|duties)$/i.test(heading)) return 'Responsibilities';
 if (/^(required(?: skills| qualifications| experience)?|requirements|essential(?: skills| criteria)?|must.haves?)$/i.test(heading)) return 'Required skills';
 if (/^(preferred(?: skills| qualifications| experience)?|nice.to.haves?|desirable(?: skills| criteria)?)$/i.test(heading)) return 'Preferred experience';
}
export function analyse(cv: string, job: string) {
 const lines = cv.split('\n').map(x => x.trim()).filter(Boolean);
 let category = 'Review manually';
 const requirements = job.split('\n').map(text => {
  const heading = section(text);
  if (heading) { category = heading; return null; }
  const trimmed = text.trim();
  if (!trimmed) return null;
  const terms = catalog.filter(t => supports(trimmed, t));
  if (!terms.length && category === 'Review manually') return null;
  const evidence = lines.filter(l => terms.some(t => supports(l, t)))
   .sort((a, b) => terms.filter(t => supports(b, t)).length - terms.filter(t => supports(a, t)).length);
  return { text: trimmed, category, terms, evidence, matched: terms.filter(t => supports(cv, t)), preferred: category === 'Preferred experience' };
 }).filter((x): x is NonNullable<typeof x> => x !== null);
 const skills = catalog.filter(t => requirements.some(r => r.terms.includes(t)));
 const matched = skills.filter(t => supports(cv, t));
 const priority = (t: string) => requirements.some(r => !r.preferred && r.terms.includes(t)) ? 0 : 1;
 const gaps = skills.filter(t => !supports(cv, t)).sort((a, b) => priority(a) - priority(b));
 const suggestions = [
  { title: 'Product & growth analytics', sector: 'SaaS · Digital products', terms: ['SQL', 'activation', 'retention', 'experimentation', 'data analysis'] },
  { title: 'Customer insights', sector: 'Consumer services · Research', terms: ['customer research', 'customer support', 'communication'] },
  { title: 'Business operations', sector: 'Technology · Professional services', terms: ['Excel', 'project management', 'stakeholder', 'leadership'] },
  { title: 'Frontend development', sector: 'Software · Digital agencies', terms: ['React', 'JavaScript', 'TypeScript', 'accessibility'] },
  { title: 'Product design', sector: 'Digital products · Design studios', terms: ['Figma', 'design', 'customer research'] },
  { title: 'Backend & platform engineering', sector: 'Software · Infrastructure', terms: ['Node.js', 'PostgreSQL', 'Docker', 'Kubernetes', 'Java', 'Rust'] },
 ].map(s => ({ ...s, strength: s.terms.filter(t => supports(cv, t)).length,
  evidence: lines.filter(l => s.terms.some(t => supports(l, t))).slice(0, 2) }))
  .filter(s => s.strength > 0).sort((a, b) => b.strength - a.strength).slice(0, 3);
 return { requirements, skills, matched, gaps, suggestions };
}
function rewrite(line: string) {
 const body = line.replace(bulletPattern, '');
 // Rewrite only phrases with known grammatical forms. Preserve unfamiliar wording.
 const verbs: Record<string, string> = { building: 'Built', managing: 'Managed', developing: 'Developed', creating: 'Created', leading: 'Led', analysing: 'Analysed', analyzing: 'Analyzed', coordinating: 'Coordinated', implementing: 'Implemented', maintaining: 'Maintained', designing: 'Designed', delivering: 'Delivered', supporting: 'Supported' };
 const m = body.match(/^Responsible for (\w+)\s+(.+)$/i);
 if (m && verbs[m[1].toLowerCase()]) return '• ' + verbs[m[1].toLowerCase()] + ' ' + m[2];
 return '• ' + body;
}
export function tailor(cv: string, job: string) {
 const { requirements } = analyse(cv, job);
 const weight = (line: string) => requirements.reduce((n, r) => n + r.terms.filter(t => supports(line, t)).length * (r.preferred ? 1 : 2), 0);
 const lines = cv.split('\n'), output: string[] = [];
 for (let i = 0; i < lines.length;) {
  if (!bulletPattern.test(lines[i])) { output.push(lines[i++]); continue; }
  const run: { line: string; index: number; score: number }[] = [];
  while (i < lines.length && bulletPattern.test(lines[i])) {
   const line = lines[i++]; run.push({ line: rewrite(line), index: run.length, score: weight(line) });
  }
  output.push(...run.sort((a, b) => b.score - a.score || a.index - b.index).map(x => x.line));
 }
 return output.join('\n');
}
export function rate(cv: string, job: string) {
 const a = analyse(cv, job);
 const bullets = cv.split('\n').filter(l => bulletPattern.test(l));
 const content = cv.split('\n').map(l => l.trim()).filter(Boolean);
 const substantive = cv.trim().split(/\s+/).length >= 12 && cv.replace(/[^\p{L}]/gu, '').length >= 60 && content.some(l => l.split(/\s+/).length >= 6);
 const units = bullets.length ? bullets : content.filter(l => l.split(/\s+/).length >= 6);
 const impact = units.filter(l => /\d/.test(l) && /\b(increas|reduc|sav|improv|grew|growth|cut|boost|decreas|generat|deliver|achiev|retain|convert)\w*/i.test(l)).length;
 const weight = (t: string) => a.requirements.some(r => !r.preferred && r.terms.includes(t)) ? 2 : 1;
 const total = a.skills.reduce((n, t) => n + weight(t), 0);
 const quality = substantive ? 1 : 0;
 const clarity = Math.max(0, 100 - units.filter(l => l.split(/\s+/).length > 30).length * 10 - (cv.match(/responsible for|worked on|helped with/gi) || []).length * 8);
 const heading = (re: RegExp) => cv.split('\n').some(l => re.test(l.trim()));
 const structure = (heading(/^(?:work |professional )?experience:?$/i) ? 25 : 0)
  + (heading(/^(?:education|qualifications):?$/i) ? 20 : 0)
  + (heading(/^(?:(?:technical|core|key) )?skills(?: & strengths)?:?$/i) ? 20 : 0)
  + (units.length ? 20 : 0) + (!/\t|│/.test(cv) ? 15 : 0);
 return [
  { name: 'Relevance', score: quality && total ? Math.round(a.matched.reduce((n, t) => n + weight(t), 0) / total * 100) : 0, why: `${a.matched.length} of ${a.skills.length} recognised terms supported. Required or uncategorised terms count twice; preferred terms count once. Negated and aspirational claims are excluded conservatively.` },
  { name: 'Evidence of impact', score: quality && units.length ? Math.round(impact / units.length * 100) : 0, why: `${impact} of ${units.length} experience statements pair a number with an outcome verb. This text proxy needs manual review.` },
  { name: 'Clarity', score: quality * clarity, why: 'Requires meaningful text: at least 12 words, 60 letters and one statement of six words. Paragraphs and bullets are accepted. Subtracts 10 per statement over 30 words and 8 per vague opening.' },
  { name: 'ATS readability', score: quality * structure, why: 'Checks standalone section headings, readable statements and tabular separators. Requires substantive content. Does not inspect the uploaded layout or simulate an employer ATS.' },
 ];
}


export function recommendProjects(cv: string, job: string) {
 const { gaps, requirements } = analyse(cv, job);
 const families = [
  { id: 'pipeline', terms: ['dbt', 'data warehouse', 'SQL', 'PostgreSQL'], title: 'Build a reproducible analytics pipeline', brief: 'Use an open dataset. Model raw data into reporting tables, add data-quality tests, and document the pipeline.', deliverable: 'A repository with setup instructions, tested models and a dashboard answering one business question.' },
  { id: 'experiment', terms: ['A/B testing', 'statistical significance', 'experimentation'], title: 'Design and evaluate a product experiment', brief: 'Use simulated or open experiment data. Define a hypothesis, primary metric and sample size. Report uncertainty and the decision you would make.', deliverable: 'An analysis notebook with reproducible results and a decision memo explaining limitations.' },
  { id: 'saas', terms: ['SaaS', 'activation', 'retention'], title: 'Investigate a SaaS activation or retention problem', brief: 'Use a public or simulated product-event dataset. Define activation, build a cohort analysis and explain one potential improvement.', deliverable: 'A metric dictionary, cohort dashboard and short recommendation supported by the analysis.' },
  { id: 'frontend', terms: ['React', 'JavaScript', 'TypeScript', 'accessibility'], title: 'Build an accessible task-focused web app', brief: 'Choose one practical workflow, implement it with the missing technologies and test keyboard access, mobile layout and error states.', deliverable: 'A deployed app, source repository and documented usability and accessibility checks.' },
  { id: 'platform', terms: ['Docker', 'Kubernetes', 'AWS', 'Node.js', 'MongoDB'], title: 'Deploy a small service with operational checks', brief: 'Build a small API using public sample data. Add automated tests, health checks and repeatable deployment instructions.', deliverable: 'A repository with a working service, CI checks and a deployment runbook. Use local or free resources.' },
  { id: 'research', terms: ['customer research', 'Figma', 'design'], title: 'Research and prototype a specific user problem', brief: 'Choose a volunteer brief. Record consent for interviews, synthesise findings and test a focused prototype with a few participants.', deliverable: 'An anonymised research summary, prototype and explanation of how feedback changed the design.' },
 ];
 const projects: { id: string; title: string; brief: string; deliverable: string; terms: string[]; requirements: string[] }[] = [];
 for (const gap of gaps) {
  const family = families.find(f => f.terms.includes(gap));
  const id = family?.id ?? gap;
  const existing = projects.find(p => p.id === id);
  const related = requirements.filter(r => r.terms.includes(gap)).map(r => r.text);
  if (existing) { existing.terms.push(gap); existing.requirements = [...new Set([...existing.requirements, ...related])]; continue; }
  projects.push({ id, title: family?.title ?? `Demonstrate ${gap} in a small practical project`,
   brief: family?.brief ?? `Choose a public dataset or volunteer brief where ${gap} solves a specific problem. Define the outcome, document your method and ask a practitioner to review the result.`,
   deliverable: family?.deliverable ?? 'A finished artifact, reproducible instructions and a short account of results and limitations.', terms: [gap], requirements: related });
 }
 return projects;
}
