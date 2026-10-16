import {vocabulary} from './vocab.ts';
import {FILLER_STARTS, FIXED_SWAPS, GERUND_TO_PAST, OWNERSHIP_OPENERS, WEAK_OPENER_PATTERN} from './focus/verbs.ts';
import {itemLines} from './focus/bullets.ts';
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
export const sampleProjects = `Personal project: a Tableau dashboard of public transport delays, built from open data.`;
export const sampleInterests = `Growth analytics, experimentation, and how small products find their first users.`;
export const sampleNurseCV = `Priya Shah
Staff Nurse
priya.shah@example.com | Manchester, UK

PROFILE
Registered nurse with 6 years on acute medical wards. Interested in how clinical data and systems shape patient safety.

EXPERIENCE
Staff Nurse | City Hospital | 2019–present
• Led a falls-prevention audit across 24 beds; recorded falls fell by 18% over two quarters.
• Responsible for handover and clinical documentation for a ward of 24 patients.
• Mentored 3 junior nurses and supported new starters through induction.
• Worked on a ward project to reduce missed observations, reporting results to the ward manager each month.

EDUCATION
BSc Nursing | University of Salford | 2019

SKILLS
Patient care, triage, clinical documentation, audit, Excel, mentoring`;
export const sampleNurseProjects = `Built an Excel tracker for the falls audit with monthly charts for the ward manager.`;
export const sampleNurseInterests = `Clinical informatics, patient safety, using ward data to improve care.`;
export const sampleJob = `Product Analyst — Growth\nOrbit • London / Hybrid\n\nResponsibilities\nBuild SQL dashboards to monitor activation and retention.\nAnalyse product data and communicate recommendations to stakeholders.\nPartner with product managers on experimentation and A/B testing.\n\nRequired skills\nSQL and Python for data analysis.\nExperience with dashboards and stakeholder communication.\nAbility to translate customer research into product improvements.\n\nPreferred experience\nA/B testing and statistical significance.\nExperience with dbt and a modern data warehouse.\nKnowledge of SaaS growth metrics.`;
const catalog = vocabulary.map(v=>v.term);
const aliases = new Map(vocabulary.map(v=>[v.term.toLowerCase(),v.aliases]));
const patterns = new Map<string,RegExp>();
function matches(text:string,term:string){
 let re=patterns.get(term);
 if(!re){re=new RegExp('(?<![a-z0-9])'+term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'s?(?![a-z0-9])','i');patterns.set(term,re);}
 return re.test(text);
}
export function has(text:string,term:string){ return matches(text,term)||(aliases.get(term.toLowerCase())||[]).some(f=>matches(text,f)); }
export const vocabularySize = catalog.length;
export function analyse(cv:string,job:string){
 const lines=cv.split('\n').filter(x=>x.trim());
 let category='Review manually'; const requirements=job.split('\n').map(x=>{if(/responsibilit/i.test(x))category='Responsibilities';else if(/required|essential|must.have/i.test(x))category='Required skills';else if(/preferred|nice.to.have|desirable/i.test(x))category='Preferred experience';return {text:x.trim(),category};}).filter(x=>! /^(responsibilities|required skills|preferred experience)$/i.test(x.text)&&x.text.length>18).slice(0,30).map(({text,category})=>{const terms=catalog.filter(t=>has(text,t));const evidence=lines.filter(l=>terms.some(t=>has(l,t))).sort((a,b)=>terms.filter(t=>has(b,t)).length-terms.filter(t=>has(a,t)).length);return {text,category,terms,evidence,matched:terms.filter(t=>has(cv,t)),preferred:category==='Preferred experience'};});

 const skills=catalog.filter(t=>has(job,t));const matched=skills.filter(t=>has(cv,t));const gaps=skills.filter(t=>!has(cv,t));
 const suggestions=[{title:'Product & growth analytics',sector:'SaaS · Digital products',terms:['SQL','activation','retention','experimentation','data analysis']},{title:'Customer insights',sector:'Consumer services · Research',terms:['customer research','customer support','communication']},{title:'Business operations',sector:'Technology · Professional services',terms:['Excel','project management','stakeholder','leadership']},{title:'Frontend development',sector:'Software · Digital agencies',terms:['React','JavaScript','TypeScript']},{title:'Product design',sector:'Digital products · Design studios',terms:['Figma','design']}].map(s=>({...s,evidence:lines.filter(l=>s.terms.some(t=>has(l,t))).slice(0,2)})).filter(s=>s.evidence.length).sort((a,b)=>b.evidence.length-a.evidence.length).slice(0,3);
 return {requirements,skills,matched,gaps,suggestions};
}
const MARKER=/^(\s*)([•*·▪●◦-]\s*)?/;
const capitalise=(t:string)=>t.replace(/^./,c=>c.toUpperCase());
const OPENERS=[...OWNERSHIP_OPENERS].sort((x,y)=>y.length-x.length);
/**
 * Rewrites the opening of a line with rules that keep the meaning and add no facts:
 * empty intensifiers are dropped, ownership openers ("Responsible for building") become the past tense verb,
 * and "Worked on", "Helped with" and "Assisted with" become a fixed phrase. Anything it cannot map safely is
 * left unchanged. Works with or without a bullet marker. Every word it can introduce comes from lib/focus/verbs.ts.
 */
