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
- [x] PDF/full-text ma recorded fixtures i diagnostyke jakosci parsowania.
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
- [x] Trusted-header user/workspace runtime access dla brief list, detail,
  `/briefs/[id]`, Markdown export, brief Q&A i job polling, z zachowanym
  session fallbackiem dla demo/private mode.
- [x] Brief generation i brief Q&A rate limit uzywa user/workspace key, gdy
  trusted identity jest dostepna; anonimowy fallback nadal jest per-IP.
- [x] AI synthesis diagnostics i embedding health w `/api/source-cache`.
- [x] Benchmarki: retrieval, source-quality, claim-check.
- [x] Embedding provider comparison runner:
  `npm run benchmark:embedding-comparison` zapisuje lokalny baseline i porownuje
  model-grade provider, gdy jest skonfigurowany.
- [x] Recorded live-source adapter fixtures dla arXiv, Semantic Scholar i
  OpenAlex w `tests/fixtures/live-sources`.
- [x] CompareReport ownership foundation: Prisma model, migracja i
  repozytoria memory/PostgreSQL z `ownerSessionId`, `ownerId`, `workspaceId`,
  `createdByUserId` i `visibility`.
- [x] App-native session runtime foundation: `UserSession`, hashowane tokeny,
  cookie `ai_brief_app_session`, `GET /api/auth/session` i app-session access
  dla brief list/detail/export/Q&A/job polling.
- [x] UI warnings dla slabej jakosci parsowania PDF/full-text w source cards i
  Markdown export.
- [x] Page-range support dla full-text parsera/chunkingu na extracted page
  fixtures i API opcji `FULL_TEXT_PAGE_RANGE`.
- [x] Background jobs dla ciezszego PDF/full-text ingestion: osobny
  `FullTextIngestionJob`, repozytoria memory/PostgreSQL, ownership metadata,
  lease recovery, attempt limits, `BRIEF_FULL_TEXT_INGESTION_MODE=background`
  i `npm run worker:fulltext`.
- [x] Deployment smoke obejmuje source health, preflight, documents, compare,
  claim extraction, claim comparison i opcjonalnie AI flow.
- [x] Dashboard workspace laczy najnowsze briefy, dokumenty i zapisane Compare
  reports w jednym session/user/workspace-scoped widoku `/workspace`.
- [x] Saved topics / research projects: `ResearchProject` ma ownership,
  repozytoria memory/PostgreSQL, API i UI w dashboardzie workspace.
- [x] Saved brief collections: `BriefCollection` ma ownership, walidacje
  dostepu do briefow, repozytoria memory/PostgreSQL, API i UI w dashboardzie.
- [x] Dokument collections: `DocumentCollection` ma ownership, walidacje
  dostepu do dokumentow, repozytoria memory/PostgreSQL, API i UI w dashboardzie.
- [x] Notatki/komentarze do zapisanych papierow: `PaperNote` ma ownership,
  walidacje dostepu do papierow z dostepnych briefow, repozytoria
  memory/PostgreSQL, API i UI w dashboardzie.

## Najwieksze braki

1. **Brak pelnego app-native auth i UI kont.**
   Decyzja architektoniczna, schemat Prisma i fundament sesji sa gotowe, ale
   nie ma jeszcze rejestracji/logowania, UI kont, resetu dostepu ani pelnego
   enforcementu rol.

2. **Briefy i joby maja trusted-header workspace enforcement, ale nie role.**
   Pola ownership sa w schemacie i repozytoriach, a runtime access layer chroni
   list/detail/export/Q&A/job polling po user/workspace. Brakuje jeszcze
   app-native sesji, membershipow i egzekwowania rol.

3. **App-native session runtime istnieje, ale nie ma jeszcze login UI.**
   Trusted user/workspace headers sa teraz mostem dla prywatnego/B2B wdrozenia,
   a app-native cookie/token runtime jest przygotowany dla briefow. Docelowa
   warstwa musi jeszcze obslugiwac rejestracje/logowanie, reset dostepu, role,
   membership UI i audit trail.

4. **Compare With Science ma zapisane raporty i polling jobow.**
   `CompareReport` ma model, migracje, repozytoria z workspace ownership,
   endpointy historii, UI zapisanych raportow oraz background job polling dla
   dluzszych porownan. Nadal brakuje trwalej DB-backed kolejki compare jobs i
   glebszego zarzadzania historia.

5. **Produkcja nie jest jeszcze realnie skonfigurowana.**
   Obecne lokalne srodowisko uzywa local embedding fallback; trzeba dodac
   produkcyjny PostgreSQL URL, Upstash, AI secrets i model-grade embeddings.

