# Project Status

Last updated: 2026-06-02

## Current Snapshot

AI Research Brief Generator is a working source-grounded research workspace prototype.

The app supports:

- mock, arXiv, Semantic Scholar, and OpenAlex source adapters
- source preflight and Research Quality Gate
- paper normalization, dedupe, hybrid lexical/semantic ranking, and top-paper selection
- DeepSeek V4 Pro structured synthesis through a provider abstraction
- Zod validation for AI outputs
- claim-level `sourcePaperIds` and evidence snippets
- Markdown export
- controlled `Ask This Brief` Q&A over selected papers
- async brief generation jobs with polling
- PostgreSQL-backed brief job status with a separate worker entrypoint
- stale job lease recovery and attempt limits for the DB-backed worker
- legal selected-paper full-text ingestion for arXiv/source-provided PDF URLs
- explicit evidence boundaries for metadata, abstract, full-text, uploaded-document, mixed, and insufficient evidence
- private session-scoped `Ask My Documents` upload/Q&A for PDF/TXT/MD files
- `Compare With Science` claim extraction and claim-evidence matrix with non-binary classifications
- optional PostgreSQL/Prisma persistence
- separate paper full-text, paper chunk, uploaded document, and uploaded document chunk storage
- session-scoped private brief history through `ai_brief_history_session`
- session ownership checks for brief detail, Markdown export, and brief Q&A
- trusted-header user/workspace ownership checks for brief list/detail,
  `/briefs/[id]`, Markdown export, brief Q&A, and brief job polling
- app-native `UserSession` runtime foundation with hashed tokens,
  `ai_brief_app_session`, `GET /api/auth/session`, and brief
  list/detail/export/Q&A/job polling access through resolved app sessions
- user/workspace-aware rate limiting for brief generation and brief Q&A when
  trusted identity headers or app-native sessions are present
- source API cache and source diagnostics
- production fail-fast persistence and shared Upstash rate limiting
- rate limiting for brief generation, brief Q&A, document Q&A, document uploads, claim extraction, and claim comparison
- deployment privacy notice enabled by default in production
- deployment privacy notice distinguishes trusted-user mode from session-demo mode
- embedding provider comparison runner for local fallback vs configured
  OpenAI-compatible model-grade embeddings
- recorded live-source adapter fixtures for arXiv, Semantic Scholar, and OpenAlex
- recorded PDF parser fixture and parser-quality diagnostics for full-text extraction
- scanned/noisy/table-heavy/failed-extraction PDF robustness fixtures and tests
- visible full-text parser warnings in source cards and Markdown export when
  PDF extraction is low-quality, chunkless, or failed
- full-text page-range parsing/chunk metadata support for extracted page
  fixtures and `FULL_TEXT_PAGE_RANGE`
- background full-text ingestion jobs with PostgreSQL persistence, ownership
  metadata, lease recovery, retry limits, and `npm run worker:fulltext`
- `CompareReport` schema and repository foundation with user/workspace ownership
- deployment smoke coverage for source health, preflight, documents, compare, claim extraction, claim comparison, and AI-backed brief flow when not skipped
- staging readiness preflight through `npm run staging:check`

## Current Docs

- Current implemented behavior: `docs/CURRENT_STATE.md`
- Future work: `docs/ROADMAP.md`
- Full public SaaS path: `docs/DROGA_DO_PELNEGO_SAAS.md`
- Identity model decision: `docs/IDENTITY_MODEL.md`
- Major milestone history: `docs/CHANGELOG.md`
- Risk-driven repair plan: `docs/REMEDIATION_PLAN.md`
- Deployment notes: `docs/DEPLOYMENT.md`

## Important Current Decisions

- This is a controlled research pipeline, not a generic chatbot.
- The app can run locally without PostgreSQL, but production requires PostgreSQL unless an explicit temporary demo escape hatch is set.
- DeepSeek is the default implemented AI provider, but the architecture remains provider-agnostic.
- AI output must be structured and validated with Zod.
- Important claims must include valid selected-paper IDs and evidence snippets.
- Full-text evidence may be used only when a legal PDF was fetched, parsed, chunked, and retrieved. Otherwise the UI/API must label the answer as abstract or metadata grounded.
- Uploaded document evidence is private by authenticated user/workspace ownership
  when trusted auth headers are present, with session-scoped fallback for
  local/private demos.
