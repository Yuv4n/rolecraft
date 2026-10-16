import { spawnSync } from "node:child_process";

const action = process.argv[2];
if (!["build", "deploy"].includes(action)) throw new Error("Expected build or deploy");
const args = action === "build"
  ? ["scripts/run-framework.mjs", "build"]
  : ["node_modules/wrangler/bin/wrangler.js", "deploy", "--config", "dist/server/wrangler.json"];
const result = spawnSync(process.execPath, args, {
  stdio: "inherit",
  env: { ...process.env, ROLECRAFT_DEPLOY_TARGET: "cloudflare" },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
