# Public URL migration

The owner requested removal of the inherited Groq name from the public website address on November 15, 2026 (America/Lima).

- Website: https://flamingo.flamingo-research.workers.dev/
- API: https://houston-groq-proxy.flamingo-research.workers.dev/
- Account workers.dev subdomain: `flamingo-research`.
- Existing Worker identifiers, Vectorize index, scientific snapshots, Durable Object namespace and paid-generation gates are preserved.

Both Workers in this account belong to this project. The account-level subdomain was replaced using the official subdomain API. The public frontend remains Worker `flamingo`; the backend's internal historical identifier does not identify an active Groq integration.

The frontend API base URL, Open Graph URL, CSP connect-src, exact-origin CORS, verification scripts and copy-ready submission fields now use the new hostname. Existing security and source-preservation tests passed before deployment. HTTPS activation and live checks completed successfully. The published build matched 50 exact static files; API health and exact-origin CORS passed. A subsequent public-origin behavior check also passed hybrid retrieval, original-value comparison and paid-generation gates, using one embedding query and zero OpenAI requests. Browser visual interaction review remains separate.

Old links and QR codes must be replaced. The old account subdomain is no longer owned by this account; no redirect from it is promised. Reports and older release tags retain their original historical URLs and evidence. Current entry points are the README and the latest release.

For a fresh independent deployment, follow the deployment README and configure your own hostname. Changing a Worker name alone does not change its account-level workers.dev suffix. See [Cloudflare workers.dev configuration](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).
