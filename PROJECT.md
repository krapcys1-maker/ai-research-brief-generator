# AI Research Brief Generator — Cursor Project Spec

## Purpose

Build a web application that generates source-grounded research briefs from academic paper metadata and abstracts.

The app is not a generic chatbot. It is a controlled research pipeline:

```text
User research topic
→ academic source search
→ paper normalization
→ deduplication
→ scoring/ranking
→ structured AI synthesis
→ source validation
→ clean brief UI
→ Markdown export
```

## Non-negotiable product rule

The AI must never invent papers, authors, citations, DOI values, URLs, or unsupported claims.

The AI must detect the language of the user query and generate the research brief in the same language.

Keep paper titles, author names, journal names, venue names, and DOI values unchanged.

If the query is Polish, all summaries, explanations, findings, gaps, uncertainties, and recommendations must be in Polish.

Every important output item must include source paper IDs:

- key findings
- major themes
- research gaps
- controversies / uncertainties
- executive summary claims where possible

If a claim cannot be grounded in the provided paper list, the model must either remove the claim or mark it as weak/uncertain.

---

## Recommended stack

Use this stack unless the user explicitly changes it:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui optional; current UI uses custom CSS
- Zod
- AI provider abstraction in `lib/ai`
- DeepSeek V4 Pro as the default AI provider/model
- Upstash Redis REST for production rate limiting
- Prisma and PostgreSQL for optional durable persistence

Default AI configuration:

```text
provider: deepseek
model: deepseek-v4-pro
```

The app must remain provider-agnostic. Do not hardcode DeepSeek throughout the codebase. Read provider configuration from environment variables and route all model calls through a small AI provider interface so the app can later switch to OpenAI or another provider.

---

## MVP scope

The first working version must include:

1. Home page with a research topic form.
2. User options:
   - query
   - max papers: 10 / 20 / 30
   - optional year range
   - sources: arXiv, Semantic Scholar, OpenAlex
3. `POST /api/briefs` endpoint.
4. Mock source adapter first.
5. Shared `NormalizedPaper` type.
6. Shared `ResearchBrief` type and Zod schema.
7. Mock pipeline that creates a valid brief without real external APIs.
8. Result page: `/briefs/[id]`.
9. In-memory/mock storage for generated briefs and selected papers.
10. Persistence-ready TypeScript types so Prisma/PostgreSQL can be added later without reshaping the domain model.
11. Real source adapters after mock pipeline works:
   - arXiv
   - Semantic Scholar
   - OpenAlex
12. Deduplication.
13. Scoring/ranking.
14. AI structured output through the provider abstraction.
15. Source-grounding validation.
16. Markdown export.

---

## Explicit non-goals for MVP

Do not implement these in the first version:

- user authentication
- team accounts
- paid subscriptions
- PDF parsing
- full-text paper ingestion
- browser automation
- social media scraping
- autonomous agents that search the open web freely
- multi-agent system
- knowledge graph
- weekly email digests
- PDF export
- PostgreSQL persistence
- Prisma schema/migrations

These can be added later after the source-grounded MVP is stable.

---

## Core architecture

```text
app/page.tsx
    ↓
POST /api/briefs
    ↓
lib/pipeline/createBrief.ts
    ↓
query expansion, optional in v1
    ↓
lib/sources/* adapters
    ↓
normalize papers
    ↓
deduplicate papers
    ↓
score and rank papers
    ↓
select top papers
    ↓
lib/ai/synthesizeBrief.ts
    ↓
validate structured AI output
    ↓
validate source grounding
    ↓
save to in-memory/mock storage
    ↓
redirect/render /briefs/[id]
```

---

## Folder structure

Create or maintain this structure:

