# Changelog

This file summarizes major project milestones. Detailed turn-by-turn history used to live in `STATUS.md`; current state now lives in `docs/CURRENT_STATE.md`.

## 2026-05-29

- Synced README, STATUS, and deployment docs with the current three-mode product shape: Research Brief, Ask My Documents, and Compare With Science.
- Clarified evidence boundaries, uploaded-document privacy limits, and public-deployment prerequisites.
- Made AI provider request timeout configurable through `AI_REQUEST_TIMEOUT_MS` and hardened timeout handling for slow provider calls.
- Added a session-upload privacy gate, private no-store document API headers, production `Secure` document session cookies, and visible retention/deletion copy in the document UI.
- Added deterministic Compare With Science benchmark fixtures plus `npm run benchmark:claim-check`, covering supported, partially supported, contradicted, insufficient-evidence, too-broad, non-scientific, already-known, and possible-dead-end cases.
- Added the first private `Ask My Documents` implementation slice.
- Added PDF/TXT/MD upload with file validation, max-size checks, basic text extraction, text cleanup, and extraction-quality checks.
- Added private session-scoped document and chunk storage behind a `DocumentRepository` contract with in-memory and Prisma-backed implementations.
- Added Prisma `UserDocument` and `UserDocumentChunk` models plus migration.
- Added document chunking with section hints, chunk indexes, token estimates, overlap, and `uploaded_document_supported` evidence level.
- Added retrieval over uploaded document chunks, using lexical scoring and optional existing embedding-provider vectors.
- Added `POST /api/documents/upload`, `GET /api/documents`, `DELETE /api/documents/[id]`, and `POST /api/documents/ask`.
- Added structured Ask My Documents answers validated with Zod, cited snippets, and explicit refusal when uploaded documents do not support an answer.
- Added `/documents` UI with upload, private document list, selected-document Q&A, answer confidence, and cited snippet cards.
- Added tests for upload validation, chunking, private session scoping, unsupported Q&A refusal, cited chunk evidence, and answer-schema validation.
- Added the second safe full-text implementation slice for selected academic papers.
- Added `lib/fulltext/` with arXiv/pdfUrl discovery, safe PDF fetching, plain-text PDF parsing, chunking, retrieval, repository selection, and ingestion orchestration.
- Added Prisma `PaperFullText` and `PaperTextChunk` models plus migration so full text and chunks stay outside `Brief.briefJson`.
- Added full-text status fields to normalized papers and UI badges for `Full text parsed`, `Abstract only`, `Metadata only`, `Full text unavailable`, and `Parse failed`.
- Updated `Ask This Brief` to prefer retrieved full-text chunks when available, fall back to abstracts/metadata, label evidence levels, and refuse strong methodology/result/table/statistical questions when only abstract/metadata evidence is available.
- Added tests for full-text discovery, PDF fetch timeout/max-size behavior, parser failure on unusable text, chunking, brief-generation resilience, and full-text vs abstract evidence labels.
- Added the third safe `Compare With Science` implementation slice.
- Added `lib/claimCheck/` with claim extraction, Zod report schemas, retrieved-source comparison, similar-work detection, evidence boundary labels, and cautious non-binary classifications.
- Added `POST /api/claim-check/extract` for pasted text or PDF/TXT/MD upload and `POST /api/claim-check` for selected-claim comparison.
- Added `/compare` UI with paste/upload input, extracted claim review, claim-evidence matrix, classification filters, evidence drawer, similar prior work, and suggested safer wording.
- Added tests for claim extraction/schema validation, insufficient evidence, contradicted evidence, already-known evidence requirements, possible-dead-end caveats, private chunk scoping, and report validation.

## 2026-05-28

- Created the Next.js App Router implementation with TypeScript, Tailwind CSS, ESLint, and Vitest.
- Added mock paper data and the first source-grounded brief pipeline.
- Added provider-agnostic AI configuration with DeepSeek V4 Pro as the default implemented provider.
- Added Zod schemas for requests, normalized papers, structured briefs, and AI output validation.
- Added Polish language handling so final briefs follow the user query language while paper metadata remains unchanged.
- Added real source adapters for arXiv, Semantic Scholar, and OpenAlex.
- Added query expansion, source retries, timeouts, partial failure warnings, cache, and diagnostics.
- Added dedupe, ranking, source quality scoring, identifier scoring, and top-paper selection.
- Added Markdown export and source drawer UI.
- Added source diagnostics, source health panel, recent brief history, and source preflight.
- Added Prisma/PostgreSQL persistence behind the `BriefRepository` contract.
- Added persistent source API cache and persistent source diagnostics when PostgreSQL is enabled.
- Added local PostgreSQL Docker workflow and optional PostgreSQL integration tests.
- Added production deployment guide.
- Added production safeguards:
  - public recent history disabled by default in production
  - production persistence fail-fast without valid PostgreSQL
  - shared Upstash Redis REST rate limiting for production
- Added evidence boundary messaging for metadata/abstract-only grounding.
- Promoted DOI visibility across UI and Markdown export.
- Added claim-level evidence snippets and grounding validation.
- Simplified result-page UX so takeaways come before diagnostics.
- Added controlled `Ask This Brief` Q&A over selected papers with Zod validation and evidence-backed claims.
- Simplified source preflight language for non-technical users.
- Published and updated branch `codex/initial-mvp` on GitHub.
