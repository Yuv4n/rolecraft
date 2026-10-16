import { performance } from "node:perf_hooks";
import {
  sampleCV,
  sampleJob,
  parseJob,
  analyse,
  rate,
  recommendProjects,
} from "../lib/engine.ts";
const cv = sampleCV.repeat(30).slice(0, 30000);
const job = sampleJob.repeat(35).slice(0, 20000);
const start = performance.now();
const model = parseJob(job),
  analysis = analyse(cv, model);
rate(cv, model, analysis);
recommendProjects(cv, model, analysis);
console.log(
  JSON.stringify({
    cvCharacters: cv.length,
    jobCharacters: job.length,
    requirements: model.requirements.length,
    elapsedMs: Math.round(performance.now() - start),
  }),
);
