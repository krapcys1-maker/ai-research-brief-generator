# Roadmap

Last updated: 2026-06-02

## P0: Production Readiness

- Keep DB-backed brief and full-text workers separated from the web process;
  replace them with a stronger external queue when multi-instance production
  throughput requires it.
- Add authentication and user-scoped private storage before public multi-user document upload.
- Add session-scoped/private brief history.
- Keep production PostgreSQL fail-fast behavior enabled.
- Keep production shared rate limiting enabled through Upstash Redis REST or equivalent KV.
- Add a clear production privacy note before enabling public deployments, especially for uploaded documents.

## P1: Research Quality

- Configure and evaluate a production embedding provider in deployment.
- Expand hybrid retrieval beyond the current lexical + local semantic signal:
  - model-grade embedding similarity
  - source diversity
  - citation/recency balance tuning
- Continue expanding retrieval and source-quality benchmarks beyond the current
  real live-source gold queries and hard negatives, especially for non-English
  topics and more source adapter failure modes.
- Expand metadata-quality rules with more recorded live-source anomalies and canonical paper fixtures.
- Add more claim/evidence benchmark fixtures for methodological claims, such as sample size, study design, and evaluation setting.
- Expand paper full-text ingestion tests with recorded arXiv/OA PDF fixtures and parser-quality edge cases.
- Expand uploaded-document retrieval tests with longer PDFs, noisy extraction, and multi-document questions.
- Continue expanding Compare With Science benchmarks beyond the current
  deterministic, recorded live-source, and full-text-supported cases with more
  provider/adapter drift and long-document evidence cases.
- Keep `npm run benchmark:quality-gate` in CI so retrieval, source-quality, and
  claim-check regressions fail before deploy.

## P1: Project Idea And Architecture Quality

- Keep `npm run benchmark:project-pipeline` in CI so idea discovery, AI idea
  guardrails, GitHub collection, GH Archive cost safety, research, PRD and
  architecture regressions fail before deploy.
- Add docs/script consistency checks so project pipeline documentation cannot
  drift from available commands and artifacts.
- Expand recorded GitHub fixtures for noisy README text, multilingual issues,
  session reliability, provider routing, document conversion, context
  compression and self-hosted AI governance.
- Keep `ProjectIdeaInput` handoff quality scoring in the idea benchmark so
  generic constraints, weak domains, missing non-goals or missing research
  questions fail before research spend.
- Keep architecture judge scoring in the project architecture benchmark so
  schema-valid but generic architectures fail before implementation planning.
- Keep `npm run benchmark:project-bucket-relevance` in the project pipeline so
  bucket-specific false positives fail before weak papers become PRD or
  architecture evidence. Track `project-bucket-relevance-latest.json`,
  `project-bucket-relevance-latest.md`, `falsePositiveRejectRate` and
  `truePositiveAcceptRate` as hard relevance regression signals.
- Keep `npm run benchmark:project-paper-relevance` in the project pipeline so
  the final `paper_relevance_judgement` layer rejects cross-domain papers that
  happen to share generic bucket wording. Track
  `project-paper-relevance-judge-latest.json`,
  `project-paper-relevance-judge-latest.md`,
  `paperJudgeFalsePositiveRejectRate` and `paperJudgeTruePositiveKeepRate`.
- Keep controlled live GH Archive batch sampling in `npm run benchmark:project-live-batch`,
  with strict byte caps, cached GitHub enrichment, `controlled_live_batch_summary.json`,
  `controlled_live_batch_summary.md`, and decision metrics such as `trendRepoCount`,
  `sourceRepoCount`, `handoffReadyCount`, `averageHandoffQualityScore` and `blockerCount`.
  `handoffReviewCount` and `handoffBlockedCount` separate source-evidence review
  from fully blocked handoffs.

## P2: Product UX

- Add user accounts and private saved topics.
- Improve `Ask My Documents` with document collections, retention controls, and clearer deletion/audit UI.
- Improve Compare With Science with better saved-report ergonomics, claim review
  controls, and clearer source filters.
- Add saved brief collections.
- Add comparison mode for prompts such as "RAG vs fine-tuning in medicine".
- Add paper timeline and topic clustering.

## P3: Deeper Research Features

- Improve PDF/full-text ingestion beyond the current parser diagnostics,
  optional page ranges, controlled background jobs, and difficult-PDF fixtures
  by adding real OCR/table handling.
- Improve Compare With Science with durable DB-backed/external compare jobs and
  deeper claim-level evidence ranking.
- Add citation graph / related work graph.
- Add weekly research digest after accounts and saved topics exist.
- Add knowledge graph only after source quality and full-text strategy are stable.

## Deferred / Optional

- shadcn/ui adoption is optional. Current custom CSS is acceptable until reusable component complexity increases.
- Additional AI providers can be added behind the existing provider abstraction.
- OpenAI, Anthropic, or custom providers should not be hardcoded through the app.
