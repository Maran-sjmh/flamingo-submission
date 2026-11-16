# Validation, recorded evidence and limitations

## What has been checked

| Check | Evidence | What it establishes |
| --- | --- | --- |
| 25 source snapshot hashes; 2,009 distinct nonblank rows; 22 tables | Frontend integration tests and snapshot audit | Included data identities and preservation |
| Original PDF hashes, 75 pages, 47 records and 6 illustrated configurations | Document verification | Curated-document integrity and page-linked extraction behavior |
| 23 server-rendered routes | Integration verification | Routes can render and include expected structure/copy |
| Guide routing, scope, source quotes and explicit failures | Guide verification | Source-backed recommendation contract and error handling |
| Exact local row comparison, signs, ranges, approximations and CSV provenance | Visual integration verification | Original string preservation and local comparison behavior |
| Separate chart source tables/row labels; conservative numeric parsing | Visual integration verification | Ranges and qualifiers are not simplified into numeric results |
| English educational content, valid investigation links and conceptual labels | Visual integration verification | Content/link structure, not WebGL visual correctness or physics validation |
| 54 backend tests | Worker test suite | Input limits, providers disabled by default, mock retrieval/generation contracts, exact citations and values, CORS and source handling |
| 49 exact published static files, API health and exact-origin CORS | Dated working-release HTTP receipt | The public frontend served the tested build and existing service configuration at that time |
| Rebuilt evidence and fragments | Public snapshot audit and rebuild | Continuous source-text reconstruction and equality with the canonical corpus |

Source-recorded reports are in `reports/`; fresh offline outputs are generated in ignored `research/output/`. Reports have different dates and scopes. A preparation report with `embeddings_generated=false` describes preparation, not the later index-ingestion status. The recorded vector probe shows the processed index at 3,152 vectors at capture time.

## Small retrieval development probe

Seven manually selected questions tested calibration context, electric forcing, smoke particles, normal/inverse flames, Saffire materials/flow, droplet extinction and exact S1/S2 oxygen strings. An unknown-study case tested explicit empty handling.

| Method | Expected source found in top 3 | Mean reciprocal rank at 3 |
| --- | ---: | ---: |
| Keyword | 6 / 7 | 0.7857 |
| Hybrid using recorded real vector candidates | 7 / 7 | 1.0000 |

The keyword miss was the normal/inverse flame question (R4). Reproduce the ranking comparison with `node research/evaluate_retrieval.mjs`.

This is a small development diagnostic. It is not a held-out benchmark, a general retrieval-accuracy percentage, a user-impact study or validation of scientific conclusions. Recorded vector results are not a fresh provider run.

## Generation and scientific interpretation

The public guide retrieves sources with generation disabled. The separately labeled historical GPT evaluation and guarded provider adapters do not establish broad answer quality. One earlier classification case (H5) remained partial. No new paid evaluation is authorized by cloning or running this repository.

Checks on exact source quotations or numerical strings cannot establish that a source supports an interpretation, that two tests are comparable, or that a habitat is safe. Rankings describe relevance, not truth or hazard.

## Known limits and follow-up work

- Remote file contents totaling a declared 12.279 TB are not fully downloaded or indexed. The catalog contains pointers and summaries.
- The 364 publication entries are references; full texts are not all acquired.
- PSI-68's remote inventory is incomplete; available local rows remain accessible.
- The historical provenance review retains 43 unresolved aggregate warnings. Indexing does not repair source/context issues.
- Captured retrieval metadata and later catalog metadata have separate update lifecycles.
- Supplied row labels and matching units do not establish independently validated experiments or cross-study scientific equivalence.
- The English-oriented embedding model has not been broadly validated for multilingual scientific queries.
- Browser visual, interactive keyboard, mobile and WebGL review of this integrated release remain pending. Render/HTTP checks are not substitutes.
- Educational shapes, numerical game cutoffs and conceptual habitat conditions are illustrative, not calibrated predictions or operational procedures.

Useful next work is source-reviewed interpretation notes, broader retrieval evaluation, targeted document acquisition and task-based browser/user studies. These are future work, not shipped or measured results.