6. **PDF/full-text nadal wymaga glebszej obslugi trudnych PDF.**
   Sa recorded PDF fixtures, quality metrics i ostrzezenia w UI/eksporcie dla
   slabej ekstrakcji oraz page-range support w warstwie parser/chunking dla
   extracted page fixtures. Sa tez background jobs dla ciezszych PDF/full-text
   oraz testy scanned/noisy/table-heavy/failed extraction. Nadal brakuje
   prawdziwego OCR i semantycznej obslugi tabel.

7. **DB-backed worker jest dobry na start, ale nie jest docelowa kolejka.**
   Przy wiekszym ruchu trzeba przejsc na zewnetrzna kolejke lub przynajmniej
   wyciagnac stabilny `JobQueue` adapter.

8. **Brakuje produktowej retencji i udostepniania.**
   Sa briefy, dokumenty, compare, dashboard workspace i saved research
   projects, saved brief collections, document collections oraz
   notatki/komentarze do papierow, ale jeszcze nie ma share links, export
   history ani retencji per workspace.

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
- [x] Dodac app-native `UserSession` runtime foundation.
  Zweryfikowano 2026-06-02: `npx prisma generate`, `npm test --
  tests/appSession.test.ts tests/authSessionRoute.test.ts
  tests/briefAccessAppSession.test.ts tests/identitySchema.test.ts`.
- [x] Dodac `ownerId`, `workspaceId`, `createdByUserId`, `visibility` do
  briefow i brief generation jobs.
  Zweryfikowano 2026-06-02: `npx prisma validate`, `npm test --
  tests/inMemoryBriefRepository.test.ts tests/briefJobs.test.ts
  tests/createBrief.test.ts tests/identitySchema.test.ts`, `npm test`,
  `npm run lint`, `npm run build`.
- [x] Przeniesc rate limit z per-IP na per-user/per-workspace tam, gdzie jest
  dostepna tozsamosc.
- [x] Dodac testy cross-user/cross-workspace dla brief list, detail, export,
  Q&A, job polling, documents i compare.
  Zweryfikowano 2026-06-02: `npm test --
  tests/briefsRoute.test.ts tests/briefAccessRoute.test.ts
  tests/briefQuestionsRoute.test.ts tests/briefJobs.test.ts
  tests/documentsRoute.test.ts tests/documentRepository.test.ts
  tests/claimCheck.test.ts`.
- [x] Ujednolicic privacy notice tak, aby rozroznial trusted-user mode i
  session-demo mode.
  Zweryfikowano 2026-06-02: `npm test --
  tests/deploymentPrivacyConfig.test.ts`.

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
- [x] Dodac staging checklist i rollback procedure dla migracji.
  Zweryfikowano 2026-06-02: `npm test --
  tests/stagingReadiness.test.ts`; `npm run staging:check` przechodzi na
  kompletnej, zasymulowanej konfiguracji stagingowej i fail-fast wskazuje braki
  dla lokalnego env bez sekretow.

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
- [x] Dodac wiecej gold queries z live OpenAlex/arXiv/Semantic Scholar.
  Zweryfikowano 2026-06-02: dodano 3 recorded live-source gold cases dla
  arXiv, Semantic Scholar i OpenAlex; `npm test --
  tests/retrievalGoldBenchmark.test.ts`, `npm run benchmark:retrieval`.
- [x] Rozszerzyc source-quality fixtures o wiecej recorded live failures.
  Zweryfikowano 2026-06-02: dodano 3 recorded live-source failure cases dla
  clinical RAG/citation faithfulness/diagnosis support z wysokocytowanymi
  hard negatives; `npm test -- tests/sourceQualityBenchmark.test.ts`,
  `npm run benchmark:source-quality`.
- [x] Rozszerzyc Compare With Science benchmarki o live/full-text cases.
  Zweryfikowano 2026-06-02: dodano recorded arXiv/Semantic Scholar cases oraz
  full-text-supported transformer case z wymaganym `full_text_supported`;
  `npm test -- tests/claimCheckBenchmark.test.ts tests/claimCheck.test.ts`,
  `npm run benchmark:claim-check`.
- [x] Ustalic progi jakosci do CI dla retrieval/source-quality/claim-check.
  Zweryfikowano 2026-06-02: dodano centralne progi jakosci i
  `npm run benchmark:quality-gate` dla retrieval/source-quality/claim-check;
  `npm test -- tests/benchmarkQualityGate.test.ts
  tests/retrievalGoldBenchmark.test.ts tests/sourceQualityBenchmark.test.ts
  tests/claimCheckBenchmark.test.ts`, `npm run benchmark:quality-gate`.
