# Research API contract

This documents the delivered Worker source, not an entitlement to unlimited use of the existing shared demo service. Public paid generation is disabled. Inspect `worker/src/worker.mjs`, `retrieval.mjs`, `rag.mjs` and the tests for the executable contract.

| Route | Method | Purpose |
| --- | --- | --- |
| `/health` | GET | Actual generation/semantic configuration, corpus version and study/fragment counts |
| `/v1/search` | POST | Keyword or hybrid evidence discovery |
| `/v1/rag` | POST | Evidence retrieval with optional separately gated passage selection |
| `/v1/compare` | POST | Reload and compare two to six selected original Firestore source rows |
| `/v1/answer` | POST | Historical constrained source-cell generation path; disabled unless explicitly configured |
| `/demo` | GET | Technical workbench |
| `/demo-evaluation.json` | GET | Clearly labeled recorded private evaluation, not a new live answer |

## Evidence discovery

Example JSON body for `/v1/rag`:

```json
{"query":"BASS-II fan calibration airflow","accession":"PSI-25","mode":"auto","limit":6,"generate":false}
```

`/v1/search` takes the same search fields without `generate`. Only the question is required. Optional fields are accession, kind, row_type, mode and limit. Query text is bounded to 400 UTF-8 bytes; result limits are 1–10. Kinds are investigation_metadata, document_paragraph, workbook_cached_cell and source_table_row. Supplied row labels are test, campaign, condition_summary and unknown.

Results report the actual mode, semantic status, corpus version, coverage and original source excerpts with identifiers/locators. A relevance score is not scientific confidence. `auto` can explicitly fall back to keyword search; required `hybrid` returns an error if semantic retrieval is unavailable.

## Exact source-cell comparison

Example body for `/v1/compare`:

```json
{"test_uids":["PSI-98|PSI-98_Experimental table_SAFFIRE-1.csv|1","PSI-98|PSI-98_Experimental table_SAFFIRE-1.csv|2"]}
```

The Worker reloads canonical cells rather than accepting client-authored source values. The response preserves ranges, approximations, missing values and source provenance, returns `generation_performed=false`, and marks scientific comparability as `not_established`.

The application's main `#rows` view performs a different local comparison using bundled snapshots. It needs no research API request; this endpoint remains available in the NASA evidence workbench.

## Generation gates

Provider keys alone do not enable generation. OpenAI/Groq activation and required approval/configuration flags must also pass. The public guide requests generate=false. The RAG passage-selection path verifies original contiguous quotations and IDs; the source-cell path validates exact original values. Neither check is a scientific review of interpretation.

Disabled, rejected or unavailable generation returns an explicit evidence-only/unavailable state; it never silently substitutes another paid provider or retries a quota error. Source texts and questions are untrusted data, not instructions.

## Transport and limits

API POST routes require JSON, a bounded body (4,096 bytes), an allowed exact Origin and configured limiters/client identity. The shipped policy admits the team's known public origins and HTTP localhost with an optional port. For an independent frontend, add its exact origin and a matching test. CORS is not authentication; non-browser clients can forge Origin.

The source uses approximate per-location rate limits of three requests/minute/IP and twenty requests/minute for the shared key. They are not a strict worldwide budget. HTTP 429 includes Retry-After; do not auto-retry. Bad input returns 400/413/415, disallowed origins 403 and unavailable provider/service configuration explicit status/errors. Preserve original source text safely as text, not injected HTML.
