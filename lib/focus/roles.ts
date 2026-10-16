// A curated list of role families. The model maps a person's evidence onto these ids and never
// invents roles. The offline engine matches the same families by keyword.

export type RoleRequirement = {text: string; terms: string[]};
export type RoleFamily = {
  id: string;
  title: string;
  field: string;
  summary: string;
  requirements: RoleRequirement[];
  /** Ids of fields where the same skills carry over. */
  adjacent: string[];
  searchTitles: string[];
};

const req = (text: string, ...terms: string[]): RoleRequirement => ({text, terms});

export const roleFamilies: RoleFamily[] = [
  {
    id: 'product-analyst', title: 'Product or growth analyst', field: 'Technology and data',
    summary: 'Uses product data and experiments to decide what a software team builds next.',
    requirements: [
      req('SQL, dashboards and scripting for product data', 'sql', 'dashboard', 'tableau', 'power bi', 'looker', 'python'),
      req('Experiment design and A/B testing', 'experiment', 'a/b testing', 'hypothesis'),
      req('Statistical testing and significance', 'statistical significance', 'significance', 'confidence interval', 'p-value', 'regression'),
      req('Product metrics such as activation, retention and conversion', 'activation', 'retention', 'funnel', 'conversion'),
      req('A data warehouse and modelling tools such as dbt', 'dbt', 'data warehouse', 'bigquery', 'snowflake'),
      req('Turning analysis into recommendations for stakeholders', 'stakeholder', 'recommendation', 'presented'),
    ],
    adjacent: ['data-analyst', 'marketing-analyst', 'product-manager', 'ux-researcher'],
    searchTitles: ['Product Analyst', 'Growth Analyst', 'Product Data Analyst'],
  },
  {
    id: 'data-analyst', title: 'Data analyst', field: 'Technology and data',
    summary: 'Answers business questions with data, reporting and clear visualisation.',
    requirements: [
      req('SQL or spreadsheet analysis', 'sql', 'excel', 'spreadsheet'),
      req('Data visualisation and dashboards', 'dashboard', 'tableau', 'power bi', 'visualisation', 'chart'),
      req('Cleaning data and checking its quality', 'data quality', 'cleaning', 'validation', 'audit'),
      req('Reporting to non-technical audiences', 'report', 'stakeholder', 'presented'),
    ],
    adjacent: ['product-analyst', 'bi-developer', 'operations-analyst', 'health-data-analyst'],
    searchTitles: ['Data Analyst', 'Reporting Analyst', 'Insight Analyst'],
  },
  {
    id: 'analytics-engineer', title: 'Analytics engineer', field: 'Technology and data',
    summary: 'Builds the tested, documented data models that analysts and dashboards rely on.',
    requirements: [
      req('Data modelling in SQL', 'sql', 'data model', 'dbt'),
      req('A modern data warehouse', 'data warehouse', 'bigquery', 'snowflake', 'redshift'),
      req('Automated data tests and documentation', 'dbt', 'data quality', 'test', 'documentation'),
      req('Version control and code review', 'git', 'github', 'pull request'),
    ],
    adjacent: ['data-analyst', 'bi-developer', 'product-analyst'],
    searchTitles: ['Analytics Engineer', 'BI Engineer', 'Data Modeller'],
  },
  {
    id: 'bi-developer', title: 'Business intelligence developer', field: 'Technology and data',
    summary: 'Builds and maintains the dashboards and reports a business runs on.',
    requirements: [
      req('Dashboard development', 'dashboard', 'tableau', 'power bi', 'looker'),
      req('Gathering reporting requirements from stakeholders', 'stakeholder', 'requirements'),
      req('SQL and data modelling', 'sql', 'data model'),
      req('Automating recurring reports', 'automate', 'automated', 'python', 'scheduled'),
    ],
    adjacent: ['data-analyst', 'analytics-engineer', 'operations-analyst'],
    searchTitles: ['BI Developer', 'Power BI Developer', 'Reporting Analyst'],
  },
  {
    id: 'frontend-developer', title: 'Frontend developer', field: 'Technology and data',
    summary: 'Builds the parts of a web product that people see and use.',
    requirements: [
      req('React or a similar framework', 'react', 'vue', 'angular', 'next.js'),
      req('JavaScript or TypeScript', 'javascript', 'typescript'),
      req('Accessible, responsive interfaces', 'accessibility', 'responsive', 'wcag'),
      req('Automated testing', 'jest', 'testing library', 'cypress', 'playwright', 'unit test'),
      req('Working from design files', 'figma', 'design system'),
    ],
    adjacent: ['product-designer', 'technical-support', 'qa-engineer'],
    searchTitles: ['Frontend Developer', 'React Developer', 'UI Engineer'],
  },
  {
    id: 'product-designer', title: 'Product or UX designer', field: 'Technology and data',
    summary: 'Designs how a digital product works and looks, from research to prototype.',
    requirements: [
      req('Interface design in Figma or similar', 'figma', 'sketch', 'prototype'),
      req('User research that informs design', 'user research', 'usability', 'interview'),
      req('A design system or reusable components', 'design system', 'component library'),
      req('A portfolio of case studies', 'portfolio', 'case study'),
    ],
    adjacent: ['ux-researcher', 'service-designer', 'frontend-developer'],
    searchTitles: ['Product Designer', 'UX Designer', 'UI Designer'],
  },
  {
    id: 'product-manager', title: 'Product manager', field: 'Technology and data',
    summary: 'Decides what to build and why, and coordinates the people who build it.',
    requirements: [
      req('Prioritising work against goals', 'prioritis', 'roadmap', 'backlog'),
      req('Working with engineers and designers', 'engineer', 'designer', 'agile', 'sprint'),
      req('Using user research and data to decide', 'user research', 'customer research', 'data analysis'),
      req('Stakeholder communication', 'stakeholder', 'presented'),
      req('Defining and tracking product metrics', 'activation', 'retention', 'kpi', 'okr'),
    ],
    adjacent: ['product-analyst', 'project-coordinator', 'customer-success-manager'],
    searchTitles: ['Associate Product Manager', 'Product Owner', 'Technical Product Manager'],
  },
  {
    id: 'technical-support', title: 'Technical support or solutions role', field: 'Technology and data',
    summary: 'Helps customers solve technical problems and turns what is learned into better documentation and product fixes.',
    requirements: [
      req('Troubleshooting and root-cause analysis', 'troubleshoot', 'root cause', 'debug', 'incident'),
      req('Clear written documentation', 'documentation', 'knowledge base', 'guide'),
      req('Customer communication under pressure', 'customer', 'escalation', 'ticket'),
      req('Basic scripting or API knowledge', 'api', 'python', 'sql', 'javascript'),
    ],
    adjacent: ['customer-success-manager', 'qa-engineer', 'frontend-developer'],
    searchTitles: ['Technical Support Engineer', 'Solutions Consultant', 'Customer Support Engineer'],
  },
  {
    id: 'qa-engineer', title: 'QA or test analyst', field: 'Technology and data',
    summary: 'Finds problems in software before users do.',
    requirements: [
      req('Writing and running test cases', 'test case', 'test plan', 'testing'),
      req('Reporting defects clearly', 'bug', 'defect', 'ticket', 'jira'),
      req('Test automation', 'selenium', 'cypress', 'playwright', 'automated'),
      req('Working with developers on fixes', 'developer', 'agile', 'sprint'),
    ],
    adjacent: ['technical-support', 'frontend-developer'],
    searchTitles: ['QA Analyst', 'Test Analyst', 'QA Engineer'],
  },
  {
    id: 'ux-researcher', title: 'UX researcher', field: 'Technology and data',
    summary: 'Studies how people use a product and turns it into decisions.',
    requirements: [
      req('Interviews and usability sessions', 'interview', 'usability', 'user research'),
      req('Surveys and basic analysis', 'survey', 'questionnaire', 'data analysis'),
      req('Synthesising findings into insight', 'synthesis', 'insight', 'themes'),
      req('Presenting findings to decision makers', 'presented', 'stakeholder', 'report'),
    ],
    adjacent: ['product-designer', 'service-designer', 'product-analyst', 'policy-analyst'],
    searchTitles: ['UX Researcher', 'User Researcher', 'Customer Insight Analyst'],
  },
  {
    id: 'clinical-informatics', title: 'Clinical informatics analyst', field: 'Healthcare',
    summary: 'Connects clinical practice to health data and systems, so that records and reports work for the people using them.',
    requirements: [
      req('Understanding of clinical workflows', 'patient', 'clinical', 'ward', 'triage'),
      req('Reporting and dashboards on clinical data', 'dashboard', 'sql', 'report', 'audit data'),
      req('Quality improvement projects', 'audit', 'quality improvement', 'incident', 'safety'),
      req('Communicating with clinicians and managers', 'mentor', 'handover', 'stakeholder', 'led'),
      req('Information governance and confidentiality', 'confidential', 'gdpr', 'governance', 'consent'),
    ],
    adjacent: ['health-data-analyst', 'healthcare-operations', 'data-analyst', 'learning-designer'],
    searchTitles: ['Clinical Informatics Analyst', 'Clinical Systems Analyst', 'Health Informatics Officer'],
  },
  {
    id: 'health-data-analyst', title: 'Health data analyst', field: 'Healthcare',
    summary: 'Analyses health service data to measure quality, demand and outcomes.',
    requirements: [
      req('SQL or spreadsheet analysis', 'sql', 'excel', 'spreadsheet'),
      req('Audit and outcome measurement', 'audit', 'outcome', 'incidence', 'reduced'),
      req('Health service knowledge', 'patient', 'clinical', 'nhs', 'ward'),
      req('Privacy and information governance', 'confidential', 'gdpr', 'governance'),
    ],
    adjacent: ['clinical-informatics', 'data-analyst', 'healthcare-operations'],
    searchTitles: ['Health Data Analyst', 'Healthcare Analyst', 'Performance Analyst NHS'],
  },
  {
    id: 'clinical-research', title: 'Clinical research coordinator', field: 'Healthcare',
    summary: 'Runs the day-to-day work of a clinical study: participants, data collection and compliance.',
    requirements: [
      req('Participant recruitment and consent', 'recruit', 'consent', 'participant', 'patient'),
      req('Accurate data collection and records', 'documentation', 'records', 'data collection'),
      req('Protocol and regulatory compliance', 'protocol', 'gcp', 'regulatory', 'compliance'),
      req('Coordinating clinical teams', 'coordinated', 'multidisciplinary', 'team'),
    ],
    adjacent: ['health-data-analyst', 'healthcare-operations', 'risk-compliance'],
    searchTitles: ['Clinical Research Coordinator', 'Research Nurse', 'Clinical Trials Assistant'],
  },
  {
    id: 'healthcare-operations', title: 'Healthcare operations or service improvement', field: 'Healthcare',
    summary: 'Improves how a clinical service runs: staffing, flow, quality and cost.',
    requirements: [
      req('Managing teams and rotas', 'rota', 'managed', 'supervis', 'mentor'),
      req('Service improvement projects', 'quality improvement', 'audit', 'reduced', 'improvement'),
      req('Performance indicators and reporting', 'kpi', 'report', 'dashboard', 'metrics'),
      req('Budgets and resources', 'budget', 'resource'),
    ],
    adjacent: ['clinical-informatics', 'operations-analyst', 'project-coordinator'],
    searchTitles: ['Service Improvement Manager', 'Operations Manager Healthcare', 'Quality Improvement Lead'],
  },
  {
    id: 'learning-designer', title: 'Learning designer', field: 'Education',
    summary: 'Designs courses and training that people finish and use.',
    requirements: [
      req('Defining learning objectives and assessment', 'learning objective', 'assessment', 'curriculum'),
      req('Building course content in authoring tools', 'articulate', 'moodle', 'e-learning', 'lms'),
      req('Evaluating whether training worked', 'evaluation', 'feedback', 'outcome'),
      req('Working with subject experts', 'subject matter', 'stakeholder', 'collaborat'),
    ],
    adjacent: ['training-facilitator', 'content-marketer', 'clinical-informatics'],
    searchTitles: ['Learning Designer', 'Instructional Designer', 'E-learning Developer'],
  },
  {
    id: 'training-facilitator', title: 'Trainer or facilitator', field: 'Education',
    summary: 'Teaches skills to adults in organisations and keeps the learning going afterwards.',
    requirements: [
      req('Delivering sessions to groups', 'taught', 'training', 'workshop', 'facilitat'),
      req('Assessing training needs', 'needs analysis', 'assessment', 'feedback'),
      req('Preparing materials', 'materials', 'curriculum', 'slides', 'handbook'),
      req('Mentoring individuals', 'mentor', 'coach', 'supervis'),
    ],
    adjacent: ['learning-designer', 'customer-success-manager', 'people-analyst'],
    searchTitles: ['Training Coordinator', 'Learning and Development Officer', 'Facilitator'],
  },
  {
    id: 'operations-analyst', title: 'Operations analyst', field: 'Operations',
    summary: 'Finds where a process loses time or money and shows how to fix it.',
    requirements: [
      req('Process mapping and improvement', 'process', 'workflow', 'improvement', 'lean'),
      req('Spreadsheet or SQL analysis', 'excel', 'sql', 'spreadsheet'),
      req('KPIs and regular reporting', 'kpi', 'report', 'dashboard', 'metrics'),
      req('Working with the teams that run the process', 'stakeholder', 'coordinated', 'team'),
    ],
    adjacent: ['supply-chain-analyst', 'project-coordinator', 'data-analyst', 'healthcare-operations'],
    searchTitles: ['Operations Analyst', 'Business Operations Analyst', 'Process Improvement Analyst'],
  },
  {
    id: 'project-coordinator', title: 'Project or programme coordinator', field: 'Operations',
    summary: 'Keeps a project on schedule by coordinating people, tasks and information.',
    requirements: [
      req('Planning and tracking tasks', 'schedule', 'plan', 'track', 'timeline'),
      req('Coordinating across teams', 'coordinated', 'cross-functional', 'stakeholder'),
      req('Documentation and reporting', 'documentation', 'report', 'minutes'),
      req('Project tools', 'jira', 'asana', 'trello', 'monday.com', 'ms project'),
      req('Managing risks and issues', 'risk', 'issue log', 'escalat'),
    ],
    adjacent: ['operations-analyst', 'product-manager', 'programme-officer', 'healthcare-operations'],
    searchTitles: ['Project Coordinator', 'Project Support Officer', 'PMO Analyst'],
  },
  {
    id: 'supply-chain-analyst', title: 'Supply chain or logistics analyst', field: 'Operations',
    summary: 'Plans stock, supply and delivery so that goods arrive when needed.',
    requirements: [
      req('Forecasting demand', 'forecast', 'demand', 'planning'),
      req('Inventory and supplier management', 'inventory', 'supplier', 'procurement', 'stock'),
      req('Spreadsheet or SQL analysis', 'excel', 'sql'),
      req('Logistics performance measures', 'delivery', 'logistics', 'lead time', 'kpi'),
    ],
    adjacent: ['operations-analyst', 'financial-analyst', 'data-analyst'],
    searchTitles: ['Supply Chain Analyst', 'Logistics Analyst', 'Demand Planner'],
  },
  {
    id: 'customer-success-manager', title: 'Customer success manager', field: 'Operations',
    summary: 'Helps customers get value from a product so that they stay and expand.',
    requirements: [
      req('Onboarding customers', 'onboarding', 'implementation', 'training'),
      req('Managing relationships and renewals', 'account', 'renewal', 'relationship', 'client'),
      req('Handling escalations', 'escalat', 'complaint', 'incident'),
      req('Using customer data to spot risk', 'churn', 'retention', 'nps', 'customer data'),
      req('Product knowledge and communication', 'communication', 'presented', 'product'),
    ],
    adjacent: ['technical-support', 'product-manager', 'training-facilitator', 'project-coordinator'],
    searchTitles: ['Customer Success Manager', 'Account Manager', 'Client Success Associate'],
  },
  {
    id: 'service-designer', title: 'Service designer', field: 'Operations',
    summary: 'Redesigns how a service works end to end, across channels and teams.',
    requirements: [
      req('Journey mapping', 'journey map', 'service blueprint', 'process'),
      req('Research with users and staff', 'user research', 'interview', 'observation'),
      req('Running workshops', 'workshop', 'facilitat'),
      req('Prototyping and testing ideas', 'prototype', 'pilot', 'test'),
    ],
    adjacent: ['product-designer', 'ux-researcher', 'healthcare-operations', 'policy-analyst'],
    searchTitles: ['Service Designer', 'Experience Designer', 'Transformation Analyst'],
  },
  {
    id: 'marketing-analyst', title: 'Marketing analyst', field: 'Marketing and communications',
    summary: 'Measures what marketing does and shows where to spend next.',
    requirements: [
      req('Campaign performance analysis', 'campaign', 'conversion', 'roi', 'attribution'),
      req('Web analytics tools', 'google analytics', 'ga4', 'mixpanel', 'amplitude'),
      req('SQL or spreadsheet analysis', 'sql', 'excel'),
      req('Reporting to marketing leads', 'report', 'dashboard', 'stakeholder'),
    ],
    adjacent: ['product-analyst', 'content-marketer', 'data-analyst'],
    searchTitles: ['Marketing Analyst', 'Digital Analyst', 'Performance Marketing Analyst'],
  },
  {
    id: 'content-marketer', title: 'Content or editorial marketer', field: 'Marketing and communications',
    summary: 'Plans and writes content that earns an audience.',
    requirements: [
      req('Writing for a defined audience', 'wrote', 'writing', 'copy', 'article', 'newsletter'),
      req('Search and audience research', 'seo', 'keyword', 'audience'),
      req('Editorial planning', 'editorial', 'calendar', 'content plan'),
      req('Measuring content results', 'analytics', 'engagement', 'traffic'),
    ],
    adjacent: ['communications-officer', 'marketing-analyst', 'learning-designer'],
    searchTitles: ['Content Marketer', 'Content Editor', 'Content Strategist'],
  },
  {
    id: 'communications-officer', title: 'Communications officer', field: 'Marketing and communications',
    summary: 'Explains an organisation to its audiences through writing, media and events.',
    requirements: [
      req('Writing for different audiences', 'wrote', 'writing', 'press release', 'newsletter'),
      req('Social media and campaigns', 'social media', 'campaign'),
      req('Stakeholder and media relations', 'stakeholder', 'media', 'press'),
      req('Planning events and announcements', 'event', 'announcement', 'organised'),
    ],
    adjacent: ['content-marketer', 'programme-officer', 'policy-analyst'],
    searchTitles: ['Communications Officer', 'Communications Coordinator', 'Engagement Officer'],
  },
  {
    id: 'financial-analyst', title: 'Financial analyst', field: 'Finance and risk',
    summary: 'Models and explains the numbers behind decisions.',
    requirements: [
      req('Financial modelling and forecasting', 'forecast', 'model', 'budget'),
      req('Advanced Excel', 'excel', 'pivot', 'vlookup'),
      req('Variance analysis and reporting', 'variance', 'report', 'month-end'),
      req('Presenting numbers to non-finance managers', 'presented', 'stakeholder'),
    ],
    adjacent: ['supply-chain-analyst', 'operations-analyst', 'risk-compliance'],
    searchTitles: ['Financial Analyst', 'FP&A Analyst', 'Finance Business Partner'],
  },
  {
    id: 'risk-compliance', title: 'Risk or compliance analyst', field: 'Finance and risk',
    summary: 'Checks that an organisation follows the rules and manages its exposure.',
    requirements: [
      req('Knowledge of regulations or standards', 'regulat', 'compliance', 'gdpr', 'gcp', 'policy'),
      req('Testing controls and auditing', 'audit', 'control', 'inspection'),
      req('Clear documentation of findings', 'documentation', 'report', 'records'),
      req('Raising issues with managers', 'escalat', 'incident', 'stakeholder'),
    ],
    adjacent: ['clinical-research', 'financial-analyst', 'policy-analyst'],
    searchTitles: ['Compliance Analyst', 'Risk Analyst', 'Governance Officer'],
  },
  {
    id: 'policy-analyst', title: 'Policy or research analyst', field: 'Public sector and non-profit',
    summary: 'Gathers evidence and turns it into advice for people who make decisions.',
    requirements: [
      req('Research and evidence synthesis', 'research', 'literature', 'evidence'),
      req('Writing briefings and reports', 'report', 'briefing', 'wrote'),
      req('Quantitative analysis', 'data analysis', 'statistics', 'excel', 'survey'),
      req('Engaging stakeholders', 'stakeholder', 'consultation', 'presented'),
    ],
    adjacent: ['programme-officer', 'ux-researcher', 'communications-officer', 'risk-compliance'],
    searchTitles: ['Policy Analyst', 'Research Officer', 'Policy Officer'],
  },
  {
    id: 'programme-officer', title: 'Programme or grants officer', field: 'Public sector and non-profit',
    summary: 'Delivers a funded programme, tracks what it achieves and reports to funders.',
    requirements: [
      req('Delivering a programme to plan', 'programme', 'delivery', 'coordinated'),
      req('Monitoring and evaluation', 'evaluation', 'monitoring', 'outcome', 'impact'),
      req('Budgets and grant reporting', 'budget', 'grant', 'funder'),
      req('Partner and volunteer coordination', 'partner', 'volunteer', 'coordinated'),
    ],
    adjacent: ['policy-analyst', 'project-coordinator', 'communications-officer'],
    searchTitles: ['Programme Officer', 'Grants Officer', 'Programme Coordinator'],
  },
  {
    id: 'people-analyst', title: 'People or HR analyst', field: 'People and talent',
    summary: 'Uses workforce data to help an organisation hire, keep and develop people.',
    requirements: [
      req('HR and workforce data', 'hr', 'workforce', 'headcount', 'attrition'),
      req('Spreadsheet or SQL analysis', 'excel', 'sql'),
      req('Survey design and analysis', 'survey', 'engagement'),
      req('Handling confidential information', 'confidential', 'gdpr'),
    ],
    adjacent: ['data-analyst', 'training-facilitator', 'talent-coordinator'],
    searchTitles: ['People Analyst', 'HR Analyst', 'Workforce Planning Analyst'],
  },
  {
    id: 'talent-coordinator', title: 'Recruitment or talent coordinator', field: 'People and talent',
    summary: 'Runs the logistics and candidate experience of hiring.',
    requirements: [
      req('Screening and sourcing candidates', 'recruit', 'screening', 'sourcing', 'interview'),
      req('Scheduling and coordination', 'schedule', 'coordinated', 'calendar'),
      req('Applicant tracking tools', 'ats', 'greenhouse', 'workday', 'lever'),
      req('Working with hiring managers', 'stakeholder', 'hiring manager'),
    ],
    adjacent: ['people-analyst', 'training-facilitator', 'project-coordinator'],
    searchTitles: ['Talent Coordinator', 'Recruitment Coordinator', 'Resourcer'],
  },
];

export const roleById = new Map(roleFamilies.map((r) => [r.id, r]));

/** Compact text version for prompts. */
export function taxonomyForPrompt(): string {
  return roleFamilies
    .map((r) => `${r.id} | ${r.title} | ${r.field} | requirements: ${r.requirements.map((q) => q.text).join('; ')}`)
    .join('\n');
}
