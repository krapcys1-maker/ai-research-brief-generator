# Current State

Last updated: 2026-05-28

## Product Shape

AI Research Brief Generator is a working Next.js App Router prototype for source-grounded research briefs.

It is not a generic chatbot. The primary flow is:

```text
user query -> source adapters -> normalized papers -> dedupe/ranking -> quality gate -> structured AI synthesis -> grounding validation -> brief UI/export
```

## Implemented Capabilities

- Home page research form with query, source selection, year range, source preflight, and generation progress.
- Academic sources:
  - mock data
  - arXiv
  - Semantic Scholar
  - OpenAlex
- Source search orchestration with query expansion, timeout handling, retry behavior, partial failure warnings, and source diagnostics.
- Paper normalization, DOI/arXiv/Semantic Scholar/OpenAlex ID dedupe, scoring, source quality signals, and top-paper selection.
- Research Quality Gate that blocks weak source coverage before calling the AI provider.
- Provider-agnostic AI wrapper with DeepSeek as the implemented default:
  - `AI_PROVIDER=deepseek`
  - `AI_MODEL=deepseek-v4-pro`
  - `DEEPSEEK_API_KEY`
- Structured JSON synthesis validated with Zod.
- Claim-level grounding with `sourcePaperIds` and evidence snippets for executive summaries, findings, themes, gaps, and uncertainties.
- Grounded `Ask This Brief` Q&A over selected papers for a single generated brief.
- Brief result UI with bottom line, confidence, reading path, priority takeaways, evidence snippets, source drawer, bibliography, and collapsed technical diagnostics.
- Markdown export through `GET /api/export/[id]?format=markdown`.
- Optional PostgreSQL/Prisma persistence behind the `BriefRepository` contract.
- Source API cache and source diagnostics persistence when PostgreSQL is enabled.
- Public brief history disabled by default in production.
- Production fail-fast behavior for missing persistence and missing shared rate limiting unless explicit demo escape hatches are set.
- Upstash Redis REST rate limiting for production deployments.
- Vitest coverage for core pipeline, schemas, routes, storage, source diagnostics, grounding, Q&A, rate limiting, and export.

## Storage Modes

Development can run with in-memory storage.

PostgreSQL is available through Prisma when `DATABASE_URL` points to PostgreSQL. With PostgreSQL enabled, the app persists:

- generated briefs
- selected papers
- brief-paper score joins
- source API cache records
- source diagnostics

Production requires a valid PostgreSQL `DATABASE_URL` by default. Temporary non-durable demos can explicitly set:

```bash
ALLOW_MEMORY_STORAGE_IN_PRODUCTION=true
```

## Rate Limiting

Development and tests use in-memory rate limiting.

Production should use shared Upstash Redis REST rate limiting:

```bash
RATE_LIMIT_BACKEND=upstash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Temporary single-instance demos can explicitly set:

```bash
ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION=true
```

## Known Limits

- The app grounds on selected paper metadata and abstracts, not parsed full-text PDFs.
- Scoring is still heuristic and keyword/metadata based; embeddings are not implemented.
- Source preflight is improved but still needs richer coverage dimensions such as abstract coverage, identifier coverage, source diversity, and query-title alignment.
- Generation is still synchronous; long-running production generation should move to a job flow.
- Authentication and private user-scoped history are not implemented.
- shadcn/ui is not implemented; current UI uses custom CSS.

## Verification Commands

```bash
npm test
npm run lint
npm run build
```

Optional PostgreSQL integration test:

```bash
npm test -- tests/prismaBriefRepository.integration.test.ts
```

The PostgreSQL integration test is skipped unless `DATABASE_URL` points to PostgreSQL.
