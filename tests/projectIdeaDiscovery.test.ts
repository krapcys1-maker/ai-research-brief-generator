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

  it("generates specific LLM operations ideas for model deployment trends", () => {
    const report = discoverProjectIdeas({
      domain: "AI model operations",
      constraints: ["avoid cloning model repositories"],
      maxIdeas: 2,
      outputLanguage: "pl",
      sourceRepos: [
        sourceRepo({
          repoId: "repo_llm_inference",
          name: "llm-inference-runtime",
          owner: "example",
          url: "https://github.com/example/llm-inference-runtime",
          description:
            "LLM inference runtime with benchmark harness and deployment examples.",
          topics: ["ai", "llm", "inference", "benchmark"],
          primaryLanguage: "Python",
          stars: 4800,
          forks: 360,
          openIssues: 42,
          readmeText:
            "LLM inference project with model serving, benchmark harness, evaluations, and deployment examples.",
          issueSignals: [
            {
              title: "Need safer deployment checks before inference release",
              body: "Teams need regression gates, cost checks, and rollback planning before shipping model changes.",
              labels: ["enhancement"]
            }
          ]
        })
      ]
    });

    expect(report.shortlist[0]?.title).toBe("LLM Release Readiness Radar");
    expect(report.shortlist[0]?.differentiation.join(" ")).toContain(
      "release readiness"
    );
    expect(report.shortlist[0]?.researchQuestions.join(" ")).toContain(
      "LLM releases"
    );
  });

  it("generates specific agent QA ideas for agent framework trends", () => {
    const report = discoverProjectIdeas({
      domain: "AI agent operations",
      constraints: ["avoid building another agent framework"],
      maxIdeas: 2,
      outputLanguage: "pl",
      sourceRepos: [
        sourceRepo({
          repoId: "repo_agent_framework",
          name: "agent-workflow-kit",
          owner: "example",
          url: "https://github.com/example/agent-workflow-kit",
          description:
            "AI agent framework for tool use, workflow orchestration, and repeatable automation.",
          topics: ["ai", "agents", "workflow", "tools"],
          primaryLanguage: "Python",
          stars: 4200,
          forks: 330,
          openIssues: 38,
          readmeText:
            "AI agent framework that coordinates tools, code execution, and repeatable workflows.",
          issueSignals: [
            {
              title: "Need workflow evaluation before production runs",
              body: "Agent runs need repeatable scoring, failure review, and safe rollout plans.",
              labels: ["enhancement"]
            }
          ]
        })
      ]
    });

    expect(report.shortlist[0]?.title).toBe("AI Agent Run QA Console");
    expect(report.shortlist[0]?.differentiation.join(" ")).toContain(
      "another agent framework"
    );
    expect(report.shortlist[0]?.mvpScope.join(" ")).toContain("tool calls");
  });

  it("deduplicates repeated shortlist ideas across similar source repos", () => {
    const report = discoverProjectIdeas({
      domain: "AI developer tools",
      constraints: ["avoid repeated ideas"],
      maxIdeas: 5,
      outputLanguage: "pl",
      sourceRepos: [
        sourceRepo({
          repoId: "repo_code_review_agent_one",
          name: "code-review-agent-one"
        }),
        sourceRepo({
          repoId: "repo_code_review_agent_two",
          name: "code-review-agent-two",
          stars: 2200,
          forks: 160
        })
      ]
    });
    const titles = report.shortlist.map((idea) => idea.title);

    expect(titles).toEqual([...new Set(titles)]);
    expect(titles.filter((title) => title === "AI Technical Debt Sprint Planner")).toHaveLength(1);
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
