import { describe, expect, it } from "vitest";
import {
  FullPassSelectionMode,
  selectIdeaForFullPass
} from "@/lib/project-ideas";
import type { IdeaDiscoveryReport } from "@/lib/project-ideas";

function report(): IdeaDiscoveryReport {
  const idea = (id: string, title: string) => ({
    ideaId: id,
    title,
    oneSentence: `${title} for developer workflows.`,
    problem: `${title} problem statement.`,
    targetUsers: ["developers"],
    mvpScope: ["diagnose one workflow"],
    nonGoals: [],
    sourceRepos: [`repo_${id}`],
    originalInspiration: "repo signal",
    differentiation: ["diagnostic angle"],
    aiLeverage: ["summarize evidence"],
    researchQuestions: ["what evidence matters?"],
    risks: [],
    domains: ["developer tools"]
  });
  const projectInput = (title: string) => ({
    title,
    description: `${title} description for research handoff.`,
    constraints: ["narrow diagnostic MVP"],
    preferredDomains: ["developer tools"],
    outputLanguage: "pl"
  });
  const score = (ideaId: string, total: number) => ({
    ideaId,
    total,
    problemClarity: 1,
    userSpecificity: 1,
    githubSignalStrength: 1,
    novelty: 1,
    mvpFeasibility: 1,
    researchLeverage: 1,
    personalUtility: 1,
    businessPotential: 0.5,
    riskPenalty: 0,
    verdict: "promising" as const,
    reasons: []
  });
  const handoff = (
    ideaId: string,
    title: string,
    readiness: "ready" | "needs_review",
    sourceEvidenceQuality: number,
    reviewFlags: string[]
  ) => ({
    ideaId,
    title,
    score: 100,
    readiness,
    inputValid: true,
    constraintsQuality: 1,
    domainSpecificity: 1,
    researchQuestionCoverage: 1,
    nonGoalClarity: 1,
    descriptionSpecificity: 1,
    sourceEvidenceQuality,
    strengths: [],
    weaknesses: [],
    requiredFixes: [],
    reviewFlags
  });

  return {
    id: "report",
    generatedAt: "2026-06-04T00:00:00.000Z",
    input: {
      domain: "developer tools",
      constraints: [],
      maxIdeas: 3,
      maxIdeasPerSource: 1,
      sourceRepos: [],
      outputLanguage: "pl"
    },
    sourceRepos: [],
    repoInsights: [],
    discoveredIdeas: [],
    rejectedIdeas: [],
    shortlist: [
      idea("risky_top", "Risky Top"),
      idea("ready_lower", "Ready Lower"),
      idea("risky_lower", "Risky Lower")
    ],
    projectIdeaInputs: [
      projectInput("Risky Top"),
      projectInput("Ready Lower"),
      projectInput("Risky Lower")
    ],
    ideaScores: [
      score("risky_top", 98),
      score("ready_lower", 95),
      score("risky_lower", 90)
    ],
    projectIdeaHandoffQuality: [
      handoff("risky_top", "Risky Top", "needs_review", 0.25, [
        "Manual review: weak source evidence."
      ]),
      handoff("ready_lower", "Ready Lower", "ready", 0.9, []),
      handoff("risky_lower", "Risky Lower", "needs_review", 0.3, [
        "Manual review: borderline source evidence."
      ])
    ],
    metrics: {
      ideaCount: 3,
      promisingCount: 3,
      cloneRejectedCount: 0,
      averageNovelty: 1,
      averageMvpFeasibility: 1,
      averagePersonalUtility: 1,
      averageGithubSignalStrength: 1,
      shortlistSourceDominance: 0.34,
      maxIdeasPerSource: 1,
      researchReadyCount: 3,
      pipelineInputValidCount: 3,
      averageHandoffQualityScore: 100,
      handoffReadyCount: 1,
      handoffReviewCount: 2,
      handoffBlockedCount: 0
    }
  };
}

describe("full-pass idea selection", () => {
  it("keeps the default ready-first behavior", () => {
    const selected = selectIdeaForFullPass(report(), FullPassSelectionMode.Ready);

    expect(selected?.idea.ideaId).toBe("ready_lower");
  });

  it("can force a needs-review idea to test handoff risk resolution", () => {
    const selected = selectIdeaForFullPass(
      report(),
      FullPassSelectionMode.NeedsReview
    );

    expect(selected?.idea.ideaId).toBe("risky_top");
    expect(selected?.handoff?.reviewFlags).toHaveLength(1);
  });

  it("can select the strongest score regardless of readiness", () => {
    const selected = selectIdeaForFullPass(report(), FullPassSelectionMode.Top);

    expect(selected?.idea.ideaId).toBe("risky_top");
  });
});
