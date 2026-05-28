# AI Research Brief Generator

Source-grounded research brief generator built with Next.js.

This is not a generic chatbot. The core flow is:

```text
user query -> academic sources -> normalized papers -> dedupe/ranking -> quality gate -> structured AI synthesis -> grounding validation -> brief UI/export
```

## Key Docs

- `docs/CURRENT_STATE.md` - what works now
- `docs/PRODUCT_SPEC.md` - product rules and intended value
- `docs/ROADMAP.md` - prioritized future work
- `docs/CHANGELOG.md` - major milestone history
- `docs/REMEDIATION_PLAN.md` - risk-driven repair plan
- `docs/DEPLOYMENT.md` - production/runtime notes
- `docs/ARCHITECTURE.md` - module boundaries
- `docs/PROMPTS.md` - AI prompt guidance
- `PROJECT.md` - original product specification and planning context
- `TODO.md` - active work only

## Current Capabilities

- Source adapters: mock, arXiv, Semantic Scholar, OpenAlex.
- Source preflight before AI generation.
- Research Quality Gate for weak source coverage.
- Paper normalization, dedupe, ranking, and top-paper selection.
- DeepSeek V4 Pro structured synthesis through a provider abstraction.
- Zod validation for AI outputs.
- Claim-level source IDs and evidence snippets.
- Controlled `Ask This Brief` Q&A over selected papers.
- Markdown export.
- Optional PostgreSQL/Prisma persistence.
- Source API cache and source diagnostics.
- Production safeguards for public history, persistence, and rate limiting.

## Environment

Required for AI generation:

```bash
AI_PROVIDER=deepseek
AI_MODEL=deepseek-v4-pro
DEEPSEEK_API_KEY=...
```

Optional source/API settings:

```bash
SEMANTIC_SCHOLAR_API_KEY=...
```

Optional local/development settings:

```bash
PUBLIC_BRIEF_HISTORY_ENABLED=true
BRIEF_RATE_LIMIT_MAX=5
BRIEF_RATE_LIMIT_WINDOW_MS=600000
RATE_LIMIT_BACKEND=memory
```

Optional PostgreSQL persistence:

```bash
DATABASE_URL=postgresql://...
```

Production rate limiting should use Upstash Redis REST:

```bash
RATE_LIMIT_BACKEND=upstash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Production requires valid PostgreSQL by default. Temporary demos can explicitly opt into non-durable memory mode:

```bash
ALLOW_MEMORY_STORAGE_IN_PRODUCTION=true
ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION=true
```

## Run Locally

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Optional Local PostgreSQL

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Generate Prisma Client:

```bash
npm run prisma:generate
```

Apply migrations:

```bash
npm run prisma:migrate
```

## Checks

```bash
npm test
npm run lint
npm run build
```

Optional PostgreSQL integration check:

```bash
npm test -- tests/prismaBriefRepository.integration.test.ts
```

The PostgreSQL integration test is skipped unless `DATABASE_URL` points to PostgreSQL.

## Diagnostics

```bash
curl http://localhost:3000/api/source-cache
```
