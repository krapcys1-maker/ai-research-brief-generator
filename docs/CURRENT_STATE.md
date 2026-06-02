# Current State

Last updated: 2026-05-29

## Product Shape

AI Research Brief Generator is a working Next.js App Router prototype for source-grounded research briefs.

It is not a generic chatbot. The primary research brief flow is:

```text
user query -> generation job -> source adapters -> normalized papers -> dedupe/ranking -> quality gate -> structured AI synthesis -> grounding validation -> brief UI/export
```

The app now also has a separate private document flow:

```text
PDF/TXT/MD upload -> private session document -> text extraction -> chunking -> retrieval -> structured source-grounded document Q&A
```

For selected academic papers, the app can also attempt legal full-text ingestion:

```text
selected top papers -> arXiv/pdfUrl discovery -> safe PDF fetch -> plain-text parse -> chunk storage -> full-text evidence for Ask This Brief
```

The third product mode compares user claims with retrieved scientific evidence:

```text
paste/upload text -> extract candidate claims -> user selects claims -> academic search per claim -> rank papers -> retrieve evidence -> claim-evidence matrix
```

## Implemented Capabilities

- Home page research form with query, source selection, year range, source preflight, and generation progress.
- Async generation job flow:
  - `POST /api/briefs` queues a generation job and returns `202` with `jobId`.
  - `GET /api/briefs/jobs/[id]` returns queued/running/completed/failure status.
  - The UI polls job status and redirects to `/briefs/[id]` when completed.
  - Job status is stored through a repository contract. Development can use memory;
    PostgreSQL deployments persist job request/status/error/quality-gate metadata,
    attempt counts, and worker leases.
  - `npm run worker:briefs` can process queued jobs from the job repository as a
    separate worker process and reset stale `running` jobs before retrying or
    failing them after the configured attempt limit.
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
- Embedding provider diagnostics through `npm run embedding:check`, which validates the effective provider and vector shape without printing secrets.
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
- Legal open-access paper full-text ingestion for selected top papers:
  - arXiv PDF URL discovery from `arxivId`.
  - existing `pdfUrl` discovery when source metadata provides one.
  - safe PDF fetch with timeout, content-type check, and max-size enforcement.
  - plain-text PDF parsing through a swappable parser boundary.
  - full-text chunking with `paperId`, `fullTextId`, chunk indexes, section hints, token estimates, and `full_text_supported` evidence level.
  - separate `PaperFullText` and `PaperTextChunk` storage, not `Brief.briefJson`.
  - per-paper failure isolation so one failed PDF never blocks brief generation.
  - configurable max papers per brief through `FULL_TEXT_MAX_PAPERS_PER_BRIEF`, defaulting to 10.
- Private `Ask My Documents` workspace at `/documents`:
  - PDF/TXT/MD uploads.
  - server-side file validation and max-size enforcement.
  - deployment-level upload gate through `DOCUMENT_UPLOADS_ENABLED` or the explicit production demo opt-in.
  - private no-store response headers for document APIs.
  - authenticated user/workspace ownership through trusted `X-AI-Brief-User-Id`
    and optional `X-AI-Brief-Workspace-Id` headers, with
    `DOCUMENT_AUTH_REQUIRED=true` for public deployments.
  - session-cookie privacy fallback with production `Secure` cookie flag for
    local/private demos.
  - basic plain-text extraction.
  - document chunking with user/workspace/session-scoped ownership.
  - optional chunk embeddings through the existing embedding provider abstraction.
  - private retrieval over uploaded document chunks only.
  - structured Q&A responses validated with Zod.
  - evidence snippets tied to uploaded document chunk IDs.
  - explicit refusal when uploaded documents do not support an answer.
- Brief result UI with bottom line, confidence, reading path, priority takeaways, evidence snippets, source drawer, bibliography, full-text status badges, and collapsed technical diagnostics.
- Document workspace UI with upload panel, private document list, selected-document Q&A, cited snippets, and `uploaded_document_supported` evidence badges.
- `Compare With Science` workspace at `/compare`:
  - paste text or upload PDF/TXT/MD.
  - extract candidate claims for user review.
  - compare selected claims with arXiv, Semantic Scholar, and OpenAlex results.
  - retrieve abstract/metadata evidence and parsed full-text chunks when available.
  - include private uploaded document chunks only for the same session.
  - classify claims without true/false verdicts:
    - `supported`
    - `partially_supported`
    - `contradicted`
    - `insufficient_evidence`
    - `too_broad`
    - `not_scientific_claim`
    - `already_known_or_done`
    - `possible_dead_end`
  - show evidence snippets, similar prior work, suggested safer wording, caveats, and evidence boundaries.
- Markdown export through `GET /api/export/[id]?format=markdown`.
- Optional PostgreSQL/Prisma persistence behind the `BriefRepository` contract.
- Optional PostgreSQL/Prisma persistence behind the `DocumentRepository` contract for uploaded documents and chunks.
- Source API cache and source diagnostics persistence when PostgreSQL is enabled.
- Public brief history disabled by default in production.
- Brief history can be session-scoped through `ai_brief_history_session`; public history remains an explicit opt-in.
- Brief detail, export, and brief Q&A endpoints enforce `ai_brief_history_session`
  ownership for session-owned records unless public history is explicitly enabled.