```text
ai-research-brief-generator/
├─ app/
│  ├─ page.tsx
│  ├─ layout.tsx
│  ├─ globals.css
│  ├─ briefs/
│  │  ├─ page.tsx
│  │  └─ [id]/
│  │     └─ page.tsx
│  └─ api/
│     ├─ briefs/
│     │  ├─ route.ts
│     │  └─ [id]/
│     │     └─ route.ts
│     └─ export/
│        └─ [id]/
│           └─ route.ts
│
├─ components/
│  ├─ brief/
│  │  ├─ BriefRenderer.tsx
│  │  ├─ KeyFindings.tsx
│  │  ├─ MajorThemes.tsx
│  │  ├─ ResearchGaps.tsx
│  │  ├─ Bibliography.tsx
│  │  ├─ PaperCard.tsx
│  │  └─ SourceDrawer.tsx
│  ├─ search/
│  │  ├─ ResearchForm.tsx
│  │  └─ SourceSelector.tsx
│  └─ ui/
│
├─ lib/
│  ├─ ai/
│  │  ├─ client.ts
│  │  ├─ schemas.ts
│  │  ├─ prompts.ts
│  │  ├─ generateQueryVariants.ts
│  │  ├─ extractClaims.ts
│  │  └─ synthesizeBrief.ts
│  │
│  ├─ pipeline/
│  │  ├─ createBrief.ts
│  │  ├─ normalize.ts
│  │  ├─ dedupe.ts
│  │  ├─ score.ts
│  │  ├─ selectTopPapers.ts
│  │  └─ validateGrounding.ts
│  │
│  ├─ sources/
│  │  ├─ types.ts
│  │  ├─ mock.ts
│  │  ├─ arxiv.ts
│  │  ├─ semanticScholar.ts
│  │  ├─ openAlex.ts
│  │  └─ index.ts
│  │
│  ├─ storage/
│  │  ├─ types.ts
│  │  └─ mockStore.ts
│  │
│  ├─ export/
│  │  └─ markdown.ts
│  │
│  └─ utils/
│     ├─ retry.ts
│     ├─ rateLimit.ts
│     └─ text.ts
│
├─ docs/
│  ├─ ARCHITECTURE.md
│  ├─ MVP_SPEC.md
│  └─ PROMPTS.md
│
├─ .cursor/
│  └─ rules/
│     ├─ architecture.mdc
│     ├─ ai-output.mdc
│     ├─ data-sources.mdc
│     └─ workflow.mdc
│
├─ .env.example
├─ PROJECT.md
├─ TODO.md
└─ README.md
```

---

## Shared types

Create these early and keep them stable.

### Research source

```ts
export type ResearchSource = "mock" | "arxiv" | "semantic_scholar" | "openalex";
```

### Search input

```ts
export type SearchPapersInput = {
  query: string;
  maxResults: number;
  fromYear?: number;
  toYear?: number;
};
```

### Normalized paper

```ts
export type NormalizedPaper = {
  id: string;
  title: string;
  abstract: string | null;
  authors: string[];
  year: number | null;
  publishedAt: string | null;

  doi: string | null;
  arxivId: string | null;
  semanticScholarId: string | null;
  openAlexId: string | null;

  sourceUrls: string[];
  pdfUrl: string | null;

  venue: string | null;
  citationCount: number | null;
  influentialCitationCount: number | null;

  source: ResearchSource | "merged";

  relevanceScore?: number;
  qualityScore?: number;
  finalScore?: number;
};
```

### Source adapter contract

```ts
export type SourceAdapter = {
  name: ResearchSource;
  searchPapers(input: SearchPapersInput): Promise<NormalizedPaper[]>;
};
```

### AI provider contract

Use a provider abstraction from the first AI integration. DeepSeek is the default configuration, but the rest of the app should call only this interface:

```ts
export type AIProviderName = "deepseek" | "openai" | "anthropic" | "custom";

export type AIModelConfig = {
  provider: AIProviderName;
  model: string;
  apiKey: string;
};

export type GenerateStructuredInput = {
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
  schema: unknown;
};

export type AIProvider = {
  name: AIProviderName;
  generateStructured<T>(input: GenerateStructuredInput): Promise<T>;
};
```

Default config:

