# Remediation Plan

Last updated: 2026-05-28

## Audit Verdict

The product audit is broadly correct.

The project is no longer just a clean MVP. It is closer to a pre-MVP+ prototype with real source adapters, PostgreSQL persistence, source cache, source diagnostics, quality gate, Markdown export, tests, and manual UI QA.

The strongest product direction is still valid: this should remain a controlled research pipeline, not a generic AI chat wrapper.

The main risks are:

- claim grounding is still mostly ID-level, not evidence-level
- public brief history can expose user research topics without authentication
- production storage can silently fall back to memory mode
- rate limiting now has a shared Upstash Redis REST production backend, but production envs must be configured before public deploy
- documentation mixes historical MVP rules with the current implemented state
- some UX surfaces expose too much diagnostic detail before explaining user value

## Audit Accuracy

| Audit point | Verdict | Notes |
| --- | --- | --- |
| `sourcePaperIds` do not prove claim-level grounding | Correct | `validateBriefGrounding` checks that IDs exist and are non-empty. It does not verify that the cited paper supports the claim. |
| MVP documentation is inconsistent with current state | Correct | `PROJECT.md`, `README.md`, `docs/ARCHITECTURE.md`, and `docs/MVP_SPEC.md` still contain historical "no PostgreSQL in MVP" language while PostgreSQL is already implemented. |
| Public recent brief history is risky without auth | Correct | `GET /api/briefs` returns repository summaries, and the home page has recent brief history. |
| In-memory rate limiting is not production-grade | Addressed | Local/test still use memory, while production can use Upstash Redis REST and fails fast without shared limiting unless an explicit demo escape hatch is set. |
| Production fallback to in-memory storage is risky | Correct | Current repository selection falls back to memory when `DATABASE_URL` is invalid or missing. This is convenient in development but dangerous in production. |
| Source quality and ranking need stronger validation | Mostly correct | Source preflight and quality gate now exist, but they are still heuristic and should be clearer and stricter. |
| Scoring is heuristic | Correct | Current scoring is improved but still keyword/metadata based. Embeddings or hybrid retrieval are not implemented. |
| shadcn/ui mismatch | Correct but low priority | It appears in stack/TODO but is not implemented. This is a documentation/decision issue more than a product risk. |
| Synchronous generation is a future bottleneck | Correct | Current request path is acceptable for MVP but should become a job flow before heavier source/full-text work. |
| Diagnostics can overwhelm users | Correct | Some diagnostics are collapsed, but the product should lead with usefulness and confidence, not adapter internals. |

## P0: Before Public Use

### 1. Protect brief history

Problem:

`GET /api/briefs` and the recent history panel can expose generated topics and brief metadata globally.

Target behavior:

- In development, recent history can remain visible.
- In production without auth, global history must be disabled.
- Later, history should be scoped to a user/session/team.

Implementation plan:

1. Add `PUBLIC_BRIEF_HISTORY_ENABLED=false` default for production.
2. In `GET /api/briefs`, return `403` or an empty list when public history is disabled.
3. Hide the recent history panel when disabled.
4. Add tests for enabled/disabled modes.

Acceptance criteria:

- Production default does not expose global brief summaries.
- Local development can still show history for debugging.

### 2. Fail fast on invalid production persistence

Problem:

Missing or invalid `DATABASE_URL` currently falls back to in-memory storage. In production this can cause silent data loss.

Target behavior:

- `development`: memory fallback allowed.
- `test`: memory fallback allowed.
- `production`: valid PostgreSQL `DATABASE_URL` required unless an explicit escape hatch is set.

Implementation plan:

1. Add `ALLOW_MEMORY_STORAGE_IN_PRODUCTION=false` default.
2. Update `getPersistenceStatus()` to mark production memory mode as fatal unless explicitly allowed.
3. Make repository initialization throw a clear startup/runtime error in production when persistence is invalid.
4. Update deployment docs.
5. Add repository selection tests for production fail-fast behavior.

Acceptance criteria:

