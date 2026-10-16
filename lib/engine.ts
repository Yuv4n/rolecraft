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
};
const catalog = Object.keys(aliases);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function has(text: string, term: string) {
 return (aliases[term] ?? [term]).some(t =>
  new RegExp('(?<![a-z0-9])' + escape(t) + 's?(?![a-z0-9])', 'i').test(text));
}
// Conservative, clause-level negation: uncertain claims are not positive evidence.
export function supports(text: string, term: string) {
 return text.split(/\n|[;!?]|\.(?:\s|$)|\bbut\b|\bhowever\b/i).some(clause =>
  has(clause, term) && !/\b(no|not|never|without|lack(?:s|ing)?|unfamiliar|haven[’']t|don[’']t|doesn[’']t|learning|aspir(?:e|ing)|plan(?:ning)? to|want to)\b/i.test(clause));
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
 const gaps = skills.filter(t => !supports(cv, t));
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
 const substantive = cv.trim().split(/\s+/).length >= 40 && bullets.some(l => l.trim().split(/\s+/).length >= 6);
 const impact = bullets.filter(l => /\d/.test(l) && /\b(increas|reduc|sav|improv|grew|growth|cut|boost|decreas|generat|deliver|achiev|retain|convert)\w*/i.test(l)).length;
 const weight = (t: string) => a.requirements.some(r => !r.preferred && r.terms.includes(t)) ? 2 : 1;
 const total = a.skills.reduce((n, t) => n + weight(t), 0);
 const quality = substantive ? 1 : 0;
 const clarity = Math.max(0, 100 - bullets.filter(l => l.split(/\s+/).length > 30).length * 10 - (cv.match(/responsible for|worked on|helped with/gi) || []).length * 8);
 const heading = (re: RegExp) => cv.split('\n').some(l => re.test(l.trim()));
 const structure = (heading(/^(?:work |professional )?experience:?$/i) ? 25 : 0)
  + (heading(/^(?:education|qualifications):?$/i) ? 20 : 0)
  + (heading(/^(?:(?:technical|core|key) )?skills(?: & strengths)?:?$/i) ? 20 : 0)
  + (bullets.length ? 20 : 0) + (!/\t|│/.test(cv) ? 15 : 0);
 return [
  { name: 'Relevance', score: quality && total ? Math.round(a.matched.reduce((n, t) => n + weight(t), 0) / total * 100) : 0, why: `${a.matched.length} of ${a.skills.length} recognised terms supported. Required or uncategorised terms count twice; preferred terms count once. Negated and aspirational claims are excluded conservatively.` },
  { name: 'Evidence of impact', score: quality && bullets.length ? Math.round(impact / bullets.length * 100) : 0, why: `${impact} of ${bullets.length} bullets pair a number with an outcome verb. This text proxy needs manual review.` },
  { name: 'Clarity', score: quality * clarity, why: 'Requires at least 40 words and a substantive bullet. Subtracts 10 per bullet over 30 words and 8 per vague opening.' },
  { name: 'ATS readability', score: quality * structure, why: 'Checks standalone section headings, bullet structure and tabular separators. Requires substantive content. Does not inspect the uploaded layout or simulate an employer ATS.' },
 ];
}
