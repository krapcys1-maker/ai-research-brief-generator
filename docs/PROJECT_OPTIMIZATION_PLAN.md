# Project Optimization Plan

Generated: 2026-06-03

## Objective

Build an agent-monitored project pipeline that continuously checks every major step:

```text
signals -> ideas -> audit -> research -> PRD -> architecture -> benchmarks
```

The goal is to eliminate silent failure modes, stale prompts, noisy data interpretation, clone-like ideas, weak evidence handoff, and architecture outputs that are not traceable to research evidence.

## Current Strengths To Preserve

- Evidence-first idea generation from GitHub, GH Archive, README and issue signals.
- Anti-clone guardrails for deterministic and AI-generated ideas.
- First-class benchmarks for idea discovery, AI idea guardrails, GitHub collection, GH Archive cost safety, research, PRD and architecture.
- Per-run artifacts for inspection: source repos, repo insights, trend radar, shortlist, rejected ideas, project inputs and audit.
- Cost controls around BigQuery through dry-run estimates, `maxDays`, and `maxBytesBilled`.
- Source diversity guard through `maxIdeasPerSource`.
- Controlled live batch sampling through `npm run project:live-batch` and `npm run benchmark:project-live-batch`.

## Main Weaknesses To Eliminate

### 1. Documentation Drift

Problem: docs can describe an older system state and mislead future work.

Current fix:

- `docs/PROJECT_IDEA_SCOUT_ARCHITECTURE.md` updated to reflect implemented GH Archive, trend radar, AI guardrail benchmark, audit and per-source cap.
- `docs/PROJECT_SYSTEM_AUDIT.md` is the audit reference.
- `npm run benchmark:project-docs` verifies that key project scripts, artifacts and metrics are documented.

Implemented guard:

- Docs/script consistency check is part of `npm run benchmark:project-pipeline`.

### 2. Prompt Drift

Problem: prompt changes can sound better while making outputs less measurable.

Current guard:

- `npm run benchmark:project-ai-ideas` compares raw clone-shaped AI candidates to guarded adjacent candidates.
- Raw clone outputs must be rejected.
- Guarded QA/audit/diagnostic outputs must remain usable or strong.
- `tests/projectAiIdeaPrompt.test.ts` checks required AI idea prompt snippets so hard rules cannot silently disappear.

Implemented guard:

- Prompt hard-rule checks cover system prompt and user prompt requirements.

### 3. Data Noise

Problem: README feature lists and incidental issue words can override the real workflow.

Current guard:

- Repo analyzer does not let noisy README feature text override workflow classification.
- Session reliability has priority over incidental context-compression mentions.
- `projectIdeaBenchmarkCases` stores stable benchmark fixtures outside the benchmark script.
- `npm run benchmark:project-ideas` verifies expected top ideas for regression cases.

Implemented guard:

- Recorded-style GitHub fixtures cover document conversion, context compression, AI CLI provider routing, agent session reliability and self-hosted AI governance.
- Noisy README, multilingual issue, incidental issue-noise and multi-source diversity fixtures are included.

### 4. Source Dominance

Problem: one hot repo can dominate a shortlist.

Current guard:

- `maxIdeasPerSource = 1` by default.
- Report metric: `shortlistSourceDominance`.
- Multi-source benchmark requires diverse shortlist behavior.
- Project idea audit warns when small batches use `maxIdeasPerSource > 1`.

Implemented guard:

- `source_cap` warning appears in `project_ideas_audit` for risky small-batch source caps.

### 5. Research Handoff Weakness

Problem: an idea can look attractive but enter research without enough questions, constraints or domain focus.

Current guard:

- `ProjectIdeaInput` schema validation.
- `researchReadyCount`.
- `pipelineInputValidCount`.
- `project_idea_handoff_quality.json` and `.md` artifacts score every shortlisted idea before research.
- Report metrics: `averageHandoffQualityScore`, `handoffReadyCount`.

Implemented guard:

- Handoff quality score checks constraints quality, domain specificity, research question coverage, non-goal clarity and description specificity.
- `npm run benchmark:project-ideas` fails if promising ideas are not handoff-ready.

### 6. Architecture Quality Drift

Problem: architecture can become generic even when the idea/research is specific.

Current guard:

