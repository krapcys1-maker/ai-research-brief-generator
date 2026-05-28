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

- [ ] Prepare Prisma.
- [ ] Add PostgreSQL connection.
- [ ] Create models: `Brief`, `Paper`, `BriefPaper`, `ApiCache`.
- [ ] Add migration.
- [ ] Save generated brief to database.
- [ ] Save selected papers to database.
- [ ] Load brief result page from database.

## Phase 4 — Source Adapters

- [x] Implement arXiv adapter.
- [x] Implement Semantic Scholar adapter.
- [x] Implement OpenAlex adapter.
- [x] Add timeout handling.
- [x] Add retry with exponential backoff.
- [x] Add graceful failure with `Promise.allSettled`.
- [x] Add API cache.
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
- [x] Add source/result diagnostics.

## Phase 8 — Export

- [x] Add Markdown export function.
- [x] Add `GET /api/export/[id]?format=markdown`.
- [x] Add export button.
- [x] Include bibliography in export.

## Later

- [ ] Add user accounts.
- [ ] Add saved topics.
- [ ] Add weekly research digest.
- [ ] Add PDF parsing.
- [ ] Add embeddings.
- [ ] Add topic clustering.
- [ ] Add paper timeline.
- [ ] Add knowledge graph.
