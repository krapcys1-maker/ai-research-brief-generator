# Deployment Guide

## Goal

Deploy the AI Research Brief Generator as a source-grounded pipeline:

```text
user query -> academic source adapters -> normalized papers -> dedupe/ranking -> DeepSeek synthesis -> Zod validation -> PostgreSQL persistence
```

This is not a chatbot deployment. The production app should preserve the same source-grounded behavior as local development.

## Required Environment Variables

Set these in the hosting provider, not in committed files:

```bash
AI_PROVIDER=deepseek
AI_MODEL=deepseek-v4-pro
DEEPSEEK_API_KEY=...
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
```

Public brief history setting:

```bash
PUBLIC_BRIEF_HISTORY_ENABLED=false
```

Production defaults to disabled public brief history when this variable is omitted. Enable it only after authentication/session scoping exists or when generated brief summaries are intentionally public.

Optional source API setting:

```bash
SEMANTIC_SCHOLAR_API_KEY=...
```

Semantic Scholar can run without a key, but anonymous requests are more likely to be rate limited.

## Database

Use a managed PostgreSQL database in production. The local `docker-compose.yml` PostgreSQL service is for development only.

The app uses Prisma for:

- generated briefs
- selected paper records
- brief-to-paper score joins
- source API cache records
- source diagnostics

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
npm run lint
npm run build
```

The test suite does not call DeepSeek by default. PostgreSQL integration tests are skipped unless `DATABASE_URL` points to PostgreSQL.

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

It uses `SMOKE_SOURCES=mock` by default so source adapter rate limits do not block deployment verification. It still exercises the configured AI provider for brief generation and Q&A unless `SMOKE_SKIP_AI=true` is set for a preflight-only check.

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
- [ ] `npx prisma migrate deploy` succeeds.
- [ ] `npm run build` succeeds.
- [ ] `BRIEF_RATE_LIMIT_MAX` and `BRIEF_RATE_LIMIT_WINDOW_MS` are set.
- [ ] `.env` is not committed.
- [ ] `/api/source-cache` reports `mode: postgresql`.
- [ ] Missing or failing source adapters produce warnings, not crashes.
- [ ] A Polish query produces a Polish final brief.
- [ ] Every finding/theme/gap/uncertainty includes valid `sourcePaperIds`.

## Rollback Notes

If a deploy fails after a migration, keep the database online and roll back the app version first. Do not drop production tables. Prisma migrations should be treated as forward-only unless a manual rollback plan has been tested.
