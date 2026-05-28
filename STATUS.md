# Project Status

## Current State

This folder now contains a working Next.js App Router MVP implementation.

The app works as a source-grounded research pipeline, not as a generic chatbot.

## Completed

- Reviewed the project files:
  - `README.md`
  - `PROJECT.md`
  - `TODO.md`
  - `CURSOR_START_PROMPT.md`
  - `docs/ARCHITECTURE.md`
  - `docs/MVP_SPEC.md`
  - `docs/PROMPTS.md`
  - `.cursor/rules/*.mdc`
  - `.env` variable names only, without reading or logging secret values
- Confirmed that there is no git repository initialized in this folder.
- Added language rules to the project plan:
  - detect the language of the user query
  - generate the final research brief in the same language
  - keep paper titles, author names, journal names, venue names, and DOI values unchanged
  - if the query is Polish, summaries, explanations, findings, gaps, uncertainties, and recommendations must be in Polish
- Updated the project plan to use a provider-agnostic AI architecture.
- Set DeepSeek V4 Pro as the default AI configuration:
  - provider: `deepseek`
  - model: `deepseek-v4-pro`
- Updated environment configuration expectations:
  - `AI_PROVIDER`
  - `AI_MODEL`
  - `DEEPSEEK_API_KEY`
- Updated MVP storage plan:
  - no PostgreSQL in MVP
  - no Prisma in MVP
  - use mock data and in-memory/mock storage first
  - keep persistence-ready types for later database work
- Added rule that search query expansion may produce English queries, but the final report language must match the original user query language.
- Created the Next.js App Router project scaffold.
- Added TypeScript, Tailwind CSS, ESLint, and build configuration.
- Added mock academic paper data.
- Implemented source adapter types and a mock source adapter.
- Implemented Zod schemas for request, papers, and research brief output.
- Implemented deduplication, scoring, top-paper selection, and source-grounding validation.
- Implemented provider-agnostic AI client with DeepSeek as the current provider.
- Implemented DeepSeek structured JSON synthesis with one retry for validation/grounding failures.
- Implemented controlled missing-key error for `DEEPSEEK_API_KEY`.
- Implemented global in-memory brief storage for the MVP.
- Implemented `POST /api/briefs`, `GET /api/briefs`, and `GET /api/briefs/[id]`.
- Implemented home page form and `/briefs/[id]` result page.
- Verified a Polish query generated a brief with `outputLanguage: pl`.
- Verified cited `sourcePaperIds` exist in the selected paper list.
- Verified `npm run lint` passes.
- Verified `npm run build` passes.
- Initialized a local git repository.
- Created public GitHub repository `krapcys1-maker/ai-research-brief-generator`.
- Published branch `codex/initial-mvp` to GitHub.
- Confirmed `.env`, `.next`, and `node_modules` are ignored and not included in the committed tree.
- Added interactive source drawer for citation/source inspection.
- Added Markdown export function and `GET /api/export/[id]?format=markdown`.
- Added export link on the brief result page.
- Added `searchSummary.warnings` support for future graceful source-adapter failures.
- Verified `npm run lint` and `npm run build` after the export/source drawer changes.
- Implemented real academic source adapters:
  - arXiv Atom API
  - Semantic Scholar Graph API
  - OpenAlex Works API
