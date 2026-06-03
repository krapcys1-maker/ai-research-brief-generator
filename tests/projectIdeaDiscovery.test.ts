import { describe, expect, it } from "vitest";
import {
  discoverProjectIdeas,
  IdeaDiscoveryReportSchema,
  scoreIdea
} from "@/lib/project-ideas";
import type { IdeaSourceRepo } from "@/lib/project-ideas";
import { buildProjectResearchPlan } from "@/lib/project-research";

function sourceRepo(overrides: Partial<IdeaSourceRepo>): IdeaSourceRepo {
  return {
    repoId: "repo_ai_code_review_agent",
    name: "ai-code-review-agent",
    owner: "example",
    url: "https://github.com/example/ai-code-review-agent",
    description: "AI agent for code review and pull request comments.",
    topics: ["ai", "code-review", "developer-tools"],
    primaryLanguage: "TypeScript",
    stars: 1800,
    forks: 140,
    openIssues: 24,
    createdAt: "2025-10-01T12:00:00.000Z",
    pushedAt: "2026-05-28T12:00:00.000Z",
    readmeText:
      "AI code review agent that reads repositories, reviews pull requests, and comments on code quality.",
    issueSignals: [
      {
        title: "Need better sprint planning for refactors",
        body: "Review comments are useful, but we need prioritization and sprint-sized plans.",
        labels: ["enhancement"]
      }
    ],
    ...overrides
  };
}

describe("discoverProjectIdeas", () => {
  it("turns GitHub repo signals into non-clone project ideas", () => {
    const report = discoverProjectIdeas({
      domain: "AI developer tools",
      constraints: ["MVP in 2 weeks", "no automatic code edits"],
      maxIdeas: 3,
      outputLanguage: "pl",
      sourceRepos: [sourceRepo({})]
    });

    expect(IdeaDiscoveryReportSchema.parse(report)).toEqual(report);
    expect(report.discoveredIdeas.length).toBeGreaterThanOrEqual(2);
    expect(report.metrics.cloneRejectedCount).toBeGreaterThanOrEqual(1);
    expect(report.shortlist.length).toBeGreaterThanOrEqual(1);
    expect(report.shortlist[0]?.title).toBe("AI Technical Debt Sprint Planner");
    expect(report.shortlist[0]?.differentiation.length).toBeGreaterThanOrEqual(2);
    expect(report.projectIdeaInputs.length).toBe(report.shortlist.length);
  });

  it("exports shortlisted ideas as valid research pipeline inputs", () => {
    const report = discoverProjectIdeas({
      domain: "AI developer tools",
      constraints: ["MVP only recommends a plan"],
      maxIdeas: 1,
      sourceRepos: [sourceRepo({})]
    });
    const projectIdea = report.projectIdeaInputs[0];

    expect(projectIdea).toBeDefined();
    const { researchPlan } = buildProjectResearchPlan(projectIdea);

    expect(researchPlan.evidenceBuckets.length).toBeGreaterThanOrEqual(4);
    expect(researchPlan.queryVariants.length).toBeGreaterThan(
      researchPlan.evidenceBuckets.length
    );
  });

  it("penalizes direct clones of source repository workflow", () => {
    const report = discoverProjectIdeas({
      domain: "AI developer tools",
      sourceRepos: [sourceRepo({})]
    });
    const clone = report.discoveredIdeas.find((idea) =>
      idea.ideaId.startsWith("idea_clone_")
    );
    const repo = report.sourceRepos[0];
    const insight = report.repoInsights[0];

    expect(clone).toBeDefined();
    expect(repo).toBeDefined();
    expect(insight).toBeDefined();

    const score = scoreIdea({
      idea: clone!,
      repo: repo!,
      insight: insight!
    });

    expect(score.verdict).toBe("reject");
    expect(score.novelty).toBeLessThan(0.55);
    expect(score.reasons.join(" ")).toContain("core workflow");
  });
});

