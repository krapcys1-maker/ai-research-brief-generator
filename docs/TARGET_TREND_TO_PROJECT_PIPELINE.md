# Target Trend-To-Project Pipeline

## Verdict

The project already has useful architecture docs and implemented modules, but the target system is broader than the current project idea and research runners.

Final output quality must also meet the baseline described in:

```text
docs/GPT_BASELINE_QUALITY_FLOOR.md
```

That baseline comes from `testy/GPT` and should be treated as the minimum
acceptable floor for Cursor-ready project-pack output.

Existing docs cover:

- academic research brief generation,
- document and full-text ingestion,
- Project Idea Scout,
- GH Archive / BigQuery budget guarded sampling,
- adjacent idea generation,
- project research,
- PRD and architecture generation,
- architecture judging.

Missing target contract:

- select roughly 50 true GitHub rising-star repositories,
- let an LLM curate 10 differentiated non-clone ideas,
- persist an explicit user selection,
- run scientific and technical research for the chosen idea,
- generate a complete Cursor-ready project pack,
- iterate architecture through judge, critique and improvement loops.

This document is the code-repo contract for that target pipeline.

## Target Flow

```text
GH Archive / BigQuery
-> Rising Star Repo Collector
-> GitHub Enrichment
-> Repo Insight Extraction
-> LLM Idea Curator
-> Top 10 Idea Briefs
-> User Selection
-> Scientific / Technical Research
-> Product Strategy Synthesis
-> PRD
-> Architecture
-> Implementation Roadmap
-> Test Plan
-> Risk Register
-> Cursor Start Pack
-> Judge / Critique / Improve Loop
```

## Rising Star Criteria

Sorting by total stars is not enough. It promotes old large repositories.

The first-class score should combine:

- `starVelocity`: new stars per day in the recent window,
- `starAcceleration`: recent velocity compared with a previous baseline,
- `activityFreshness`: recent push, release or issue activity,
- `developerActivity`: push, PR, commit and release events,
- `communitySignal`: issues, forks and watchers where available,
- `noveltyWindow`: young or newly discovered repositories with enough substance,
- `topicHeat`: AI agents, developer tools, data quality, automation, security, compliance, local-first, multimodal, robotics and evals,
- `oldGiantPenalty`: penalty for established repos without real acceleration,
- `abandonedRepoPenalty`: penalty for stale repos,
- `lowSignalPenalty`: penalty for missing README, topics, description or clear problem.

Target artifacts:

```text
01_bigquery_rising_stars/
  bigquery_budget_report.json
  repo_trend_scores.json
  top_50_rising_repos.json
  top_50_rising_repos.md
```

## LLM Idea Curator

The LLM should receive the top 50 repositories plus extracted repo insights.
Its job is not to clone repositories. It must produce adjacent ideas by changing at least one meaningful dimension:

- target user,
- workflow stage,
- compliance or audit layer,
- QA or reliability job,
- diagnostic use case,
- integration surface,
- business niche.

Each of the top 10 ideas must include:

- title,
- one-sentence summary,
- problem,
- target users,
- MVP scope,
- non-goals,
- source inspirations,
- differentiation,
- why it is not a clone,
- research questions,
- main risks,
- score and rationale.

Target artifacts:

```text
04_llm_top10_ideas/
  top_10_ideas.json
  top_10_ideas.md
  rejected_ideas.md
  llm_idea_curator_audit.json
```

## User Selection

The chosen idea must be explicit. In benchmark mode, an auto-selector may choose the idea, but it must persist the reason.

Artifacts:

```text
05_user_selection/
  selected_idea.json
  selected_idea.md
  selection_reason.md
```

## Research Requirements

Research must use bucketed planning, not a single broad query.

Required buckets:

- core methods,
- evaluation and benchmarks,
- risks and failure modes,
- human workflow / UX / adoption,
- security / privacy / compliance when relevant,
- similar systems and prior work.

The research runner must distinguish:

- full-text-supported evidence,
- abstract-supported evidence,
- metadata-only evidence,
- missing or weak evidence.

It must never treat a paper as fully reviewed when no legal PDF/full-text was parsed.

## Project Pack

The final output must be enough to start work in Cursor.

Artifacts:

```text
08_project_pack/
  prd.md
  architecture.md
  architecture.json
  implementation_plan.md
  roadmap.md
  test_plan.md
  benchmark_plan.md
  risk_register.md
  cursor_start_prompt.md
  first_tasks.md
```

## Judge Loop

Final architecture requires more than schema validity.

Minimum pass criteria:

```text
architectureJudgeScore >= 90
architectureJudgeVerdict == pass
genericComponentRisk == low
allCriticalRequirementsCovered == true
```

The target loop:

```text
candidate_v1
-> judge
-> critique
-> improvement_prompt
-> candidate_v2
-> judge
-> candidate_v3
-> final verdict
```

## Required Full-Run Folder Shape

```text
testy/<run_id>/
  00_START_TUTAJ.md
  01_bigquery_rising_stars/
  02_github_enrichment/
  03_repo_insights/
  04_llm_top10_ideas/
  05_user_selection/
  06_research/
  07_strategy/
  08_project_pack/
  09_judges/
  10_final_verdict.md
```

## Current Gaps

1. The current full pass is cost-safe, but it does not yet implement a first-class top-50 rising-repo stage.
2. LLM-curated top 10 ideas must become a separate audited stage.
3. User selection must be a persisted pipeline stage.
4. The project pack must be a standard output, not a partial side effect.
5. The architecture generator needs a stronger LLM candidate -> judge -> critique -> revision loop.
6. The benchmark suite must score the complete chain from BigQuery to final Cursor pack.

## Next Implementation Step

Implement `RisingStarCollector v1`:

```text
GH Archive / BigQuery
-> top_50_rising_repos
-> repo_trend_scores
-> budget report
-> benchmark
```

This should be implemented before tuning the LLM curator. Without a strong top-50 input set, the LLM will only make weak input sound better.

Parallel quality-track work has started with:

```text
npm run benchmark:project-repo-mri-pack
```

This validates the final architecture-and-plan pack against the GPT baseline
idea before full starter-code generation is added.
