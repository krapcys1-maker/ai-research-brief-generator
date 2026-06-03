import { z } from "zod";
import type { IdeaSourceRepo } from "@/lib/project-ideas/types";

export const AiIdeaCandidateSchema = z.object({
  title: z.string().trim().min(3),
  sourceRepos: z.array(z.string().trim().min(1)).min(1),
  problem: z.string().trim().min(20),
  mvpScope: z.array(z.string().trim().min(8)).min(3).max(4),
  differentiation: z.array(z.string().trim().min(8)).min(2).max(4),
  evidenceSignals: z.array(z.string().trim().min(8)).min(2).max(5),
  cloneRisk: z.enum(["low", "medium", "high"]),
  estimatedMvpWeeks: z.number().min(1).max(12),
  scoreOutOf10: z.number().min(0).max(10),
  rejectionReasons: z.array(z.string().trim().min(1)).default([])
});

export const AiIdeaResponseSchema = z.object({
  ideas: z.array(AiIdeaCandidateSchema).min(1)
});

export type AiIdeaCandidate = z.infer<typeof AiIdeaCandidateSchema>;
export type AiIdeaResponse = z.infer<typeof AiIdeaResponseSchema>;

type BuildAiIdeaGenerationPromptInput = {
  sourceRepos: IdeaSourceRepo[];
  maxIdeas: number;
  constraints: string[];
  outputLanguage: string;
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

export function compactRepoForAiIdeaPrompt(repo: IdeaSourceRepo) {
  return {
    repoFullName: repoFullName(repo),
    description: repo.description,
    topics: repo.topics,
    primaryLanguage: repo.primaryLanguage,
    stars: repo.stars,
    forks: repo.forks,
    openIssues: repo.openIssues,
    readmeExcerpt: truncate(repo.readmeText, 1600),
    issueSignals: repo.issueSignals.slice(0, 3).map((issue) => ({
      title: issue.title,
      body: truncate(issue.body, 700),
      labels: issue.labels
    }))
  };
}

export const aiIdeaGenerationSystemPrompt = [
  "You are an evidence-backed product discovery architect.",
  "Your job is to generate adjacent product ideas from GitHub trend evidence.",
  "You must avoid cloning the source repository, forking it, or adding a broad team/enterprise edition of the same product.",
  "Prefer narrow diagnostic, QA, audit, evaluation, readiness, monitoring, or reliability products.",
  "Do not output generic AI assistant ideas.",
  "Return strict JSON only."
].join(" ");

export function buildAiIdeaGenerationPrompt(input: BuildAiIdeaGenerationPromptInput) {
  const compactRepos = input.sourceRepos.map(compactRepoForAiIdeaPrompt);

  return `Generate exactly ${input.maxIdeas} adjacent, non-clone product ideas.

Output language: ${input.outputLanguage}
User constraints:
${JSON.stringify(input.constraints)}

Hard rules:
- Do not create a fork, plugin pack, team edition, or direct replacement of any source repo.
- Do not build another converter for MarkItDown-like repos; prefer conversion QA, regression testing, or RAG-readiness diagnostics.
- Do not build another context compressor for Headroom-like repos; prefer fidelity, fact-retention, and task-success evaluation.
- Do not build another provider switcher/config manager for CC Switch-like repos; prefer failure diagnosis, compatibility testing, or safe routing recommendations.
- Do not build another agent client for Hermes-like repos; prefer session reliability QA, recovery, telemetry, or approval UX testing.
- Do not build another self-hosted workspace for Odysseus-like repos; prefer deployment risk auditing, policy readiness, model-fit gates, or governance.
- Every idea must be feasible as an MVP in 2-4 weeks.
- Every idea must cite at least two evidenceSignals from the supplied README or issue summaries.
- Every idea must explain why it is not a clone in differentiation.
- If an idea would have high clone risk, do not include it.

Return exactly one JSON object:
{
  "ideas": [
    {
      "title": "specific product name, not generic AI Assistant",
      "sourceRepos": ["owner/name"],
      "problem": "specific buyer/user pain from evidence",
      "mvpScope": ["3-4 concrete MVP bullets"],
      "differentiation": ["2-4 bullets explaining non-clone angle"],
      "evidenceSignals": ["2-5 concrete signals from README/issues"],
      "cloneRisk": "low|medium|high",
      "estimatedMvpWeeks": 1,
      "scoreOutOf10": 1,
      "rejectionReasons": []
    }
  ]
}

GitHub trend evidence:
${JSON.stringify(compactRepos, null, 2)}`;
}

function textOf(candidate: AiIdeaCandidate) {
  return [
    candidate.title,
    candidate.problem,
    candidate.mvpScope.join(" "),
    candidate.differentiation.join(" "),
    candidate.evidenceSignals.join(" ")
  ]
    .join(" ")
    .toLowerCase();
}

export function scoreAiIdeaCandidateForQuality(candidate: AiIdeaCandidate) {
  const text = textOf(candidate);
  const cloneTerms = [
    "fork",
    "team edition",
    "workspace clone",
    "another converter",
    "another compressor",
    "provider switcher",
    "config manager",
    "agent client",
    "collaborative workspace"
  ];
  const strongAdjacentTerms = [
    "qa",
    "regression",
    "diagnostic",
    "audit",
    "readiness",
    "fidelity",
    "reliability",
    "compatibility",
    "governance",
    "recovery",
    "evidence",
    "quality",
    "tests",
    "testing"
  ];
  const clonePenalty = cloneTerms.filter((term) => text.includes(term)).length * 18;
  const adjacentBoost = Math.min(
    30,
    strongAdjacentTerms.filter((term) => text.includes(term)).length * 5
  );
  const evidenceBoost = Math.min(20, candidate.evidenceSignals.length * 5);
  const feasibilityPenalty =
    candidate.estimatedMvpWeeks > 4 ? (candidate.estimatedMvpWeeks - 4) * 8 : 0;
  const declaredClonePenalty =
    candidate.cloneRisk === "high" ? 30 : candidate.cloneRisk === "medium" ? 8 : 0;
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        45 +
          adjacentBoost +
          evidenceBoost +
          candidate.scoreOutOf10 * 2 -
          clonePenalty -
          feasibilityPenalty -
          declaredClonePenalty
      )
    )
  );
  const issues = [
    ...(clonePenalty > 0 ? ["candidate contains clone/fork/config-manager signals"] : []),
    ...(candidate.estimatedMvpWeeks > 4
      ? ["candidate exceeds 2-4 week MVP constraint"]
      : []),
    ...(candidate.cloneRisk === "high" ? ["candidate declares high clone risk"] : []),
    ...(candidate.evidenceSignals.length < 2
      ? ["candidate lacks enough concrete evidence signals"]
      : [])
  ];

  return {
    score,
    verdict:
      score >= 80 && candidate.cloneRisk !== "high"
        ? ("strong" as const)
        : score >= 65 && candidate.cloneRisk !== "high"
          ? ("usable" as const)
          : ("reject" as const),
    issues
  };
}
