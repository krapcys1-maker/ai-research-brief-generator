# TODO

Active work only. Historical milestones are summarized in `docs/CHANGELOG.md`; implemented behavior is described in `docs/CURRENT_STATE.md`.

## Next

- [x] Add a production embedding provider configuration check.
- [ ] Configure a real production embedding provider in deployment and compare benchmark reports.
- [ ] Add more gold retrieval queries from live OpenAlex/arXiv examples.
- [ ] Expand source-quality fixtures with more recorded live-source failures.
- [x] Add metadata-quality checks for suspicious live-source records.

## Production Readiness

- [ ] Add authentication or session-scoped/private brief history.
- [ ] Add a clear production privacy note before public deployment.

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
- [ ] Add PDF/full-text ingestion with explicit full-text evidence boundaries.

## Product UX

- [x] Move long generation to a job flow with polling.
- [x] Add a controlled timeout for long-running in-process generation jobs.
- [ ] Replace in-process job runner with a durable production queue/worker.
- [ ] Add user accounts.
- [ ] Add private saved topics.
- [ ] Add comparison mode.
- [ ] Add paper timeline.
- [ ] Add topic clustering.

## Later

- [ ] Add weekly research digest after accounts and saved topics exist.
- [ ] Add citation graph / related work graph.
- [ ] Add knowledge graph after source quality and full-text strategy are stable.
- [ ] Decide whether shadcn/ui should remain optional or be adopted.