- Session-scoped document uploads are disabled by default in production unless explicitly enabled for a private/internal deployment.
- Public recent history is disabled by default in production.
- Brief history is session-scoped by default for anonymous/private demo use.
  When trusted `X-AI-Brief-User-Id` and optional
  `X-AI-Brief-Workspace-Id` headers are present, brief list/detail/export/Q&A
  and job polling are scoped to that user/workspace unless public history is
  explicitly enabled.
- The DB-backed worker is suitable for first production deployments, but a stronger external queue is still recommended when throughput or multi-instance retry orchestration grows.
- The official full public SaaS identity target is app-native authentication
  with workspaces and role-based membership. Trusted auth headers remain an
  interim private/B2B deployment bridge, not the final public SaaS identity
  model.
- shadcn/ui is optional and not currently implemented.

## Latest Completed Step

Completed a production-readiness hardening pass:

- Added PostgreSQL-backed brief generation job status, `npm run worker:briefs`, worker lease recovery, and retry/attempt limits.
- Added session-scoped private brief history and protected brief detail/export/Q&A by session ownership.
- Added a production privacy notice shown by default in production.
- Added rate limiting to document uploads and claim extraction.
- Expanded deployment smoke coverage to include `/documents`, `/api/documents`, `/compare`, claim extraction, and mock-source claim comparison.
- Added stronger tests for long/multi-document retrieval in `Ask My Documents`.

Latest verification:

- `npm test` passes.
- `npm run lint` passes.
- `npm run build` passes.
- `npm run embedding:check` passes with the local embedding provider.
- `npm run benchmark:retrieval`, `npm run benchmark:source-quality`, and `npm run benchmark:claim-check` pass on current fixtures.
- `SMOKE_SKIP_AI=true npm run smoke:deploy` passes against a local production build.

Manual browser QA added on 2026-06-02 against a local production build on
`http://localhost:3110` with Chromium/Playwright:

- `/`, `/documents`, and `/compare` render on desktop and mobile without console
  errors or horizontal overflow.
- `Compare With Science` claim extraction works from pasted text and produces
  selectable `checkable` claims.
- `Ask My Documents` renders correctly; document upload is disabled in production
  by default, as intended for public deployments.
- Mock-only brief generation is correctly blocked by the Research Quality Gate
  because it has 0 live-source papers.
- The default brief generation flow with mock, arXiv, and OpenAlex selected does
  not complete in this environment. The job remains `running` until the
  180-second job timeout and then fails with `Brief generation job timed out
  after 180000 ms.` Source adapters report success before the timeout, so the
  next investigation should isolate full-text ingestion versus DeepSeek
  structured synthesis and add stage-level job telemetry.

First remediation started on 2026-06-02:

- Added brief job stage telemetry (`queued`, `preflight`,
  `full_text_ingestion`, `synthesis`, `persistence`, `completed`, `failed`) to
  in-memory jobs, PostgreSQL-backed jobs, the job status API, and the generator
  progress UI.
- Added a Prisma migration for `BriefGenerationJob.stage` and
  `BriefGenerationJob.stageStartedAt`.
- Bounded full-text ingestion during brief generation with separate defaults:
  `BRIEF_FULL_TEXT_MAX_PAPERS=3` and
  `BRIEF_FULL_TEXT_FETCH_TIMEOUT_MS=8000`, while preserving the lower-level
  full-text ingestion module for dedicated workflows.
- Runtime polling after this change showed default generation moving quickly
  from `full_text_ingestion` to `synthesis`, confirming the remaining stall was
  in AI structured synthesis rather than PDF/full-text ingestion.
- Hardened the DeepSeek client timeout so `AI_REQUEST_TIMEOUT_MS` covers the
  full provider response cycle, including JSON body reads, not just the initial
  fetch response.
- Manual browser QA after the timeout hardening showed a clean synthesis-stage
  provider timeout instead of the previous whole-job timeout.
- Added bounded DeepSeek synthesis settings: `AI_MAX_OUTPUT_TOKENS=7000` and
  `AI_THINKING_ENABLED=false` by default.
- Added compact-output prompt constraints and a second-attempt repair prompt
  that feeds server-side grounding validation errors back to the model. This
  targets failures such as comparative or quantitative claims not present in
  the cited evidence snippets.
