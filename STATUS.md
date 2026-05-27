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

## Important Current Decisions

- Build Phase 1 and Phase 2 first.
- Real academic source adapters exist, but the app still supports mock data and graceful partial failures.
- Do not add PostgreSQL or Prisma yet.
- Do not add authentication, payments, PDF parsing, or autonomous web browsing.
- All AI output must be structured and validated with Zod.
- Every key finding, major theme, research gap, and uncertainty must include `sourcePaperIds`.
- Every cited paper ID must exist in the selected paper list.

## Next Recommended Step

Improve source quality/ranking further with better normalization and source result diagnostics, or add durable persistence when ready to move beyond process memory.