- Project architecture benchmark checks schema validity, component traceability, paper coverage and component diversity.
- Architecture judge artifacts compare architecture outputs against PRD and research:
  - `project_architecture_judge.json`,
  - `project_architecture_judge.md`.
- Report metric: `averageJudgeScore`.

Implemented guard:

- Judge checks requirement coverage, component traceability, decision paper coverage, component diversity, generic component risk, paper evidence coverage, risk coverage and project-specific language.
- `npm run benchmark:project-architecture` fails schema-valid but generic architectures.

## Agent Monitoring Checklist

For every meaningful system change:

1. Inspect changed step:
   - signal collection,
   - repo analysis,
   - idea generation,
   - AI prompt/scorer,
   - shortlist selection,
   - audit,
   - research,
   - PRD,
   - architecture,
   - benchmarks.
2. Identify failure class:
   - clone risk,
   - weak source evidence,
   - noisy classification,
   - stale prompt,
   - source dominance,
   - schema drift,
   - low research readiness,
   - generic architecture.
3. Add or update a fixture before tuning behavior.
4. Run targeted tests.
5. Run `npm run benchmark:project-pipeline`.
6. Run `npm run benchmark:project-architecture` when architecture generation changes.
7. Run `npm test` before pushing.
8. Update docs when behavior changes.

## Optimization Roadmap

### P0: Monitoring Integrity

- Keep `runs/` out of commits.
- Keep PR body updated with current benchmark numbers.
- Done: docs/script consistency check.
- Done: prompt hard-rule snapshot checks.
- Done: source-cap audit warning for small batches.

### P1: Data Quality

- Done: expand recorded-style GitHub fixtures for:
  - document conversion,
  - context compression,
  - AI CLI provider routing,
  - agent session reliability,
  - self-hosted AI governance.
- Done: add fixture cases for misleading README text, multilingual issues and incidental context-compression issue noise.
- Done: make benchmark read from stable fixture module instead of recreating every case inline.
- Add source freshness and trend acceleration fields when data source allows it.

### P2: Handoff Quality

- Done: score every `ProjectIdeaInput` before research.
- Done: block generic constraints, missing non-goals, weak domains, weak descriptions or missing research questions.
- Done: add artifact showing why a shortlisted idea should or should not enter research.

### P3: Architecture Judge

- Done: compare architecture components against research evidence and PRD requirements.
- Done: fail architecture benchmark if components are generic, not traceable or below judge score.
- Done: add architecture judge reports for generated architectures.
- Add side-by-side architecture comparison reports for AI-generated alternatives.

### P4: Live Batch Sampling

- Done: run controlled GH Archive batches with:
  - small date windows,
  - strict byte caps,
  - cached GitHub enrichment,
  - no auto-spend escalation.
- Done: store only summarized benchmark artifacts, not raw large runs:
  - `controlled_live_batch_summary.json`,
  - `controlled_live_batch_summary.md`.
- Done: track `trendRepoCount`, `sourceRepoCount`, `handoffReadyCount`, `averageHandoffQualityScore` and `blockerCount` before research spend.
- Done: include compact `repoEvidence` and `scoredCandidates` sections so live outputs can be audited without raw large dumps.
- Done: require `allowLiveSpend: true` in addition to `mode: "live"` so a copied JSON file cannot accidentally run a live BigQuery query.
- Done: run one real controlled live GH Archive sample for 2026-06-01 with a 500,000,000 byte cap and no auto-escalation.

### P5: Live-Derived Architecture Smoke

- Done: run `AI Short-Video Content QA Console` from the live sample through research, PRD, architecture and architecture judge.
- Done: catch the first weak result: architecture judge `84/fail` due to a generic fallback component.
- Done: add media/publishing QA architecture blueprint and judge vocabulary; rerun result: `96/pass`, generic components `0`.
- Done: add `live_short_video_arch_ready`, `live_data_quality_arch_ready` and `live_agent_approval_arch_ready` to `npm run benchmark:project-architecture` so live-derived category regressions are covered by the pipeline.

## Current Recommended Next Step

Use the live-derived benchmark set to choose one implementation target:

- compare the three live-derived architecture outputs by judge score, specificity, and implementation risk,
- pick one idea for the first implementation planning pass,
- create a step-by-step MVP implementation benchmark before writing product code.

This closes the next gap between repeatable live category coverage and choosing the first implementation target.
