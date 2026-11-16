# Project history and delivery provenance

flamingo grew from a NASA combustion-data exploration effort into a public research interface with hybrid discovery and an educational entry point. It combines contributions from the data/backend work and the visual interface team.

## Engineering progression

1. Explore NASA PSI catalog scope and small source data while retaining pointers to large remote archives.
2. Organize source tables, extracted text, workbook cells and provenance in a structured evidence layer.
3. Build a versioned 3,152-fragment corpus and deploy pretrained embeddings with Cloudflare Vectorize.
4. Combine keyword and vector ranking, with source identities and exact excerpts checked against the canonical corpus.
5. Connect guided discovery, investigation pages, original row comparison, reading-room evidence and source links to the web interface.
6. Adopt the flamingo brand and publish the independent Cloudflare frontend.
7. Integrate the visual team's animated research scenes, unified Explore feed, comparison presentation, typography and educational 3D activities.
8. Preserve source data, adapt authored learning content to English and constrain charts and educational claims to their actual scope.
9. Package a reproducible public repository with audits, SQLite reconstruction, exact corpus regeneration, recorded retrieval replay and independent deployment defaults.

## Source references

The initial public delivery was based on [working commit d5979cb](https://github.com/Maran-sjmh/flamingo/commit/d5979cb301a7507f8bb1370616c0f402e206bd4f). The deployed frontend version at delivery is `1d0fd8e5-9a60-43e2-9540-a3844e577939`.

The visual team supplied flamingo-aprende.zip with a CAMBIOS.md summary identifying branch visual/aprende-escolares, final commit ce5802f, and its contribution sequence. Archive SHA-256: `8930bd9bc83a3352a9c26e7b7ad14060fa2e438d9af30d9a6f74cfd29782aab3`. The earlier 3D contribution was already accepted in [working PR #1](https://github.com/Maran-sjmh/flamingo/pull/1); the remaining delivery was integrated in the working snapshot.

This repository starts with a clean public-delivery history rather than copying working-account credentials, private coordination records or development runtime artifacts. The original history remains available in the linked working repository. `SUBMISSION_MANIFEST.json` records the source commit and hashes of protected application/data files.

## Final submission update

Version 1.1.0 records working commit aa519d6ab9f768596f26363df8d222c2c94cb3ac, frontend 92205b44-1532-434b-b573-30e4e19a3d77 and backend 4a497b58-8b10-49b6-af75-065dd5202d80. It adds coordinated semantic quotas, security headers, deployment verification and AI-assistance disclosure. The earlier v1.0.0 remains a separate immutable delivery tag.

## Public hostname migration

Version 1.1.1 records working commit a4052b708f28e9d7f5126a4a491e78e47e42789f, frontend 1094fcda-3fb2-4b77-a592-36223d639adf and backend efddb397-ae30-4dc6-90d7-8d2a47c8253b. It updates the public website, API connection, CORS, CSP and submission links to the flamingo-research account subdomain. Scientific content, the vector index and coordinated semantic quota are unchanged. Historical security reports retain their recorded capture context.
