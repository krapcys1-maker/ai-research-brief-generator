# Project System Audit

Generated: 2026-06-03

## Scope

This audit covers the current project pipeline:

```text
GitHub / GH Archive signals
-> Project Idea Scout
-> trend radar
-> idea quality audit
-> research brief
-> PRD
-> architecture
-> benchmarks
```

The goal is not to manually invent one good architecture. The goal is to improve the system that discovers ideas, rejects clones, turns evidence into research, and generates measurable architecture outputs.

## Strongest Advantages

- Evidence-first pipeline: ideas are grounded in repository metadata, README excerpts, issue signals, trend radar categories, and research artifacts.
- Anti-clone behavior: the system now rejects direct replacements and prefers adjacent QA, audit, diagnostic, readiness, compatibility, governance, and reliability products.
- Measurable gates: project idea discovery, GitHub collection, GH Archive budget safety, research planning, PRD generation, and architecture generation all have benchmark coverage.
- Cost control: GH Archive collection uses exact date tables, dry-run estimates, `maxDays`, and `maxBytesBilled`.
- Handoff quality: shortlisted ideas are converted into `ProjectIdeaInput`, then into research, PRD, and architecture artifacts with schema validation.

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

The audit scores:

- source repo count,
- shortlist count,
- clone rejection ratio,
- average shortlist score,
- average novelty,
- MVP feasibility,
- GitHub signal strength,
- research handoff readiness,
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
- GitHub signal strength: 1.0
- research ready ratio: 1.0
- weaknesses: 0

## Operating Rule

Do not move an idea into expensive research or architecture generation unless:

- audit readiness is not `blocked`,
- clone rejection ratio is non-zero on benchmarked runs,
- shortlisted ideas are research-ready,
- trend radar has at least one category,
- the idea has a specific QA/audit/diagnostic/reliability/governance job rather than a broad clone-shaped title.

## Next Optimization Targets

- Add per-source shortlist caps when using larger GH Archive batches.
- Add live trend batch sampling with strict cost ceilings and cached enrichment.
- Add architecture judge scoring that compares generated architecture against audit findings and research evidence.