- Production privacy notice is shown by default in production on public entry points and can be controlled with `DEPLOYMENT_PRIVACY_NOTICE`.
- Production fail-fast behavior for missing persistence and missing shared rate limiting unless explicit demo escape hatches are set.
- Upstash Redis REST rate limiting for production deployments.
- Vitest coverage for core pipeline, schemas, routes, storage, source diagnostics, grounding, Q&A, rate limiting, and export.
- Adapter contract tests for arXiv, Semantic Scholar, and OpenAlex
  response-shape drift, backed by recorded fixtures in
  `tests/fixtures/live-sources`.
- Retrieval benchmark fixtures, gold-query tests, and `npm run benchmark:retrieval` for acronyms, Polish/English variants, typo recovery, interdisciplinary topics, comparison queries, and domain-specific query expansion. The benchmark also writes ignored JSON/Markdown reports under `benchmark-results/` for provider comparisons.
- Source-quality benchmark fixtures and `npm run benchmark:source-quality` for recorded live-source failure modes, including broad transformer queries that should prefer foundational papers over derivative title matches.
- Compare With Science benchmark fixtures and `npm run benchmark:claim-check` for supported, partially supported, contradicted, insufficient-evidence, too-broad, non-scientific, already-known, and possible-dead-end classifications.
- Ranking includes an exact-title boost so canonical title searches can surface foundational papers instead of derivative titles with extra keyword overlap.
- Metadata-quality warnings flag suspicious live-source records, including known canonical papers with unexpected publication years or non-canonical identifiers, and surface those warnings in preflight, brief source details, and Markdown export.
- Claim/evidence benchmark fixtures for direct, indirect, weak, unsupported-claim, overclaim, numeric, statistical-significance, and comparative cases.
- Repeatable deployment smoke check through `npm run smoke:deploy`.

## Storage Modes

Development can run with in-memory storage.

PostgreSQL is available through Prisma when `DATABASE_URL` points to PostgreSQL. With PostgreSQL enabled, the app persists:

- generated briefs
- generation job status records
- selected papers
- brief-paper score joins
- source API cache records
- source diagnostics
- paper full-text ingestion records
- paper full-text chunks
- private uploaded document metadata
- private uploaded document chunks

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

- Research brief synthesis still primarily uses selected paper metadata and abstracts. Parsed full-text chunks are currently used by Ask This Brief where available.
- Paper full-text ingestion only uses legal open-access PDF candidates from arXiv IDs or source-provided `pdfUrl` values. It does not bypass paywalls, automate browsers, or crawl uncontrolled sources.
- PDF parsing is plain-text only. The current full-text slice does not support OCR, figures, tables, images, DOCX, XLSX, or scanned documents.
- If a selected paper has no legal PDF, fails fetch, or fails parsing, the app explicitly falls back to abstract/metadata evidence boundaries.
- `Ask My Documents` grounds only on user-uploaded PDF/TXT/MD content. It does not search the web, public paper indexes, or global document data.
- `Compare With Science` is a retrieved-source comparison, not a definitive scientific, legal, medical, or financial review. It must not be treated as a true/false validator or novelty guarantee.
- Similar-work detection indicates that related retrieved work exists; it does not prove an idea is definitely new or definitely already exhausted.
- Uploaded document privacy supports authenticated user/workspace ownership
  through trusted headers. Session-scoped uploads remain a local/private demo
  fallback and are disabled by default in production unless explicitly enabled
  with `DOCUMENT_UPLOADS_ENABLED=true` or
  `ALLOW_SESSION_DOCUMENT_UPLOADS_IN_PRODUCTION=true`.
- The document UI now displays the session privacy boundary, deletion behavior, and retention caveat before upload.
- Uploaded PDF parsing is plain-text only. The first slice does not support OCR, figures, tables, images, DOCX, XLSX, or scanned documents.
- No uploaded document text is stored inside `Brief.briefJson`; document text lives in separate document/chunk storage.
- Metadata-quality warnings are advisory checks, not a full bibliographic authority system.
- Absolute, numeric, statistical, and comparative validation is heuristic; it is not a substitute for full-text methodological verification.
- Scoring is still heuristic, but now combines lexical/title/abstract relevance with a local semantic embedding signal.
- The local embedding provider is not a replacement for model-grade embeddings; production deployments can configure an OpenAI-compatible embeddings endpoint, and retrieval quality still needs tuning against the larger benchmark set.
- Generation status can be persisted in PostgreSQL and processed by a separate DB-backed worker with stale-lease recovery and an attempt limit. A stronger external queue is still recommended when multi-instance throughput and retry orchestration grow.
- Uploaded documents can be scoped to durable authenticated user/workspace IDs
  supplied by trusted infrastructure. Brief history remains session-scoped in
  the current prototype.
- shadcn/ui is not implemented; current UI uses custom CSS.

## Verification Commands

```bash
npm test
npm run embedding:check
npm run benchmark:retrieval
npm run benchmark:source-quality
npm run benchmark:claim-check
npm run lint
npm run build
```

Optional PostgreSQL integration test:

```bash
npm test -- tests/prismaBriefRepository.integration.test.ts
```

The PostgreSQL integration test is skipped unless `DATABASE_URL` points to PostgreSQL.
