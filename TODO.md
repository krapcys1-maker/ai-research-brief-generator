# TODO — AI Research Brief Generator

## Phase 1 — Skeleton

- [x] Create Next.js App Router project.
- [x] Add TypeScript strict mode.
- [x] Add Tailwind CSS.
- [ ] Add shadcn/ui.
- [x] Create folder structure from `PROJECT.md`.
- [x] Create `lib/sources/types.ts`.
- [x] Create `lib/ai/schemas.ts`.
- [x] Create provider-agnostic AI config/types with DeepSeek V4 Pro defaults.
- [x] Create `lib/storage/inMemoryBriefStore.ts`.
- [x] Create `lib/pipeline/createBrief.ts`.
- [x] Create home page shell.
- [x] Create brief result page shell.

## Phase 2 — Mock Pipeline

- [x] Create mock paper dataset.
- [x] Implement `mockSourceAdapter`.
- [x] Implement request validation with Zod.
- [x] Implement `POST /api/briefs` using mock pipeline.
- [x] Generate structured brief through DeepSeek using mock papers.
- [x] Render `/briefs/[id]` from mock/in-memory data.
- [x] Do not add PostgreSQL or Prisma yet.
- [x] Add loading and error states.

## Phase 3 — Durable Persistence

- [x] Add storage repository contract for future persistence.
- [x] Prepare Prisma.
- [x] Add PostgreSQL connection.
- [x] Add local Docker PostgreSQL service.
- [x] Create models: `Brief`, `Paper`, `BriefPaper`, `ApiCache`.
- [x] Add migration.
- [x] Run migration against local PostgreSQL.
- [x] Save generated brief to database.
- [x] Save selected papers to database.
- [x] Load brief result page from database.
- [x] Add optional PostgreSQL repository integration test.

## Phase 4 — Source Adapters

- [x] Implement arXiv adapter.
- [x] Implement Semantic Scholar adapter.
- [x] Implement OpenAlex adapter.
- [x] Add timeout handling.
- [x] Add retry with exponential backoff.
- [x] Add graceful failure with `Promise.allSettled`.
- [x] Add API cache.
- [x] Persist source API cache in PostgreSQL when `DATABASE_URL` is enabled.
- [x] Add deterministic query expansion for source search.

## Phase 5 — Paper Processing

- [x] Normalize paper metadata.
- [x] Deduplicate by DOI.
- [x] Deduplicate by arXiv ID.
- [x] Deduplicate by Semantic Scholar ID.
- [x] Deduplicate by OpenAlex ID.
- [x] Deduplicate by normalized title.
- [x] Implement simple relevance scoring.
- [x] Implement citation score.
- [x] Implement recency score.
- [x] Implement completeness score.
- [x] Add source quality and identifier signals.
- [x] Penalize weak relevance and prevent mock papers from dominating live-source selections.
- [x] Select top N papers.

## Phase 6 — AI Synthesis

- [x] Add provider-agnostic AI provider client wrapper.
- [x] Configure `AI_PROVIDER`, `AI_MODEL`, and `DEEPSEEK_API_KEY`.
- [x] Use DeepSeek V4 Pro as the default model.
- [x] Keep OpenAI/other providers swappable later.
- [x] Add research brief Zod schema.
- [x] Implement `synthesizeBrief`.
- [x] Force structured JSON output.
- [x] Validate AI output.
- [x] Retry once on invalid output.
- [x] Add source-grounding validator.
- [x] Ensure Polish queries produce Polish final briefs.
- [x] Allow query expansion to produce English search queries while preserving final report language.
- [x] Pass query variants into source search and AI synthesis.

## Phase 7 — UI Polish

- [x] Render TL;DR.
- [x] Render executive summary.
- [x] Render key findings.
- [x] Render major themes.
- [x] Render influential papers.
- [x] Render research gaps.
- [x] Render controversies / uncertainties.
- [x] Render suggested next questions.
- [x] Render bibliography.
- [x] Add clickable citations.
- [x] Add source drawer.
- [x] Add warnings for failed sources.
- [x] Improve home form styling and rate-limit feedback.
- [x] Add source/result diagnostics.
- [x] Show paper score breakdowns.
- [x] Add loading/progress state for brief generation.
- [x] Improve source warning visibility in result UI.
- [x] Track requested and successful sources separately.
- [x] Add per-adapter/query source diagnostics.
- [x] Add human citation labels, brief quality summary, reading path, and collapsed technical diagnostics.
- [x] Run multi-topic research-quality QA and improve relevance selection based on findings.
- [x] Add Research Quality Gate before AI synthesis to block weak source coverage.
- [x] Add source preflight preview before AI synthesis.

## Phase 8 — Export

- [x] Add Markdown export function.
- [x] Add `GET /api/export/[id]?format=markdown`.
- [x] Add export button.
- [x] Include bibliography in export.
- [x] Include search diagnostics and paper scores in export.

## Later

- [x] Add deployment readiness documentation.
- [x] Add in-memory rate limiting for costly brief generation requests.
- [x] Add source/API health panel.
- [x] Add manual refresh control for source/API health panel.
- [x] Persist source diagnostics in PostgreSQL when `DATABASE_URL` is enabled.
- [x] Add recent brief history on home page.
- [ ] Add user accounts.
- [ ] Add saved topics.
- [ ] Add weekly research digest.
- [ ] Add PDF parsing.
- [ ] Add embeddings.
- [ ] Add topic clustering.
- [ ] Add paper timeline.
- [ ] Add knowledge graph.

## Remediation Priorities

See `docs/REMEDIATION_PLAN.md` for the full audit-based repair plan.

- [x] Disable or scope public recent brief history before public deployment.
- [x] Fail fast in production when PostgreSQL persistence is missing or invalid.
- [x] Replace in-memory production rate limiting with Redis/KV-backed limiting.
- [x] Add an evidence boundary/disclaimer to the brief UI and Markdown export.
- [x] Improve DOI visibility as a first-class paper identifier.
- [x] Add claim-level evidence snippets and support validation.
- [x] Add controlled `Ask this brief` Q&A over selected papers after evidence validation.
- [x] Simplify brief result UX so non-technical users see takeaways before diagnostics.
- [ ] Simplify source preflight language for non-technical users.
- [ ] Restructure docs into product spec, current state, roadmap, and changelog.
