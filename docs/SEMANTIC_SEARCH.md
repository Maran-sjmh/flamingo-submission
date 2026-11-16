# Semantic search, the vector database and RAG

## Why a vector database helps

A researcher may ask about smoke detection while a source describes aerosol size distributions. Exact-word matching may miss the connection. A text embedding represents language as a numerical vector; related passages can be retrieved even when their wording differs. It complements exact keyword search rather than replacing source review.

The integration uses Cloudflare Vectorize, which indexes vectors and supports similarity search. The vector database is a discovery index, not a replacement for structured scientific data, source documents or the canonical evidence store.

## What is embedded

The versioned corpus contains 3,152 fragments derived from 6,177 evidence items across 25 investigations:

| Fragment type | Count |
| --- | ---: |
| Source-table row fragments | 2,576 |
| Investigation metadata | 270 |
| Grouped workbook-cell fragments | 173 |
| Extracted document paragraphs | 133 |

One row can span several fragments; one workbook fragment can contain several evidence cells. These counts are not independent experiments. Remote video contents and unextracted papers are outside the index.

Each fragment contains accession, source ID and filename, file hash, original evidence IDs, locators, character offsets and original strings. Row-linked fragments also keep the source-row identity and supplied annotations.

## Model and index configuration

| Setting | Value |
| --- | --- |
| Pretrained model | `@cf/baai/bge-small-en-v1.5` |
| Dimensions | 384 |
| Similarity metric | Cosine |
| Pooling | Explicit `cls` for source and query embeddings |
| Fragment input budget | 480 UTF-8 bytes including context prefix |
| Query prefix | `Represent this sentence for searching relevant passages: ` |
| Candidate count | Up to 50 keyword and 50 vector candidates before fusion |
| Returned results | 1–10, default 6 |
| Version boundary | Namespace derived from the canonical corpus hash |

The model is pretrained and English-oriented. The project does not claim multilingual retrieval validation or a newly trained combustion model. Changing the model, pooling or preprocessing requires a compatible rebuilt index; source and query vectors must use the same representation.

Official references: [embedding model](https://developers.cloudflare.com/workers-ai/models/bge-small-en-v1.5/), [Vectorize](https://developers.cloudflare.com/vectorize/), [metadata filtering](https://developers.cloudflare.com/vectorize/reference/metadata-filtering/).

## How hybrid retrieval works

1. Validate the bounded query and optional investigation, source-type and row-label filters.
2. Rank keyword candidates using BM25-style term scoring over the canonical corpus.
3. Embed the question and query the current Vectorize namespace with matching filters.
4. Resolve every candidate against the current canonical corpus. Reject unknown IDs and recheck scope.
5. Combine ranked lists with reciprocal rank fusion: each appearance contributes `1 / (60 + rank + 1)`.
6. Collapse duplicate results belonging to the same row and return original cited excerpts.

Keyword search helps with exact accession IDs, names and numeric terms. Vector search helps with conceptual relationships. Fusion avoids treating incompatible raw lexical and vector scores as if they were the same unit.

Relevance ranking is not a confidence probability, safety score or proof that an experiment applies to another habitat.

## Availability and fallback

- `lexical`: keyword retrieval only; no embedding call.
- `hybrid`: both channels are required; returns an explicit error if semantic retrieval is unavailable.
- `auto`: attempts hybrid when configured; otherwise reports lexical mode and its semantic status.

The implementation never labels lexical fallback as a successful vector query. The local Worker intentionally uses lexical mode; the existing live service has semantic bindings enabled. API availability and quotas can change independently of the source snapshot.

## Retrieval, RAG and generation

RAG means retrieving relevant evidence to ground a later response. flamingo implements the retrieval foundation and a gated evidence-selection path; the public experience uses evidence-only retrieval, deterministic explanation framing and source-backed navigation.

The guide sends `generate=false`. It does not ask GPT to invent summaries, measurements or destination URLs. The backend's optional generated passage selections must match original contiguous source text and valid evidence IDs. Public generation flags remain disabled.

A separate historical private evaluation is retained as a recorded replay. It does not establish that paid GPT is active on the public site or that generated scientific answers passed a broad evaluation.

## Reproduce without model calls

`node research/evaluate_retrieval.mjs` recomputes keyword ranking and fuses stored real vector-query candidates from seven recorded development probes. It performs no network requests. The recorded comparison found an expected source in the top three for 6/7 keyword cases and 7/7 hybrid cases. This is a small, hand-selected diagnostic, not general search accuracy.

`node research/vector_index.mjs plan` describes index requirements without reading credentials or writing remotely. Independent ingestion is opt-in and uses environment credentials; see [reproducibility](REPRODUCIBILITY.md).