- Wired source selection into the home form.
- Added optional year range inputs to the home form.
- Added source search orchestration with `Promise.allSettled`.
- Added timeout/retry helper for external source requests.
- Verified arXiv and OpenAlex return papers for a small test query.
- Verified Semantic Scholar 429 rate limiting is captured as a warning rather than crashing the whole search.
- Verified multi-source search can continue with arXiv and OpenAlex when Semantic Scholar is rate limited.
- Added in-memory TTL cache for source API results.
- Added `GET /api/source-cache` diagnostics with aggregate cache counts only.
- Verified repeated source searches hit cache instead of repeating external calls.
- Added deterministic query expansion for source search.
- Added Polish-to-English academic query variants while preserving the final brief language.
- Wired query variants into multi-source search and AI synthesis metadata.
- Verified expanded search can return papers from arXiv/OpenAlex for a Polish hallucination query.
- Added Vitest test setup.
- Added unit tests for language detection, query expansion, deduplication, and source-grounding validation.
- Fixed title normalization so punctuation becomes spacing instead of merging words during deduplication.
- Verified `npm test`, `npm run lint`, and `npm run build`.
- Added dependency injection to `createBrief` so the full pipeline can be tested without calling DeepSeek.
- Added tests for the mock-paper brief pipeline and Polish output-language handling.
- Added tests for `POST /api/briefs` success and controlled missing-provider-key failure responses.
- Verified `npm test` now covers 14 tests across 6 test files.
- Added source/result diagnostics to the brief UI:
  - requested sources
  - selected paper source distribution
  - total found, after deduplication, and used in brief counts
  - query variants and source warnings
- Fixed brief metadata handling so `id`, `query`, `outputLanguage`, `generatedAt`, and `searchSummary` remain app-controlled instead of model-controlled.
- Added a unit test for app-controlled AI synthesis metadata.
- Verified `npm test`, `npm run lint`, and `npm run build` after the diagnostics UI change.
- Improved paper ranking with per-source quality priors, identifier scoring, influential-citation blending, and explicit scoring breakdown fields.
- Added scoring tests to confirm metadata quality helps when relevance is comparable while relevance remains the strongest signal.
- Verified `npm test`, `npm run lint`, and `npm run build` after the scoring update.
- Added score breakdowns to bibliography paper cards, including final score plus relevance, citations, recency, completeness, source, and identifier scores.
- Verified `npm test`, `npm run lint`, and `npm run build` after the score breakdown UI change.
- Extended Markdown export with query variants, warnings, paper source metadata, influential citations, final score, and score breakdowns.
- Added Markdown export test coverage for search diagnostics and paper scores.
- Verified `npm test`, `npm run lint`, and `npm run build` after the export metadata update.
- Added a loading/progress panel to the research form for long synchronous DeepSeek generations.
- Disabled form controls while a brief is being generated to prevent duplicate or conflicting submissions.
- Verified `npm test`, `npm run lint`, and `npm run build` after the progress UI update.
- Improved result-page warning visibility by grouping repeated source/query warnings and showing warning counts in the brief header and diagnostics section.
- Renamed the source diagnostics label from requested sources to successful sources to match the current `sourcesUsed` meaning.
- Verified `npm test`, `npm run lint`, and `npm run build` after the warning UI update.
- Added `requestedSources` to `searchSummary` so the app can show user-selected sources separately from successful sources.
- Updated result diagnostics, Markdown export, prompt schema example, fixtures, and pipeline tests for requested-vs-successful source tracking.
- Verified `npm test`, `npm run lint`, and `npm run build` after the `requestedSources` update.
- Added per-adapter/query `sourceDiagnostics` with source, query, status, result count, cache flag, and optional message.
- Rendered adapter diagnostics in the brief result page and included them in Markdown export.
- Added pipeline test coverage to ensure source diagnostics are stored in `searchSummary`.
- Verified `npm test`, `npm run lint`, and `npm run build` after the source diagnostics update.

## Important Current Decisions

- Build Phase 1 and Phase 2 first.
- Real academic source adapters exist, but the app still supports mock data and graceful partial failures.
- Do not add PostgreSQL or Prisma yet.
- Do not add authentication, payments, PDF parsing, or autonomous web browsing.
- All AI output must be structured and validated with Zod.
- Every key finding, major theme, research gap, and uncertainty must include `sourcePaperIds`.
- Every cited paper ID must exist in the selected paper list.

## Next Recommended Step

Next practical options: add a small API/source health panel, add result history/search on the home page, or add durable persistence when ready to move beyond process memory.