export function rewriteLine(line:string){
 const m=line.match(MARKER)!; const lead=m[1]||''; const mark=m[2]?m[2].replace(/\s*$/,' '):''; let body=line.slice(m[0].length);
 const original=body;
 const filler=new RegExp('^(?:'+FILLER_STARTS.join('|')+')\\s+(?=\\S)','i');
 if(filler.test(body))body=capitalise(body.replace(filler,''));
 const lower=body.toLowerCase();
 const opener=OPENERS.find(o=>lower.startsWith(o+' ')||lower.startsWith(o+': '));
 if(opener){
  const rest=body.slice(opener.length).replace(/^:?\s+/,''); const first=rest.split(/\s+/)[0]; let past=GERUND_TO_PAST[first.toLowerCase()]; let tail=rest.slice(first.length);
  // "planning and delivering lessons": both verbs change tense together. A later ", ...ing" or "and ...ing" could be a
  // noun ("and training staff"), so the whole line is left alone rather than risk a wrong reading.
  const pair=tail.match(/^(\s*,\s*|\s+and\s+)([A-Za-z]+ing)\b/i);
  if(past&&pair){const second=GERUND_TO_PAST[pair[2].toLowerCase()]; if(second)tail=pair[1]+second.toLowerCase()+tail.slice(pair[0].length); else past='';}
  if(past&&/(?:\band|,)\s+[A-Za-z]+ing\b/i.test(tail))past='';
  if(past)body=past+tail;
 } else {
  const swap=Object.keys(FIXED_SWAPS).find(k=>lower.startsWith(k+' '));
  if(swap&&body.length>swap.length+3)body=FIXED_SWAPS[swap]+' '+body.slice(swap.length+1);
 }
 return body===original?line:lead+mark+body;
}
export function tailor(cv:string,job:string){
 const {skills}=analyse(cv,job); const lines=cv.split('\n'); const item=itemLines(lines); const output:string[]=[];
 for(let i=0;i<lines.length;){if(!item[i]){output.push(lines[i++]);continue;}
 const run:string[]=[];while(i<lines.length&&item[i])run.push(lines[i++]);
 output.push(...run.map((l,index)=>({line:rewriteLine(l),index,score:skills.filter(t=>has(l,t)).length})).sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.line));
 } return output.join('\n');
}
const UNITS='hours?|hrs|days?|weeks?|months?|users|customers|clients|accounts|tickets|patients|pupils|students|learners|children|staff|colleagues|employees|people|members|subscribers|leads|sales|orders|reports|projects|incidents|cases|calls|emails|invoices|sites|stores|products|campaigns|releases|bugs|beds|candidates|visitors|sessions|requests|transactions|deliveries';
/**
 * True when a line shows a measurable result or a counted scale: a percentage, an amount of money, a multiple
 * such as 3x or 2m, or a number followed by a counted unit such as users or hours. Years, date ranges, quarters
 * and version numbers are removed first, so "2019-2022" or "in 2021" never counts. A bare number such as
 * "team of 5" does not count either.
 */
