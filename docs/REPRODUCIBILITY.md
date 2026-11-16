# Reproduce, inspect and deploy independently

## Requirements

- Node 24.x and pnpm 11.25.0, as recorded in the package files.
- npm for the isolated Worker package; keep its lockfile separate.
- Python 3.11+ with SQLite FTS5 for the offline research reconstruction. No Python packages are required.
- Cloudflare access only for an independent remote index/deployment. Offline checks require no model credentials.

## Application setup

```bash
pnpm install --frozen-lockfile
npm --prefix worker ci
pnpm dev
```

Open http://localhost:5173. The application uses the existing public research API by default. It is a limited shared demo service, not an unlimited API entitlement.

To run a local keyword-only backend, create an ignored `.env.local` with `VITE_API_BASE_URL=http://localhost:8787`, restart Vite, and run:

```bash
npm --prefix worker run dev
```

The Worker listens on port 8787. Use the frontend through `localhost`, whose browser origin is explicitly allowed. Local semantic bindings are absent by design. The `#rows` comparison reads bundled snapshots; the separate API comparison still uses the existing public Firestore source.

## Data and chunk reconstruction

```bash
python research/audit_snapshot.py
python research/build_store.py
python research/build_corpus.py
```

1. The audit checks all protected-source hashes, corpus and fragment identities, continuous original-text reconstruction, row snapshots and coverage counts.
2. The store builder creates `research/output/snapshot.sqlite` from included evidence, provenance, row strings and annotations. It checks SQLite integrity and foreign keys and builds an FTS5 text index.
3. The chunk builder reruns the original grouping/splitting algorithm against that reconstructed evidence. Workbook cells remain grouped by worksheet row, long text is split without dropping characters, and every part retains offsets. It requires the rebuilt corpus to equal the shipped canonical corpus exactly.

This reproduces the published evidence transformation, not the original remote-acquisition session or unseen raw media. The database is a local generated artifact and is excluded from Git. The store builder refuses to overwrite an existing database; use a fresh checkout for a clean repeat.

## Recorded retrieval experiment

```bash
node research/evaluate_retrieval.mjs
node research/vector_index.mjs plan
```

The evaluator uses the actual Worker ranking code and recorded real Vectorize candidate lists from seven development queries. It recomputes keyword results and rank fusion without making a new embedding request. The plan describes 3,152 vectors, 384 dimensions and index filters without reading credentials or making network calls.

`research/output/evaluation-live.json` is the historical evaluator's filename for a replay using recorded live candidates; inspect `semantic_transport` for `official_mcp_captured_real_queries`. This command does not perform a fresh live benchmark.

## Application checks

```bash
pnpm test
npm --prefix worker test
pnpm build
pnpm run check:repository
```

Backend tests use mocked providers and fixtures. They do not spend model credits. The repository audit scans tracked files and source-row hashes; run `git add` on intended changes before that audit when preparing a commit. CI runs the same checks and the offline research reconstruction on a fresh checkout.

The standard build advisory for the roughly 510 kB lazy 3D engine chunk remains visible. That engine is not preloaded on Home. No measured page-speed claim is made.

## Optional independent vector index

Remote ingestion can consume Workers AI and Vectorize quota or incur charges according to the operator's account. It is not run by tests, builds, CI or the offline plan. No plan or payment settings are changed by the tool.

Create an index in your own Cloudflare account using the project-local Wrangler:

```bash
node worker/node_modules/wrangler/bin/wrangler.js vectorize create flamingo-research-bge-small-v1 --dimensions 384 --metric cosine
node worker/node_modules/wrangler/bin/wrangler.js vectorize create-metadata-index flamingo-research-bge-small-v1 --property-name accession --type string
node worker/node_modules/wrangler/bin/wrangler.js vectorize create-metadata-index flamingo-research-bge-small-v1 --property-name kind --type string
node worker/node_modules/wrangler/bin/wrangler.js vectorize create-metadata-index flamingo-research-bge-small-v1 --property-name row_type --type string
```

Metadata indexes must exist before ingestion. Configure `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in the local environment, with permissions for the chosen AI and Vectorize operations. `CLOUDFLARE_VECTOR_INDEX` optionally overrides the independent index name. Never put secrets in frontend `VITE_` variables or Git.

```bash
node research/vector_index.mjs status
node research/vector_index.mjs ingest --confirm-remote-write
node research/vector_index.mjs status
```

Ingestion reuses cached embeddings and checkpoints accepted batches. There are at most 197 embedding batches on a fresh run with batch size 16. Upsert acceptance is asynchronous, so verify index processing and a real scoped source query before enabling semantic mode. No automatic retries or paid generation fallback are performed.

Only after validating the independent index, set `ENABLE_SEMANTIC_SEARCH=true` in your Worker config, retain the exact `RETRIEVAL_CORPUS_VERSION`, and bind the matching model/index. Official references: [Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/vectorize/), [Vectorize API](https://developers.cloudflare.com/vectorize/reference/client-api/).

## Optional independent deployment

The root config targets `flamingo-submission-demo`; the API config targets `flamingo-submission-api`. Account IDs were removed and semantic search defaults off. These are fork deployment defaults, not the settings of the existing live service.

For an independent public app:

1. Choose your own Worker names, account and index. Configure the API's exact frontend origin in `worker/src/worker.mjs` and add a matching CORS test; do not introduce a wildcard.
2. Set `VITE_API_BASE_URL` to your API URL before building the frontend. Preserve all public generation flags as false unless you independently authorize, configure and evaluate a generation feature.
3. Build and dry-run the API with its own config, then deploy it using your own credentials. Local development and API deployment are separate.
4. Run `pnpm build` and `pnpm run deploy:check`, then `pnpm run deploy` for the independent frontend.
5. Verify health, CORS, data hashes, one scoped retrieval case and exact comparison behavior. Do browser keyboard/mobile/WebGL review separately.

The included live verification scripts target the team's canonical public demo and compare its files with the local build. They are opt-in diagnostics, not generic fork-deployment tools or automatic CI steps. Do not run a live embedding evaluation on every push.
