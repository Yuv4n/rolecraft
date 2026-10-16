import type { JobPosting } from './types.ts';

// Demo postings for offline use. The companies are invented and the links are not real.
const now = Date.UTC(2026, 9, 10);
const day = 86400000;

const mk = (id: string, title: string, company: string, location: string, remote: boolean, age: number, description: string, tags: string[]): JobPosting => ({
  id: `sample:${id}`, source: 'Sample data', title, company: `${company} (sample)`, location, remote, url: 'https://example.com/sample-posting', postedAt: now - age * day, description, tags, sample: true,
});

export const samplePostings: JobPosting[] = [
  mk('pa', 'Product Analyst', 'Orbit Labs', 'London, UK', false, 3, 'Responsibilities\nBuild SQL dashboards to monitor activation and retention.\nPartner with product managers on experimentation and A/B testing.\nCommunicate recommendations to stakeholders.\nRequired skills\nSQL and Python for data analysis.\nExperience with dashboards and stakeholder communication.\nPreferred experience\nKnowledge of SaaS growth metrics. 2+ years of experience.', ['analytics', 'saas']),
  mk('da', 'Data Analyst', 'Brightside Retail', 'Manchester, UK', false, 6, 'Responsibilities\nProduce weekly reporting and dashboards for retail and e-commerce teams.\nRequired skills\nSQL and Excel for data analysis.\nTableau or Power BI.\nPresent findings to stakeholders. 1+ years of experience.', ['reporting', 'retail']),
  mk('ci', 'Customer Insights Analyst', 'Harbour Home', 'London, UK', false, 12, 'Responsibilities\nRun customer research and analyse customer support data.\nPresent insight to stakeholders.\nRequired skills\nCustomer research, Excel and strong communication.\nPreferred experience\nSQL or Tableau.', ['insight', 'consumer']),
  mk('ae', 'Analytics Engineer', 'Lattice Data', 'Remote (Europe)', true, 2, 'Responsibilities\nBuild and test dbt models in our data warehouse.\nRequired skills\nSQL, dbt and Python. Experience with a modern data warehouse.\nGit and AWS are a plus. 3+ years of experience.', ['dbt', 'data']),
  mk('sa', 'Senior Product Analyst', 'Kestrel Pay', 'London, UK', false, 9, 'Responsibilities\nLead experimentation and A/B testing for our payments product. Mentor analysts.\nRequired skills\nSQL, Python, statistical significance, A/B testing and stakeholder management. 7+ years of experience.\nPreferred experience\nfintech or payments background.', ['fintech', 'senior']),
  mk('fe', 'Frontend Developer', 'Pixel Forge', 'Remote', true, 4, 'Responsibilities\nBuild interfaces in React and TypeScript.\nRequired skills\nJavaScript, TypeScript, React, HTML and CSS. Git.\n2+ years of experience.', ['react', 'frontend']),
  mk('ops', 'Business Operations Analyst', 'Northgate Logistics', 'Leeds, UK', false, 14, 'Responsibilities\nImprove processes across the supply chain and logistics operations.\nRequired skills\nExcel, reporting, process improvement and project management.\nPreferred experience\nSQL, vendor management.', ['operations', 'logistics']),
  mk('ja', 'Junior Data Analyst', 'Tidewater Health', 'Bristol, UK', false, 5, 'Responsibilities\nSupport healthcare reporting and dashboards.\nRequired skills\nExcel and SQL. Entry level; graduates welcome.', ['healthcare', 'junior']),
];
