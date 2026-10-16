// Practical ways to build real evidence for a skill. Nothing here is CV text:
// each template contains [brackets] that only the user can fill after doing the work.

export type ExperienceKind = "project" | "responsibility" | "work experience";

export interface Play {
  kind: ExperienceKind;
  /** Rough effort in hours. */
  hours: number;
  title: string;
  steps: string[];
  /** What the CV gains once this is done. */
  evidence: string;
  /** A bullet shape to fill in with real details. */
  template: string;
}

const mk = (
  kind: ExperienceKind,
  hours: number,
  title: string,
  evidence: string,
  template: string,
  steps: string[],
): Play => ({ kind, hours, title, steps, evidence, template });

const plays: Record<string, Play> = {
  dbt: mk(
    "project",
    20,
    "Build a tested dbt project on an open dataset",
    "Shows you can model data in layers and test it, which is the core of analytics engineering.",
    "Built a dbt project with [N] staging and mart models on [dataset], with [N] data-quality tests and published documentation.",
    [
      "Pick an open dataset (for example public transport or e-commerce data).",
      "Create staging and reporting models and add not-null, unique and relationship tests.",
      "Generate the docs site and publish the repository with setup instructions.",
    ],
  ),
  "data warehouse": mk(
    "project",
    12,
    "Load an open dataset into a cloud warehouse and model it",
    "Shows hands-on use of a warehouse, not just queries against one.",
    "Loaded [dataset] into [BigQuery/Snowflake/Postgres] and modelled [N] tables for [question].",
    [
      "Use a free tier of a warehouse.",
      "Load a dataset, design a simple star schema and write the queries that answer one real question.",
      "Document the schema and the trade-offs you made.",
    ],
  ),
  "A/B testing": mk(
    "project",
    10,
    "Design and analyse an A/B test with open or simulated data",
    "Shows you can frame a hypothesis, choose a metric and read the result honestly.",
    "Designed and analysed an A/B test on [dataset or simulation]; [result with confidence interval or p-value].",
    [
      "Write the hypothesis, primary metric and required sample size first.",
      "Analyse the result and report uncertainty, not just the winner.",
      "State when you would not ship the change.",
    ],
  ),
  experimentation: mk(
    "responsibility",
    15,
    "Own one experiment at work from hypothesis to readout",
    "Moves experimentation from “contributed to” to “owned”.",
    "Owned an experiment on [feature/process]: [hypothesis], [metric], [result].",
    [
      "Ask your manager for a small change you can test.",
      "Write the hypothesis and success metric before launch.",
      "Present the result, including what you would do next.",
    ],
  ),
  "statistical significance": mk(
    "project",
    8,
    "Write up a statistics case study",
    "Shows you understand significance, power and error, not only dashboards.",
    "Analysed [dataset] to test [question] using [method]; found [result] with [uncertainty].",
    [
      "Choose a question with a clear comparison.",
      "Run the test and state assumptions and limits.",
      "Write a one-page explanation for a non-specialist.",
    ],
  ),
  Tableau: mk(
    "project",
    8,
    "Publish a Tableau dashboard on an open dataset",
    "Gives a public, inspectable example of your visual analysis.",
    "Built a Tableau dashboard on [dataset] showing [metrics], viewed by [audience/size] if known.",
    [
      "Use Tableau Public with an open dataset.",
      "Design for one decision, not twenty charts.",
      "Add a short note on what the dashboard shows and how to read it.",
    ],
  ),
  "Power BI": mk(
    "project",
    8,
    "Build a Power BI report from an open dataset",
    "Shows working knowledge of the tool.",
    "Built a Power BI report on [dataset] with [N] measures covering [topic].",
    [
      "Install Power BI Desktop and load an open dataset.",
      "Write DAX measures for the key figures.",
      "Publish screenshots with a short explanation.",
    ],
  ),
  Looker: mk(
    "project",
    10,
    "Model and explore data in Looker Studio or LookML",
    "Shows you can set up reusable metrics.",
    "Built a [Looker Studio/LookML] report on [dataset] covering [metrics].",
    [
      "Connect a public dataset.",
      "Define metrics once and reuse them.",
      "Document the definitions.",
    ],
  ),
  Python: mk(
    "project",
    12,
    "Automate a real task or analyse a dataset in Python",
    "Shows you can write working code, not only list the language.",
    "Wrote a Python script that [action] [volume], saving [time] per [period].",
    [
      "Pick a repetitive task you really do.",
      "Automate it and keep the code in a repository.",
      "Measure the time saved honestly.",
    ],
  ),
  SQL: mk(
    "project",
    8,
    "Answer a business question in SQL on an open dataset",
    "Shows query skill with a concrete question and result.",
    "Used SQL to analyse [dataset] and answer [question], finding [result].",
    [
      "Pick an open dataset.",
      "Write joins, aggregations and a window function to answer one question.",
      "Publish the queries and your findings.",
    ],
  ),
  React: mk(
    "project",
    25,
    "Build and deploy a small React app",
    "Shows you can ship a working interface.",
    "Built and deployed a React app that [does what] using [APIs/state tools].",
    [
      "Choose a small, useful idea.",
      "Build it with components, state and a data source, and deploy it.",
      "Write a README that explains decisions.",
    ],
  ),
  TypeScript: mk(
    "project",
    15,
    "Convert a small project to TypeScript",
    "Shows typed code and tooling.",
    "Migrated [project] to TypeScript with [N] typed modules and strict mode.",
    [
      "Take a project of your own.",
      "Turn on strict mode and fix the errors properly.",
      "Note what the types caught.",
    ],
  ),
  JavaScript: mk(
    "project",
    15,
    "Build an interactive tool in JavaScript",
    "Shows practical programming rather than coursework.",
    "Built [tool] in JavaScript that [does what] for [users].",
    [
      "Pick a small problem.",
      "Build and publish it.",
      "Ask one person to use it and note their feedback.",
    ],
  ),
  HTML: mk(
    "project",
    8,
    "Build an accessible static page",
    "Shows markup and accessibility basics.",
    "Built [page] in HTML with [accessibility checks].",
    [
      "Build one page from a design.",
      "Run an accessibility checker.",
      "Fix what it finds.",
    ],
  ),
  CSS: mk(
    "project",
    8,
    "Rebuild a layout responsively",
    "Shows layout skill.",
    "Built a responsive [layout] in CSS that works from [width] to [width].",
    [
      "Pick a real site layout.",
      "Rebuild it with grid and flexbox.",
      "Test on a phone.",
    ],
  ),
  AWS: mk(
    "project",
    15,
    "Deploy a small service on AWS",
    "Shows cloud basics beyond the logo on the CV.",
    "Deployed [service] on AWS using [services], with [monitoring or cost control].",
    [
      "Use the free tier.",
      "Deploy something small with a database or storage.",
      "Add a budget alert and write down the architecture.",
    ],
  ),
  Figma: mk(
    "project",
    15,
    "Design and prototype a flow in Figma",
    "Shows design process and tooling.",
    "Designed and prototyped [flow] in Figma, tested with [N] people.",
    [
      "Choose a real problem.",
      "Design the flow and make it clickable.",
      "Test it with a few people and record what changed.",
    ],
  ),
  prototyping: mk(
    "project",
    12,
    "Prototype and test an idea with real users",
    "Shows you test before you build.",
    "Prototyped [idea] and tested it with [N] users; [change made].",
    [
      "Sketch, then prototype.",
      "Watch 3 to 5 people use it.",
      "Write down what you changed.",
    ],
  ),
  "user research": mk(
    "project",
    15,
    "Run a small research study",
    "Shows you can find and report what users need.",
    "Interviewed [N] [users] about [topic]; identified [N] themes that led to [decision].",
    [
      "Write a discussion guide.",
      "Run 5 interviews.",
      "Synthesise themes and share them.",
    ],
  ),
  "customer research": mk(
    "responsibility",
    12,
    "Run a customer interview round at work",
    "Moves research from “presented” to “ran”.",
    "Ran [N] customer interviews on [topic]; findings led to [decision].",
    [
      "Offer to run a short interview round.",
      "Share insights with the team.",
      "Track what was decided.",
    ],
  ),
  stakeholder: mk(
    "responsibility",
    10,
    "Take charge of a recurring stakeholder update",
    "Shows communication with decision makers.",
    "Presented [topic] to [audience] every [period], leading to [decision].",
    [
      "Offer to present a regular update.",
      "Keep it to one decision per meeting.",
      "Record what each update led to.",
    ],
  ),
  leadership: mk(
    "responsibility",
    20,
    "Lead a small piece of work or mentor someone",
    "Shows leadership with a real example.",
    "Led [N] people to [outcome] over [time].",
    [
      "Ask to lead a small piece of work.",
      "Agree goals first.",
      "Record the result.",
    ],
  ),
  "project management": mk(
    "responsibility",
    20,
    "Take ownership of a project plan",
    "Shows you can run work end to end.",
    "Managed [project] with [N] people over [time], delivering [outcome] [on/under] [plan].",
    [
      "Volunteer to plan one project.",
      "Track scope, risks and dates.",
      "Hold a short retrospective.",
    ],
  ),
  Agile: mk(
    "responsibility",
    10,
    "Run or support sprint rituals in your team",
    "Shows practical use of the method.",
    "Facilitated [N] sprint [ceremonies] for a team of [N].",
    [
      "Ask to help run planning or retrospectives.",
      "Keep notes of what changed.",
      "Report the effect on delivery.",
    ],
  ),
  roadmap: mk(
    "responsibility",
    15,
    "Draft a prioritised roadmap for your area",
    "Shows prioritisation.",
    "Drafted a [period] roadmap for [area] with [N] priorities, chosen using [criteria].",
    [
      "Collect requests.",
      "Score them against a stated rule.",
      "Review with your manager.",
    ],
  ),
  "product management": mk(
    "work experience",
    40,
    "Take on a product-owner style responsibility",
    "Shows decisions about what to build.",
    "Owned [feature/backlog] for [users]; shipped [N] changes, resulting in [outcome].",
    [
      "Ask to own a small backlog.",
      "Write problem statements before solutions.",
      "Measure what ships.",
    ],
  ),
  SaaS: mk(
    "work experience",
    60,
    "Work with or for a SaaS product",
    "Shows exposure to subscription software metrics.",
    "Worked on [function] for a [type] SaaS product used by [N] customers.",
    [
      "Look for a volunteer or contract project with a software startup.",
      "Learn their core metrics.",
      "Write up what you did.",
    ],
  ),
  "Google Analytics": mk(
    "project",
    8,
    "Instrument and analyse a small site",
    "Shows web analytics in use.",
    "Set up analytics on [site] and reported on [N] metrics; found [insight].",
    [
      "Use a personal or volunteer site.",
      "Define the events.",
      "Report one finding.",
    ],
  ),
  reporting: mk(
    "responsibility",
    8,
    "Own a recurring report",
    "Shows regular delivery of numbers people use.",
    "Produced [report] every [period] for [audience], used to [decision].",
    ["Offer to own a report.", "Agree definitions.", "Check who reads it."],
  ),
  forecasting: mk(
    "project",
    12,
    "Build a simple forecast and test it",
    "Shows you can forecast and check yourself.",
    "Built a [method] forecast for [metric]; error was [X] over [period].",
    ["Pick a series.", "Forecast and backtest.", "Report the error."],
  ),
  "financial modelling": mk(
    "project",
    20,
    "Build a three-statement style model for a public company",
    "Shows structured modelling.",
    "Built a model of [company] with [N] scenarios and [assumptions].",
    [
      "Use public filings.",
      "Build the model with clear assumptions.",
      "Explain the sensitivities.",
    ],
  ),
  budgeting: mk(
    "responsibility",
    10,
    "Take on a small budget",
    "Shows money responsibility.",
    "Managed a [£amount] budget for [purpose], finishing [under/on] plan.",
    ["Ask to own a small budget.", "Track monthly.", "Report variances."],
  ),
  "process improvement": mk(
    "responsibility",
    15,
    "Map and improve one process",
    "Shows operational improvement.",
    "Mapped and redesigned [process], cutting [measure] from [x] to [y].",
    [
      "Map the current steps.",
      "Remove or automate one.",
      "Measure before and after.",
    ],
  ),
  "customer success": mk(
    "work experience",
    40,
    "Support a portfolio of customers",
    "Shows retention-focused work.",
    "Managed [N] customer accounts, with [retention/renewal result].",
    [
      "Look for a customer-facing volunteer or part-time role.",
      "Track outcomes.",
      "Record renewals.",
    ],
  ),
  onboarding: mk(
    "responsibility",
    10,
    "Improve a customer or employee onboarding step",
    "Shows work on the first experience.",
    "Improved [onboarding step], raising [completion/activation] from [x] to [y].",
    ["Find the biggest drop-off.", "Change one thing.", "Measure."],
  ),
  CRM: mk(
    "project",
    8,
    "Set up a CRM pipeline for a small group",
    "Shows tool use.",
    "Set up a [CRM] pipeline with [N] stages for [group].",
    ["Use a free tier.", "Model a real pipeline.", "Report conversion."],
  ),
  SEO: mk(
    "project",
    12,
    "Optimise a small site and track it",
    "Shows measurable search work.",
    "Improved [site] SEO, raising [metric] from [x] to [y] in [time].",
    ["Pick a small site.", "Make changes.", "Track results."],
  ),
  Git: mk(
    "project",
    6,
    "Contribute to a repository with pull requests",
    "Shows collaborative version control.",
    "Contributed [N] merged pull requests to [project].",
    [
      "Find a small open source issue.",
      "Open a pull request.",
      "Respond to review.",
    ],
  ),
  "Node.js": mk(
    "project",
    15,
    "Build a small API",
    "Shows back-end basics.",
    "Built a Node.js API with [N] endpoints for [use].",
    ["Pick a small use case.", "Build and test.", "Deploy."],
  ),
  design: mk(
    "project",
    12,
    "Produce a design case study",
    "Shows design thinking.",
    "Designed [artefact] for [problem]; tested with [N] users.",
    ["Pick a problem.", "Design and test.", "Write up decisions."],
  ),
  negotiation: mk(
    "responsibility",
    10,
    "Lead a supplier or scope negotiation",
    "Shows negotiation in practice.",
    "Negotiated [contract/scope] with [party], achieving [outcome].",
    ["Ask to join a negotiation.", "Prepare targets.", "Record the result."],
  ),
  "vendor management": mk(
    "responsibility",
    10,
    "Own a supplier relationship",
    "Shows vendor management.",
    "Managed [N] vendors spending [£amount], achieving [outcome].",
    ["Ask to own one supplier.", "Track performance.", "Report."],
  ),
};

