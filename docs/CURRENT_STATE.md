# Current State

Last updated: 2026-06-02

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

For heavier PDF/full-text work, deployments can defer selected-paper ingestion:

```text
saved brief papers -> FullTextIngestionJob -> full-text worker -> PaperFullText/PaperTextChunk storage
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
  - parser diagnostics for page count, empty pages, character count, word count,
    alphanumeric ratio, parser version, quality score, and extraction warnings.
  - full-text chunking with `paperId`, `fullTextId`, chunk indexes, section hints, token estimates, and `full_text_supported` evidence level.
  - separate `PaperFullText` and `PaperTextChunk` storage, not `Brief.briefJson`.
  - per-paper failure isolation so one failed PDF never blocks brief generation.
  - configurable max papers per brief through `FULL_TEXT_MAX_PAPERS_PER_BRIEF`, defaulting to 10.
  - optional background ingestion through
    `BRIEF_FULL_TEXT_INGESTION_MODE=background`, backed by
    `FullTextIngestionJob` storage and `npm run worker:fulltext`.
  - background full-text jobs store user/workspace/session ownership metadata,
    worker leases, attempt counts, result summaries, and errors.
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
  - save completed reports through `CompareReport` with
    user/workspace/session ownership.
  - list and reopen saved reports from the `/compare` history panel.
  - queue longer comparisons through `POST /api/claim-check/jobs` and poll
    status/results through `GET /api/claim-check/jobs/[id]`.
- Workspace dashboard at `/workspace`:
  - `GET /api/workspace/dashboard` aggregates recent brief, document, and
    saved Compare report summaries.
  - The dashboard keeps the existing ownership boundaries: brief history is
    scoped through app-session/trusted identity/session history, while
    documents and Compare reports are scoped through trusted document identity
    or the private document session fallback.
  - The UI shows workspace/session counters and recent links back into briefs,
    documents, and Compare workflows.
- Markdown export through `GET /api/export/[id]?format=markdown`.
- Optional PostgreSQL/Prisma persistence behind the `BriefRepository` contract.
- Optional PostgreSQL/Prisma persistence behind the `DocumentRepository` contract for uploaded documents and chunks.
- Optional PostgreSQL/Prisma persistence for saved Compare With Science reports
  behind the `CompareReportRepository` contract, plus session/user/workspace
  scoped history APIs.
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
- Recorded PDF parser fixture and extraction diagnostics tests in
  `tests/fixtures/pdf-parser` and `tests/fulltextFetchParseChunk.test.ts`.
- Scanned/no-OCR, noisy/corrupted, table-heavy, and failed-extraction PDF
  robustness fixtures in `tests/fixtures/pdf-parser`, covered by
  `tests/fulltextPdfRobustness.test.ts`.
- Full-text parser warnings are visible in brief source cards and Markdown
  export when extraction diagnostics show weak text, no chunks, or failed
  parsing.
- Full-text parser/chunking supports explicit extracted-page ranges (`N` or
  `N-M`) and records selected `pageStart`/`pageEnd` on chunks.
- Retrieval benchmark fixtures, gold-query tests, and `npm run benchmark:retrieval` for acronyms, Polish/English variants, typo recovery, interdisciplinary topics, comparison queries, domain-specific query expansion, and recorded live-source examples from arXiv, Semantic Scholar, and OpenAlex. The benchmark also writes ignored JSON/Markdown reports under `benchmark-results/` for provider comparisons.
- Source-quality benchmark fixtures and `npm run benchmark:source-quality` for recorded live-source failure modes, including broad transformer queries that should prefer foundational papers over derivative title matches, stem-cell burn treatment queries that should avoid generic stem-cell/cosmetology records, and clinical RAG/citation-faithfulness queries that should beat high-citation but off-topic clinical or bibliometric records.
- Compare With Science benchmark fixtures and `npm run benchmark:claim-check`
  for supported, partially supported, contradicted, insufficient-evidence,
  too-broad, non-scientific, already-known, possible-dead-end, recorded
  live-source abstract evidence, and full-text-supported evidence-boundary
  cases.
- CI-ready benchmark quality gate through `npm run benchmark:quality-gate`,
  which runs retrieval, source-quality, and claim-check suites with central
  thresholds and writes JSON/Markdown reports under `benchmark-results/`.
- Ranking includes an exact-title boost so canonical title searches can surface foundational papers instead of derivative titles with extra keyword overlap.
- Metadata-quality warnings flag suspicious live-source records, including known canonical papers with unexpected publication years or non-canonical identifiers, and surface those warnings in preflight, brief source details, and Markdown export.
- Claim/evidence benchmark fixtures for direct, indirect, weak, unsupported-claim, overclaim, numeric, statistical-significance, and comparative cases.
- Repeatable deployment smoke check through `npm run smoke:deploy`.
- Staging readiness preflight through `npm run staging:check` for PostgreSQL,
  Upstash, AI secrets, model-grade embeddings, worker split, trusted ownership,
  full AI smoke settings, and rollback procedure.
- App-native session runtime foundation through `UserSession`, hashed opaque
  tokens, `ai_brief_app_session`, `GET /api/auth/session`, workspace membership
  validation, and brief access/rate-limit integration.

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
- full-text ingestion job status records
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
- Page-range support is implemented for extracted page-text fixtures and
  ingestion options. The current live `pdf-parse` path still depends on the
  parser exposing per-page text before it can physically skip pages during
  network PDF parsing.
- If a selected paper has no legal PDF, fails fetch, or fails parsing, the app explicitly falls back to abstract/metadata evidence boundaries.
- Parser-quality warnings are advisory and should prompt manual PDF review
  before relying on method/result/table/statistical claims.
- Table-heavy extraction now receives an explicit parser warning, but the app
  still does not understand tables semantically; it only preserves chunkable
  plain text.
- Background full-text ingestion is DB-backed and good enough for controlled
  staging/private beta work. A stronger external queue is still recommended for
  high-throughput multi-instance production.
- Background full-text ingestion updates `PaperFullText` and `PaperTextChunk`
  storage after a brief is saved. Brief source-card status snapshots may still
  show the original generation-time full-text status until a future UI refresh
  or status endpoint is added.
- `Ask My Documents` grounds only on user-uploaded PDF/TXT/MD content. It does not search the web, public paper indexes, or global document data.
- `Compare With Science` is a retrieved-source comparison, not a definitive scientific, legal, medical, or financial review. It must not be treated as a true/false validator or novelty guarantee.
- Similar-work detection indicates that related retrieved work exists; it does not prove an idea is definitely new or definitely already exhausted.
- Saved Compare reports are persisted after synchronous or background-polled
  comparison. Compare job status is currently an in-process queue; use it for
  local/private beta ergonomics, then move it to durable DB-backed or external
  queue storage before high-throughput multi-instance production.
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
- `/workspace` is a scoped product dashboard over existing resources. It is not
  yet a full project management layer: saved topics, collections, export
  history, share links, and onboarding remain future work.
- App-native sessions can resolve durable users/workspaces for brief access, but
  registration/login UI, password or magic-link flow, reset access, account
  settings, audit trail, and full role enforcement are not implemented yet.
- shadcn/ui is not implemented; current UI uses custom CSS.

## Verification Commands

```bash
npm test
npm run embedding:check
npm run benchmark:retrieval
npm run benchmark:source-quality
npm run benchmark:claim-check
npm run benchmark:quality-gate
npm test -- tests/workspaceDashboardRoute.test.ts
npm run worker:fulltext
npm run lint
npm run build
```

Staging-only preflight:

```bash
npm run staging:check
```

Run it with the exact staging environment variables. A local env without
production secrets should report blockers.

Optional PostgreSQL integration test:

```bash
npm test -- tests/prismaBriefRepository.integration.test.ts
```

The PostgreSQL integration test is skipped unless `DATABASE_URL` points to PostgreSQL.
