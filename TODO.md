# TODO

Active work only. Historical milestones are summarized in `docs/CHANGELOG.md`; implemented behavior is described in `docs/CURRENT_STATE.md`.

## Next

- [ ] Replace local embeddings with a production embedding provider.
- [ ] Add more gold retrieval queries from live OpenAlex/arXiv examples.

## Production Readiness

- [ ] Add authentication or session-scoped/private brief history.
- [ ] Add a clear production privacy note before public deployment.

## Research Quality

- [x] Expand retrieval benchmark fixtures with more gold queries and expected source IDs.
- [x] Add embeddings provider abstraction.
- [x] Add hybrid retrieval with lexical and semantic scoring.
- [ ] Tune hybrid retrieval with model-grade embeddings and larger benchmarks.
- [ ] Add PDF/full-text ingestion with explicit full-text evidence boundaries.

## Product UX

- [x] Move long generation to a job flow with polling.
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