export function playFor(term: string): Play {
  const found = plays[term];
  if (found) return found;
  return mk(
    "project",
    12,
    `Create a practical ${term} case study`,
    `Gives you a real example of ${term} to point to.`,
    `Completed [deliverable] using ${term} to [goal]; [result].`,
    [
      `Use a public dataset or a small volunteer brief to practise ${term}.`,
      "Define the problem, build a small deliverable and record your decisions.",
      "Ask a practitioner for feedback and note what you changed.",
    ],
  );
}

/** Terms that make a gap easier to close when the user already has them. */
export const related: Record<string, string[]> = {
  dbt: ["SQL", "Python", "data warehouse"],
  "data warehouse": ["SQL"],
  "A/B testing": ["experimentation", "data analysis", "SQL"],
  experimentation: ["data analysis", "SQL", "stakeholder"],
  "statistical significance": ["data analysis", "Python"],
  Tableau: ["dashboards", "Excel", "SQL"],
  "Power BI": ["dashboards", "Excel"],
  Looker: ["dashboards", "SQL"],
  React: ["JavaScript", "HTML", "CSS"],
  TypeScript: ["JavaScript"],
  AWS: ["Python", "Git"],
  Figma: ["design"],
  prototyping: ["design", "Figma"],
  "user research": ["customer research"],
  roadmap: ["stakeholder", "project management"],
  "product management": ["stakeholder", "customer research", "roadmap"],
  leadership: ["project management"],
  Agile: ["project management"],
  forecasting: ["Excel", "data analysis"],
  "financial modelling": ["Excel", "forecasting"],
};
