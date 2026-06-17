import { buildProjectResearchPlan } from "@/lib/project-research";
import type { ProjectIdeaInput } from "@/lib/project-research";
import type { DiscoveredIdea, IdeaSourceRepo } from "@/lib/project-ideas/types";

export type ResearchHandoffAuditItem = {
  ideaId: string;
  title: string;
  sourceRepos: string[];
  sourceSignalTerms: string[];
  projectIdeaTerms: string[];
  queryTerms: string[];
  sourceToInputCoverage: number;
  sourceToQueryCoverage: number;
  inputToQueryCoverage: number;
  verdict: "pass" | "needs_review";
  warnings: string[];
  queryVariants: string[];
};

export type ResearchHandoffAuditReport = {
  itemCount: number;
  passCount: number;
  averageSourceToQueryCoverage: number;
  averageSourceToInputCoverage: number;
  items: ResearchHandoffAuditItem[];
};

const STOP_TERMS = new Set([
  "and",
  "are",
  "but",
  "for",
  "from",
  "how",
  "into",
  "need",
  "needs",
  "that",
  "the",
  "this",
  "with",
  "without",
  "agent",
  "agents",
  "application",
  "build",
  "mvp",
  "project",
  "system",
  "tool",
  "tools",
  "user",
  "users"
]);

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenize(value: string) {
  return normalize(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length > 2 && !STOP_TERMS.has(term));
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function topTerms(text: string, limit: number) {
  const counts = new Map<string, number>();

  for (const term of tokenize(text)) {
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([term]) => term);
}

function repoSignalText(repo: IdeaSourceRepo) {
  return [
    repo.name,
    repo.description,
    repo.topics.join(" "),
    repo.primaryLanguage,
    repo.readmeText,
    repo.issueSignals.map((issue) => `${issue.title} ${issue.body}`).join(" ")
  ].join(" ");
}

function sourceTermsForIdea(input: {
  idea: DiscoveredIdea;
  sourceReposById: Map<string, IdeaSourceRepo>;
}) {
  const sourceText = input.idea.sourceRepos
    .map((repoId) => input.sourceReposById.get(repoId))
    .filter((repo): repo is IdeaSourceRepo => Boolean(repo))
    .map(repoSignalText)
    .join(" ");
  const ideaSignalText = [
    input.idea.problem,
    input.idea.mvpScope.join(" "),
    input.idea.differentiation.join(" "),
    input.idea.researchQuestions.join(" ")
  ].join(" ");

  return unique([
    ...topTerms(ideaSignalText, 12),
    ...topTerms(sourceText, 18)
  ]).slice(0, 24);
}

function termCoverage(sourceTerms: string[], targetTerms: string[]) {
  if (sourceTerms.length === 0) {
    return 0;
  }

  const target = new Set(targetTerms);
  const hits = sourceTerms.filter((term) => target.has(term)).length;

  return Number((hits / sourceTerms.length).toFixed(3));
}

function itemWarnings(input: {
  sourceToInputCoverage: number;
  sourceToQueryCoverage: number;
  inputToQueryCoverage: number;
}) {
  const warnings: string[] = [];

  if (input.sourceToInputCoverage < 0.25) {
    warnings.push("Repo/source signals are weakly represented in ProjectIdeaInput.");
  }

  if (input.sourceToQueryCoverage < 0.2) {
    warnings.push("Research query variants carry too little of the source signal.");
  }

  if (input.inputToQueryCoverage < 0.2) {
    warnings.push("Research query variants drift away from the project idea input.");
  }

  return warnings;
}

export function auditResearchHandoff(input: {
  ideas: DiscoveredIdea[];
  projectIdeaInputs: ProjectIdeaInput[];
  sourceRepos: IdeaSourceRepo[];
}): ResearchHandoffAuditReport {
  const sourceReposById = new Map(input.sourceRepos.map((repo) => [repo.repoId, repo]));
  const items = input.projectIdeaInputs.flatMap((projectIdeaInput, index) => {
    const idea = input.ideas[index];
    if (!idea) {
      return [];
    }

    const researchPlan = buildProjectResearchPlan(projectIdeaInput).researchPlan;
    const sourceSignalTerms = sourceTermsForIdea({
      idea,
      sourceReposById
    });
    const projectIdeaTerms = unique(
      tokenize(
        [
          projectIdeaInput.title,
          projectIdeaInput.description,
          projectIdeaInput.constraints.join(" "),
          projectIdeaInput.preferredDomains.join(" ")
        ].join(" ")
      )
    );
    const queryTerms = unique(tokenize(researchPlan.queryVariants.join(" ")));
    const sourceToInputCoverage = termCoverage(sourceSignalTerms, projectIdeaTerms);
    const sourceToQueryCoverage = termCoverage(sourceSignalTerms, queryTerms);
    const inputToQueryCoverage = termCoverage(projectIdeaTerms, queryTerms);
    const warnings = itemWarnings({
      sourceToInputCoverage,
      sourceToQueryCoverage,
      inputToQueryCoverage
    });

    return [
      {
        ideaId: idea.ideaId,
        title: idea.title,
        sourceRepos: idea.sourceRepos,
        sourceSignalTerms,
        projectIdeaTerms,
        queryTerms,
        sourceToInputCoverage,
        sourceToQueryCoverage,
        inputToQueryCoverage,
        verdict: warnings.length === 0 ? "pass" : "needs_review",
        warnings,
        queryVariants: researchPlan.queryVariants
      } satisfies ResearchHandoffAuditItem
    ];
  });
  const averageSourceToQueryCoverage =
    items.length > 0
      ? Number(
          (
            items.reduce((sum, item) => sum + item.sourceToQueryCoverage, 0) /
            items.length
          ).toFixed(3)
        )
      : 0;
  const averageSourceToInputCoverage =
    items.length > 0
      ? Number(
          (
            items.reduce((sum, item) => sum + item.sourceToInputCoverage, 0) /
            items.length
          ).toFixed(3)
        )
      : 0;

  return {
    itemCount: items.length,
    passCount: items.filter((item) => item.verdict === "pass").length,
    averageSourceToQueryCoverage,
    averageSourceToInputCoverage,
    items
  };
}

export function researchHandoffAuditToMarkdown(report: ResearchHandoffAuditReport) {
  return [
    "# Research Handoff Audit",
    "",
    `Items: ${report.itemCount}`,
    `Pass: ${report.passCount}/${report.itemCount}`,
    `Average source-to-input coverage: ${report.averageSourceToInputCoverage}`,
    `Average source-to-query coverage: ${report.averageSourceToQueryCoverage}`,
    "",
    "## Items",
    "",
    ...report.items.flatMap((item) => [
      `### ${item.title}`,
      "",
      `- Verdict: ${item.verdict}`,
      `- Source repos: ${item.sourceRepos.join(", ") || "none"}`,
      `- Source to input coverage: ${item.sourceToInputCoverage}`,
      `- Source to query coverage: ${item.sourceToQueryCoverage}`,
      `- Input to query coverage: ${item.inputToQueryCoverage}`,
      `- Warnings: ${item.warnings.join(" | ") || "none"}`,
      `- Source signal terms: ${item.sourceSignalTerms.slice(0, 16).join(", ") || "none"}`,
      `- Query terms: ${item.queryTerms.slice(0, 16).join(", ") || "none"}`,
      ""
    ])
  ].join("\n");
}
