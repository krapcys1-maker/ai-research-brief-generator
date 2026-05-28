# MVP Spec — AI Research Brief Generator

This document describes the historical MVP baseline. For implemented behavior, use `docs/CURRENT_STATE.md`. For future work, use `docs/ROADMAP.md`.

## User story

As a user, I want to enter a research topic and receive a concise research brief grounded in academic paper metadata and abstracts.

## MVP flow

1. User enters topic.
2. User selects max number of papers.
3. User submits form.
4. Backend validates request.
5. Mock or real source adapters return papers.
6. Papers are normalized.
7. Duplicates are removed.
8. Papers are scored and ranked.
9. Top papers are selected.
10. AI generates a structured brief through a provider-agnostic AI abstraction.
11. Brief is validated.
12. Brief is saved through the repository contract. The original MVP used mock/in-memory storage; the current app can also use PostgreSQL through Prisma.
13. User sees result page.

## MVP acceptance criteria

- The app runs locally.
- User can submit a query from the home page.
- The server returns a brief ID.
- The result page renders the brief.
- The brief contains:
  - TL;DR
  - executive summary
  - key findings
  - major themes
  - influential papers
  - research gaps
  - uncertainties
  - next questions
  - bibliography
- Every finding has source paper IDs.
- Every major theme, research gap, and uncertainty has source paper IDs.
- Cited paper IDs exist in the bibliography.
- AI output is validated with Zod.
- Default AI configuration is `provider: deepseek`, `model: deepseek-v4-pro`, read from environment variables.
- If the user query is Polish, the final brief is generated in Polish.
- Search query expansion may produce English queries, but the final report language matches the user query language.
- Markdown export works.

## Do not build in MVP

- login
- payments
- full PDF parsing
- web browser automation
- social media scraping
- knowledge graph
- multi-agent architecture
- PostgreSQL or Prisma persistence in the original baseline. Current implementation supports optional PostgreSQL behind the repository contract.
