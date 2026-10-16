// URL fetching is disabled in the public demo until production egress
// controls and rate limiting are implemented. Reject direct API calls too.
export async function POST() {
  return Response.json(
    { error: "Paste the job description into the app. URL fetching is disabled in this demo." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