```ts
export const defaultAIModelConfig = {
  provider: process.env.AI_PROVIDER ?? "deepseek",
  model: process.env.AI_MODEL ?? "deepseek-v4-pro",
};
```

All AI outputs must still be validated with Zod after generation.

### Research brief

```ts
export type ResearchBrief = {
  id: string;
  query: string;
  generatedAt: string;
  title: string;
  tldr: string;

  executiveSummary: {
    paragraph: string;
    sourcePaperIds: string[];
  };

  keyFindings: {
    finding: string;
    explanation: string;
    confidence: "low" | "medium" | "high";
    sourcePaperIds: string[];
    caveats: string[];
  }[];

  majorThemes: {
    theme: string;
    description: string;
    sourcePaperIds: string[];
  }[];

  influentialPapers: {
    paperId: string;
    reason: string;
  }[];

  researchGaps: {
    gap: string;
    whyItMatters: string;
    sourcePaperIds: string[];
  }[];

  controversiesOrUncertainties: {
    issue: string;
    explanation: string;
    sourcePaperIds: string[];
  }[];

  suggestedNextQuestions: string[];

  searchSummary: {
    sourcesUsed: string[];
    totalFound: number;
    totalAfterDeduplication: number;
    totalUsedInBrief: number;
    queryVariants: string[];
  };

  bibliography: {
    paperId: string;
    title: string;
    authors: string[];
    year: number | null;
    url: string | null;
    doi: string | null;
  }[];
};
```

---

## API design

### `POST /api/briefs`

Creates a brief.

Request:

```json
{
  "query": "retrieval augmented generation in medical diagnosis",
  "maxPapers": 20,
  "fromYear": 2020,
  "toYear": 2026,
  "sources": ["arxiv", "semantic_scholar", "openalex"]
}
```

Response for MVP:

```json
{
  "briefId": "brief_123",
  "status": "completed"
}
```

The first implementation can be synchronous. Later, if generation becomes slow, convert this to a job system.

### `GET /api/briefs`

Returns brief history.

### `GET /api/briefs/[id]`

Returns one brief with papers.

### `GET /api/export/[id]?format=markdown`

Exports a brief as Markdown.

---

## Input validation

Create a Zod schema for brief requests:

```ts
import { z } from "zod";

export const BriefRequestSchema = z.object({
  query: z.string().min(3).max(300),
  maxPapers: z.number().int().min(5).max(50).default(20),
  fromYear: z.number().int().min(1900).max(2100).optional(),
  toYear: z.number().int().min(1900).max(2100).optional(),
  sources: z
    .array(z.enum(["mock", "arxiv", "semantic_scholar", "openalex"]))
    .min(1)
    .default(["mock"]),
});
```

---

## Pipeline details

### `createBrief(input)`

Responsible for orchestration only. Keep it readable.

Pseudo-flow:

```ts
export async function createBrief(input: BriefRequest) {
  const validatedInput = BriefRequestSchema.parse(input);

  const queryVariants = await generateQueryVariants(validatedInput.query);

  const rawResults = await searchAllSources({
    ...validatedInput,
    queryVariants,
  });

  const normalized = normalizePapers(rawResults);
  const deduped = dedupePapers(normalized);
  const scored = scorePapers(deduped, validatedInput.query);
  const selected = selectTopPapers(scored, validatedInput.maxPapers);

  const brief = await synthesizeBrief({
    query: validatedInput.query,
    queryVariants,
    papers: selected,
    searchSummary: {
      totalFound: normalized.length,
      totalAfterDeduplication: deduped.length,
      totalUsedInBrief: selected.length,
    },
  });

  validateBriefGrounding(brief, selected);

  return saveBriefWithPapers({ brief, papers: selected });
}
```

### Query expansion

For v1, query expansion can be disabled or mocked.

Later, use AI to produce 3-5 search variants.

Search query expansion may produce English search queries even when the original user query is in another language, because academic indexes often work best with English terms. This must not change the final report language: the final brief must match the language of the original user query.

Example:

