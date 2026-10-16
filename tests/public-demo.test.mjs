import assert from "node:assert/strict";
import { POST } from "../app/api/job/route.ts";

const previousFetch = globalThis.fetch;
let requests = 0;
globalThis.fetch = async () => { requests++; throw new Error("Outbound request prohibited"); };
try {
  for (const url of ["https://example.com/job", "http://127.0.0.1", "https://169.254.169.254"]) {
    const response = await POST(new Request("https://rolecraft.example/api/job", {
      method: "POST", body: JSON.stringify({ url }),
    }));
    assert.equal(response.status, 410);
    assert.match((await response.json()).error, /Paste the job description/);
  }
  assert.equal(requests, 0);
  console.log("PASS: public demo rejects URL fetching without outbound requests");
} finally { globalThis.fetch = previousFetch; }
