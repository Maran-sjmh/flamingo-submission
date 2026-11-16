# Submission security review — November 15, 2026

This is a scoped code/configuration and non-destructive service review, not a penetration-test certification or guarantee against every denial-of-service attack.

## Findings and controls

| Area | Verified state / change |
| --- | --- |
| Paid generation | Live health reports generation_enabled=false and rag_generation_enabled=false. The recorded deployed Worker settings contain no OpenAI secret binding. Public request fields cannot change server environment flags. |
| Frontend secrets | Repository credential-pattern audit passes. The frontend uses a public API URL; provider credentials are not browser variables. |
| Firestore data integrity | Current released rules were read through the existing authorized Firebase session. They explicitly deny all client writes; no other write/create/update/delete allow statement was found. No database write was attempted. |
| Request handling | Bounded JSON bodies, query/result limits, validated scopes and exact-source resolution remain enforced. |
| API throttling | Existing per-IP and shared per-location rate limits remain. CORS allows exact known origins, but is not authentication and is not a defense against a non-browser client forging Origin. |
| Semantic quota | A SQLite Durable Object per UTC-day budget atomically reserves before each semantic request. Production requires the binding and allows at most 250 reservations/day across callers and locations. Failed AI attempts conservatively retain their reservation. |
| Graceful fallback | On exhausted/unavailable reservation, auto mode uses keyword retrieval and reports its actual semantic status. Explicit hybrid mode returns a 503 rather than pretending semantic retrieval worked. Static research pages and local row comparison need no semantic request. |
| Browser policy | Added a restrictive script/network CSP, frame-ancestors none, X-Frame-Options DENY, Permissions-Policy and HSTS. Required Google font styles/fonts and the known research API remain allowed. Inline styles are retained for the existing React layout; inline scripts and eval are not allowed. |
| API response policy | JSON responses now also deny framing and carry a restrictive CSP, HSTS and no-referrer policy. |
| Dependencies | The production frontend dependency advisory check reported zero advisories at review time; this is not a guarantee that no vulnerabilities exist. |

The strict 250/day cap counts semantic-request attempts, not tokens or currency. It protects embedding use, while OpenAI/Groq generation stays disabled independently. It does not create a plan upgrade, guaranteed free entitlement or a strict monetary limit across unrelated services.

## Validation

The original backend tests remain alongside new atomic SQLite reservation, UTC-day routing, exhausted/missing-budget, no-embedding fallback and security-header checks. The actual local workerd runtime also exercised the exported Durable Object through RPC with a limit of three: three accepted reservations followed by two denials. No model call was made by these tests.

Run `npm --prefix worker test` and `npm --prefix worker run test:budget-runtime`. The runtime test uses only local Miniflare/workerd and SQLite. Frontend render/data tests and the build remain separate from a real browser visual/mobile review.

## Remaining availability boundaries

An attacker could consume the bounded semantic allowance and cause a keyword fallback. The original public-read Firestore source could still face read-quota abuse outside this API; its writes remain denied, and the main browser row comparison uses bundled snapshots. Cloudflare platform limits, distributed traffic and hosting-account compromise are separate risks. This review does not promise that no one can degrade any service.

Browser interaction/WebGL review remains pending. When independently deploying to another API URL, update both the VITE_API_BASE_URL and the frontend CSP connect-src allowlist. Preserve strict generation flags, exact source identities and origin tests.

## AI-use disclosure

AI-assisted code and data organization are disclosed in AI_USE.md and public ai-assistance.json. The educational canvas/3D illustrations have visible labels. Team-owned slides/video are separate assets; generated slide images require the visible label specified by the submission form. Original NASA media retain their own source credits.
