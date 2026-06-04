import { z } from "zod";
import { createAIProvider } from "@/lib/ai/client";
import type {
  DiscoveredIdea,
  IdeaScore,
  IdeaSourceRepo
} from "@/lib/project-ideas/types";
import type {
  IdeaSelectionReport,
  SourceCurationReport
} from "@/lib/project-ideas/selectionCurator";

export const AiIdeaCurationReviewSchema = z.object({
  ideaId: z.string().trim().min(1),
  title: z.string().trim().min(3),
  verdict: z.enum(["keep", "revise", "reject"]),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string().trim().min(1)).min(1),
  sourceEvidenceConcerns: z.array(z.string().trim().min(1)).default([]),
  suggestedRevision: z
    .object({
      title: z.string().trim().min(3),
      problem: z.string().trim().min(20),
      whyBetter: z.string().trim().min(20)
    })
    .nullable()
});

export const AiIdeaCurationHiddenGemSchema = z.object({
  sourceRepo: z.string().trim().min(1),
  suggestedIdea: z.string().trim().min(3),
  whyItMayBeMissed: z.string().trim().min(20),
  evidenceSignals: z.array(z.string().trim().min(1)).min(1),
  confidence: z.number().min(0).max(1)
});

export const AiIdeaCurationReportSchema = z.object({
  status: z.enum(["success", "failed"]),
  generatedAt: z.string().trim().min(1),
  model: z.string().trim().min(1).nullable(),
  summary: z.string().trim().min(1),
  reviews: z.array(AiIdeaCurationReviewSchema).default([]),
  hiddenGems: z.array(AiIdeaCurationHiddenGemSchema).default([]),
  finalRecommendations: z.array(z.string().trim().min(1)).default([]),
  error: z.string().trim().min(1).nullable()
});

export type AiIdeaCurationReport = z.infer<typeof AiIdeaCurationReportSchema>;

type RunAiIdeaCurationInput = {
  sourceRepos: IdeaSourceRepo[];
  shortlist: DiscoveredIdea[];
  ideaScores: IdeaScore[];
  sourceCuration: SourceCurationReport;
  ideaSelection: IdeaSelectionReport;
  domain: string;
  maxHiddenGems?: number;
  timeoutMs?: number;
  model?: string;
};

function truncate(value: string, limit: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > limit
    ? `${normalized.slice(0, limit - 3)}...`
    : normalized;
}

function repoFullName(repo: IdeaSourceRepo) {
  return `${repo.owner}/${repo.name}`;
}

function scoreFor(scores: IdeaScore[], ideaId: string) {
  return scores.find((score) => score.ideaId === ideaId)?.total ?? null;
}

function compactRepo(repo: IdeaSourceRepo) {
  return {
    repoId: repo.repoId,
    repoFullName: repoFullName(repo),
    description: repo.description,
    topics: repo.topics,
    stars: repo.stars,
    forks: repo.forks,
    openIssues: repo.openIssues,
    createdAt: repo.createdAt,
    pushedAt: repo.pushedAt,
    readmeExcerpt: truncate(repo.readmeText, 900),
    issueSignals: repo.issueSignals.slice(0, 3).map((issue) => ({
      title: issue.title,
      body: truncate(issue.body, 350),
      labels: issue.labels
    }))
  };
}

