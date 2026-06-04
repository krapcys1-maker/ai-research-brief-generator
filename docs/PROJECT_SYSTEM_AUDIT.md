# Project System Audit

Generated: 2026-06-03

## Scope

This audit covers the current project pipeline:

```text
GitHub / GH Archive signals
-> Project Idea Scout
-> trend radar
-> idea quality audit
-> handoff quality gate
-> research brief
-> PRD
-> architecture
-> architecture judge
-> benchmarks
```

The goal is not to manually invent one good architecture. The goal is to improve the system that discovers ideas, rejects clones, turns evidence into research, and generates measurable architecture outputs.

## Strongest Advantages

- Evidence-first pipeline: ideas are grounded in repository metadata, README excerpts, issue signals, trend radar categories, and research artifacts.
- Anti-clone behavior: the system now rejects direct replacements and prefers adjacent QA, audit, diagnostic, readiness, compatibility, governance, and reliability products.
- Measurable gates: project idea discovery, GitHub collection, GH Archive budget safety, research planning, PRD generation, and architecture generation all have benchmark coverage.
- Cost control: GH Archive collection uses exact date tables, dry-run estimates, `maxDays`, and `maxBytesBilled`.
- Handoff quality: shortlisted ideas are converted into `ProjectIdeaInput`, scored for research readiness, then moved into research, PRD, and architecture artifacts only when the handoff is strong enough.
- Architecture quality: generated architecture is judged against PRD requirements and research evidence, so schema-valid but generic component plans can fail benchmarks.

## Biggest Weaknesses

- Quality review was previously scattered across benchmark numbers and manual inspection. There was no single artifact saying why a run is strong, risky, or blocked.
- AI-assisted idea generation can drift into clone-like ideas unless the prompt and scorer force adjacent product shapes.
- GitHub evidence can be noisy. README feature lists and incidental issue wording can misclassify the source workflow without priority rules.
- A shortlist can look good while still being too narrow, dominated by one repo, too generic in positioning, or not ready for research handoff.

## Implemented Fix

The system now includes `Project Idea System Audit`.

Each `project:ideas` run writes:

- `project_ideas_audit.json`
- `project_ideas_audit.md`
- `project_idea_handoff_quality.json`
- `project_idea_handoff_quality.md`

The audit scores:

- source repo count,
- shortlist count,
- clone rejection ratio,
- max ideas per source,
- average shortlist score,
- average novelty,
- MVP feasibility,
- personal build utility,
- GitHub signal strength,
- research handoff readiness,
- handoff quality score,
- handoff ready ratio,
- domain diversity,
- target user diversity,
- source dominance,
- trend radar coverage,
- generic title risk.

It outputs:

- strengths to preserve,
- weaknesses to fix,
- promotion moves,
- mitigation moves,
- readiness: `ready`, `needs_review`, or `blocked`.

The system also includes a first-class AI idea guardrail benchmark:

- `npm run benchmark:project-ai-ideas`
- output: `benchmark-results/project-ai-idea-latest.json`
- output: `benchmark-results/project-ai-idea-latest.md`

This benchmark uses controlled raw-vs-guarded AI candidate fixtures. It verifies that clone-like raw AI ideas are rejected, while guarded adjacent QA/audit/diagnostic ideas are kept.

The system also includes a Repo MRI realistic Bug Path benchmark:

- `npm run benchmark:project-repo-mri-real`
- output: `benchmark-results/project-repo-mri-real-latest.json`
- output: `benchmark-results/project-repo-mri-real-latest.md`

This benchmark generates the current Repo MRI project pack, runs the generated Python starter tests, creates realistic repository fixtures, indexes them, and evaluates Bug Path localization. Key metrics:

- `top1FileAccuracy`
- `top1SymbolAccuracy`
- `top3FileAccuracy`
- `top3SymbolAccuracy`
- `top5TestFileAccuracy`
- `relatedTestAccuracy`
- `noDirectTestHonestyRate`
- `evidenceCompleteness`
- `lineRangeCompleteness`
- `relatedTestsCompleteness`
- `unknownsCompleteness`
- `whyNotCompleteness`
- `secretIgnoreRate`

This is the main proof that the project pack is not only a plan. It must show that generated starter code can localize issue text to likely files, symbols, related tests when they exist, honest no-direct-test guidance when they do not, and next actions with evidence, unknowns and why-not explanations for runner-up candidates.

The system also includes a Repo MRI local checkout benchmark:

- `npm run benchmark:project-repo-mri-local`
- output: `benchmark-results/project-repo-mri-local-checkout-latest.json`
- output: `benchmark-results/project-repo-mri-local-checkout-latest.md`

This benchmark generates the current Repo MRI project pack, indexes the current repository checkout, and tests Bug Path against known real code targets such as `scorePersonalUtility`, `discoverProjectIdeas`, `repoMriStarterCodeFiles`, and `runProjectResearch`. It is a heavier but more honest gate than synthetic fixtures.

The system also includes an optional live GitHub checkout benchmark:

- `npm run benchmark:project-repo-mri-github`
- output: `benchmark-results/project-repo-mri-github-checkout-latest.json`
- output: `benchmark-results/project-repo-mri-github-checkout-latest.md`

This benchmark shallow-clones a public GitHub repository, generates the current Repo MRI project pack, indexes the clone, and runs Bug Path cases against the cloned code. It is intentionally not required by `benchmark:project-pipeline` because it depends on network access and remote availability.

The shortlist selector now applies a per-source cap:

- default: `maxIdeasPerSource = 1`
- runner manifest field: `maxIdeasPerSource`
- report metrics: `shortlistSourceDominance`, `maxIdeasPerSource`

This prevents one popular GitHub repository from filling the whole shortlist when larger GH Archive batches are used.

The architecture runner now emits:

- `project_architecture_judge.json`
- `project_architecture_judge.md`

The judge scores requirement coverage, component traceability, decision paper
coverage, component type diversity, generic component risk, paper evidence
coverage, risk coverage and project-specific language.

## Current Smoke Result

Local smoke run:

```text
runs/system-audit-smoke-v2
```

Result:

- score: 100/100
- readiness: ready
- source repos: 5
- shortlist: 5
- clone rejections: 5
- average novelty: 0.98
- MVP feasibility: 0.95
- personal build utility: tracked by `averagePersonalUtility`
- GitHub signal strength: 1.0
- research ready ratio: 1.0
- weaknesses: 0

## Operating Rule

Do not move an idea into expensive research or architecture generation unless:

- audit readiness is not `blocked`,
- clone rejection ratio is non-zero on benchmarked runs,
- shortlisted ideas are research-ready,
- shortlisted ideas have enough personal build utility for the user's own workflow,
- `handoffReadyCount` equals the number of generated `ProjectIdeaInput` records,
- `averageHandoffQualityScore` is at least 82,
- trend radar has at least one category,
- the idea has a specific QA/audit/diagnostic/reliability/governance job rather than a broad clone-shaped title.
- ready architectures receive an architecture judge verdict of `pass`.

## Next Optimization Targets

- Add live trend batch sampling with strict cost ceilings and cached enrichment.
- Add side-by-side architecture comparison reports for AI-generated alternatives.