```text
Input: RAG in medical diagnosis
Output:
- retrieval augmented generation medical diagnosis
- large language models clinical decision support retrieval
- evidence grounded generation healthcare
- retrieval augmented medical question answering
```

### Search

Use `Promise.allSettled`, not `Promise.all`.

If one source fails, the whole brief should not fail unless every source fails.

### Normalization

Every source adapter must map its output to `NormalizedPaper`.

### Deduplication

Deduplicate in this order:

1. DOI
2. arXiv ID
3. Semantic Scholar ID
4. OpenAlex ID
5. normalized title

Title normalization:

```ts
export function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
```

### Scoring

Use simple scoring first.

```text
finalScore =
  relevanceScore * 0.50 +
  citationScore * 0.18 +
  recencyScore * 0.12 +
  completenessScore * 0.08 +
  sourceQualityScore * 0.07 +
  identifierScore * 0.05
```

Relevance can be simple keyword matching first. Do not add embeddings until the base app works.

Citation score should use log scaling and may blend total citations with influential citations:

```ts
const citationScore = Math.log((citationCount ?? 0) + 1);
```

Do not over-prioritize citation counts because new papers will be unfairly punished.

Source quality and identifier scores are lightweight metadata signals. They should reward papers with stronger source provenance and stable identifiers such as DOI, arXiv ID, Semantic Scholar ID, OpenAlex ID, and source URLs without overriding query relevance.

---

## AI synthesis rules

Use structured output. Do not accept loose prose from the model.

The AI receives:

- original query
- selected paper list
- paper IDs
- titles
- abstracts
- years
- authors
- citation counts
- URLs
- required output schema

The AI must return a `ResearchBrief` object.

### System prompt

```text
You are a research synthesis assistant.

You must only make claims supported by the provided papers.
Every key finding, major theme, research gap, and uncertainty must include sourcePaperIds.
Do not invent authors, papers, citations, DOI values, URLs, venues, or facts.
Detect the language of the original query and write the brief in that same language.
Search query variants may be in English, but the final report language must still match the original query language.
Keep paper titles, author names, journal names, venue names, and DOI values unchanged.
If the query is Polish, write all summaries, explanations, findings, gaps, uncertainties, and recommendations in Polish.
If evidence is weak, mark confidence as low.
If papers disagree or evidence is indirect, include caveats.
Return only valid JSON matching the schema.
```

### User prompt

```text
Original query:
{{query}}

You are given a list of papers with IDs, titles, abstracts, years, authors, citation counts, and URLs.

Your task:
1. Summarize the current research landscape.
2. Identify major themes.
3. Extract key findings.
4. Identify research gaps.
5. Identify controversies or uncertainties.
6. Suggest next research questions.
7. Cite paper IDs for every important claim.

Papers:
{{papersJson}}

Return a structured research brief.
```

---

## Source-grounding validator

Add a validator after AI output generation.

Rules:

- every key finding must have at least one `sourcePaperId`
- every major theme must have at least one `sourcePaperId`
- every research gap must have at least one `sourcePaperId`
- every uncertainty must have at least one `sourcePaperId`
- every cited paper ID must exist in the selected paper list
- every influential paper ID must exist in the selected paper list

Pseudo-code:

```ts
export function validateBriefGrounding(brief: ResearchBrief, papers: NormalizedPaper[]) {
  const paperIds = new Set(papers.map((paper) => paper.id));

  function assertValidPaperIds(ids: string[], section: string) {
    if (!ids.length) {
      throw new Error(`${section} has no sourcePaperIds`);
    }

    for (const id of ids) {
      if (!paperIds.has(id)) {
        throw new Error(`${section} cites unknown paperId: ${id}`);
      }
    }
  }

  for (const item of brief.keyFindings) {
    assertValidPaperIds(item.sourcePaperIds, "keyFinding");
  }

  for (const item of brief.majorThemes) {
    assertValidPaperIds(item.sourcePaperIds, "majorTheme");
  }

  for (const item of brief.researchGaps) {
    assertValidPaperIds(item.sourcePaperIds, "researchGap");
  }

  for (const item of brief.controversiesOrUncertainties) {
    assertValidPaperIds(item.sourcePaperIds, "controversyOrUncertainty");
  }

  for (const item of brief.influentialPapers) {
    if (!paperIds.has(item.paperId)) {
      throw new Error(`influentialPapers cites unknown paperId: ${item.paperId}`);
    }
  }
}
```

