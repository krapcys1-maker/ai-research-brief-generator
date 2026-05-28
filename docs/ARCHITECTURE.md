# Architecture — AI Research Brief Generator

## Main idea

The app must behave like a pipeline, not like an open-ended chatbot.

```text
Input query
→ controlled academic search
→ normalized paper model
→ deduplication
→ ranking
→ structured AI synthesis
→ citation validation
→ saved brief
→ UI rendering
```

## Main modules

### `app/`

Next.js routes and pages.

### `components/`

Pure UI components. Components must not call academic APIs directly.

### `lib/sources/`

Academic source adapters.

Each source adapter must implement:

```ts
export type SourceAdapter = {
  name: ResearchSource;
  searchPapers(input: SearchPapersInput): Promise<NormalizedPaper[]>;
};
```

### `lib/pipeline/`

The orchestration layer.

Important files:

- `createBrief.ts`
- `dedupe.ts`
- `score.ts`
- `selectTopPapers.ts`
- `validateGrounding.ts`

### `lib/ai/`

Provider-agnostic AI wrapper, schemas, prompts, and synthesis logic.

The AI layer must return structured data only. No loose text.

Default AI configuration:

```text
provider: deepseek
model: deepseek-v4-pro
```

Read AI configuration from `AI_PROVIDER`, `AI_MODEL`, and the selected provider API key such as `DEEPSEEK_API_KEY`. Do not hardcode DeepSeek outside the provider configuration.

### `lib/storage/`

Storage is accessed through the `BriefRepository` contract in `lib/storage/types.ts`.

Current implementations:

- `inMemoryBriefRepository` for local development, tests, and temporary demo mode.
- `prismaBriefRepository` for PostgreSQL-backed persistence when `DATABASE_URL` is configured.

The repository selector chooses PostgreSQL when `DATABASE_URL` points to PostgreSQL. In production, missing or invalid PostgreSQL configuration fails fast unless `ALLOW_MEMORY_STORAGE_IN_PRODUCTION=true` is explicitly set for a temporary non-durable demo.

## Dependency direction

Correct:

```text
app/api → lib/pipeline → lib/sources
app/api → lib/pipeline → lib/ai
app/api → lib/storage
components → types only
```

Wrong:

```text
components → lib/sources
components → external academic APIs
components → AI provider SDK directly
```

## Implementation Strategy

The project started with mock data and in-memory storage, then added real source adapters and optional PostgreSQL persistence behind stable contracts.

New work should preserve those boundaries:

- UI components do not call source APIs or AI providers directly.
- Source adapters return normalized paper data.
- Pipeline code owns orchestration, quality gates, scoring, and validation.
- AI code returns structured JSON only.
- Storage code stays behind repository contracts.