function buildPrompt(input: RunAiIdeaCurationInput) {
  const repoById = new Map(input.sourceRepos.map((repo) => [repo.repoId, repo]));
  const shortlist = input.shortlist.map((idea) => ({
    ideaId: idea.ideaId,
    title: idea.title,
    problem: idea.problem,
    mvpScope: idea.mvpScope,
    differentiation: idea.differentiation,
    sourceRepos: idea.sourceRepos,
    score: scoreFor(input.ideaScores, idea.ideaId)
  }));
  const selectedSourceIds = new Set(input.shortlist.flatMap((idea) => idea.sourceRepos));
  const unselectedSources = input.sourceRepos
    .filter((repo) => !selectedSourceIds.has(repo.repoId))
    .slice(0, 25)
    .map(compactRepo);
  const selectedSources = input.shortlist
    .flatMap((idea) => idea.sourceRepos)
    .map((repoId) => repoById.get(repoId))
    .filter((repo): repo is IdeaSourceRepo => Boolean(repo))
    .slice(0, 30)
    .map(compactRepo);
  const decisions = input.ideaSelection.decisions.map((decision) => ({
    title: decision.title,
    selected: decision.selected,
    alignmentScore: decision.alignmentScore,
    primarySource: decision.primarySource,
    supportingSources: decision.supportingSources,
    reasons: decision.reasons,
    warnings: decision.warnings
  }));

  return `Audit this idea discovery run as a strict but fair product-discovery judge.

Project goal:
- This system is for one builder/user to find projects worth building.
- Business potential can help, but personal usefulness, buildability, novelty and evidence matter more.
- Do not reward pretty names without source evidence.
- Do not reject a small rising gem only because it has fewer stars.
- Do not clone the source repos. Prefer adjacent diagnostic, QA, audit, monitoring, evaluation, readiness and reliability products.

Domain: ${input.domain}
Max hidden gems to report: ${input.maxHiddenGems ?? 5}

You must judge the deterministic curator, not replace it blindly.

Return strict JSON:
{
  "status": "success",
  "generatedAt": "ISO string",
  "model": "model name if known",
  "summary": "short verdict",
  "reviews": [
    {
      "ideaId": "id from shortlist",
      "title": "idea title",
      "verdict": "keep|revise|reject",
      "confidence": 0.0,
      "reasons": ["why"],
      "sourceEvidenceConcerns": ["concerns or empty"],
      "suggestedRevision": null | {
        "title": "better title",
        "problem": "better problem",
        "whyBetter": "why this is better"
      }
    }
  ],
  "hiddenGems": [
    {
      "sourceRepo": "owner/name",
      "suggestedIdea": "idea",
      "whyItMayBeMissed": "why deterministic sorting may miss it",
      "evidenceSignals": ["README/issue evidence"],
      "confidence": 0.0
    }
  ],
  "finalRecommendations": ["what to change in the system"],
  "error": null
}

Deterministic shortlist:
${JSON.stringify(shortlist, null, 2)}

Deterministic selection decisions:
${JSON.stringify(decisions, null, 2)}

Top source curation scores:
${JSON.stringify(input.sourceCuration.evaluatedSources.slice(0, 40), null, 2)}

Selected source evidence:
${JSON.stringify(selectedSources, null, 2)}

Unselected source evidence, possible small gems:
${JSON.stringify(unselectedSources, null, 2)}`;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runAiIdeaCuration(
  input: RunAiIdeaCurationInput
): Promise<AiIdeaCurationReport> {
  const generatedAt = new Date().toISOString();
  const maxAttempts = 2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const provider = createAIProvider();
      const raw = await provider.generateStructured({
        schemaName: "AiIdeaCurationReport",
        systemPrompt:
          "You are a strict product-discovery judge. Return JSON only. Be fair: reward evidence and useful novelty, punish shallow keyword matches and clone risk.",
        userPrompt: buildPrompt(input),
        timeoutMs: input.timeoutMs ?? 90_000,
        maxTokens: 5000,
        model: input.model
      });

      return AiIdeaCurationReportSchema.parse({
        ...(raw as Record<string, unknown>),
        status: "success",
        generatedAt,
        model: input.model ?? null,
        error: null
      });
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await wait(750);
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);

  return AiIdeaCurationReportSchema.parse({
    status: "failed",
    generatedAt,
    model: input.model ?? null,
    summary: `AI idea curation failed after ${maxAttempts} attempts: ${message}`,
    reviews: [],
    hiddenGems: [],
    finalRecommendations: [
      "Keep deterministic curation as the source of truth until AI curation succeeds."
    ],
    error: message
  });
}

export function aiIdeaCurationReportToMarkdown(report: AiIdeaCurationReport) {
  const lines = [
    "# AI Idea Curation Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Model: ${report.model ?? "default"}`,
    "",
    "## Summary",
    "",
    report.summary,
    "",
    "## Reviews",
    ""
  ];

  for (const review of report.reviews) {
    lines.push(`### ${review.verdict.toUpperCase()} ${review.title}`);
    lines.push("");
    lines.push(`- Idea ID: ${review.ideaId}`);
    lines.push(`- Confidence: ${review.confidence}`);
    lines.push("");
    lines.push("Reasons:");
    lines.push(...review.reasons.map((reason) => `- ${reason}`));
    lines.push("");
    lines.push("Source evidence concerns:");
    lines.push(
      ...(review.sourceEvidenceConcerns.length
        ? review.sourceEvidenceConcerns.map((concern) => `- ${concern}`)
        : ["- none"])
    );
    if (review.suggestedRevision) {
      lines.push("");
      lines.push("Suggested revision:");
      lines.push(`- Title: ${review.suggestedRevision.title}`);
      lines.push(`- Problem: ${review.suggestedRevision.problem}`);
      lines.push(`- Why better: ${review.suggestedRevision.whyBetter}`);
    }
    lines.push("");
  }

  lines.push("## Hidden Gems");
  lines.push("");

  for (const gem of report.hiddenGems) {
    lines.push(`### ${gem.suggestedIdea}`);
    lines.push("");
    lines.push(`- Source: ${gem.sourceRepo}`);
    lines.push(`- Confidence: ${gem.confidence}`);
    lines.push(`- Why missed: ${gem.whyItMayBeMissed}`);
    lines.push("");
    lines.push("Evidence:");
    lines.push(...gem.evidenceSignals.map((signal) => `- ${signal}`));
    lines.push("");
  }

  lines.push("## Final Recommendations");
  lines.push("");
  lines.push(
    ...(report.finalRecommendations.length
      ? report.finalRecommendations.map((item) => `- ${item}`)
      : ["- none"])
  );
  lines.push("");

  if (report.error) {
    lines.push("## Error");
    lines.push("");
    lines.push(report.error);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}
