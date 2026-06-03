import { describe, expect, it } from "vitest";
import {
  discoverProjectIdeas,
  scoreProjectIdeaHandoff
} from "@/lib/project-ideas";
import type { DiscoveredIdea } from "@/lib/project-ideas";
import type { ProjectIdeaInput } from "@/lib/project-research";
import { benchmarkIdeaSourceRepo } from "@/lib/project-ideas/benchmarkFixtures";

describe("project idea handoff quality", () => {
  it("marks generated adjacent ideas as research-ready handoffs", () => {
    const report = discoverProjectIdeas({
      domain: "AI developer tools",
      constraints: ["MVP in 2 weeks"],
      maxIdeas: 1,
      outputLanguage: "pl",
      sourceRepos: [
        benchmarkIdeaSourceRepo({
          repoId: "repo_code_review_agent",
          name: "ai-code-review-agent",
          description: "AI agent for code review and pull request comments.",
          topics: ["ai", "code-review", "developer-tools"],
          stars: 1800,
          forks: 140,
          openIssues: 24,
          readmeText:
            "AI code review agent that reads repositories, reviews pull requests, and comments on code quality.",
          issueTitle: "Need better sprint planning for refactors",
          issueBody:
            "Review comments are useful, but we need prioritization and sprint-sized plans."
        })
      ]
    });

    expect(report.projectIdeaHandoffQuality[0]?.readiness).toBe("ready");
    expect(report.metrics.handoffReadyCount).toBe(1);
    expect(report.metrics.averageHandoffQualityScore).toBeGreaterThanOrEqual(82);
  });

  it("blocks generic project inputs before research handoff", () => {
    const idea: DiscoveredIdea = {
      ideaId: "idea_generic",
      title: "AI App",
      oneSentence: "Build an AI app to help users do useful work.",
      problem: "Users need a useful AI app.",
      targetUsers: ["users"],
      mvpScope: ["build a prototype"],
      nonGoals: [],
      sourceRepos: ["repo_generic"],
      originalInspiration: "generic repo",
      differentiation: ["different UI"],
      aiLeverage: ["uses AI"],
      researchQuestions: ["Can AI help?"],
      risks: [],
      domains: ["AI"]
    };
    const projectIdeaInput: ProjectIdeaInput = {
      title: "AI App",
      description: "Build an AI app to help users.",
      constraints: ["MVP"],
      preferredDomains: ["AI"],
      outputLanguage: "pl"
    };

    const quality = scoreProjectIdeaHandoff({ idea, projectIdeaInput });

    expect(quality.readiness).toBe("blocked");
    expect(quality.score).toBeLessThan(65);
    expect(quality.requiredFixes.join(" ")).toContain("research questions");
    expect(quality.requiredFixes.join(" ")).toContain("specific");
  });
});
