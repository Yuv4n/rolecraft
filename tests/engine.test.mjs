import assert from 'node:assert/strict';
import {sampleCV,sampleJob,analyse,tailor,rate,has} from '../lib/engine.ts';
const a=analyse(sampleCV,sampleJob),t=tailor(sampleCV,sampleJob);
assert(a.gaps.includes('dbt'));
assert(!a.matched.includes('dbt'));
assert(a.requirements.some(r=>r.category==='Preferred experience'));
assert(t.includes('31% to 39%'));
assert(t.includes('• Built SQL dashboards'));
assert(!t.includes('dbt'));
assert.equal(t.split('\n').filter(l=>l.startsWith('•')).length,6);
assert(rate(t,sampleJob)[2].score>rate(sampleCV,sampleJob)[2].score);
assert(has('SQL and stakeholders','stakeholder'));
assert(!has('NoSQL','SQL'));
assert.equal(analyse('Unrelated text','Unrelated role').matched.length,0);
assert.equal(rate('',sampleJob)[0].score,0);
console.log('PASS: 12 grounding, extraction-category, matching and rubric assertions');

// Negated and aspirational skill mentions must not become evidence.
for (const text of ['No experience with SQL.', 'I am learning SQL.', 'I have never used SQL.', 'I want to learn SQL.']) {
 assert(!analyse(text, 'SQL').matched.includes('SQL'), text);
 assert(!analyse(text, 'SQL').suggestions.some(s => s.title === 'Product & growth analytics'), text);
}
assert(analyse('No Python experience. Built SQL dashboards.', 'SQL').matched.includes('SQL'));
assert(analyse('Built Node.js services.', 'Node.js').matched.includes('Node.js'));
assert(has('ReactJS, Postgres and split testing', 'React'));
assert(has('ReactJS, Postgres and split testing', 'PostgreSQL'));
assert(has('ReactJS, Postgres and split testing', 'A/B testing'));
const short = analyse(sampleCV, 'Required skills:\nSQL\nPython\nReact');
assert.equal(short.requirements.length, 3);
assert(short.requirements.every(r => r.category === 'Required skills'));
const preferred = analyse(sampleCV, 'Preferred experience\nPython is required for bonus projects.');
assert.equal(preferred.requirements[0].category, 'Preferred experience');
for (const text of ['', 'EXPERIENCE\nEDUCATION\nSKILLS\nSQL', 'Unrelated text']) {
 assert(rate(text, 'SQL').every(r => r.score === 0), text);
}
assert.equal(tailor('• Worked on Python automation.', 'Python'), '• Worked on Python automation.');
assert.equal(tailor('• Responsible for managing customer accounts.', 'sales'), '• Managed customer accounts.');
assert.equal(tailor('  • Responsible for building SQL dashboards.', 'SQL'), '• Built SQL dashboards.');
assert.equal(tailor('1. Responsible for developing React applications.', 'React'), '• Developed React applications.');
const partitioned = 'Role A\n• Python automation.\n• SQL analysis.\n\nRole B\n• React development.';
assert(tailor(partitioned, 'SQL').indexOf('Role B') > tailor(partitioned, 'SQL').indexOf('SQL analysis'));
assert(tailor(partitioned, 'SQL').endsWith('• React development.'));
assert(rate(sampleCV, sampleJob).every(r => r.score >= 0 && r.score <= 100));
assert.equal(analyse(sampleCV, Array.from({length: 40}, (_, i) => `Requirement ${i}: SQL`).join('\n')).requirements.length, 40);
console.log('PASS: negation, aliases, short requirements, category preservation, empty scores, grammar and bullet boundaries');