---

## Prisma schema

Do not add this in the MVP. Use this later as the starting durable persistence model after the mock/in-memory pipeline is stable:

```prisma
model Brief {
  id          String   @id @default(cuid())
  query       String
  title       String
  tldr        String
  briefJson   Json

  totalFound  Int
  totalUsed   Int

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  papers      BriefPaper[]
}

model Paper {
  id                         String   @id @default(cuid())

  title                      String
  abstract                   String?
  authorsJson                Json

  year                       Int?
  publishedAt                DateTime?

  doi                        String?
  arxivId                    String?
  semanticScholarId          String?
  openAlexId                 String?

  venue                      String?
  citationCount              Int?
  influentialCitationCount   Int?

  sourceUrlsJson             Json
  pdfUrl                     String?

  normalizedTitle            String

  createdAt                  DateTime @default(now())
  updatedAt                  DateTime @updatedAt

  briefs                     BriefPaper[]

  @@index([doi])
  @@index([arxivId])
  @@index([semanticScholarId])
  @@index([openAlexId])
  @@index([normalizedTitle])
}

model BriefPaper {
  id              String @id @default(cuid())

  briefId         String
  paperId         String

  relevanceScore  Float?
  qualityScore    Float?
  finalScore      Float?

  usedInBrief     Boolean @default(false)

  brief           Brief @relation(fields: [briefId], references: [id])
  paper           Paper @relation(fields: [paperId], references: [id])

  @@unique([briefId, paperId])
}

model ApiCache {
  id          String   @id @default(cuid())
  cacheKey    String   @unique
  source      String
  query       String
  response    Json
  createdAt   DateTime @default(now())
  expiresAt   DateTime
}
```

---

## UI requirements

### Home page

Include:

- app name
- short explanation
- research topic input
- max papers selector
- source selector
- year range inputs
- generate button
- example queries

Example queries:

```text
retrieval augmented generation in medical diagnosis
LLM hallucination detection
AI agents in software engineering
graph neural networks for drug discovery
privacy preserving machine learning in healthcare
```

### Loading state

Show pipeline steps:

1. Expanding query
2. Searching academic sources
3. Normalizing papers
4. Removing duplicates
5. Ranking sources
6. Generating brief
7. Validating citations
8. Saving result

### Brief result page

Sections:

- title
- query
- generated date
- search summary
- TL;DR
- executive summary
- key findings
- major themes
- influential papers
- research gaps
- controversies / uncertainties
- suggested next questions
- bibliography

### Source display

Paper IDs shown in brief sections should be clickable.

Clicking a citation opens a source drawer or card showing:

- title
- authors
- year
- abstract
- citation count
- source badges
- DOI
- URL

---

## Markdown export

`GET /api/export/[id]?format=markdown` should return a `.md` file with:

- title
- query
- generated date
- TL;DR
- executive summary
- key findings with citations
- major themes with citations
- influential papers
- research gaps
- uncertainties
- next questions
- bibliography

---

## Error handling

Do not crash the whole pipeline if one source fails.

Use this behavior:

```text
If arXiv fails but Semantic Scholar succeeds:
→ continue
→ show warning in search summary

If all sources fail:
→ return API error

If AI output validation fails:
→ retry once
→ if still invalid, return a clear error
```

Use timeouts for all external API calls.

Use retry with exponential backoff for network errors and 429 responses.

---

## Environment variables

Create `.env.example`:

```bash
AI_PROVIDER="deepseek"
AI_MODEL="deepseek-v4-pro"
DEEPSEEK_API_KEY=""
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
SEMANTIC_SCHOLAR_API_KEY=""
OPENALEX_API_KEY=""
```

