# Roadmap

Last updated: 2026-05-29

## P0: Production Readiness

- Replace the in-process generation job runner with a durable queue/worker for multi-instance production.
- Add authentication and user-scoped private storage before public multi-user document upload.
- Add session-scoped/private brief history.
- Keep production PostgreSQL fail-fast behavior enabled.
- Keep production shared rate limiting enabled through Upstash Redis REST or equivalent KV.
- Add a clear production privacy note before enabling public deployments, especially for uploaded documents.

## P1: Research Quality

- Configure and evaluate a production embedding provider in deployment.
- Expand hybrid retrieval beyond the current lexical + local semantic signal:
  - model-grade embedding similarity
  - source diversity
  - citation/recency balance tuning
- Expand retrieval benchmarks with more gold queries from real live-source results.
- Expand metadata-quality rules with more recorded live-source anomalies and canonical paper fixtures.
- Add more claim/evidence benchmark fixtures for methodological claims, such as sample size, study design, and evaluation setting.
- Expand paper full-text ingestion tests with recorded arXiv/OA PDF fixtures and parser-quality edge cases.
- Expand uploaded-document retrieval tests with longer PDFs, noisy extraction, and multi-document questions.
- Expand Compare With Science benchmarks with more live/recorded cases beyond the current deterministic supported, partially supported, contradicted, overclaimed, already-known, insufficient-evidence, non-scientific, and possible-dead-end fixtures.

## P2: Product UX

- Add user accounts and private saved topics.
- Improve `Ask My Documents` with document collections, retention controls, and clearer deletion/audit UI.
- Improve Compare With Science with saved reports, better claim review ergonomics, and clearer source filters.
- Add saved brief collections.
- Add comparison mode for prompts such as "RAG vs fine-tuning in medicine".
- Add paper timeline and topic clustering.

## P3: Deeper Research Features

- Improve PDF/full-text ingestion with better parser diagnostics, optional page ranges, and controlled background jobs.
- Improve Compare With Science with background jobs, report persistence, and deeper claim-level evidence ranking.
- Add citation graph / related work graph.
- Add weekly research digest after accounts and saved topics exist.
- Add knowledge graph only after source quality and full-text strategy are stable.

## Deferred / Optional

- shadcn/ui adoption is optional. Current custom CSS is acceptable until reusable component complexity increases.
- Additional AI providers can be added behind the existing provider abstraction.
- OpenAI, Anthropic, or custom providers should not be hardcoded through the app.