- AI provider runtime failures are now stored as `failed` jobs; only actual
  missing/invalid AI configuration is classified as `configuration_error`.
- Added `BRIEF_SYNTHESIS_MAX_PAPERS=5` so live source search can remain broad
  while AI synthesis receives a smaller top-paper context.
- Added one retry for transient AI provider failures such as timeouts,
  terminated connections, and 5xx/429 provider responses.
- Added a conservative extractive fallback brief after repeated provider or
  grounding validation failures. The fallback is explicitly warning-labeled,
  uses only selected paper titles/abstracts, and still passes server-side
  grounding validation before persistence.
- Manual browser QA after the fallback confirmed default generation completes:
  the job reached `completed`, opened `/briefs/brief_mpwq47pw_o3jhsa`, rendered
  the brief page, showed the fallback warning, exposed export controls, and had
  no console errors or horizontal overflow.
- Improved fallback brief UX so section headings use selected paper titles and
  descriptions use shorter title/abstract excerpts instead of repeating the full
  evidence text as both heading and body.
- Manual forced-fallback QA with `AI_REQUEST_TIMEOUT_MS=1` confirmed the
  fallback still completes, renders, shows the warning, avoids the previous
  repeated-heading pattern, and has no console errors or horizontal overflow.
- Added an inline fallback-mode explanation near source warnings so users can
  see that the brief is an extractive evidence summary, why fallback was used,
  and what to try next.
- Manual forced-fallback QA confirmed the fallback explanation renders in the
  header, includes retry/narrow-topic guidance, and does not introduce layout
  overflow or console errors.
- Added a Markdown export fallback-mode section near the top of exported briefs,
  before `Evidence Boundary`, so downloaded fallback briefs also explain that
  they are extractive summaries and include the fallback reason.
- Runtime forced-fallback export QA confirmed
  `/api/export/{briefId}?format=markdown` returns `200` in the same session and
  includes `## Fallback Mode`, extractive-summary wording, and fallback reason
  before the evidence-boundary section.
- Added AI synthesis diagnostics for success, retry, fallback, provider error,
  validation error, and configuration error events, with in-memory tracking and
  PostgreSQL persistence through `AiSynthesisDiagnostic`.
- Extended `/api/source-cache` and the home-page health panel with AI synthesis
  health counters, fallback rate, provider breakdowns, and recent AI synthesis
  events.
- Manual Chromium QA confirmed the AI synthesis health panel renders on
  `http://localhost:3110`, `/api/source-cache` returns the new health payload,
  and the page has no console errors or horizontal overflow.
- Added authenticated uploaded-document ownership through trusted
  `X-AI-Brief-User-Id` and optional `X-AI-Brief-Workspace-Id` headers, including
  `DOCUMENT_AUTH_REQUIRED=true` enforcement for public deployments.
- Added `workspaceId` storage for uploaded documents and chunks, plus
  user/workspace isolation in document upload, list, delete, document Q&A, and
  Compare With Science uploaded-document retrieval.
- Runtime API QA with `DOCUMENT_AUTH_REQUIRED=true` confirmed anonymous uploads
  return `401`, authenticated uploads store user/workspace ownership without a
  session cookie, same-workspace listing returns the document, and another
  workspace cannot see it.
- Ran `npm run embedding:check` on the current environment. The app is still
  using the local `local-hash-ngrams` embedding fallback with valid 192-dimension
  vectors; no production OpenAI-compatible embedding provider is configured yet.
- Ran current benchmark baselines on the local embedding fallback:
  `benchmark:retrieval` passed with 7/7 cases and 100% top-1/recall@5,
  `benchmark:source-quality` passed with 2/2 cases and 100% top-1/recall@5, and
  `benchmark:claim-check` passed with 8/8 classifications and no evidence,
  similar-work, or caveat requirement failures.
- Added embedding configuration visibility to `/api/source-cache` and the
  home-page health panel so deployments show whether they are using local
  fallback, a ready model-grade provider, or missing embedding configuration.
- Manual Chromium QA confirmed the embedding health panel renders on
  `http://localhost:3110`, `/api/source-cache` returns `embeddingHealth`, and
  the page has no console errors or horizontal overflow.
- Created `docs/DROGA_DO_PELNEGO_SAAS.md` as the living checklist for moving
  from private beta/internal production candidate to full public SaaS, and
  updated `TODO.md` to distinguish trusted-header document ownership from full
  app-native accounts/workspaces.
