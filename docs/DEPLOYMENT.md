# Deployment Guide

## Goal

Deploy the AI Research Brief Generator as a source-grounded research workspace:

```text
user query -> academic source adapters -> normalized papers -> dedupe/ranking -> DeepSeek synthesis -> Zod validation -> PostgreSQL persistence
```

This is not a chatbot deployment. The production app should preserve the same source-grounded behavior as local development across Research Brief, Ask My Documents, and Compare With Science modes.

## Required Environment Variables

Set these in the hosting provider, not in committed files:

```bash
AI_PROVIDER=deepseek
AI_MODEL=deepseek-v4-pro
DEEPSEEK_API_KEY=...
AI_REQUEST_TIMEOUT_MS=90000
AI_MAX_OUTPUT_TOKENS=7000
AI_THINKING_ENABLED=false
DATABASE_URL=postgresql://...
RATE_LIMIT_BACKEND=upstash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Production requires a valid PostgreSQL `DATABASE_URL` by default. Missing or invalid database configuration fails fast instead of falling back to non-durable memory storage.

Temporary demo escape hatch:

```bash
ALLOW_MEMORY_STORAGE_IN_PRODUCTION=true
ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION=true
```

Use these only for throwaway single-instance demos. Generated briefs will disappear across restarts, and memory rate limits will not be shared across instances.

Recommended production rate limit settings:

```bash
BRIEF_RATE_LIMIT_MAX=5
BRIEF_RATE_LIMIT_WINDOW_MS=600000
BRIEF_JOB_TIMEOUT_MS=240000
FULL_TEXT_MAX_PAPERS_PER_BRIEF=10
BRIEF_SYNTHESIS_MAX_PAPERS=5
BRIEF_FULL_TEXT_MAX_PAPERS=3
BRIEF_FULL_TEXT_FETCH_TIMEOUT_MS=8000
BRIEF_JOB_AUTORUN=false
BRIEF_JOB_MAX_ATTEMPTS=2
BRIEF_JOB_STALE_MS=600000
DEPLOYMENT_PRIVACY_NOTICE=true
```

Session-scoped document upload is disabled in production unless explicitly enabled. For private/internal deployments:

```bash
DOCUMENT_UPLOADS_ENABLED=true
```

Temporary demo opt-in:

```bash
ALLOW_SESSION_DOCUMENT_UPLOADS_IN_PRODUCTION=true
```

Authenticated document ownership can be enforced when the app sits behind a
trusted auth gateway or server layer:

```bash
DOCUMENT_AUTH_REQUIRED=true
```

When `DOCUMENT_AUTH_REQUIRED=true`, document upload/list/delete/Q&A and
uploaded-document claim comparison require `X-AI-Brief-User-Id`. The optional
`X-AI-Brief-Workspace-Id` header scopes documents to a workspace as well as the
user. Set these headers only from trusted infrastructure; do not let browsers or
untrusted clients choose arbitrary owner IDs.

Do not enable public multi-user session uploads. Use authenticated
user/workspace ownership for public deployments.

## Identity Model

The official target for a full public SaaS is app-native authentication with
workspaces and role-based membership. See `docs/IDENTITY_MODEL.md`.

Trusted `X-AI-Brief-User-Id` and `X-AI-Brief-Workspace-Id` headers are an
interim/private-B2B deployment bridge, not the final public SaaS identity model.
Use them only when trusted infrastructure injects the headers server-side and
untrusted browsers cannot choose or override owner IDs.

Session-scoped ownership is local/internal-demo only. Do not use session-scoped
brief history or session-scoped document upload as the identity model for a
public multi-user SaaS.

Public brief history setting:

```bash
PUBLIC_BRIEF_HISTORY_ENABLED=false
```

Production defaults to disabled public brief history when this variable is omitted. Enable it only after authentication/session scoping exists or when generated brief summaries are intentionally public.
When public history is disabled, `/api/briefs` returns only summaries owned by
the current `ai_brief_history_session` cookie. Brief detail, Markdown export,
and brief Q&A also require that cookie for session-owned records.

Production privacy notice setting:

```bash
DEPLOYMENT_PRIVACY_NOTICE=true
```

This notice is shown by default in production and can be set to `false` only for private/internal deployments that provide equivalent privacy copy elsewhere.

Optional source API setting:

```bash
SEMANTIC_SCHOLAR_API_KEY=...
```

Semantic Scholar can run without a key, but anonymous requests are more likely to be rate limited.

Optional production embeddings setting:

```bash
EMBEDDING_PROVIDER=openai_compatible
EMBEDDING_BASE_URL=https://your-embedding-provider.example/v1
EMBEDDING_API_KEY=...
EMBEDDING_MODEL=...
```

If these variables are omitted, the app uses local hash-ngram embeddings. That is safe for development and demos, but production research quality should use a model-grade embedding provider. If the configured embeddings provider is temporarily unavailable, ranking falls back to lexical scoring instead of failing brief generation.

## Database

Use a managed PostgreSQL database in production. The local `docker-compose.yml` PostgreSQL service is for development only.

The app uses Prisma for:

- app-native user/workspace identity foundation
- generated briefs
- generation job status records
- selected paper records
- brief-to-paper score joins
- source API cache records
- source diagnostics
- selected-paper full-text ingestion records
- selected-paper full-text chunks
- uploaded document metadata
- uploaded document chunks

Do not store extracted full text or uploaded document text inside `Brief.briefJson`. Full text and uploaded content must stay in their own tables/repositories.

Run migrations during deploy:

```bash
npm run prisma:generate
npm run prisma:migrate
```

For production platforms that require non-interactive migrations, run:

```bash
npx prisma migrate deploy
```

## Build

Before deploy, verify locally:

```bash
npm install
npm test
npm run embedding:check
npm run benchmark:retrieval
npm run benchmark:source-quality
npm run benchmark:claim-check
npm run lint
npm run build
```

The test suite does not call DeepSeek by default. PostgreSQL integration tests are skipped unless `DATABASE_URL` points to PostgreSQL.

`npm run embedding:check` validates the effective embedding provider, vector shape, and missing configuration without printing API keys.

`npm run benchmark:retrieval` uses the configured embeddings provider and fails when retrieval quality drops below the configured thresholds. Defaults:

```bash
RETRIEVAL_BENCHMARK_MIN_TOP1=0.85
RETRIEVAL_BENCHMARK_MIN_RECALL=0.85
SOURCE_QUALITY_BENCHMARK_MIN_TOP1=0.90
SOURCE_QUALITY_BENCHMARK_MIN_RECALL=0.90
```

It also writes local ignored artifacts for comparison across providers:

```text
benchmark-results/retrieval-gold-latest.json
benchmark-results/retrieval-gold-latest.md
benchmark-results/source-quality-latest.json
benchmark-results/source-quality-latest.md
benchmark-results/claim-check-latest.json
benchmark-results/claim-check-latest.md
```

`npm run benchmark:claim-check` uses deterministic local fixtures. It does not call live academic APIs or AI providers.

## Runtime Checks

After deploy, check:

```bash
GET /api/source-cache
```

Expected production shape:

- `persistence.mode` is `postgresql`
- `persistence.warning` is `null`
- source health returns recent diagnostics after generating a brief
- cache counts increase after live source searches

Then generate a small mock-source brief first, followed by a live-source brief.

You can run the repeatable deployment smoke check against an already running app:

```bash
SMOKE_BASE_URL=https://your-deployment.example npm run smoke:deploy
```

Local default:

```bash
npm run smoke:deploy
```

The smoke check verifies:

- `GET /api/source-cache`
- `POST /api/briefs/preflight`
- `POST /api/briefs`
- `GET /api/briefs/[id]`
- `GET /briefs/[id]`
- `POST /api/briefs/[id]/questions`
- `GET /api/export/[id]?format=markdown`
- `GET /documents`
- `GET /api/documents`
- `GET /compare`
- `POST /api/claim-check/extract`
- `POST /api/claim-check` with mock sources

It uses `SMOKE_SOURCES=mock` by default so source adapter rate limits do not block deployment verification. It still exercises the configured AI provider for brief generation and Q&A unless `SMOKE_SKIP_AI=true` is set for a preflight-only check.

The current deployment smoke covers the basic `/documents` and `/compare` page/API flows without uploading a real file. Manual checks should still verify real PDF/TXT/MD uploads, deletion, and unsupported-document refusal before public demos.

Brief generation status is persisted when PostgreSQL is configured, but the
web process should not be the only background executor in production. Run a
separate worker process:

```bash
npm run worker:briefs
```

For local demos, memory mode auto-runs queued jobs by default. Production
PostgreSQL deployments should keep `BRIEF_JOB_AUTORUN=false` and rely on the
worker. The DB-backed worker marks claimed jobs with a lease, resets stale
`running` jobs after `BRIEF_JOB_STALE_MS`, and fails them after
`BRIEF_JOB_MAX_ATTEMPTS` exhausted stale leases. A stronger external queue can
still replace the simple DB-backed worker when multi-instance throughput grows.

## Rate Limiting

The limiter protects `POST /api/briefs` with a per-IP window.

Local development and tests use in-memory counters by default. Production requires shared Upstash Redis REST rate limiting by default:

```bash
RATE_LIMIT_BACKEND=upstash
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

