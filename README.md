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

1. Add `DATABASE_URL=postgresql://...` to `.env`.
2. Generate Prisma Client:

```bash
npm run prisma:generate
```

3. Apply migrations:

```bash
npm run prisma:migrate
```

Without `DATABASE_URL`, the app safely falls back to in-memory storage.

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
