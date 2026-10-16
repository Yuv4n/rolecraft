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
const catalog = ['SQL','Python','Excel','Tableau','Power BI','JavaScript','TypeScript','React','Figma','AWS','dbt','SaaS','A/B testing','statistical significance','data warehouse','dashboards','activation','retention','customer research','stakeholder','experimentation','project management','customer support','data analysis','communication','leadership','marketing','sales','design'];
const aliases: Record<string, string[]> = {
 experimentation: ['experiment', 'experimented', 'experimenting'],
 'a/b testing': ['a/b test', 'ab testing', 'split test'],
 dashboards: ['dashboard'],
 'data warehouse': ['data warehousing'],
 stakeholder: ['stakeholders'],
 communication: ['communicating', 'communicated'],
};
function matches(text:string,term:string){ return new RegExp('(?<![a-z0-9])'+term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'s?(?![a-z0-9])','i').test(text); }
export function has(text:string,term:string){ return [term,...(aliases[term.toLowerCase()]||[])].some(f=>matches(text,f)); }
export function analyse(cv:string,job:string){
 const lines=cv.split('\n').filter(x=>x.trim());
 let category='Review manually'; const requirements=job.split('\n').map(x=>{if(/responsibilit/i.test(x))category='Responsibilities';else if(/required|essential|must.have/i.test(x))category='Required skills';else if(/preferred|nice.to.have|desirable/i.test(x))category='Preferred experience';return {text:x.trim(),category};}).filter(x=>! /^(responsibilities|required skills|preferred experience)$/i.test(x.text)&&x.text.length>18).slice(0,30).map(({text,category})=>{const terms=catalog.filter(t=>has(text,t));const evidence=lines.filter(l=>terms.some(t=>has(l,t))).sort((a,b)=>terms.filter(t=>has(b,t)).length-terms.filter(t=>has(a,t)).length);return {text,category,terms,evidence,matched:terms.filter(t=>has(cv,t)),preferred:category==='Preferred experience'};});

 const skills=catalog.filter(t=>has(job,t));const matched=skills.filter(t=>has(cv,t));const gaps=skills.filter(t=>!has(cv,t));
 const suggestions=[{title:'Product & growth analytics',sector:'SaaS · Digital products',terms:['SQL','activation','retention','experimentation','data analysis']},{title:'Customer insights',sector:'Consumer services · Research',terms:['customer research','customer support','communication']},{title:'Business operations',sector:'Technology · Professional services',terms:['Excel','project management','stakeholder','leadership']},{title:'Frontend development',sector:'Software · Digital agencies',terms:['React','JavaScript','TypeScript']},{title:'Product design',sector:'Digital products · Design studios',terms:['Figma','design']}].map(s=>({...s,evidence:lines.filter(l=>s.terms.some(t=>has(l,t))).slice(0,2)})).filter(s=>s.evidence.length).sort((a,b)=>b.evidence.length-a.evidence.length).slice(0,3);
 return {requirements,skills,matched,gaps,suggestions};
}
const pastTense: Record<string, string> = {building:'Built',creating:'Created',analysing:'Analysed',analyzing:'Analyzed',managing:'Managed',leading:'Led',developing:'Developed',writing:'Wrote',running:'Ran',delivering:'Delivered',supporting:'Supported',coordinating:'Coordinated',maintaining:'Maintained',producing:'Produced',designing:'Designed',monitoring:'Monitored',preparing:'Prepared',presenting:'Presented',training:'Trained',implementing:'Implemented'};
/** Replaces a weak opener with a verb of the same meaning. Anything it cannot map safely is left unchanged. */
export function rewriteLine(line:string){
 const m=line.match(/^([•*-]\s*)(Responsible for|Worked on|Helped with)\s+(\S.*)$/i); if(!m)return line;
 const marker=m[1].replace(/\s*$/,' '),opener=m[2].toLowerCase(),rest=m[3];
 if(opener==='worked on')return marker+'Contributed to '+rest;
 if(opener==='helped with')return marker+'Supported '+rest;
 const first=rest.split(/\s+/)[0],past=pastTense[first.toLowerCase()];
 return past?marker+past+rest.slice(first.length):line;
}
export function tailor(cv:string,job:string){
 const {skills}=analyse(cv,job); const lines=cv.split('\n'); const output:string[]=[];
 for(let i=0;i<lines.length;){if(!/^[•*-]\s/.test(lines[i])){output.push(lines[i++]);continue;}
 const run:string[]=[];while(i<lines.length&&/^[•*-]\s/.test(lines[i]))run.push(lines[i++]);
 output.push(...run.map((l,index)=>({line:rewriteLine(l),index,score:skills.filter(t=>has(l,t)).length})).sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.line));
 } return output.join('\n');
}
export function rate(cv:string,job:string){const a=analyse(cv,job); const bullets=cv.split('\n').filter(l=>/^[•*-]/.test(l)); const impact=bullets.filter(l=>/\d/.test(l)).length;return [{name:'Relevance',score:a.skills.length?Math.round(a.matched.length/a.skills.length*100):0,why:`${a.matched.length} of ${a.skills.length} recognised role terms have CV evidence. Vocabulary coverage, not a full semantic assessment.`},{name:'Evidence of impact',score:bullets.length?Math.round(impact/bullets.length*100):0,why:`${impact} of ${bullets.length} achievement bullets contain a number. Numbers are a proxy; verify that each shows a useful outcome.`},{name:'Clarity',score:Math.max(0,100-bullets.filter(l=>l.split(/\s+/).length>30).length*10-(cv.match(/responsible for|worked on|helped with/gi)||[]).length*8),why:'Starts at 100; subtracts 10 per bullet over 30 words and 8 per vague opening.'},{name:'ATS readability',score:Math.max(0,100-(!/experience/i.test(cv)?25:0)-(!/education/i.test(cv)?20:0)-(!/skills/i.test(cv)?20:0)-(/\t|│/.test(cv)?15:0)),why:'Text structure check: experience (25), education (20), skills (20), no tabular separators (15); remaining 20 is baseline. Does not inspect the source file layout.'}];}