export function hasMetric(line:string){
 const t=line
  .replace(/\b(?:19|20)\d{2}\s*(?:[-–—]|to)\s*(?:(?:19|20)\d{2}|\d{2}|present|now|date|current)\b/gi,' ')
  .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(?:19|20)\d{2}\b/gi,' ')
  .replace(/\b(?:19|20)\d{2}\b/g,' ').replace(/\bq[1-4]\b/gi,' ').replace(/\bv\d+(?:\.\d+)*\b/gi,' ');
 return /\d(?:[\d,]*\d)?(?:\.\d+)?\s?%/.test(t)||/[£$€]\s?\d/.test(t)||/\b\d+(?:\.\d+)?\s?(?:x|k|m|bn)\b/i.test(t)||new RegExp('\\b\\d[\\d,]*(?:\\.\\d+)?\\s+(?:[a-z]+\\s+)?(?:'+UNITS+')\\b','i').test(t);
}
export const rubric=[
 {name:'Relevance',measures:'How many of the skills and tools the role asks for also appear in your CV.',method:`Recognised role terms that your CV also mentions, divided by all recognised role terms. The vocabulary holds about ${vocabularySize} terms with their synonyms.`,limits:'It cannot see skills outside the vocabulary or judge how well you used a skill. Reordering bullets does not change this score.',improve:'Add evidence for a missing term only where you genuinely have it.'},
 {name:'Evidence of impact',measures:'How many of your achievement lines show a measurable result or a counted scale.',method:'A line counts when it has a percentage, an amount of money, a multiple such as 3x, or a number with a counted unit such as users or hours. Years, dates and a bare number such as "team of 5" are ignored.',limits:'A counted scale is not always an outcome. A number can be present and still say little.',improve:'Ask what changed, who benefited and how it was measured. Add a figure only if you can verify it.'},
 {name:'Clarity',measures:'Whether lines open directly and stay short enough to scan.',method:'Starts at 100. Subtracts 10 for each achievement line over 30 words and 8 for each vague opening such as "Responsible for", "Tasked with" or "Worked on".',limits:'It looks at openings and length only, not at how well the sentence reads.',improve:'Start with what you did, in the past tense, and keep each line to one idea.'},
 {name:'ATS readability',measures:'Whether the text has the plain structure that applicant tracking systems read reliably.',method:'Starts at 100. Subtracts 25 if there is no experience section, 20 if there is no education section, 20 if there is no skills section and 15 if the text contains tabs or box-drawing separators.',limits:'It reads the extracted text. It does not inspect the layout of your original file or simulate any employer\'s system.',improve:'Use standard headings, one column and plain text for dates and contact details.'},
];
export function rate(cv:string,job:string){const a=analyse(cv,job); const lines=cv.split('\n'); const item=itemLines(lines); const bullets=lines.filter((_,i)=>item[i]); const impact=bullets.filter(hasMetric).length;const vague=(cv.match(WEAK_OPENER_PATTERN)||[]).length;return [{name:'Relevance',score:a.skills.length?Math.round(a.matched.length/a.skills.length*100):0,why:`${a.matched.length} of ${a.skills.length} recognised role terms have CV evidence. Vocabulary coverage, not a full semantic assessment.`},{name:'Evidence of impact',score:bullets.length?Math.round(impact/bullets.length*100):0,why:`${impact} of ${bullets.length} achievement lines show a percentage, an amount, a multiple or a counted scale. Years and dates are ignored. Verify that each shows a useful outcome.`},{name:'Clarity',score:Math.max(0,100-bullets.filter(l=>l.split(/\s+/).length>30).length*10-vague*8),why:'Starts at 100; subtracts 10 per line over 30 words and 8 per vague opening.'},{name:'ATS readability',score:Math.max(0,100-(!/experience/i.test(cv)?25:0)-(!/education/i.test(cv)?20:0)-(!/skills/i.test(cv)?20:0)-(/\t|│/.test(cv)?15:0)),why:'Text structure check: experience (25), education (20), skills (20), no tabular separators (15); remaining 20 is baseline. Does not inspect the source file layout.'}];}