- A production deployment with missing/invalid `DATABASE_URL` fails loudly.
- The user sees a clear configuration error instead of silent memory mode.

### 3. Replace process-local rate limiting

Status: completed for the current production target.

Problem:

The old rate limiter used an in-memory `Map`, so limits were not shared across instances.

Target behavior:

- Single-instance local dev can use memory.
- Production should use Redis/KV-backed rate limiting.

Implementation plan:

1. Introduce a `RateLimiter` interface.
2. Keep the current memory limiter as `MemoryRateLimiter`.
3. Add `RedisRateLimiter` or `KvRateLimiter`.
4. Configure via env:
   - `RATE_LIMIT_BACKEND=memory|upstash`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
5. In production, warn or fail if backend is `memory`.
6. Add tests around limiter selection and 429 responses.

Acceptance criteria:

- Multi-instance deployments share limits.
- `POST /api/briefs` remains protected with the same response contract.

### 4. Add visible quality disclaimer

Problem:

The app uses metadata and abstracts, not full-text paper ingestion. Users should understand the confidence boundary.

Target behavior:

- Brief result page clearly states whether the result is based on metadata/abstracts only.
- Export includes the same limitation.

Implementation plan:

1. Add a short "Evidence boundary" block to the brief result page.
2. Include source coverage, abstract availability, and full-text status.
3. Add the same note to Markdown export.

Acceptance criteria:

- Users know the brief is not full-text verification unless full-text ingestion exists.

## P1: Biggest Research Quality Improvements

### 5. Treat DOI as a first-class source identifier

Problem:

DOI is already present in the `NormalizedPaper` type and bibliography, but the product should make it more prominent because it is one of the strongest stable identifiers for scholarly sources.

Target behavior:

- DOI is shown clearly wherever a paper is shown.
- DOI is rendered as a clickable `https://doi.org/...` link when present.
- DOI is included in Markdown export.
- DOI remains source-provided only. AI must never invent or repair DOI values.
- DOI continues to be used as a high-priority deduplication key.

Implementation plan:

1. Audit paper cards, bibliography, source drawer, Markdown export, and preflight previews for DOI visibility.
2. Add a small DOI link helper that formats DOI consistently.
3. Prefer DOI as the user-facing stable reference when it exists, while preserving internal `paperId`.
4. Add tests proving generated/synthesized AI output cannot introduce DOI values outside selected paper metadata.

Acceptance criteria:

- A user can quickly open the canonical DOI page for papers that provide DOI metadata.
- No DOI value is ever model-generated.

### 6. Add claim-level evidence grounding

Problem:

Existing grounding validation confirms IDs, not claim support.

Target behavior:

Each major claim should include evidence objects:

```ts
type EvidenceLink = {
  paperId: string;
  evidenceText: string;
  supportLevel: "direct" | "indirect" | "weak";
};
```

Implementation plan:

1. Extend Zod schemas for key findings, themes, gaps, uncertainties, and executive summary claims.
2. Update AI prompt to require evidence snippets copied or tightly paraphrased from paper title/abstract/metadata.
3. Add `validateClaimEvidence()`:
   - paper ID exists
   - evidence text is non-empty
   - evidence text has lexical overlap with source title/abstract
   - weak support is allowed only when confidence/caveats reflect uncertainty
4. Render evidence snippets in the source drawer or under each finding.
5. Add tests for direct, indirect, weak, and invalid evidence.

Acceptance criteria:

- A key finding cannot pass with only a real paper ID and unsupported prose.
- Users can see why a source supports a claim.

### 7. Add controlled "Ask this brief" Q&A

Status: completed for source-bounded single-turn Q&A.

Problem:

Users naturally want to ask follow-up questions such as "why were transformers chosen?" or "what benefits do these papers claim?", but a generic chat would undermine the product's source-grounded promise.

Target behavior:

Add a controlled Q&A mode over one generated brief:

