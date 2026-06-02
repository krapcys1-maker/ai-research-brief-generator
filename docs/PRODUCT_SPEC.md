# Product Spec

Last updated: 2026-05-28

## Purpose

AI Research Brief Generator helps a user turn a research topic into a concise, source-grounded brief based on selected academic paper metadata and abstracts.

The product is a controlled research pipeline, not a generic chatbot.

## Core Flow

```text
user query -> academic source search -> normalized papers -> dedupe/ranking -> quality gate -> structured AI synthesis -> grounding validation -> brief UI/export
```

## Non-Negotiable Rules

- The AI must never invent papers, authors, DOI values, URLs, venues, citations, or unsupported claims.
- Paper titles, author names, journal/venue names, DOI values, and URLs must stay unchanged.
- The final brief language must match the user query language.
- Polish queries must produce Polish summaries, explanations, findings, gaps, uncertainties, recommendations, and Q&A answers.
- Search/query expansion may use English variants, but the final report must remain in the user query language.
- Every important claim must cite selected paper IDs.
- Every important claim must include evidence snippets when synthesized by AI.
- Evidence snippets must be grounded in selected paper titles, abstracts, venues, or metadata.
- If selected papers do not support an answer, the app should say so rather than improvise.

## User Value

The app should answer:

- What is the current research landscape for this topic?
- Which papers should I read first?
- What is well supported?
- What is uncertain or controversial?
- What gaps remain?
- Which source supports each claim?
- Can I ask follow-up questions about the selected papers?

## Evidence Boundary

Research brief synthesis is primarily based on selected paper metadata and abstracts.
For selected papers, the app may legally fetch and parse open-access PDF chunks for
`Ask This Brief`, and those claims must be labeled with the appropriate evidence
level. Treat any claim without parsed full-text evidence as metadata/abstract-bound.

The UI and Markdown export should keep this boundary visible so users do not confuse abstract-level grounding with full-text verification.

## Default AI Provider

Default implemented provider:

```text
provider: deepseek
model: deepseek-v4-pro
```

The architecture must remain provider-agnostic. Provider calls must go through `lib/ai`.

## Storage Strategy

Local development may use in-memory storage.

Production should use PostgreSQL/Prisma through the repository contract.

## Out of Scope For Now

- open-ended general chatbot behavior
- autonomous web browsing
- social media scraping
- payments
- full-text PDF verification
- multi-agent architecture
- knowledge graph