Missing shared rate-limit configuration returns a controlled configuration error instead of silently using per-instance memory counters. For temporary single-instance demos only, set `ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION=true`.

Hosting-provider edge rate limiting, API gateway rules, or authenticated per-user quotas can still be layered on top later.

## Secrets

Never commit:

- `.env`
- API keys
- production `DATABASE_URL`
- exported logs containing secrets

The repository already ignores `.env`, `.next`, and `node_modules`.

## Uploaded Documents

Uploaded documents are private by either authenticated user/workspace ownership
or the local/demo session fallback. For public multi-user deployment:

- set `DOCUMENT_AUTH_REQUIRED=true`
- provide trusted `X-AI-Brief-User-Id` and, when relevant,
  `X-AI-Brief-Workspace-Id` headers
- keep uploaded chunks isolated by owner/workspace/session
- disable global/public uploaded-document history
- add retention and deletion policy copy in the UI
- keep deletion support enabled
- do not mix uploaded private chunks with public global retrieval
- send only retrieved relevant chunks to AI providers, not entire documents unless they are very small

## Pre-Deploy Checklist

- [ ] `DEEPSEEK_API_KEY` is configured in the hosting provider.
- [ ] `AI_PROVIDER=deepseek`.
- [ ] `AI_MODEL=deepseek-v4-pro`.
- [ ] `DATABASE_URL` points to production PostgreSQL.
- [ ] `ALLOW_MEMORY_STORAGE_IN_PRODUCTION` is not set for real production deployments.
- [ ] `RATE_LIMIT_BACKEND=upstash`.
- [ ] `UPSTASH_REDIS_REST_URL` is configured.
- [ ] `UPSTASH_REDIS_REST_TOKEN` is configured.
- [ ] `ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION` is not set for real production deployments.
- [ ] `PUBLIC_BRIEF_HISTORY_ENABLED` is unset or `false` unless public history is intentional.
- [ ] `DEPLOYMENT_PRIVACY_NOTICE` is enabled, or equivalent production privacy copy is shown elsewhere.
- [ ] Production embeddings are configured, or local embeddings are intentionally accepted for the deployment.
- [ ] `npm run embedding:check` succeeds with the intended embedding provider.
- [ ] `npx prisma migrate deploy` succeeds.
- [ ] `npm run build` succeeds.
- [ ] Uploaded document privacy model is acceptable for the deployment scope.
- [ ] Identity model is selected and documented. Full public SaaS requires
  app-native accounts/workspaces; trusted headers are private/B2B or interim
  only.