- Protected `GET /api/briefs/jobs/[id]` with the same private session ownership
  boundary used by brief detail/export/Q&A. Private job status now returns
  `403` for another browser session, and the SaaS roadmap/TODO checklist marks
  this point complete after targeted verification.
- Documented the official identity model in `docs/IDENTITY_MODEL.md`: full
  public SaaS targets app-native auth + workspaces + role-based membership;
  trusted auth gateway remains a private/B2B or interim mode. Updated
  `docs/DROGA_DO_PELNEGO_SAAS.md`, `TODO.md`, `README.md`, and
  `docs/DEPLOYMENT.md` to point at that decision.
- Added the Prisma identity foundation for app-native SaaS accounts:
  `WorkspaceRole`, `User`, `Workspace`, and `WorkspaceMember`, plus migration
  `20260602193000_add_app_identity`. The runtime login/session layer and
  user/workspace ownership for briefs/jobs remain the next implementation work.
- Added user/workspace ownership fields to generated briefs and brief generation
  jobs: `ownerId`, `workspaceId`, `createdByUserId`, and `visibility`, plus
  migration `20260602195000_add_brief_workspace_ownership`. In-memory and
  Prisma repositories now store/filter these fields while preserving session
  ownership as the demo fallback.
- Added trusted-header user/workspace runtime access for brief list/detail,
  `/briefs/[id]`, Markdown export, brief Q&A, and brief job polling. Brief
  generation and brief Q&A rate limits now use user/workspace keys when
  trusted identity is available, with per-IP fallback for anonymous demo mode.
- Expanded cross-user/cross-workspace tests for brief list, detail, export,
  Q&A, job polling, uploaded documents, document repository isolation, and
  Compare With Science uploaded-document retrieval.
- Split the production privacy notice into trusted-user mode and session-demo
  mode so deployments with `DOCUMENT_AUTH_REQUIRED=true` describe trusted
  user/workspace ownership, while private demos clearly describe browser-session
  isolation.
- Added `npm run benchmark:embedding-comparison`, which writes combined
  JSON/Markdown reports under `benchmark-results/`, always records a local
  embedding baseline, and compares the configured OpenAI-compatible provider
  when production embedding env vars are present.
- Ran `npm run embedding:check` and `npm run benchmark:embedding-comparison`.
  Current local result: `local-hash-ngrams`, 192 dimensions, 100% retrieval
  top-1/source-quality top-1/claim-check accuracy on current fixtures. The
  model-grade comparison was skipped with `model_grade_not_configured` because
  no production embedding provider secrets are present locally.
- Added recorded live-source adapter fixtures under
  `tests/fixtures/live-sources` for arXiv Atom, Semantic Scholar search JSON,
  and OpenAlex works JSON. `tests/sourceAdapters.contract.test.ts` now uses
  those files to verify response-shape normalization, malformed-record skipping,
  DOI/arXiv/OpenAlex IDs, reconstructed abstracts, PDF URLs, venues, authors,
  and citation metadata without live API calls.
- Added a recorded PDF parser fixture under `tests/fixtures/pdf-parser` and
  parser diagnostics for extracted full text: parser name/version, page count,
  empty page count, character count, word count, alphanumeric ratio, quality
  score, and warnings for weak extraction. Parsed full-text records now preserve
  diagnostic warnings in `fullTextErrorMessage` as a JSON payload without
  requiring a schema migration.
- Added the `CompareReport` ownership foundation for saved Compare With Science
  reports: Prisma model and migration, memory/PostgreSQL repositories,
  `ownerSessionId`, `ownerId`, `workspaceId`, `createdByUserId`, `visibility`,
  request JSON, report JSON, claim count, and workspace-scoped summary listing.
  The history API/UI and background compare polling remain future product work.
- Added `npm run staging:check` with a tested staging readiness preflight for
  PostgreSQL, Upstash, DeepSeek secrets/model/timeouts, model-grade embeddings,
  web/worker split, trusted document ownership, disabled demo escape hatches,
  remote smoke target, full AI smoke without `SMOKE_SKIP_AI=true`, and a
  rollback procedure. Verified with `npm test -- tests/stagingReadiness.test.ts`
  and a complete simulated staging env. Real staging/prod secrets and hosted
  smoke remain deployment tasks.
