# Droga do Pelnego Publicznego SaaS

Last updated: 2026-06-02

To jest zywy plik do odhaczania prac po kazdym kroku. Cel: doprowadzic
AI Research Brief Generator z obecnego stanu private beta / internal production
candidate do pelnego publicznego SaaS.

## Aktualny werdykt

Obecny etap: **private beta / internal production candidate**.

Publiczny SaaS: **jeszcze nie**.

Publiczny demo/internal deployment: **tak, warunkowo**:

- bez publicznych uploadow sesyjnych,
- z prawdziwym PostgreSQL,
- z shared rate limiting,
- z osobnym workerem,
- z jasna informacja prywatnosci,
- z trusted auth gateway tylko jako tryb prywatny/B2B albo przejsciowy.

Szacunkowa gotowosc public SaaS: **5/10**.

## Jak tego uzywac

- `[x]` oznacza zrobione i zweryfikowane na aktualnym repo.
- `[ ]` oznacza do zrobienia.
- `Czesciowo` oznacza, ze fundament istnieje, ale nie jest jeszcze pelnym
  SaaSowym rozwiazaniem.
- Punkt odhaczamy dopiero po:
  1. wdrozeniu zmiany w kodzie,
  2. uruchomieniu sensownych testow dla tej zmiany,
  3. aktualizacji tego pliku,
  4. aktualizacji `STATUS.md` i `TODO.md`, jesli punkt dotyczy aktywnej pracy.
- Po kazdym wiekszym kroku aktualizujemy ten plik, `STATUS.md` i w razie
  potrzeby `TODO.md`.

## Definicja pelnego publicznego SaaS

Produkt mozna nazwac pelnym publicznym SaaS dopiero, gdy spelnia te warunki:

- [ ] Ma stabilna tozsamosc uzytkownika: konta, logowanie, sesje produkcyjne,
  reset dostepu, podstawowe role.
- [ ] Ma workspace'y lub organizacje: wlasciciel, administrator, czlonek,
  viewer.
- [ ] Wszystkie prywatne zasoby maja wlasciciela: briefy, joby, dokumenty,
  chunki, pytania, eksporty, compare reports i przyszle zapisane tematy.
- [ ] Kazdy endpoint prywatny sprawdza uprawnienia przed odczytem, zapisem,
  pollingiem joba, eksportem i Q&A.
- [ ] Produkcja dziala na PostgreSQL, a migracje przechodza przez
  `npx prisma migrate deploy`.
- [ ] Rate limiting jest wspoldzielony miedzy instancjami, np. Upstash Redis.
- [ ] Web process i worker sa rozdzielone.
- [ ] Embeddingi produkcyjne sa skonfigurowane i porownane z lokalnym
  fallbackiem.
- [ ] PDF/full-text ma recorded fixtures i diagnostyke jakosci parsowania.
- [ ] Monitoring, logi i alerty obejmuja AI provider, zrodla, worker, kolejke,
  storage i bledy routingu.
- [ ] Jest polityka retencji/usuwania danych oraz publicznie widoczna informacja
  o tym, co idzie do AI providera.
- [ ] Jest produktowa warstwa SaaS: zapisane tematy, zapisane raporty,
  biblioteka briefow, dashboard workspace.
- [ ] Jest model komercyjny lub quota model: plany, limity, billing, trial,
  admin panel albo przynajmniej reczny model private beta.

## Co juz mamy

- [x] Next.js App Router research workspace.
- [x] Research Brief pipeline: query, zrodla, normalizacja, deduplikacja,
  ranking, quality gate, synteza AI, grounding, UI, eksport Markdown.
- [x] Zrodla: mock, arXiv, Semantic Scholar, OpenAlex.
- [x] Zod validation dla AI output.
- [x] Evidence snippets i `sourcePaperIds` dla kluczowych claimow.
- [x] Evidence boundaries: metadata, abstract, full-text, uploaded document,
  mixed, insufficient.
