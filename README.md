# AI Research Brief Generator

Source-grounded research workspace built with Next.js.

This is not a generic chatbot. The core flow is:

```text
user query -> academic sources -> normalized papers -> dedupe/ranking -> quality gate -> structured AI synthesis -> grounding validation -> brief UI/export
```

The app now has three product modes:

- `Research Brief` - search academic sources and generate a grounded brief.
- `Ask My Documents` - upload private PDF/TXT/MD documents and ask questions answered only from those uploads.
- `Compare With Science` - extract claims from pasted/uploaded text and compare them with retrieved scientific evidence.

## Key Docs

- `docs/CURRENT_STATE.md` - what works now
- `docs/PRODUCT_SPEC.md` - product rules and intended value
- `docs/ROADMAP.md` - prioritized future work
- `docs/DROGA_DO_PELNEGO_SAAS.md` - living checklist for public SaaS readiness
- `docs/IDENTITY_MODEL.md` - public SaaS identity decision
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
- Legal selected-paper full-text ingestion for arXiv/source-provided PDF URLs, with full-text status badges and abstract/metadata fallback.
- Private `Ask My Documents` workspace for PDF/TXT/MD upload, chunking, retrieval, grounded answers, and cited snippets.
- `Compare With Science` workspace for claim extraction, selected-claim comparison, non-binary classifications, evidence snippets, similar work, caveats, and safer wording.
- Markdown export.
- Optional PostgreSQL/Prisma persistence.
- Source API cache and source diagnostics.
- Production safeguards for public history, persistence, and rate limiting.
- Prisma identity foundation for app-native SaaS accounts: users, workspaces,
  workspace members, and owner/admin/member/viewer roles. Runtime login/session
  UI is still future work.
- Briefs and brief generation jobs already include app-native ownership fields:
  `ownerId`, `workspaceId`, `createdByUserId`, and `visibility`.

## Environment

Required for AI generation:

```bash
AI_PROVIDER=deepseek
AI_MODEL=deepseek-v4-pro
DEEPSEEK_API_KEY=...
AI_REQUEST_TIMEOUT_MS=90000
AI_MAX_OUTPUT_TOKENS=7000
AI_THINKING_ENABLED=false
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
BRIEF_JOB_TIMEOUT_MS=240000
FULL_TEXT_MAX_PAPERS_PER_BRIEF=10
BRIEF_SYNTHESIS_MAX_PAPERS=5
BRIEF_FULL_TEXT_MAX_PAPERS=3
BRIEF_FULL_TEXT_FETCH_TIMEOUT_MS=8000
```

Optional model-grade embeddings:

```bash
EMBEDDING_PROVIDER=openai_compatible
EMBEDDING_BASE_URL=https://your-embedding-provider.example/v1
EMBEDDING_API_KEY=...
EMBEDDING_MODEL=...
```

When omitted, the app uses local hash-ngram embeddings so development does not require another API key.

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

Retrieval benchmark:

```bash
npm run embedding:check
npm run benchmark:retrieval
npm run benchmark:source-quality
npm run benchmark:claim-check
```

Production PostgreSQL deployments can process queued brief jobs with:

```bash
npm run worker:briefs
```

Set `BRIEF_JOB_AUTORUN=false` for production web processes and run the worker
separately. The worker resets stale `running` jobs and respects
`BRIEF_JOB_MAX_ATTEMPTS` / `BRIEF_JOB_STALE_MS`.

Brief history is session-scoped when `PUBLIC_BRIEF_HISTORY_ENABLED=false`.
Public history is an explicit opt-in.

`npm run embedding:check` verifies the configured embedding provider without printing secrets. The benchmark commands use the configured embedding provider. With no embedding env vars, they use local hash-ngram embeddings. After configuring `EMBEDDING_PROVIDER=openai_compatible`, run the same commands to compare retrieval quality.

The commands write ignored local reports to:

```text
benchmark-results/retrieval-gold-latest.json
benchmark-results/retrieval-gold-latest.md
benchmark-results/source-quality-latest.json
benchmark-results/source-quality-latest.md
benchmark-results/claim-check-latest.json
benchmark-results/claim-check-latest.md
```

Optional PostgreSQL integration check:

```bash
npm test -- tests/prismaBriefRepository.integration.test.ts
```

The PostgreSQL integration test is skipped unless `DATABASE_URL` points to PostgreSQL.

## Evidence Boundaries

The app must not pretend to have full-paper support unless a legal PDF was fetched, parsed, chunked, stored, and used. Evidence levels are shown explicitly:

- `metadata_only`
- `abstract_supported`
- `full_text_supported`
- `uploaded_document_supported`
- `mixed_evidence`
- `insufficient_evidence`

Uploaded document Q&A is source-only by default. If the answer is not supported by uploaded chunks, the system should say that it is not answerable from the provided documents.

## Privacy Boundary

Uploaded documents are not stored inside `Brief.briefJson` or public brief
history. The full public SaaS target is app-native authentication with
workspaces and role-based membership. Until that is implemented, private/B2B
deployments can set `DOCUMENT_AUTH_REQUIRED=true` and provide trusted
`X-AI-Brief-User-Id` plus optional `X-AI-Brief-Workspace-Id` headers from a
server-side auth layer. Without those headers, the app falls back to private
session ownership for local/internal demos.

In production, session-scoped uploads are disabled unless explicitly enabled:

```bash
DOCUMENT_UPLOADS_ENABLED=true
```

Session uploads are for private/internal deployments. Public multi-user uploads
should use authenticated user/workspace ownership instead:

```bash
DOCUMENT_AUTH_REQUIRED=true
```

See `docs/IDENTITY_MODEL.md` before treating a deployment as public SaaS.

## Diagnostics

```bash
curl http://localhost:3000/api/source-cache
```
