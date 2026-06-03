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
-> shortlist
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
  +--> Repo Analyzer
  +--> Problem Pattern Extractor
  +--> Adjacent Idea Generator
  +--> Novelty Guard
  +--> Idea Ranker
  +--> Idea Discovery Report
  |
  v
Project Research Runner
  |
  v
ProjectResearchBrief -> PRD -> Architecture
```

## MVP Phases

### Phase 0: Mocked Repositories

Build logic and benchmark first. Do not start by debugging live GitHub rate limits.

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

Use GitHub Search API before scraping GitHub Trending HTML.

Example queries:

```text
stars:>100 pushed:>2026-01-01 topic:ai
stars:>500 topic:developer-tools
stars:>100 language:typescript topic:agent
```

The collector should report rate limits, cache results, and work with or without `GITHUB_TOKEN`.

### Phase 2: Extra Signals

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

## Planned Files

```text
lib/project-ideas/schemas.ts
lib/project-ideas/types.ts
lib/project-ideas/repoAnalyzer.ts
lib/project-ideas/ideaGenerator.ts
lib/project-ideas/noveltyGuard.ts
lib/project-ideas/ranker.ts
lib/project-ideas/runner.ts
lib/project-ideas/index.ts
scripts/project-idea-discovery-benchmark.ts
tests/projectIdeaDiscovery.test.ts
```

CLI:

```text
npm run project:ideas -- --input input.json --out output-dir
```

Artifacts:

```text
manifest.json
source_repos.json
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

## Next Implementation Step

Build Phase 0:

1. Add schemas and types.
2. Add deterministic repo analyzer for mocked repos.
3. Add adjacent idea generator.
4. Add novelty guard and ranker.
5. Add benchmark with at least five domains.
6. Add conversion from top ideas to `ProjectIdeaInput`.

