# AI Research Brief Generator — Cursor Pack

## Jak użyć

1. Wrzuć te pliki do głównego folderu projektu.
2. Otwórz projekt w Cursorze.
3. Otwórz `CURSOR_START_PROMPT.md`.
4. Skopiuj pierwszy prompt do Cursor Plan Mode.
5. Nie każ Cursorowi budować wszystkiego naraz. Najpierw Phase 1 i Phase 2.

## Najważniejsze pliki

- `PROJECT.md` — główna specyfikacja projektu.
- `TODO.md` — kolejność budowy.
- `CURSOR_START_PROMPT.md` — gotowy prompt startowy.
- `.cursor/rules/*.mdc` — stałe reguły dla Cursor Agenta.
- `docs/ARCHITECTURE.md` — architektura.
- `docs/MVP_SPEC.md` — zakres MVP.
- `docs/PROMPTS.md` — prompty AI.
- `docs/DEPLOYMENT.md` — deployment checklist and production runtime notes.

## Główna zasada

To nie jest chatbot. To pipeline:

```text
academic APIs → normalized papers → dedupe → ranking → structured AI synthesis → source-validated brief
```

## MVP defaults

- Start without PostgreSQL. Use mock data and in-memory/mock storage first.
- Use a provider-agnostic AI abstraction.
- Default AI config: `provider: deepseek`, `model: deepseek-v4-pro`.
- Read AI config from `AI_PROVIDER`, `AI_MODEL`, and `DEEPSEEK_API_KEY`.
- Academic sources currently supported: mock data, arXiv, Semantic Scholar, OpenAlex.
- Semantic Scholar can work without a key but may rate limit; add `SEMANTIC_SCHOLAR_API_KEY` later for better reliability.
- Source API responses are cached in memory for the MVP. The cache resets when the server restarts.
- Search uses deterministic query expansion. Polish queries may generate English academic search variants, while the final brief language still follows the original query.
- Brief persistence uses an in-memory repository by default. A Prisma/PostgreSQL repository is prepared and is selected automatically when `DATABASE_URL` is present.

## How to run locally

1. Create or update `.env` with:
   - `AI_PROVIDER=deepseek`
   - `AI_MODEL=deepseek-v4-pro`
   - `DEEPSEEK_API_KEY=...`
   - optional `BRIEF_RATE_LIMIT_MAX=5`
   - optional `BRIEF_RATE_LIMIT_WINDOW_MS=600000`
   - optional `RATE_LIMIT_BACKEND=memory`
   - optional `PUBLIC_BRIEF_HISTORY_ENABLED=true`
2. Install dependencies:

```bash
npm install
```

3. Start the app:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

Optional PostgreSQL persistence:

1. Start the local PostgreSQL container:

```bash
docker compose up -d postgres
```

2. Add a PostgreSQL `DATABASE_URL` to `.env`, or set it only for the current shell/session.
3. Generate Prisma Client:

```bash
npm run prisma:generate
```

4. Apply migrations:

```bash
npm run prisma:migrate
```

With PostgreSQL enabled, generated briefs, selected papers, source API cache records, and source diagnostics are persisted through Prisma. In local development, without `DATABASE_URL`, or when `DATABASE_URL` is not a PostgreSQL URL, the app falls back to in-memory storage and reports the active storage mode in the Source health panel.

In production, a valid PostgreSQL `DATABASE_URL` is required by default. The app fails fast instead of silently switching to non-durable memory storage. For temporary demos only, set `ALLOW_MEMORY_STORAGE_IN_PRODUCTION=true`.

Public recent brief history is enabled by default in local development and disabled by default in production. Set `PUBLIC_BRIEF_HISTORY_ENABLED=true` only when global brief summaries are safe to expose.

Rate limiting uses in-memory counters in local development. In production, configure a shared Upstash Redis REST backend so limits work across instances:

- `RATE_LIMIT_BACKEND=upstash`
- `UPSTASH_REDIS_REST_URL=...`
- `UPSTASH_REDIS_REST_TOKEN=...`

For temporary single-instance demos only, set `ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION=true`.

Optional PostgreSQL integration check:

```bash
npm test -- tests/prismaBriefRepository.integration.test.ts
```

This integration test is skipped unless `DATABASE_URL` points to PostgreSQL.

Useful checks:

```bash
npm run lint
npm test
npm run build
```

The test suite covers core pure modules plus the mock-paper brief pipeline and the `/api/briefs` route without calling DeepSeek.

Optional cache diagnostic:

```bash
curl http://localhost:3000/api/source-cache
```
