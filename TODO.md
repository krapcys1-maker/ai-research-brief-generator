# TODO

Active work only. Historical milestones are summarized in `docs/CHANGELOG.md`; implemented behavior is described in `docs/CURRENT_STATE.md`.

## Next

- [x] Create a living roadmap/checklist for full public SaaS readiness.
- [x] Add a production embedding provider configuration check.
- [x] Add first private `Ask My Documents` slice for PDF/TXT/MD uploads.
- [x] Add session-scoped document/chunk storage and upload/delete/list APIs.
- [x] Add uploaded-document Q&A with structured answers and evidence snippets.
- [x] Add selected-paper full-text ingestion for legal arXiv/source PDF URLs.
- [x] Add full-text chunk storage and evidence boundary labels for Ask This Brief.
- [x] Add Compare With Science claim extraction and selected-claim comparison.
- [x] Add claim-evidence matrix with non-binary classifications and evidence snippets.
- [x] Sync README/STATUS/deployment docs with Ask My Documents, full-text ingestion, and Compare With Science.
- [x] Add session-upload privacy gate, no-store private document headers, and retention/deletion UI copy.
- [x] Add Compare With Science benchmark fixtures for supported/contradicted/overclaimed/prior-work cases.
- [ ] Configure a real production embedding provider in deployment and compare benchmark reports.
- [ ] Add more gold retrieval queries from live OpenAlex/arXiv examples.
- [ ] Expand source-quality fixtures with more recorded live-source failures.
- [x] Add metadata-quality checks for suspicious live-source records.

## Production Readiness

- [x] Add authentication or session-scoped/private brief history.
- [x] Add trusted-header user/workspace ownership for uploaded documents before public multi-user deployment.
- [x] Decide and document the official identity model for full public SaaS.
- [x] Add app-native `User`, `Workspace`, `WorkspaceMember`, role enum, and Prisma migration.
- [ ] Add app-native login/session runtime, account UI, role enforcement, and audit trail.
- [ ] Add user/workspace ownership to briefs, brief generation jobs, exports, brief Q&A, and saved compare reports.
- [x] Protect brief generation job polling by owner/session access.
- [x] Add retention/deletion policy copy for uploaded documents.
- [x] Add a clear production privacy note before public deployment.

## Research Quality

- [x] Expand retrieval benchmark fixtures with more gold queries and expected source IDs.
- [x] Add embeddings provider abstraction.
- [x] Add hybrid retrieval with lexical and semantic scoring.
- [x] Add optional OpenAI-compatible embeddings provider.
- [x] Add repeatable retrieval benchmark command.
- [x] Persist local retrieval benchmark JSON/Markdown reports for provider comparisons.
- [x] Add transformer-specific query expansion for Polish typo recovery.
- [x] Normalize escaped whitespace in paper title dedupe.
- [x] Add live-source source-quality benchmarks for broad/foundational queries.
- [x] Add exact-title ranking boost for foundational source selection.
- [x] Surface suspicious metadata warnings in preflight, brief source cards, and Markdown export.
- [ ] Tune hybrid retrieval with model-grade embeddings and larger benchmarks.
- [ ] Expand paper full-text ingestion tests with recorded PDF fixtures and parser-quality cases.
- [x] Expand uploaded-document retrieval tests with longer documents and multi-document questions.
- [ ] Expand Compare With Science benchmarks with recorded live-source and full-text evidence cases.
- [ ] Improve PDF/full-text ingestion with background jobs, page-range support, and better parser diagnostics.

## Product UX

- [x] Move long generation to a job flow with polling.
- [x] Add a controlled timeout for long-running in-process generation jobs.
- [x] Add PostgreSQL-backed job status and a separate brief worker entrypoint.
- [x] Add stale job recovery and attempt limits for the DB-backed brief worker.
- [ ] Replace the simple DB-backed worker with a stronger external queue/worker when production throughput requires it.
- [ ] Add user accounts.
- [ ] Add private saved topics.
- [x] Add comparison mode.
- [ ] Add saved Compare With Science reports and background job polling.
- [ ] Add paper timeline.
- [ ] Add topic clustering.

## Later

- [ ] Add weekly research digest after accounts and saved topics exist.
- [ ] Add citation graph / related work graph.
- [ ] Add knowledge graph after source quality and full-text strategy are stable.
- [ ] Decide whether shadcn/ui should remain optional or be adopted.