- [x] Ask This Brief z Q&A ograniczonym do wybranego briefu i jego zrodel.
- [x] Ask My Documents: upload PDF/TXT/MD, chunking, retrieval, Q&A, delete/list.
- [x] Compare With Science: ekstrakcja claimow, porownanie z literatura,
  klasyfikacje niebinarne, caveaty, safer wording.
- [x] PostgreSQL/Prisma persistence dla briefow, papierow, jobow, cache,
  diagnostyki, full-text i dokumentow.
- [x] Async brief generation job flow z pollingiem.
- [x] DB-backed worker, lease recovery i attempt limits.
- [x] Stage telemetry dla jobow: queued, preflight, full_text_ingestion,
  synthesis, persistence, completed, failed.
- [x] Produkcyjny fail-fast dla braku PostgreSQL, chyba ze wlaczony jest jawny
  demo escape hatch.
- [x] Shared rate limiting przez Upstash Redis REST.
- [x] Session-scoped private brief history.
- [x] Ochrona brief detail, Markdown export i brief Q&A przez session ownership.
- [x] Trusted-header ownership dla uploadowanych dokumentow:
  `X-AI-Brief-User-Id` i opcjonalny `X-AI-Brief-Workspace-Id`.
- [x] `DOCUMENT_AUTH_REQUIRED=true` blokuje anonimowe uploady dokumentow.
- [x] Document chunks sa izolowane po user/workspace/session.
- [x] Production privacy notice.
- [x] Oficjalna decyzja tozsamosci: pelny public SaaS docelowo uzywa
  app-native auth + workspace'y, a trusted auth gateway zostaje trybem
  prywatnym/B2B lub przejsciowym. Szczegoly: `docs/IDENTITY_MODEL.md`.
- [x] Prisma identity foundation: `User`, `Workspace`, `WorkspaceMember` i
  role `owner/admin/member/viewer` z migracja
  `20260602193000_add_app_identity`.
- [x] Brief/job ownership foundation: `ownerId`, `workspaceId`,
  `createdByUserId`, `visibility` w `Brief` i `BriefGenerationJob`, migracja
  `20260602195000_add_brief_workspace_ownership`, plus memory/Prisma repo
  storage dla tych pol.
- [x] AI synthesis diagnostics i embedding health w `/api/source-cache`.
- [x] Benchmarki: retrieval, source-quality, claim-check.
- [x] Deployment smoke obejmuje source health, preflight, documents, compare,
  claim extraction, claim comparison i opcjonalnie AI flow.

## Najwieksze braki

1. **Brak runtime app-native auth i UI kont.**
   Decyzja architektoniczna i schemat Prisma sa juz gotowe, ale nie ma jeszcze
   logowania, sesji uzytkownika, UI kont ani enforcementu rol.

2. **Briefy i joby nie sa jeszcze workspace-scoped.**
   Pola ownership sa juz w schemacie i repozytoriach. Brakuje jeszcze runtime
   access layer, ktory wymusi user/workspace/role przy list/detail/export/Q&A.

3. **Brakuje user/workspace-aware access layer.**
   Endpointy briefow i jobow maja juz session ownership, a dokumenty maja
   trusted user/workspace ownership, ale docelowa warstwa uprawnien musi
   obslugiwac app-native user/workspace/role.

4. **Compare With Science nie ma jeszcze zapisanych raportow.**
   Obecny flow dziala jako runtime comparison, ale nie ma `CompareReport`,
   historii, workspace ownership ani background polling.

5. **Produkcja nie jest jeszcze realnie skonfigurowana.**
   Obecne lokalne srodowisko uzywa local embedding fallback; trzeba dodac
   produkcyjny PostgreSQL URL, Upstash, AI secrets i model-grade embeddings.

6. **PDF/full-text wymaga mocniejszych fixtures i parser diagnostics.**
   Parser dziala jako plain text, ale przed publicznym zaufaniem potrzebne sa
   recorded PDF fixtures, quality metrics i ostrzezenia w UI.

7. **DB-backed worker jest dobry na start, ale nie jest docelowa kolejka.**
   Przy wiekszym ruchu trzeba przejsc na zewnetrzna kolejke lub przynajmniej
   wyciagnac stabilny `JobQueue` adapter.