- answers only from the selected papers for that brief
- every answer includes cited `paperId` values and DOI links when available
- every important claim includes evidence snippets
- if the selected papers do not support an answer, the system says so
- no open-web browsing
- no global chat over all stored data
- no model-generated DOI, author, title, URL, or venue values

Suggested schema:

```ts
type BriefQuestionAnswer = {
  answer: string;
  confidence: "low" | "medium" | "high";
  notAnswerableFromSources: boolean;
  claims: {
    claim: string;
    sourcePaperIds: string[];
    evidenceSnippets: string[];
    supportLevel: "direct" | "indirect" | "weak";
  }[];
  suggestedFollowUpQuestions: string[];
};
```

Implementation plan:

1. Add `POST /api/briefs/[id]/questions`.
2. Load only the brief and selected papers for that `id`.
3. Prompt the AI to answer only from selected paper metadata/abstracts.
4. Validate the response with Zod.
5. Reuse or extend claim-level evidence validation.
6. Render citations and evidence snippets under each answer.
7. Add hard refusal behavior for unsupported questions.

Current implementation:

- `POST /api/briefs/[id]/questions` loads only the requested brief and its selected papers.
- Answers are validated with `BriefAnswerSchema`.
- Answer claims must cite selected paper IDs and evidence snippets that overlap selected paper metadata.
- Unsupported questions can return `notAnswerableFromSources: true` with no claims.
- The UI renders an `Ask This Brief` panel with answer confidence, claims, citations, evidence, and follow-up question chips.

Acceptance criteria:

- A question about the selected literature gets a grounded answer with evidence.
- A question not answerable from the selected papers returns a clear "not supported by these sources" answer.
- The Q&A feature does not behave like a general chatbot.

Recommendation:

Do not implement this before claim-level evidence validation. Without evidence snippets, Q&A would create a high risk of false citation.

### 8. Strengthen source coverage assessment

Status: partially completed.

Problem:

Current source preflight is useful but still technical and heuristic.

Target behavior:

Preflight should answer:

- Is this topic ready for a brief?
- Are the papers actually about the query?
- Are live sources strong enough?
- What should the user change?

Implementation plan:

1. Add coverage labels:
   - "ready"
   - "limited but usable"
   - "too weak"
2. Add coverage dimensions:
   - relevant paper count
   - live source count
   - abstract coverage
   - identifier coverage
   - source diversity
   - query-title alignment
3. Make poor coverage block generation by default.
4. Polish the preflight UI language and reduce technical wording.

Current implementation:

- The home preflight panel now uses user-facing labels: "Looks ready", "Usable with caution", and "Not enough evidence yet".
- Candidate count, source mix, and warning count are shown as the primary summary.
- Technical counts such as found, deduped, selected, and average relevance are collapsed under "Technical source details".
- Remaining follow-up: add richer coverage dimensions such as abstract coverage, identifier coverage, source diversity, and query-title alignment.

Acceptance criteria:

- A weak/off-topic query is blocked with actionable suggestions.
- A good query explains why it is good enough.

### 9. Add hybrid retrieval

Problem:

Keyword and metadata scoring will miss synonyms, acronyms, Polish/English variants, and interdisciplinary topics.

Target behavior:

Ranking combines:

- lexical relevance
- semantic similarity
- metadata quality
- recency/citation balance
- source diversity

Implementation plan:

1. Add an embeddings provider abstraction separate from the chat provider.
2. Store/query embeddings for selected candidate papers.
3. Use hybrid scoring in `score.ts`.
4. Keep deterministic scoring as a fallback when embeddings are unavailable.
5. Add benchmark fixtures for synonym and cross-language cases.

Acceptance criteria:

- Top papers improve on queries where exact keywords are weak.
- App still works when embeddings are disabled.

### 10. Move generation to jobs

Problem:

Synchronous `POST /api/briefs` can time out or feel frozen as source count, retries, and validation grow.

Target behavior:

```text
POST /api/briefs/jobs -> creates job
GET /api/briefs/jobs/[id] -> progress/status
GET /api/briefs/[id] -> final result
```