Only the key for the selected AI provider is required. For the MVP default, use `DEEPSEEK_API_KEY`.

Historical MVP note: the first implementation started without `DATABASE_URL` or PostgreSQL. Current implementation supports optional PostgreSQL/Prisma persistence behind the repository contract. See `docs/CURRENT_STATE.md`.

---

## Build order

Historical build order. For active work, use `docs/ROADMAP.md` and `TODO.md`.

### Phase 1 — project skeleton

- create folder structure
- create shared types
- create Zod schemas
- create home page shell
- create mock brief result page

### Phase 2 — mock pipeline

- create mock paper data
- implement `mockSourceAdapter`
- implement `POST /api/briefs` with mock data
- render `/briefs/[id]`
- validate data flow without real APIs

### Phase 3 — database

- prepare Prisma
- add PostgreSQL connection
- add schema
- migrate database
- persist briefs and papers
- load brief result from database

### Phase 4 — real source adapters

- implement arXiv adapter
- implement Semantic Scholar adapter
- implement OpenAlex adapter
- keep each adapter isolated in `lib/sources`

### Phase 5 — deduplication and scoring

- normalize all source results
- dedupe papers
- score papers
- select top N papers

### Phase 6 — AI synthesis

- add provider-agnostic AI client wrapper
- configure default provider/model from `AI_PROVIDER` and `AI_MODEL`
- use DeepSeek V4 Pro by default (`provider: deepseek`, `model: deepseek-v4-pro`)
- define structured output schema
- implement `synthesizeBrief`
- validate AI output
- validate source grounding

### Phase 7 — UI polish

- improve brief renderer
- add citation links
- add source drawer
- add bibliography cards
- add warnings for failed sources

### Phase 8 — export

- add Markdown export endpoint
- add export button

---

## First Cursor prompt

Use this first in Cursor Plan Mode:

```text
I want to build an AI Research Brief Generator.

Read PROJECT.md, TODO.md, and all files in .cursor/rules before writing code.

Tech stack:
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui optional; current UI uses custom CSS
- Zod
- provider-agnostic AI abstraction
- DeepSeek V4 Pro as the default model

Core product:
The user enters a research topic. The app searches academic paper sources, normalizes and deduplicates papers, ranks them, then generates a source-grounded research brief. Every key finding must cite source paper IDs.

Important rule:
This is not a generic chatbot. It is a source-grounded research pipeline.
Use mock/in-memory storage for the earliest MVP path. Current implementation also supports optional PostgreSQL/Prisma behind `BriefRepository`; preserve that contract.
Configure AI with `AI_PROVIDER`, `AI_MODEL`, and `DEEPSEEK_API_KEY`, defaulting to `provider: deepseek` and `model: deepseek-v4-pro`.
Keep AI provider logic swappable through an abstraction.
If the user query is Polish, the final brief must be generated in Polish.
Search query expansion may produce English queries, but final report language must match the user query language.

First task:
Create a detailed implementation plan for Phase 1 and Phase 2 only. Include file paths, modules, types, components, endpoints, and validation. Do not implement code yet.
```

---

## Second Cursor prompt

After Cursor gives a sensible plan, use this:

```text
Implement Phase 1 and Phase 2 only.

Requirements:
- create the project folder structure
- create shared TypeScript types
- create Zod schemas
- create mock paper data
- create mock source adapter
- create home page form
- create POST /api/briefs using mock pipeline
- create /briefs/[id] result page
- render a mock structured research brief

Do not add real external API calls yet.
Do not add authentication.
Do not add PDF parsing.
Keep the code simple, typed, and easy to extend.
```

---

## Definition of done for MVP

The MVP is done when:

- user can submit a topic
- app retrieves or mocks at least 10 papers
- papers are normalized into one format
- duplicates are removed
- top papers are selected
- AI returns structured brief JSON
- brief JSON passes Zod validation
- brief passes source-grounding validation
- brief page renders all sections
- each finding cites source paper IDs
- bibliography shows all used papers
- Markdown export works
