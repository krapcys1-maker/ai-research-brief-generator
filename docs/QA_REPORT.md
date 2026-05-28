# QA Report

Last updated: 2026-05-28

## Scope

This QA pass tested the app as a source-grounded research brief pipeline using real UI/API flows and live source adapters.

Test topics:

- `komórki macierzyste w leczeniu oparzeń`
- `retrieval augmented generation hallucinations medicine`
- `AI agents in software engineering`
- `CRISPR gene therapy safety`
- `perovskite solar cells stability`

## What Passed

- Brief generation works end-to-end through the running app.
- Polish queries produce Polish reports when the request text is correctly encoded as UTF-8.
- Markdown export works for generated briefs.
- Source IDs are validated and remain clickable in the UI.
- The result page renders without mobile horizontal overflow after the viewport/CSS fix.
- OpenAlex can provide useful live-source coverage for biomedical, AI, software engineering, CRISPR, and perovskite queries.

## Issues Found

- Weak mock fallback papers could be selected when live sources returned too few relevant papers.
- Generic query-expansion terms such as `systematic review`, `benchmark`, and `survey` could inflate lexical relevance for off-topic papers.
- Relevance scoring weighted abstract matches too strongly, so papers with loosely related abstracts could outrank papers whose titles directly matched the query.
- Empty live-source responses were cached, which could hide later successful source responses.
- Polish biomedical treatment terms needed better English query expansion for live-source search.

## Fixes Applied

- Added Polish-to-English query expansion for stem-cell and burn-treatment terms.
- Added domain-specific query variants for burn-wound stem-cell searches.
- Changed scoring to ignore generic expansion terms when computing relevance.
- Changed scoring to weight title matches more strongly than abstract/venue matches.
- Added light plural normalization for English terms such as `agents`, `cells`, `burns`, and `transformers`.
- Changed paper selection so weak mock fallback records no longer fill a brief when live-source papers are requested.
- Changed the pipeline to return a controlled “no relevant papers” error instead of synthesizing from irrelevant papers.
- Changed source API cache behavior so empty responses are not persisted and old empty cache records are ignored.

## Retest Results

`komórki macierzyste w leczeniu oparzeń`

- Before fix: 1 relevant OpenAlex paper plus 9 unrelated mock papers.
- After fix with UTF-8 request: 10 OpenAlex papers, average relevance `1.00`, no warnings.
- Top papers included burn-wound and mesenchymal-stem-cell therapy papers.

`AI agents in software engineering`

- Before fix: off-topic OpenAlex papers such as COVID prognosis/systematic-review papers could rank near the top.
- After fix: top papers focused on AI agents, software engineering automation, OpenHands, LLM-based agents, and software engineering education.
- Source mix after retest: 7 OpenAlex, 3 arXiv.
- Average relevance after retest: `0.72`.

## Remaining QA Notes

- Some DOI/source URLs return `403` to automated HEAD/GET checks even though the DOI itself may be valid in a browser.
- arXiv intermittently returns timeouts or `429`; this is handled as a source warning.
- The app should eventually distinguish “link blocked by publisher” from “dead link” in diagnostics.
- A dedicated visual smoke test could be added to the repo later with Playwright as a dev dependency.