Implementation plan:

1. Add job schema and repository.
2. Move pipeline execution into a background worker or server-side job runner.
3. Update UI progress to poll job status.
4. Keep current synchronous path only for development or tests until migration is complete.

Acceptance criteria:

- UI can show real pipeline progress.
- Long generations do not rely on a single open request.

## P2: Product and UX

### 11. Clean up documentation structure

Status: completed for the current docs pass.

Problem:

Current docs mix historical instructions, implemented state, and future roadmap.

Target structure:

- `docs/PRODUCT_SPEC.md`: target product vision and non-negotiable rules
- `docs/CURRENT_STATE.md`: what works now
- `docs/ROADMAP.md`: prioritized future work
- `docs/REMEDIATION_PLAN.md`: this risk-driven plan
- `STATUS.md`: short current snapshot, not a full changelog
- `TODO.md`: active work only, not historical phases

Implementation plan:

1. Extract current behavior from `STATUS.md`.
2. Move old phase history to `docs/CHANGELOG.md` or archive it.
3. Update `PROJECT.md` so it no longer contradicts implemented PostgreSQL support.
4. Decide whether shadcn/ui remains in scope.

Current implementation:

- Added `docs/CURRENT_STATE.md` for implemented behavior.
- Added `docs/PRODUCT_SPEC.md` for product rules and intended value.
- Added `docs/ROADMAP.md` for prioritized future work.
- Added `docs/CHANGELOG.md` for major milestone history.
- Shortened `STATUS.md` into a current snapshot.
- Reworked `TODO.md` into active work only.
- Updated `README.md`, `PROJECT.md`, `docs/ARCHITECTURE.md`, and `docs/MVP_SPEC.md` so historical MVP notes no longer contradict optional PostgreSQL support.
- Marked shadcn/ui as optional because the current app uses custom CSS.

Acceptance criteria:

- A new contributor can tell the difference between "implemented", "planned", and "historical".

### 12. Simplify primary brief UX

Status: partially completed for the brief result page.

Problem:

The product should lead with research value, not diagnostics.

Target behavior:

Main brief order:

1. One-sentence answer
2. Confidence/evidence boundary
3. Three most important papers
4. What is well supported
5. What is uncertain
6. Research gaps
7. Bibliography
8. Technical diagnostics collapsed

Implementation plan:

1. Add a high-level "What this gives you" summary to generated brief UI.
2. Keep score details and adapter diagnostics behind collapsible sections.
3. Improve paper cards around "why read this paper".

Current implementation:

- The result page now leads with bottom line, confidence, evidence base, reading path, and priority takeaways.
- Technical source diagnostics and evidence-boundary metrics are collapsed under "Source and Quality Details".
- Remaining follow-up: simplify source preflight language and improve paper-level "why read this" explanations.

Acceptance criteria:

- A non-technical user can understand the brief value in under 30 seconds.

### 13. Decide shadcn/ui scope

Problem:

shadcn/ui is listed in the stack and TODO, but the app uses custom CSS.

Options:

- Adopt shadcn/ui for forms, buttons, cards, alerts, dialogs, tabs, and drawers.
- Or remove shadcn/ui from the stack and TODO.

Recommendation:

Keep current custom CSS for now unless the UI starts needing many reusable states. Treat shadcn/ui as optional, not required.

### 14. Later research features

Recommended order:

1. User accounts and private saved topics
2. PDF/full-text ingestion
3. Topic clustering
4. Paper timeline
5. Comparison mode
6. Weekly digest
7. Knowledge graph

## Immediate Execution Order

The original P0/P1 repair sequence is mostly complete. The next recommended implementation steps are now:

1. Add richer source coverage assessment.
2. Improve paper-level "why read this paper" explanations.
3. Add adapter contract tests for source API response drift.
4. Add embeddings provider abstraction.
5. Add hybrid retrieval.
6. Move long generation to a job flow.

Use `docs/ROADMAP.md` as the active planning source.
