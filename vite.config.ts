import vinext from "vinext";
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";

// Wrangler would otherwise phone home and write logs outside the project.
process.env.WRANGLER_SEND_METRICS ??= "false";
process.env.WRANGLER_WRITE_LOGS ??= "false";
process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
process.env.WRANGLER_REGISTRY_PATH ??= ".wrangler/dev-registry";
process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      inspectorPort: false,
      config: {
        name: "rolecraft",
        main: "./worker.ts",
        compatibility_date: "2026-05-15",
        compatibility_flags: ["nodejs_compat"],
        workers_dev: true,
        // No logging products: nothing here should ever generate a usage charge.
        observability: { enabled: false },
      },
    }),
  ],
});