- [x] Dodac raport porownawczy embedding providerow w `benchmark-results`.
  Zweryfikowano 2026-06-02: `npm run embedding:check`,
  `npm run benchmark:embedding-comparison`. Lokalny baseline przeszedl na
  `local-hash-ngrams`; model-grade provider zostal oznaczony jako
  `model_grade_not_configured`, bo w lokalnym env brakuje produkcyjnych
  sekretow.

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
- [x] Recorded PDF fixtures.
  Zweryfikowano 2026-06-02: `npm test --
  tests/fulltextFetchParseChunk.test.ts`.
- [x] Parser diagnostics: page count, empty pages, char count, warnings,
  parser version, quality score.
  Zweryfikowano 2026-06-02: `npm test --
  tests/fulltextFetchParseChunk.test.ts`.
- [x] UI warnings dla slabej jakosci parsowania.
  Zweryfikowano 2026-06-02: `npm test --
  tests/fulltextDiagnostics.test.ts tests/markdownExport.test.ts
  tests/fulltextFetchParseChunk.test.ts`; `npm run lint`.
- [x] Page-range support.
  Zweryfikowano 2026-06-02: `npm test --
  tests/fulltextPageRange.test.ts tests/fulltextFetchParseChunk.test.ts
  tests/fulltextDiagnostics.test.ts tests/markdownExport.test.ts`; `npm run
  lint`.
- [x] Background jobs dla ciezszego PDF/full-text ingestion.
  Zweryfikowano 2026-06-02: `npx prisma validate`, `npm test --
  tests/fulltextIngestionJobs.test.ts tests/createBriefFullText.test.ts`.
- [x] Testy scanned PDF / noisy PDF / table-heavy PDF / failed extraction.
  Zweryfikowano 2026-06-02: `npm test --
  tests/fulltextPdfRobustness.test.ts tests/fulltextFetchParseChunk.test.ts
  tests/fulltextDiagnostics.test.ts`.

Kryterium odbioru P3:

- pelny tekst jest uzywany tylko, gdy parser quality jest akceptowalny;
- slaba ekstrakcja nie podnosi evidence level bez ostrzezenia;
- pojedynczy uszkodzony PDF nie blokuje briefu ani compare.

## Faza P4: Produktowy SaaS workspace

Status: **czesciowo zrobione**.

- [x] Dashboard workspace.
  Zweryfikowano 2026-06-02: dodano `/workspace` i
  `GET /api/workspace/dashboard`, agregujace briefy, dokumenty i zapisane
  Compare reports z session/user/workspace isolation; `npm test --
  tests/workspaceDashboardRoute.test.ts tests/briefsRoute.test.ts
  tests/documentsRoute.test.ts tests/claimCheckReportsRoute.test.ts`.
- [x] Saved topics / research projects.
  Zweryfikowano 2026-06-02: dodano `ResearchProject` z
  session/user/workspace ownership, migracje Prisma, repozytoria
  memory/PostgreSQL, `GET/POST /api/workspace/projects` oraz formularz/listing
  w `/workspace`; `npm test -- tests/researchProjectRepository.test.ts
  tests/researchProjectsRoute.test.ts tests/workspaceDashboardRoute.test.ts
  tests/identitySchema.test.ts`, `npm run lint`.
- [x] Saved brief collections.
  Zweryfikowano 2026-06-02: dodano `BriefCollection` z
  session/user/workspace ownership, migracje Prisma, repozytoria
  memory/PostgreSQL, `GET/POST /api/workspace/brief-collections`, walidacje
  dostepu do wybranych briefow oraz formularz/listing w `/workspace`; `npm
  test -- tests/briefCollectionRepository.test.ts
  tests/briefCollectionsRoute.test.ts tests/workspaceDashboardRoute.test.ts
  tests/identitySchema.test.ts`, `npm run lint`.
- [x] Saved Compare With Science reports.
  Zweryfikowano 2026-06-02: `POST /api/claim-check` zapisuje raport,
  `GET /api/claim-check/reports` listuje historie, `GET
  /api/claim-check/reports/[id]` laduje raport z kontrola session/workspace,
  a `/compare` pokazuje i otwiera zapisane raporty; `npm test --
  tests/claimCheckReportsRoute.test.ts tests/compareReportRepository.test.ts
  tests/claimCheck.test.ts tests/claimCheckExtractRoute.test.ts`, `npm run
  lint`.
- [x] Background job polling dla compare.
  Zweryfikowano 2026-06-02: dodano `POST /api/claim-check/jobs`, `GET
  /api/claim-check/jobs/[id]`, in-process `CompareJob` queue, session/workspace
  access checks i polling w `/compare`; `npm test --
  tests/claimCheckJobsRoute.test.ts tests/claimCheckReportsRoute.test.ts
  tests/compareReportRepository.test.ts tests/claimCheck.test.ts`, `npm run
  lint`.
