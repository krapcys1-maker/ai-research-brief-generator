# Current State

Last updated: 2026-05-29

## Product Shape

AI Research Brief Generator is a working Next.js App Router prototype for source-grounded research briefs.

It is not a generic chatbot. The primary flow is:

```text
user query -> generation job -> source adapters -> normalized papers -> dedupe/ranking -> quality gate -> structured AI synthesis -> grounding validation -> brief UI/export
```

## Implemented Capabilities

- Home page research form with query, source selection, year range, source preflight, and generation progress.
- Async generation job flow:
  - `POST /api/briefs` queues a generation job and returns `202` with `jobId`.
  - `GET /api/briefs/jobs/[id]` returns queued/running/completed/failure status.
  - The UI polls job status and redirects to `/briefs/[id]` when completed.
- Academic sources:
  - mock data
  - arXiv
  - Semantic Scholar
  - OpenAlex
- Source search orchestration with query expansion, timeout handling, retry behavior, partial failure warnings, and source diagnostics.
- Paper normalization, DOI/arXiv/Semantic Scholar/OpenAlex ID dedupe, hybrid lexical/semantic scoring, source quality signals, and top-paper selection.
- Embeddings provider abstraction with:
  - local hash-ngram embeddings by default,
  - optional OpenAI-compatible embeddings through `EMBEDDING_PROVIDER=openai_compatible`.
- Deterministic paper-level reading guidance, source-quality summaries, and query-title/abstract alignment signals.
- Research Quality Gate that blocks weak source coverage before calling the AI provider.
- Provider-agnostic AI wrapper with DeepSeek as the implemented default:
  - `AI_PROVIDER=deepseek`
  - `AI_MODEL=deepseek-v4-pro`
  - `DEEPSEEK_API_KEY`
- Structured JSON synthesis validated with Zod.
- Claim-level grounding with `sourcePaperIds` and evidence snippets for executive summaries, findings, themes, gaps, and uncertainties.
- Grounding validation checks selected paper IDs, evidence-to-paper metadata overlap, claim-to-evidence overlap, overclaim language, numeric/statistical support, comparative support, weak-evidence caveats, and bibliography DOI consistency.
- Grounded `Ask This Brief` Q&A over selected papers for a single generated brief, using the same claim/evidence grounding checks as the main brief.
- Brief result UI with bottom line, confidence, reading path, priority takeaways, evidence snippets, source drawer, bibliography, and collapsed technical diagnostics.
- Markdown export through `GET /api/export/[id]?format=markdown`.
- Optional PostgreSQL/Prisma persistence behind the `BriefRepository` contract.
- Source API cache and source diagnostics persistence when PostgreSQL is enabled.
- Public brief history disabled by default in production.
- Production fail-fast behavior for missing persistence and missing shared rate limiting unless explicit demo escape hatches are set.
- Upstash Redis REST rate limiting for production deployments.
- Vitest coverage for core pipeline, schemas, routes, storage, source diagnostics, grounding, Q&A, rate limiting, and export.
- Adapter contract tests for arXiv, Semantic Scholar, and OpenAlex response-shape drift.
- Retrieval benchmark fixtures, gold-query tests, and `npm run benchmark:retrieval` for acronyms, Polish/English variants, typo recovery, interdisciplinary topics, comparison queries, and domain-specific query expansion. The benchmark also writes ignored JSON/Markdown reports under `benchmark-results/` for provider comparisons.
- Source-quality benchmark fixtures and `npm run benchmark:source-quality` for recorded live-source failure modes, including broad transformer queries that should prefer foundational papers over derivative title matches.
- Ranking includes an exact-title boost so canonical title searches can surface foundational papers instead of derivative titles with extra keyword overlap.
- Metadata-quality warnings flag suspicious live-source records, including known canonical papers with unexpected publication years or non-canonical identifiers, and surface those warnings in preflight, brief source details, and Markdown export.
- Claim/evidence benchmark fixtures for direct, indirect, weak, unsupported-claim, overclaim, numeric, statistical-significance, and comparative cases.
- Repeatable deployment smoke check through `npm run smoke:deploy`.

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
- Metadata-quality warnings are advisory checks, not a full bibliographic authority system.
- Absolute, numeric, statistical, and comparative validation is heuristic; it is not a substitute for full-text methodological verification.
- Scoring is still heuristic, but now combines lexical/title/abstract relevance with a local semantic embedding signal.
- The local embedding provider is not a replacement for model-grade embeddings; production deployments can configure an OpenAI-compatible embeddings endpoint, and retrieval quality still needs tuning against the larger benchmark set.
- Generation now uses an in-process job runner. This improves local UX, but a durable queue/worker is still needed for multi-instance production deployments.
- Authentication and private user-scoped history are not implemented.
- shadcn/ui is not implemented; current UI uses custom CSS.

## Verification Commands

```bash
npm test
npm run benchmark:retrieval
npm run benchmark:source-quality
npm run lint
npm run build
```

Optional PostgreSQL integration test:

```bash
npm test -- tests/prismaBriefRepository.integration.test.ts
```

The PostgreSQL integration test is skipped unless `DATABASE_URL` points to PostgreSQL.
