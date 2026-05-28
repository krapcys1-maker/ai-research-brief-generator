# QA Report

Last updated: 2026-05-28

## Scope

This report covers manual and API-level QA for the source-grounded research brief pipeline:

- source preflight and quality gate,
- Polish and English research queries,
- weak/noisy source coverage,
- Ask This Brief Q&A,
- Markdown export,
- UI rendering through Playwright.

The browser plugin was unavailable in this environment, so the visual pass used Playwright against the running local app at `http://localhost:3000`.

## Manual Checks

### UI Preflight

Query: `komórki macierzyste`

Sources: `mock`, `openalex`

Result:

- Source check rendered successfully.
- Quality gate: `Looks ready`.
- Candidate papers: `10`.
- Source mix: `10 live / 0 mock`.
- Warnings: `0`.
- Top papers showed `Partial topic match (0.60)` after query-variant alignment.

Screenshot:

- `C:/Users/user/AppData/Local/Temp/ai-brief-audit/07-ui-preflight-after-audit.png`

### API Preflight Benchmark

| Case | Query | Coverage | Can synthesize | Notes |
| --- | --- | --- | --- | --- |
| Polish biomedical | `komórki macierzyste` | `good` | `true` | Live OpenAlex papers selected; Polish query uses English query variants for alignment. |
| English RAG medicine | `retrieval augmented generation hallucinations medicine` | `good` | `true` | Direct topic matches found. |
| Comparative query | `RAG vs fine-tuning in medical question answering` | `limited` | `true` | Usable but should be treated cautiously because only part of the set directly supports comparison. |
| Weak/noisy query | `kwantowe banany w terapii nowotworów` | `poor` | `false` | Correctly blocked before AI synthesis. |

### Existing Brief Checks

Brief: `brief_mpppg3tw_7fb4oz`

Result:

- Brief fetch: `200`.
- Stored papers: `4`.
- Evidence snippets in brief JSON: `17`.
- Markdown export: `200`, includes Polish evidence-boundary section.
- Unsupported Q&A question about trial cost returned a source-bounded refusal with `notAnswerableFromSources: true`.
- Selection-rationale Q&A (`Dlaczego te artykuły zostały wybrane?`) now returns `200` with sourced claims and does not call the AI provider.

## Issues Found

### 1. Polish Query Alignment Was Underestimated

Before the fix, source preflight for `komórki macierzyste` selected relevant live papers, but the UI reported `Weak topic match (0.00)` because paper insight used only the original Polish query. The actual search had already expanded the query to English variants such as `stem cells`.

Impact:

- Users could see a misleading quality signal.
- The quality gate could be too optimistic or too pessimistic depending on which query string was used.

Fix:

- Query alignment now uses the full query-variant set.
- Brief rendering, source drawer, paper cards, and preflight insight use query variants instead of only the raw query.

### 2. Quality Gate Needed Stronger Alignment Checks

The quality gate previously looked at relevance, live source count, and warnings, but it did not explicitly require enough strong query alignment among selected papers.

Impact:

- A set of weakly related papers could look acceptable if enough papers were returned.

Fix:

- Added strong/weak alignment counts to the quality gate.
- `good` coverage now requires both source coverage and a minimum level of query alignment.

### 3. Ask This Brief Was Too Brittle for Polish Q&A

The Q&A validator correctly required evidence snippets, but it compared claim text and evidence too literally. A Polish claim grounded in English metadata could be rejected even when the cited paper was appropriate.

Impact:

- Useful Polish answers could fail validation.
- The API previously surfaced this as a technical `500`.

Fix:

- Claim overlap validation can now use cited paper metadata as additional support text.
- Added a small Polish-English grounding vocabulary for common research terms.
- Standalone publication years such as `2020` are no longer treated as unsupported quantitative claims.
- Q&A validation failure now returns a controlled `422` quality response instead of a generic server error.

### 4. Selection-Rationale Questions Should Not Require AI

The question `Dlaczego te artykuły zostały wybrane?` is about ranking and source selection, not external scientific content.

Impact:

- Sending this to the AI provider made the answer slower and more failure-prone.

Fix:

- Added deterministic selection-rationale answers based on selected paper metadata.
- The answer still includes `sourcePaperIds` and evidence snippets.

### 5. Duplicate React Keys in Warning Lists

Repeated warning strings could produce duplicate React keys.

Impact:

- Development console warnings.
- Potential unstable rendering when the same source warning appeared several times.

Fix:

- Warning, reason, suggestion, and strength list keys now include the list index.

## Remaining Weak Points

### 1. Synchronous AI Generation Is Still Too Slow

Manual generation/Q&A can take tens of seconds with the live AI provider. A mock-only generation request timed out from the caller after about 110 seconds.

Recommended solution:

- Move generation to a job flow:
  - `POST /api/briefs/jobs`
  - `GET /api/briefs/jobs/[id]`
  - `GET /api/briefs/[id]`
- Keep progress polling in the UI.
- Store intermediate status and validation errors.

### 2. Grounding Is Still Metadata/Abstract-Level

The app validates against titles, abstracts, venues, and metadata. It does not verify full methods, tables, figures, or detailed results.

Recommended solution:

- Add full-text/PDF ingestion as a separate evidence layer.
- Clearly label evidence as `metadata`, `abstract`, or `full_text`.
- Only allow detailed methodology/result claims when full-text evidence exists.

### 3. Retrieval Is Still Mostly Lexical

Query variants improved Polish and English retrieval, but hard queries with synonyms, acronyms, or interdisciplinary wording still need better semantic retrieval.

Recommended solution:

- Add hybrid retrieval:
  - lexical/BM25 score,
  - embedding similarity,
  - metadata quality,
  - source diversity.
- Create benchmark fixtures before tuning weights.

### 4. Source Adapter Noise Needs Better UX

arXiv can return `429` or aborted requests; OpenAlex can return empty results for some variants. The app handles these as warnings, but the UI can become noisy.

Recommended solution:

- Group repeated warnings by source and message.
- Separate `temporary source issue` from `no relevant papers`.
- Add retry/backoff diagnostics per adapter.

### 5. Public History Still Needs a Privacy Decision

Before public deployment, global recent briefs can leak research interests or private topics.

Recommended solution:

- Use session-scoped brief history by default.
- Add authentication before shared persistent history.
- Add private/share tokens for links.

## Verification Commands

Run after the fixes:

```bash
npm test
npm run lint
npm run build
```

