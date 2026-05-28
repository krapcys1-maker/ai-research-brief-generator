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

Mock/in-memory storage for the MVP, with persistence-ready types. Prisma and PostgreSQL are a later durable persistence phase.

The app should access brief persistence through the `BriefRepository` contract in `lib/storage/types.ts`. The current implementation is `inMemoryBriefRepository`; future Prisma/PostgreSQL persistence should implement the same contract before replacing the in-memory repository.

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

## First implementation strategy

Start with mock data. Do not touch real academic APIs until the UI, types, and mock pipeline work end-to-end.

Do not add PostgreSQL in the MVP. Use mock/in-memory storage first, while keeping types ready for later database persistence.
