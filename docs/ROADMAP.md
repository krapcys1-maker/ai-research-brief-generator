# Roadmap

Last updated: 2026-05-28

## P0: Production Readiness

- Add authentication or session-scoped/private brief history.
- Keep production PostgreSQL fail-fast behavior enabled.
- Keep production shared rate limiting enabled through Upstash Redis REST or equivalent KV.
- Add deployment smoke checks for:
  - `POST /api/briefs/preflight`
  - `POST /api/briefs`
  - `POST /api/briefs/[id]/questions`
  - `GET /api/export/[id]?format=markdown`
- Add a clear production privacy note before enabling public deployments.

## P1: Research Quality

- Add richer source coverage assessment:
  - abstract coverage
  - DOI/identifier coverage
  - source diversity
  - query-title alignment
  - live-source reliability
- Add hybrid retrieval:
  - lexical score
  - embedding similarity
  - metadata quality
  - source diversity
  - citation/recency balance
- Add embeddings provider abstraction separate from the chat provider.
- Improve paper-level "why read this paper" explanations in preflight and bibliography.
- Add adapter contract tests for arXiv, Semantic Scholar, and OpenAlex response drift.

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
