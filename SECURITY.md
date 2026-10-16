# Security and privacy

CV parsing, matching and downloads run in the browser. CV text is not sent to an
AI provider or stored on the server. Device drafts are opt-in and can be removed
from the interface. Avoid saving drafts on shared devices.

The public job-fetch API is disabled. Restore it only with production egress
controls and rate limiting. Uploaded documents are untrusted data. DOCX extraction
limits selected expanded XML parts to 2 MB, rejects DTD/entity declarations and
caps extracted text at 30,000 characters. PDF uploads are limited to 20 pages.

Never commit credentials or CV samples containing real personal information.
Enter deployment tokens directly into GitHub's encrypted repository secrets.
Use a token scoped to the deployment account. The optional deployment workflow
publishes only main-branch commits after verification succeeds.

## Dependency audit

The production dependency audit passed with zero reported vulnerabilities after
patching Next.js and replacing Mammoth with bounded ZIP/XML extraction. React
server-rendering packages and Cloudflare tools were also updated. CI checks the
production dependency audit at the high-severity threshold.

The full audit still reports development dependency chains through braces
(glob tooling used by Next lint and Vinext) and an older esbuild used by
Drizzle Kit. Current automated suggestions include breaking downgrades. These
were not applied. Keep local development servers bound to loopback and do not
run builds against untrusted repositories. Recheck with `npm audit` as upstream
patches become available. An audit result is a dependency check, not a proof of
application security.

If you find a vulnerability, contact the repository owner privately. Do not post
credentials, CV contents or an exploit against the live service in a public issue.
