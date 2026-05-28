# Project Status

Last updated: 2026-05-28

## Current Snapshot

AI Research Brief Generator is a working source-grounded research brief prototype.

The app supports:

- mock, arXiv, Semantic Scholar, and OpenAlex source adapters
- source preflight and Research Quality Gate
- paper normalization, dedupe, ranking, and top-paper selection
- DeepSeek V4 Pro structured synthesis through a provider abstraction
- Zod validation for AI outputs
- claim-level `sourcePaperIds` and evidence snippets
- Markdown export
- controlled `Ask This Brief` Q&A over selected papers
- optional PostgreSQL/Prisma persistence
- source API cache and source diagnostics
- production fail-fast persistence and shared Upstash rate limiting

## Current Docs

- Current implemented behavior: `docs/CURRENT_STATE.md`
- Future work: `docs/ROADMAP.md`
- Major milestone history: `docs/CHANGELOG.md`
- Risk-driven repair plan: `docs/REMEDIATION_PLAN.md`
- Deployment notes: `docs/DEPLOYMENT.md`

## Important Current Decisions

- This is a controlled research pipeline, not a generic chatbot.
- The app can run locally without PostgreSQL, but production requires PostgreSQL unless an explicit temporary demo escape hatch is set.
- DeepSeek is the default implemented AI provider, but the architecture remains provider-agnostic.
- AI output must be structured and validated with Zod.
- Important claims must include valid selected-paper IDs and evidence snippets.
- The current evidence boundary is metadata/abstract grounding, not full-text PDF verification.
- Public recent history is disabled by default in production.
- shadcn/ui is optional and not currently implemented.

## Latest Completed Step

Added deterministic source-quality and paper-level reading guidance. Preflight, the reading path, source drawer, bibliography cards, and Markdown export now explain why a paper was selected, what kind of source it is, and which metadata limitations should be checked.

## Next Recommended Step

Follow `docs/ROADMAP.md`. The next practical product step is adding query-title alignment as an explicit quality signal, then adapter contract tests for arXiv, Semantic Scholar, and OpenAlex response drift.
