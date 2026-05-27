# Cursor Start Prompt

Paste this into Cursor Plan Mode after placing this folder content in your project root.

```text
I want to build an AI Research Brief Generator.

Read PROJECT.md, TODO.md, docs/*, and all .cursor/rules files before writing code.

This is the product:
The user enters a research topic. The app searches academic paper sources, normalizes and deduplicates papers, ranks them, then generates a source-grounded research brief. Every key finding must cite source paper IDs.

This is not a generic chatbot. It is a source-grounded research pipeline.

Tech stack:
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zod
- provider-agnostic AI abstraction
- DeepSeek V4 Pro as the default model

Important architecture rules:
- Do not call external APIs from React components.
- Put source adapters in lib/sources.
- Put AI logic in lib/ai.
- Use AI_PROVIDER, AI_MODEL, and DEEPSEEK_API_KEY for default DeepSeek config.
- Do not hardcode DeepSeek throughout the codebase; keep providers swappable.
- Put orchestration in lib/pipeline.
- Use mock/in-memory storage for MVP. Do not add PostgreSQL or Prisma yet.
- Validate all API inputs with Zod.
- Validate all AI outputs with Zod.
- Every key finding, theme, gap, and uncertainty must include sourcePaperIds.
- If the user query is Polish, the final brief must be generated in Polish.
- Search query expansion may produce English queries, but final report language must match the user query language.
- Do not invent papers, authors, DOI values, citation counts, or URLs.

First, create a detailed implementation plan for Phase 1 and Phase 2 only.
Include file paths, modules, types, components, endpoints, and validation.
Do not implement code yet.
```

After Cursor gives a good plan, paste this:

```text
Implement Phase 1 and Phase 2 only.

Requirements:
- create the project folder structure
- create shared TypeScript types
- create Zod schemas
- create provider-agnostic AI config/types with DeepSeek defaults
- create mock paper data
- create mock source adapter
- create mock/in-memory storage
- create home page form
- create POST /api/briefs using mock pipeline
- create /briefs/[id] result page
- render a mock structured research brief

Do not add real external API calls yet.
Do not add authentication.
Do not add PDF parsing.
Do not add PostgreSQL or Prisma yet.
Keep the code simple, typed, and easy to extend.
```