8. **Brakuje produktowej retencji.**
   Sa briefy, dokumenty i compare, ale jeszcze nie ma saved topics, collections,
   dashboardu workspace ani zapisanych raportow.

9. **Brakuje billing/quota/admin.**
   Bez planow, limitow, triala, admin panelu i audit logu to nadal bardziej beta
   niz dojrzaly SaaS.

## Faza P0: Bezpieczenstwo i ownership

Status: **najwyzszy priorytet**.

- [x] Session-scoped brief history.
- [x] Ochrona brief detail/export/Q&A po session cookie.
- [x] Trusted-header ownership dla dokumentow.
- [x] Workspace isolation dla dokumentow i chunkow.
- [x] Dodac ownership check do `GET /api/briefs/jobs/[id]`.
  Zweryfikowano 2026-06-02: `npm test -- tests/briefJobs.test.ts
  tests/briefAccessRoute.test.ts` oraz `npm run lint`.
- [x] Zdecydowac oficjalny tryb tozsamosci:
  trusted auth gateway czy app-native auth.
  Decyzja 2026-06-02: pelny public SaaS uzywa app-native auth + workspace'y.
  Trusted auth gateway zostaje trybem prywatnym/B2B lub przejsciowym.
  Zweryfikowano dokumentacyjnie: `docs/IDENTITY_MODEL.md`, `npm run lint`,
  `npm test -- tests/deploymentPrivacyConfig.test.ts tests/briefJobs.test.ts
  tests/briefAccessRoute.test.ts`.
- [x] Jesli app-native auth: dodac `User`, `Workspace`, `WorkspaceMember`,
  role i migracje.
  Zweryfikowano 2026-06-02: `npx prisma validate` z tymczasowym
  `DATABASE_URL=postgresql://...`, `npm test -- tests/identitySchema.test.ts`,
  `npm test`, `npm run lint`, `npm run build`.
- [x] Dodac `ownerId`, `workspaceId`, `createdByUserId`, `visibility` do
  briefow i brief generation jobs.
  Zweryfikowano 2026-06-02: `npx prisma validate`, `npm test --
  tests/inMemoryBriefRepository.test.ts tests/briefJobs.test.ts
  tests/createBrief.test.ts tests/identitySchema.test.ts`, `npm test`,
  `npm run lint`, `npm run build`.
- [ ] Przeniesc rate limit z per-IP na per-user/per-workspace tam, gdzie jest
  dostepna tozsamosc.
- [ ] Dodac testy cross-user/cross-workspace dla brief list, detail, export,
  Q&A, job polling, documents i compare.
- [ ] Ujednolicic privacy notice tak, aby rozroznial trusted-user mode i
  session-demo mode.

Kryterium odbioru P0:

- uzytkownik A nie moze zobaczyc joba, briefu, dokumentu, eksportu, pytania ani
  raportu uzytkownika B;
- workspace A nie widzi zasobow workspace B;
- publiczne session uploads sa domyslnie wylaczone;
- wszystkie prywatne API maja test izolacji.

Rekomendowana pierwsza poprawka:

```bash
npm test -- tests/briefJobs.test.ts tests/briefAccessRoute.test.ts
```

## Faza P1: Produkcyjna konfiguracja i deploy

Status: **czesciowo zrobione**.

- [x] `npm test` przechodzi na obecnym zestawie testow.
- [x] `npm run lint` przechodzi.
- [x] `npm run build` przechodzi.
- [x] `SMOKE_SKIP_AI=true npm run smoke:deploy` przechodzi na lokalnym
  produkcyjnym buildzie.