- [ ] App-native identity migration has been deployed before enabling account
  or workspace features.
- [ ] Public multi-user uploads require `DOCUMENT_AUTH_REQUIRED=true` and trusted user/workspace headers.
- [ ] Document retention/deletion policy copy is visible before public upload.
- [ ] `DOCUMENT_UPLOADS_ENABLED` or `ALLOW_SESSION_DOCUMENT_UPLOADS_IN_PRODUCTION` is set only for private/internal upload deployments.
- [ ] `BRIEF_RATE_LIMIT_MAX` and `BRIEF_RATE_LIMIT_WINDOW_MS` are set.
- [ ] `npm run worker:briefs` is running as a separate process for production brief generation.
- [ ] `BRIEF_JOB_AUTORUN=false` is set for production web processes unless a single-process private demo is intentional.
- [ ] `BRIEF_JOB_MAX_ATTEMPTS` and `BRIEF_JOB_STALE_MS` are set intentionally for the expected AI latency.
- [ ] `.env` is not committed.
- [ ] `/api/source-cache` reports `mode: postgresql`.
- [ ] Missing or failing source adapters produce warnings, not crashes.
- [ ] A Polish query produces a Polish final brief.
- [ ] Every finding/theme/gap/uncertainty includes valid `sourcePaperIds`.
- [ ] Full-text status badges are checked for parsed, unavailable, and failed cases.
- [ ] Ask My Documents refuses questions unsupported by uploaded chunks.
- [ ] Compare With Science uses non-binary classifications and evidence snippets.

## Rollback Notes

If a deploy fails after a migration, keep the database online and roll back the app version first. Do not drop production tables. Prisma migrations should be treated as forward-only unless a manual rollback plan has been tested.
