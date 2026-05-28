# Changelog

This file summarizes major project milestones. Detailed turn-by-turn history used to live in `STATUS.md`; current state now lives in `docs/CURRENT_STATE.md`.

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