- [x] Produkcyjny fail-fast storage.
- [x] Produkcyjny shared rate limiting przez Upstash.
- [x] Osobny `npm run worker:briefs`.
- [ ] Skonfigurowac prawdziwy produkcyjny `DATABASE_URL`.
- [ ] Uruchomic `npx prisma migrate deploy` na staging/production DB.
- [ ] Skonfigurowac `DEEPSEEK_API_KEY` i produkcyjne timeouty.
- [ ] Skonfigurowac `RATE_LIMIT_BACKEND=upstash`,
  `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- [ ] Skonfigurowac produkcyjne embeddingi:
  `EMBEDDING_PROVIDER=openai_compatible`.
- [ ] Uruchomic `npm run embedding:check` na produkcyjnym providerze.
- [ ] Uruchomic pelny `npm run smoke:deploy` bez `SMOKE_SKIP_AI=true`.
- [ ] Ustawic `BRIEF_JOB_AUTORUN=false` dla web process.
- [ ] Uruchomic worker jako osobny proces.
- [ ] Dodac staging checklist i rollback procedure dla migracji.

Kryterium odbioru P1:

- `/api/source-cache` pokazuje `persistence.mode=postgresql`;
- embedding health pokazuje model-grade provider, nie local fallback;
- smoke z AI przechodzi;
- worker przetwarza joby poza web processem;
- produkcja nie ma wlaczonych demo escape hatchy.

## Faza P2: Research quality

Status: **czesciowo zrobione**.

- [x] Hybrid lexical/semantic scoring z lokalnym embedding fallbackiem.
- [x] Embedding provider abstraction.
- [x] `npm run embedding:check`.
- [x] Retrieval benchmark.
- [x] Source-quality benchmark.
- [x] Claim-check benchmark.
- [x] Metadata-quality warnings.
- [ ] Porownac local fallback vs production embeddings.
- [ ] Dodac wiecej gold queries z live OpenAlex/arXiv/Semantic Scholar.
- [ ] Rozszerzyc source-quality fixtures o wiecej recorded live failures.
- [ ] Rozszerzyc Compare With Science benchmarki o live/full-text cases.
- [ ] Ustalic progi jakosci do CI dla retrieval/source-quality/claim-check.
- [ ] Dodac raport porownawczy embedding providerow w `benchmark-results`.

Kryterium odbioru P2:

- model-grade embeddings nie pogarszaja benchmarkow;
- benchmarki maja pokrycie dla polskich zapytan, literowek, akronimow,
  query expansion i trudnych porownan;
- regresje retrievalu sa widoczne przed deployem.

## Faza P3: Full-text i PDF robustness

Status: **czesciowo zrobione**.

- [x] Legal full-text ingestion dla arXiv/source-provided PDF URLs.
- [x] Separate `PaperFullText` i `PaperTextChunk` storage.
- [x] Per-paper failure isolation.
- [x] Full-text evidence boundary.
- [ ] Recorded PDF fixtures.
- [ ] Parser diagnostics: page count, empty pages, char count, warnings,
  parser version, quality score.
- [ ] UI warnings dla slabej jakosci parsowania.
- [ ] Page-range support.
- [ ] Background jobs dla ciezszego PDF/full-text ingestion.
- [ ] Testy scanned PDF / noisy PDF / table-heavy PDF / failed extraction.

Kryterium odbioru P3:

- pelny tekst jest uzywany tylko, gdy parser quality jest akceptowalny;
- slaba ekstrakcja nie podnosi evidence level bez ostrzezenia;
- pojedynczy uszkodzony PDF nie blokuje briefu ani compare.

## Faza P4: Produktowy SaaS workspace

Status: **do zrobienia**.

- [ ] Dashboard workspace.
- [ ] Saved topics / research projects.
- [ ] Saved brief collections.
- [ ] Saved Compare With Science reports.
- [ ] Background job polling dla compare.
- [ ] Dokument collections.
- [ ] Notatki lub komentarze do zapisanych papierow.
- [ ] Share links z kontrola widocznosci.
- [ ] Export history.
- [ ] Prosty onboarding dla nowego uzytkownika.

Kryterium odbioru P4:

- uzytkownik nie tylko generuje jednorazowy brief, ale buduje biblioteke
  researchu w workspace;
- da sie wrocic do tematow, dokumentow, raportow i eksportow.

## Faza P5: Observability, admin, compliance

Status: **do zrobienia**.

- [x] AI synthesis diagnostics w aplikacji.
- [x] Source diagnostics i cache health.
- [ ] Structured production logs.
- [ ] Alerty dla AI timeoutow, fallback rate, source failures, worker stalls.
- [ ] Audit log dla upload/delete/export/share.
- [ ] Admin panel lub przynajmniej admin API dla private beta.
- [ ] Retention policy per workspace.
- [ ] Data deletion workflow.
- [ ] Terms, privacy policy, provider data notice.
- [ ] Security headers review.
- [ ] Backup/restore plan dla PostgreSQL.

Kryterium odbioru P5:

- da sie odpowiedziec kto mial dostep do zasobu, kiedy go usunal, kiedy byl
  eksportowany i czy provider AI mial awarie;
- deployment ma plan retencji i usuwania danych.

## Faza P6: Billing, limity i public beta

Status: **do zrobienia**.

- [ ] Plan free/trial/private beta.
- [ ] Limity per user/workspace: briefy, Q&A, upload bytes, compare claims.
- [ ] Billing provider, np. Stripe, jesli SaaS ma byc komercyjny.
- [ ] Usage metering.
- [ ] Upgrade/downgrade/cancel flow.
- [ ] Admin override dla limitow.
- [ ] Public beta landing/onboarding.
- [ ] Support channel i incident process.
- [ ] Launch checklist.

Kryterium odbioru P6:

- publiczny uzytkownik moze zalozyc konto, korzystac w limitach, zaplacic lub
  dzialac w trialu, a zespol widzi usage i problemy.

## Najblizsze 10 krokow

1. [x] Naprawic privacy bug w job polling: `GET /api/briefs/jobs/[id]` musi
   sprawdzac owner session lub przyszly user/workspace.
2. [x] Zdecydowac tryb tozsamosci:
   - rekomendowane dla pelnego public SaaS: app-native auth + workspace'y;
   - akceptowalne dla B2B/private deployment: trusted auth gateway.
3. [x] Dodac schemat `User`, `Workspace`, `WorkspaceMember` albo oficjalny dokument
   kontraktu trusted auth gateway.
4. [x] Rozszerzyc `Brief` i `BriefGenerationJob` o workspace/user ownership.
5. [ ] Dodac cross-user tests dla briefow, jobow, eksportu i Q&A.
6. [ ] Skonfigurowac produkcyjny embedding provider i uruchomic benchmarki.
7. [ ] Dodac recorded live-source fixtures dla OpenAlex/arXiv/Semantic Scholar.
8. [ ] Dodac PDF parser diagnostics i recorded PDF fixtures.
9. [ ] Zaprojektowac `CompareReport` z workspace ownership.
10. [ ] Przygotowac staging env: PostgreSQL, Upstash, AI secrets, worker i smoke
    bez `SMOKE_SKIP_AI=true`.

## Ostatni znany snapshot weryfikacji

Wedlug aktualnych zapiskow projekt przeszedl:

- `npm test` - pass
- `npm run lint` - pass
- `npm run build` - pass
- `npm run embedding:check` - pass na local `local-hash-ngrams`, 192 dims
- `npm run benchmark:retrieval` - pass na obecnych fixtures
- `npm run benchmark:source-quality` - pass na obecnych fixtures
- `npm run benchmark:claim-check` - pass na obecnych fixtures
- `SMOKE_SKIP_AI=true npm run smoke:deploy` - pass na lokalnym produkcyjnym
  buildzie

Znany caveat:

- lokalny `.env` nie jest produkcyjna konfiguracja Postgres; `npx prisma
  validate` wymaga poprawnego `DATABASE_URL=postgresql://...`.
- embedding provider produkcyjny nie jest jeszcze skonfigurowany.

## Czego teraz nie dokladac

Nie dodawac jeszcze paper timeline, topic clusteringu, citation graph ani
knowledge graph jako priorytetu. To sa dobre funkcje pozniej, ale teraz
najwiekszy zwrot daja: ownership, produkcyjna konfiguracja, embedding quality,
PDF diagnostics i zapisane workflowy.