- Added the app-native session runtime foundation for public SaaS identity:
  `UserSession` schema and migration, hashed opaque session tokens,
  `ai_brief_app_session` cookie helpers, `GET /api/auth/session`, workspace
  membership validation, session revocation/expiry handling, and app-session
  ownership/rate-limit support for brief list/detail/export/Q&A/job polling.
  Login UI, account settings, reset access, audit trail, and full role
  enforcement remain future work.
- Added full-text parser warning visibility for weak PDF extraction. Serialized
  parser diagnostics, low `fullTextQualityScore`, zero parsed chunks, and failed
  extraction now surface in source cards and Markdown bibliography entries, so
  parsed full text does not look stronger than it is. Verified with
  `npm test -- tests/fulltextDiagnostics.test.ts tests/markdownExport.test.ts
  tests/fulltextFetchParseChunk.test.ts` and `npm run lint`.
- Added full-text page-range support in the parser/chunking layer: `N` and
  `N-M` ranges, selected extracted-page parsing, `pageStart`/`pageEnd` metadata
  on chunks, and `FULL_TEXT_PAGE_RANGE` plumbing for ingestion options. Verified
  with `npm test -- tests/fulltextPageRange.test.ts
  tests/fulltextFetchParseChunk.test.ts tests/fulltextDiagnostics.test.ts
  tests/markdownExport.test.ts` and `npm run lint`.
- Added background full-text ingestion jobs for heavier PDF/full-text work:
  `FullTextIngestionJob` Prisma storage with user/workspace/session ownership,
  in-memory and PostgreSQL repositories, lease recovery, attempt limits,
  `BRIEF_FULL_TEXT_INGESTION_MODE=background`, and `npm run worker:fulltext`.
  Verified with `npx prisma validate` and `npm test --
  tests/fulltextIngestionJobs.test.ts tests/createBriefFullText.test.ts`.
- Added scanned/no-OCR, noisy/corrupted, table-heavy, and failed-extraction PDF
  robustness fixtures. Parser diagnostics now warn when extracted text appears
  layout-heavy or table-like, while scanned/failed extraction artifacts remain
  rejected as unusable. Verified with `npm test --
  tests/fulltextPdfRobustness.test.ts tests/fulltextFetchParseChunk.test.ts
  tests/fulltextDiagnostics.test.ts`.
- Added three recorded live-source retrieval gold cases based on the arXiv,
  Semantic Scholar, and OpenAlex adapter fixtures. `npm run
  benchmark:retrieval` now covers 10 cases and passes with 100% top-1,
  100% recall@5, and 0 excluded top failures on the local embedding fallback.
  Verified with `npm test -- tests/retrievalGoldBenchmark.test.ts` and
  `npm run benchmark:retrieval`.
- Expanded source-quality benchmark fixtures from 2 to 5 cases with recorded
  live-source failure modes for clinical RAG, citation faithfulness, and
  diagnosis-support queries. The new hard negatives include high-citation
  generic clinical QA, bibliometric citation-counting, and rule-based triage
  records. `npm run benchmark:source-quality` passes with 100% top-1,
  100% recall@5, and 0 excluded top failures.
- Expanded Compare With Science benchmark fixtures from 8 to 11 cases with
  recorded arXiv and Semantic Scholar abstract-level evidence plus a
  full-text-supported transformer claim. The benchmark now checks evidence
  boundary requirements and `npm run benchmark:claim-check` passes with 100%
  classification accuracy and 0 evidence/similar-work/caveat/boundary failures.

## Next Recommended Step

Next highest-value work:

1. Add app-native registration/login UI, account settings, reset access, role
   enforcement, and audit trail on top of the new session runtime.
2. Add real OpenAI-compatible embedding provider credentials in deployment,
   rerun `npm run embedding:check`, then rerun
   `npm run benchmark:embedding-comparison` to compare against the local
   fallback baseline.
3. Run `npm run staging:check`, `npx prisma migrate deploy`,
   `npm run embedding:check`, and full `npm run smoke:deploy` against the real
   staging deployment after secrets are configured.
4. Set quality thresholds to CI for retrieval/source-quality/claim-check.
5. Add saved Compare With Science report history API/UI and background compare
   polling on top of the new `CompareReport` storage foundation.
6. Add structured production logs and alerting for AI/provider/source/worker
   failures.
