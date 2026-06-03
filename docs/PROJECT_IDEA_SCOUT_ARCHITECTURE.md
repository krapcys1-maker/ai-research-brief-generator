# Project Idea Scout Architecture

## Purpose

`Project Idea Scout` discovers project ideas from real external signals, starting with GitHub repositories, then turns those signals into adjacent product ideas that can enter the existing project research pipeline.

It must not be a free-form "invent ideas" prompt. The module should work from evidence:

```text
GitHub repos
-> repo analysis
-> problem pattern extraction
-> adjacent idea generation
-> novelty guard
-> scoring
-> per-source shortlist cap
-> shortlist
-> trend radar
-> idea quality audit
-> ProjectIdeaInput
-> project:research
```

## Design Rule

The module can use a repository as inspiration, but must not clone it.

It should extract:

- the problem solved by the repo,
- target users,
- workflow,
- technical mechanisms,
- pain signals from README/issues,
- missing capabilities,
- possible adjacent opportunities.

Then it should produce an idea with a different user, workflow, scope, integration layer, compliance layer, or business niche.

## Pipeline

```text
Project Idea Scout
  |
  +--> GitHub Signal Collector
  +--> GH Archive / BigQuery Trend Collector
  +--> Repo Analyzer
  +--> Problem Pattern Extractor
  +--> Adjacent Idea Generator
  +--> Novelty Guard
  +--> AI Idea Guardrail Benchmark
  +--> Idea Ranker
  +--> Per-Source Shortlist Selector
  +--> Trend Radar
  +--> Project Idea System Audit
  +--> Idea Discovery Report
  |
  v
Project Research Runner
  |
  v
ProjectResearchBrief -> PRD -> Architecture
```

## Implemented Phases

### Phase 0: Mocked Repositories

Implemented. The deterministic pipeline can run from mocked or recorded repository signals before touching live APIs.

Mock input:

```ts
type IdeaSourceRepo = {
  repoId: string;
  name: string;
  owner: string;
  url: string;
  description: string;
  topics: string[];
  primaryLanguage: string | null;
  stars: number;
  forks: number;
  openIssues: number | null;
  createdAt: string;
  pushedAt: string;
  readmeText: string;
  issueSignals: RepoIssueSignal[];
};
```

### Phase 1: GitHub Search API

Implemented. GitHub Search API enrichment supports README/issues fetching, cache, timeout diagnostics, and rate-limit diagnostics.

Example queries:

```text
stars:>100 pushed:>2026-01-01 topic:ai
stars:>500 topic:developer-tools
stars:>100 language:typescript topic:agent
```

The collector should report rate limits, cache results, and work with or without `GITHUB_TOKEN`.

### Phase 2: GH Archive Trend Sampling

Implemented with budget guards. GH Archive / BigQuery collection uses exact date tables, dry-run estimates, `maxDays`, and `maxBytesBilled`.

### Phase 3: Extra Signals

Later sources:

- GitHub issues/discussions,
- releases/changelog,
- Papers with Code,
- Hacker News,
- Product Hunt,
- arXiv/Semantic Scholar for research-heavy ideas.

## Core Data Contracts

```ts
type RepoInsight = {
  repoId: string;
  problemSolved: string;
  targetUsers: string[];
  coreWorkflow: string;
  technicalMechanisms: string[];
  marketSignals: string[];
  painSignals: string[];
  missingCapabilities: string[];
  cloneRisk: "low" | "medium" | "high";
};

type DiscoveredIdea = {
  ideaId: string;
  title: string;
  oneSentence: string;
  problem: string;
  targetUsers: string[];
  mvpScope: string[];
  nonGoals: string[];
  sourceRepos: string[];
  originalInspiration: string;
  differentiation: string[];
  aiLeverage: string[];
  researchQuestions: string[];
  risks: string[];
  domains: string[];
};

type IdeaScore = {
  ideaId: string;
  total: number;
  problemClarity: number;
  userSpecificity: number;
  githubSignalStrength: number;
  novelty: number;
  mvpFeasibility: number;
  researchLeverage: number;
  businessPotential: number;
  riskPenalty: number;
  verdict: "reject" | "needs_research" | "promising";
  reasons: string[];
};
```

Current report metrics also include:

```ts
type IdeaDiscoveryMetrics = {
  ideaCount: number;
  promisingCount: number;
  cloneRejectedCount: number;
  averageNovelty: number;
  averageMvpFeasibility: number;
  averageGithubSignalStrength: number;
  shortlistSourceDominance: number;
  maxIdeasPerSource: number;
  researchReadyCount: number;
  pipelineInputValidCount: number;
};
```

## Scoring

