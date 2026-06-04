# GPT Baseline Quality Floor

## Status

The external folder below is the minimum quality floor for final project-pack output:

```text
D:/projekty moje/pipline pomysl plus archiotektura/testy/GPT
```

Any final system output below this level should be treated as not ready.

## What The Baseline Contains

The GPT baseline is not only an architecture document. It is a Cursor-ready starter pack for `Repo MRI`:

- clear product thesis,
- one strong differentiator,
- masterplan,
- architecture,
- build roadmap,
- risk register,
- evaluation plan,
- API contract,
- research digest,
- ADRs,
- Cursor rules,
- Cursor plans,
- Cursor prompts,
- SQL schema,
- diagrams,
- minimal working SQLite indexer,
- sample repo,
- tests.

Observed baseline size:

```text
total files: 62
docs: 8
ADR: 4
Cursor rules: 4
Cursor plans: 5
Cursor prompts: 4
Python files: 12
tests: 3
diagrams: 3
```

Baseline smoke:

```text
cd testy/GPT/services/indexer
python -m pytest
1 passed
```

## Comparison With Current Pipeline

The current system is stronger than the baseline in:

- GitHub / GH Archive / BigQuery evidence collection,
- anti-clone idea discovery,
- project idea audit and handoff gates,
- scientific source search,
- legal PDF/full-text ingestion,
- evidence coverage,
- PRD and architecture traceability,
- architecture judging.

The baseline is stronger than the current final output in:

- Cursor-ready project packaging,
- product sharpness,
- runnable starter code,
- fixture tests,
- ADRs as separate files,
- Cursor rules and plans,
- concrete API/schema/demo artifacts.

Practical verdict:

```text
The current pipeline can find and justify a direction.
The GPT baseline better shows what a final project starter pack should look like.
The system must combine both: our research depth plus GPT-level or better starter packaging.
```

## Required Quality Gate

A final project pack should not pass unless it includes at least:

```text
README.md
docs/00-masterplan-source.md
docs/01-architecture.md
docs/02-build-roadmap.md
docs/03-risk-register.md
docs/04-evaluation-plan.md
docs/05-api-contract.md
docs/06-demo-script.md
docs/07-research-digest.md
adr/*.md
.cursor/rules/*.mdc
.cursor/plans/*.md
prompts/cursor/*.md
schemas/
services/<core-module>/
tests/
sample_data or sample_repo/
Makefile or package scripts
10_final_verdict.md
```

The pack must also have:

- a runnable vertical slice,
- passing tests,
- a quickstart,
- a clear product thesis,
- a specific killer feature,
- risks with mitigations,
- evaluation metrics,
- JSON API or schema examples,
- ADRs for major decisions,
- Cursor rules that prevent generic agent output.

## Next Implementation Priority

Implement:

```text
Cursor Pack Exporter
+ Cursor Readiness Judge
+ Product Sharpness Judge
```

This closes the biggest gap between the current pipeline and the GPT baseline.

The later trend-discovery improvements still matter, especially top-50 rising repos and LLM top-10 curation, but the immediate missing piece is final packaging quality.

## Implemented First Slice

Implemented:

```text
npm run benchmark:project-repo-mri-pack
```

This forces the GPT-baseline idea `Repo MRI`, generates the research -> PRD ->
architecture -> project pack chain, and writes a Cursor-oriented architecture
and planning pack. The current slice is intentionally honest: it can pass
architecture and planning quality while still reporting `needs_review` for full
baseline readiness until runnable starter code generation exists.
