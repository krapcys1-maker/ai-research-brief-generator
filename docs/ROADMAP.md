# Roadmap

Last updated: 2026-05-28

## P0: Production Readiness

- Replace the in-process generation job runner with a durable queue/worker for multi-instance production.
- Add authentication or session-scoped/private brief history.
- Keep production PostgreSQL fail-fast behavior enabled.
- Keep production shared rate limiting enabled through Upstash Redis REST or equivalent KV.
- Add a clear production privacy note before enabling public deployments.

## P1: Research Quality

- Replace the local embedding provider with a production embedding provider.
- Expand hybrid retrieval beyond the current lexical + local semantic signal:
  - model-grade embedding similarity
  - source diversity
  - citation/recency balance tuning
- Expand retrieval benchmarks with more gold queries and expected source IDs.
- Add more claim/evidence benchmark fixtures for methodological claims, such as sample size, study design, and evaluation setting.

## P2: Product UX

- Add user accounts and private saved topics.
- Add saved brief collections.
- Add comparison mode for prompts such as "RAG vs fine-tuning in medicine".
- Add paper timeline and topic clustering.

## P3: Deeper Research Features

- Add PDF/full-text ingestion with a clear evidence boundary between abstract-only and full-text-backed claims.
- Add citation graph / related work graph.
- Add weekly research digest after accounts and saved topics exist.
- Add knowledge graph only after source quality and full-text strategy are stable.

## Deferred / Optional

- shadcn/ui adoption is optional. Current custom CSS is acceptable until reusable component complexity increases.
- Additional AI providers can be added behind the existing provider abstraction.
- OpenAI, Anthropic, or custom providers should not be hardcoded through the app.
