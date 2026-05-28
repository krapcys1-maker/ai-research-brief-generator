# Roadmap

Last updated: 2026-05-28

## P0: Production Readiness

- Add authentication or session-scoped/private brief history.
- Keep production PostgreSQL fail-fast behavior enabled.
- Keep production shared rate limiting enabled through Upstash Redis REST or equivalent KV.
- Add a clear production privacy note before enabling public deployments.

## P1: Research Quality

- Add hybrid retrieval:
  - lexical score
  - embedding similarity
  - metadata quality
  - source diversity
  - citation/recency balance
- Add embeddings provider abstraction separate from the chat provider.
- Expand retrieval benchmarks with more gold queries and expected source IDs.
- Add claim/evidence evaluation benchmarks for comparative claim support.

## P2: Product UX

- Move long generation to a job flow:
  - `POST /api/briefs/jobs`
  - `GET /api/briefs/jobs/[id]`
  - `GET /api/briefs/[id]`
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
