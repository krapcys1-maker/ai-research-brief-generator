import { IdeaSourceRepoSchema, RepoInsightSchema } from "@/lib/project-ideas/schemas";
import type { IdeaSourceRepo, RepoInsight } from "@/lib/project-ideas/types";

function textOf(repo: IdeaSourceRepo) {
  return [
    repo.name,
    repo.description,
    repo.topics.join(" "),
    repo.readmeText,
    repo.issueSignals.map((issue) => `${issue.title} ${issue.body}`).join(" ")
  ]
    .join(" ")
    .toLowerCase();
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function inferTargetUsers(text: string) {
  const users: string[] = [];

  if (includesAny(text, ["developer", "repo", "code", "pull request", "github"])) {
    users.push("software developers", "small engineering teams");
  }

  if (includesAny(text, ["trading", "market", "portfolio", "backtest"])) {
    users.push("quant researchers", "retail traders testing strategies");
  }

  if (includesAny(text, ["medical", "clinical", "patient", "healthcare"])) {
    users.push("clinicians", "medical documentation teams");
  }

  if (includesAny(text, ["education", "lesson", "student", "teacher"])) {
    users.push("teachers", "course creators");
  }

  if (includesAny(text, ["data", "analytics", "csv", "warehouse", "dashboard"])) {
    users.push("data analysts", "operations teams");
  }

  return unique(users.length ? users : ["product builders"]);
}

function inferWorkflow(text: string) {
  if (includesAny(text, ["code review", "pull request", "review comments"])) {
    return "reviews code changes and comments on pull requests";
  }

  if (includesAny(text, ["trading", "backtest", "portfolio"])) {
    return "tests market strategies against historical and live-like data";
  }

  if (includesAny(text, ["clinical", "medical", "documentation"])) {
    return "retrieves and audits medical documentation for evidence-grounded review";
  }

  if (includesAny(text, ["lesson", "student", "quiz", "education"])) {
    return "adapts learning material and feedback to student performance";
  }

  if (includesAny(text, ["data", "analytics", "dashboard", "csv"])) {
    return "turns datasets into analysis, diagnostics, and reports";
  }

  return "automates a knowledge-work workflow with AI assistance";
}

function inferTechnicalMechanisms(text: string) {
  const mechanisms: string[] = [];

  if (includesAny(text, ["agent", "tool", "workflow"])) {
    mechanisms.push("agentic workflow orchestration");
  }

  if (includesAny(text, ["rag", "retrieval", "citation", "document"])) {
    mechanisms.push("retrieval-augmented generation");
  }

  if (includesAny(text, ["code", "static analysis", "repo", "pull request"])) {
    mechanisms.push("repository analysis");
  }

  if (includesAny(text, ["backtest", "time series", "market"])) {
    mechanisms.push("time-series evaluation");
  }

  if (includesAny(text, ["audit", "compliance", "risk"])) {
    mechanisms.push("audit and risk controls");
  }

  return unique(mechanisms.length ? mechanisms : ["LLM-assisted synthesis"]);
}

function inferProblem(repo: IdeaSourceRepo, text: string) {
  if (includesAny(text, ["code review", "pull request"])) {
    return "Teams get review comments, but still struggle to prioritize larger engineering work.";
  }

  if (includesAny(text, ["trading", "backtest"])) {
    return "Strategy ideas are easy to generate but hard to validate without disciplined risk controls.";
  }

  if (includesAny(text, ["clinical", "medical"])) {
    return "Medical teams need faster document review without losing evidence traceability.";
  }

  if (includesAny(text, ["student", "lesson", "education"])) {
    return "Teachers need targeted feedback loops rather than generic AI tutoring answers.";
  }

  if (includesAny(text, ["data", "analytics", "dashboard"])) {
    return "Analysts spend too much time finding data quality issues before useful analysis starts.";
  }

  return `Users show demand for ${repo.description.toLowerCase()}, but the workflow is still under-specified.`;
}

function inferPainSignals(repo: IdeaSourceRepo) {
  const signals = repo.issueSignals.map((issue) => issue.title);

  if (signals.length > 0) {
    return signals.slice(0, 5);
  }

  return ["README describes the workflow but not enough prioritization, audit, or productization."];
}

function inferMissingCapabilities(text: string) {
  const missing: string[] = [];

  if (!includesAny(text, ["audit", "trace", "evidence"])) {
    missing.push("explicit audit trail");
  }

  if (!includesAny(text, ["priority", "roadmap", "sprint", "plan"])) {
    missing.push("prioritized execution plan");
  }

  if (!includesAny(text, ["risk", "guardrail", "compliance"])) {
    missing.push("risk controls");
  }

  return missing.length ? missing : ["clear product workflow beyond the core automation"];
}

function inferCloneRisk(repo: IdeaSourceRepo, text: string) {
  if (
    repo.stars > 3000 &&
    includesAny(text, ["agent", "ai"]) &&
    repo.issueSignals.length === 0
  ) {
    return "high" as const;
  }

  if (repo.stars > 1000) {
    return "medium" as const;
  }

  return "low" as const;
}

export function analyzeIdeaSourceRepo(value: unknown): RepoInsight {
  const repo = IdeaSourceRepoSchema.parse(value);
  const text = textOf(repo);
  const insight: RepoInsight = {
    repoId: repo.repoId,
    problemSolved: inferProblem(repo, text),
    targetUsers: inferTargetUsers(text),
    coreWorkflow: inferWorkflow(text),
    technicalMechanisms: inferTechnicalMechanisms(text),
    marketSignals: [
      `${repo.stars} GitHub stars`,
      `${repo.forks} forks`,
      `last pushed at ${repo.pushedAt}`
    ],
    painSignals: inferPainSignals(repo),
    missingCapabilities: inferMissingCapabilities(text),
    cloneRisk: inferCloneRisk(repo, text)
  };

  return RepoInsightSchema.parse(insight);
}

export function analyzeIdeaSourceRepos(values: unknown[]) {
  return values.map(analyzeIdeaSourceRepo);
}