Initial weights:

```text
problemClarity: 20%
userSpecificity: 15%
githubSignalStrength: 15%
novelty: 20%
mvpFeasibility: 15%
researchLeverage: 10%
businessPotential: 5%
riskPenalty: -0% to -30%
```

Verdicts:

```text
total >= 80 -> promising
60-79       -> needs_research
< 60        -> reject
```

## Novelty Guard

Reject weak clones:

- `differentiation` must contain at least two concrete differences,
- `mvpScope` must differ from the source repo core workflow,
- if target users, problem, and workflow are all the same, the idea is a clone,
- if `cloneRisk = high`, verdict cannot be better than `needs_research`,
- "chatbot for X" without a workflow is rejected.

## Shortlist Diversity Guard

The shortlist selector caps ideas per source repository.

Default:

```text
maxIdeasPerSource = 1
```

This prevents one popular repository from filling the entire shortlist. Larger runs should raise `maxIdeas` before raising `maxIdeasPerSource`.

Measured fields:

```text
shortlistSourceDominance
maxIdeasPerSource
```

## AI Guardrail Benchmark

Script:

```text
npm run benchmark:project-ai-ideas
```

Purpose:

- compare raw clone-shaped AI candidates against guarded adjacent candidates,
- reject converter/compressor/workspace clones,
- keep QA, audit, diagnostic, readiness and reliability ideas.

## Integration With Current Pipeline

Top ideas are converted to `ProjectIdeaInput`:

```json
{
  "title": "AI Technical Debt Sprint Planner",
  "description": "System analyzing repo, issues, and commit history to create sprint-sized refactor plans.",
  "constraints": ["MVP recommends a plan only", "no automatic code rewriting"],
  "preferredDomains": ["software engineering", "LLM code review", "technical debt"],
  "outputLanguage": "pl"
}
```

Then the existing CLI can run:

```text
npm run project:research -- --input idea.json --out run-output
```

## Implemented Files

```text
lib/project-ideas/schemas.ts
lib/project-ideas/types.ts
lib/project-ideas/repoAnalyzer.ts
lib/project-ideas/ideaGenerator.ts
lib/project-ideas/noveltyGuard.ts
lib/project-ideas/aiIdeaPrompt.ts
lib/project-ideas/aiIdeaBenchmark.ts
lib/project-ideas/audit.ts
lib/project-ideas/trendRadar.ts
lib/project-ideas/githubCollector.ts
lib/project-ideas/ghArchiveTrendCollector.ts
lib/project-ideas/ranker.ts
lib/project-ideas/runner.ts
lib/project-ideas/index.ts
scripts/project-idea-discovery-benchmark.ts
scripts/project-ai-idea-benchmark.ts
scripts/project-idea-runner-benchmark.ts
tests/projectIdeaDiscovery.test.ts
tests/projectAiIdeaPrompt.test.ts
tests/projectAiIdeaBenchmark.test.ts
tests/projectIdeaAudit.test.ts
```

CLI:

```text
npm run project:ideas -- --input input.json --out output-dir
```

Artifacts:

```text
manifest.json
source_repos.json
github_collection.json
gh_archive_trends.json
trend_radar.json
trend_radar.md
project_ideas_audit.json
project_ideas_audit.md
repo_insights.json
discovered_ideas.json
idea_scores.json
shortlist.json
project_idea_inputs.json
idea_discovery_report.md
```

## Benchmark

Script:

```text
npm run benchmark:project-ideas
npm run benchmark:project-architecture
```

Minimum domains:

```text
AI developer tools
AI trading support
AI medical documentation
AI education tools
AI data analysis agents
```

Metrics:

```text
schemaValidCount
ideaCount
promisingCount
cloneRejectedCount
averageNovelty
averageMvpFeasibility
averageGithubSignalStrength
shortlistSourceDominance
maxIdeasPerSource
researchReadyCount
pipelineInputValidCount
```

MVP pass criteria:

```text
caseCount >= 5
schemaValidCount == ideaCount
pipelineInputValidCount == promisingCount
cloneRejectedCount >= 1
averageNovelty >= 0.70
averageMvpFeasibility >= 0.70
researchReadyCount >= 5
```

## Current Optimization Loop

1. Run `npm run benchmark:project-pipeline`.
2. Inspect `project_ideas_audit.json` for blocked or weak runs.
3. If AI output is involved, run `npm run benchmark:project-ai-ideas`.
4. If a source dominates the shortlist, lower or keep `maxIdeasPerSource=1`.
5. If research/architecture quality drops, add a fixture before tuning prompts.
6. Commit only code/docs/benchmarks, not local `runs/` artifacts.
