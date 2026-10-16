// The deterministic vocabulary. One term per line, then its synonyms and inflections, separated by "|".
// Matching is whole-word and case-insensitive (see `has` in engine.ts), and a trailing "s" is allowed.
// Single common words such as "plan" or "lead" are left out on purpose: they match too much.
// To support a new field, add lines here. Nothing else needs to change.

const SOURCE = `
# Data and analytics
SQL | structured query language
Python | pandas | numpy | jupyter
R programming | rstudio | tidyverse
Excel | spreadsheet | vlookup | pivot table | xlookup | google sheets
Tableau
Power BI | powerbi
Looker | looker studio | data studio
dashboards | dashboard
data analysis | data analytics | analysing data | analyzing data | data analyst
data visualisation | data visualization | visualisation | visualization
data cleaning | data quality | data validation | cleaning data
data modelling | data modeling | data model
data warehouse | data warehousing | bigquery | snowflake | redshift
dbt
ETL | data pipeline | data pipelines
statistics | statistical analysis | regression | hypothesis testing | confidence interval | confidence intervals
statistical significance | significance testing | p-value | p-values
A/B testing | a/b test | ab testing | split test | split testing
experimentation | experiment | experiments | experimenting | experimented
forecasting | forecast | forecasts | forecasted
machine learning | ml model | scikit-learn
reporting | reports | report writing | management reporting
KPIs | kpi | key performance indicators | performance indicators | metrics
SaaS
activation
retention | churn
conversion | conversion rate | conversion rates
funnel analysis | funnel
cohort analysis | cohort | cohorts
# Software and product
JavaScript | js | ecmascript
TypeScript
React | react.js | reactjs
Vue | vue.js
Angular
Node.js | nodejs | node
HTML
CSS | sass | tailwind
Java
C# | .net
Go language | golang
APIs | api | rest api | restful | rest apis
Git | github | gitlab | version control | pull request | pull requests
AWS | amazon web services
Azure
Google Cloud | gcp
Docker | containers | kubernetes
CI/CD | continuous integration | continuous delivery
unit testing | unit tests | test automation | automated testing | automated tests | jest | cypress | playwright | selenium
accessibility | wcag | accessible
responsive design | responsive
agile | scrum | kanban | sprint | sprints
Jira | confluence
product management | product manager | product roadmap | roadmap
user research | user interviews | usability testing | usability
UX design | ux | user experience
UI design | ui | user interface
Figma | sketch | adobe xd
prototyping | prototype | prototypes | wireframes | wireframing
design systems | design system | component library
# Marketing, content and communications
SEO | search engine optimisation | search engine optimization
Google Analytics | ga4 | google tag manager
paid social | meta ads | facebook ads | linkedin ads | ppc | google ads | paid media
email marketing | newsletter | newsletters | mailchimp | hubspot | klaviyo
social media | social media management | community management
content marketing | content strategy | content creation | content planning | editorial calendar
copywriting | copywriter | copy editing | proofreading | editing
campaign management | marketing campaign | marketing campaigns | campaigns
brand | branding | brand identity
public relations | press releases | press release | media relations
marketing
sales | selling | business development | lead generation | prospecting
CRM | salesforce | zendesk | customer relationship management
account management | account manager | key accounts | client management | client relationships
customer service | customer support | customer care | helpdesk | help desk
customer success | onboarding customers | customer onboarding
customer research | customer insight | customer insights
complaint handling | complaints | complaint resolution | resolving complaints
knowledge base | help centre | help center | documentation
# Operations, project and finance
project management | project manager | project coordination | project planning | managing projects
programme management | program management | pmo
stakeholder management | stakeholder engagement | stakeholder | stakeholders | stakeholder communication
risk management | risk assessment | risk register | risk analysis
process improvement | process mapping | continuous improvement | lean | six sigma | kaizen
operations | operational | operations management
supply chain | logistics | procurement | inventory | inventory management | stock control | warehousing | distribution
vendor management | supplier management | supplier relationships | suppliers
budgeting | budget | budgets | budget management | managing budgets
financial reporting | management accounts | financial statements | month-end | month end close | year-end
variance analysis | variance reporting
reconciliation | reconciliations | reconciling | bank reconciliation
accounts payable | accounts receivable | invoicing | invoice processing | payroll | bookkeeping
financial modelling | financial modeling | financial analysis | cost analysis
Xero | quickbooks | sage | sap | oracle
audit | auditing | internal audit | external audit | audits
compliance | regulatory | regulation | regulations | governance | policy compliance
GDPR | data protection | information governance | confidentiality | data privacy
quality assurance | quality control | quality improvement | qa
health and safety | health & safety | safeguarding | risk assessments
negotiation | negotiating | contract negotiation | contracts | contract management
# People, learning and care
recruitment | recruiting | talent acquisition | sourcing candidates | candidate screening | interviewing
HR | human resources | employee relations | people operations | workforce planning
onboarding | induction | inductions
training | trainer | training delivery | delivering training | facilitation | facilitating | workshops | workshop
mentoring | mentor | mentored | coaching | coach
line management | people management | team management | managing a team | managing teams | supervising | supervision
leadership | leading teams | team leadership | team leader
teamwork | collaboration | collaborating | cross-functional | cross functional
communication | communicating | communication skills | written communication | verbal communication
presenting | presentation | presentations | public speaking | presented
lesson planning | lesson plans | schemes of work | scheme of work
curriculum design | curriculum development | curriculum | course design | syllabus
teaching | taught | classroom management | classroom
assessment | assessments | marking | grading | formative assessment
e-learning | elearning | virtual learning environment | vle | moodle | google classroom | articulate | lms | learning management system
instructional design | learning design | learning objectives | learning outcomes
tutoring | tutor | tutored | one to one tuition
special educational needs | send | inclusion | differentiation
patient care | patient | patients | nursing | clinical care
clinical documentation | clinical records | patient records | medical records | clinical notes | record keeping
triage | acute care | emergency care | ward | wards | clinical practice
medication | medicines management | drug administration | administering medication
infection control | infection prevention
clinical audit | falls prevention | patient safety | incident reporting | incident
care planning | care plans | discharge planning
research | literature review | evidence synthesis | desk research
data collection | surveys | survey | questionnaires | questionnaire
policy analysis | policy | briefing | briefings | briefing papers
grant writing | grants | funding applications | grant management | fundraising
monitoring and evaluation | evaluation | impact measurement | impact assessment
volunteer management | volunteers | volunteer coordination
event planning | events | event management | organising events | organizing events
administration | administrative | office administration | diary management | scheduling | calendar management
data entry | filing | records management
problem solving | problem-solving | troubleshooting | root cause analysis | root cause
time management | prioritisation | prioritization | prioritising | prioritizing | multitasking
attention to detail | accuracy | accurate
`;

export type VocabEntry = {term: string; aliases: string[]};

export const vocabulary: VocabEntry[] = SOURCE.split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => {
    const [term, ...aliases] = line.split('|').map((s) => s.trim()).filter(Boolean);
    return {term, aliases};
  });