- [x] Dokument collections.
  Zweryfikowano 2026-06-02: dodano `DocumentCollection` z
  session/user/workspace ownership, migracje Prisma, repozytoria
  memory/PostgreSQL, `GET/POST /api/workspace/document-collections`,
  walidacje dostepu do wybranych dokumentow oraz formularz/listing w
  `/workspace`; `npm test -- tests/documentCollectionRepository.test.ts
  tests/documentCollectionsRoute.test.ts tests/workspaceDashboardRoute.test.ts
  tests/identitySchema.test.ts`, `npm run lint`.
- [x] Notatki lub komentarze do zapisanych papierow.
  Zweryfikowano 2026-06-02: dodano `PaperNote` z session/user/workspace
  ownership, migracje Prisma, repozytoria memory/PostgreSQL, `GET/POST
  /api/workspace/paper-notes`, walidacje dostepu do `paperId` przez dostepne
  briefy oraz formularz/listing w `/workspace`; `npm test --
  tests/paperNoteRepository.test.ts tests/paperNotesRoute.test.ts
  tests/workspaceDashboardRoute.test.ts tests/identitySchema.test.ts`, `npm
  run lint`.
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
5. [x] Dodac cross-user tests dla briefow, jobow, eksportu i Q&A.
6. [x] Dodac embedding comparison runner i uruchomic benchmark baseline.
   Zweryfikowano 2026-06-02: `npm run embedding:check`,
   `npm run benchmark:embedding-comparison`. Produkcyjny
   `EMBEDDING_PROVIDER=openai_compatible` nadal wymaga sekretow deployu przed
   pelnym porownaniem model-grade.
7. [x] Dodac recorded live-source fixtures dla OpenAlex/arXiv/Semantic Scholar.
   Zweryfikowano 2026-06-02: `npm test --
   tests/sourceAdapters.contract.test.ts`.
8. [x] Dodac PDF parser diagnostics i recorded PDF fixtures.
   Zweryfikowano 2026-06-02: `npm test --
   tests/fulltextFetchParseChunk.test.ts`.
9. [x] Zaprojektowac `CompareReport` z workspace ownership.
   Zweryfikowano 2026-06-02: `npx prisma validate`, `npm test --
   tests/compareReportRepository.test.ts tests/identitySchema.test.ts`.
10. [x] Przygotowac staging env checklist: PostgreSQL, Upstash, AI secrets,
    worker i smoke bez `SMOKE_SKIP_AI=true`.
    Zweryfikowano 2026-06-02: dodano `npm run staging:check`,
    `lib/config/stagingReadiness.ts`, `scripts/staging-readiness-check.ts` oraz
    `tests/stagingReadiness.test.ts`. Checklista wymusza stagingowe env vars,
    osobny worker, model-grade embeddings, pelny AI smoke i zawiera rollback
    procedure. Realne sekrety staging/prod, `npx prisma migrate deploy` na
    prawdziwej bazie i smoke na hostingu pozostaja nieodhaczone w P1.

## Ostatni znany snapshot weryfikacji

Wedlug aktualnych zapiskow projekt przeszedl:

- `npm test` - pass
- `npm run lint` - pass
- `npm run build` - pass
- `npm run embedding:check` - pass na local `local-hash-ngrams`, 192 dims
- `npm run benchmark:retrieval` - pass na obecnych fixtures
- `npm run benchmark:source-quality` - pass na obecnych fixtures
- `npm run benchmark:claim-check` - pass na obecnych fixtures
- `npm run benchmark:quality-gate` - pass: retrieval/source-quality/claim-check
  sa powyzej ustalonych progow CI
- `SMOKE_SKIP_AI=true npm run smoke:deploy` - pass na lokalnym produkcyjnym
  buildzie
- `npm run staging:check` - pass na kompletnej, zasymulowanej konfiguracji
  stagingowej; lokalny env bez produkcyjnych sekretow celowo raportuje blokery

Znany caveat:

- lokalny `.env` nie jest produkcyjna konfiguracja Postgres; `npx prisma
  validate` wymaga poprawnego `DATABASE_URL=postgresql://...`.
- embedding provider produkcyjny nie jest jeszcze skonfigurowany.

## Czego teraz nie dokladac

Nie dodawac jeszcze paper timeline, topic clusteringu, citation graph ani
knowledge graph jako priorytetu. To sa dobre funkcje pozniej, ale teraz
najwiekszy zwrot daja: ownership, produkcyjna konfiguracja, embedding quality,
PDF diagnostics i zapisane workflowy.
