import { describe, expect, it } from "vitest";
import { buildTrendRadar, TrendRadarReportSchema } from "@/lib/project-ideas";
import type { IdeaSourceRepo, RepoInsight } from "@/lib/project-ideas";

function repo(): IdeaSourceRepo {
  return {
    repoId: "repo_deepseek_v3",
    name: "DeepSeek-V3",
    owner: "deepseek-ai",
    url: "https://github.com/deepseek-ai/DeepSeek-V3",
    description: "Large language model repository with inference and deployment artifacts.",
    topics: ["ai", "llm", "inference"],
    primaryLanguage: "Python",
    stars: 4800,
    forks: 360,
    openIssues: 42,
    createdAt: "2024-12-01T12:00:00.000Z",
    pushedAt: "2025-01-01T12:00:00.000Z",
    readmeText:
      "LLM inference project with model serving, benchmark harness, evaluations, and deployment examples.",
    issueSignals: [
      {
        title: "Need safer deployment checks before inference release",
        body: "Teams need regression gates, cost checks, and rollback planning before shipping model changes.",
        labels: ["enhancement"]
      }
    ]
  };
}

function insight(): RepoInsight {
  return {
    repoId: "repo_deepseek_v3",
    problemSolved:
      "Teams need model deployment workflows with reliable inference and release checks.",
    targetUsers: ["AI platform teams", "software developers"],
    coreWorkflow: "runs model inference and deployment benchmarks",
    technicalMechanisms: ["LLM-assisted synthesis", "audit and risk controls"],
    marketSignals: ["4800 GitHub stars", "360 forks"],
    painSignals: ["Need safer deployment checks before inference release"],
    missingCapabilities: ["risk controls", "prioritized execution plan"],
    cloneRisk: "medium"
  };
}

describe("buildTrendRadar", () => {
  it("groups trend repo signals into hot opportunity categories", () => {
    const report = buildTrendRadar({
      sourceRepos: [repo()],
      repoInsights: [insight()],
      ghArchiveTrendRepos: [
        {
          repoFullName: "deepseek-ai/DeepSeek-V3",
          stars: 680,
          forks: 12,
          pushes: 8,
          issues: 3,
          trendScore: 3434
        }
      ],
      generatedAt: "2026-06-03T17:00:00.000Z"
    });

    expect(TrendRadarReportSchema.parse(report)).toEqual(report);
    expect(report.repoSignals[0]?.category).toBe(
      "LLM infrastructure and model operations"
    );
    expect(report.repoSignals[0]?.heatScore).toBeGreaterThan(70);
    expect(report.repoSignals[0]?.sexinessScore).toBeGreaterThanOrEqual(70);
    expect(report.categories[0]?.opportunityAngles.join(" ")).toContain(
      "model release checklist"
    );
    expect(report.topOpportunities[0]?.suggestedConstraints.join(" ")).toContain(
      "do not clone"
    );
  });

  it("derives opportunity angles from concrete repo evidence", () => {
    const report = buildTrendRadar({
      sourceRepos: [
        {
          ...repo(),
          repoId: "repo_markitdown",
          owner: "microsoft",
          name: "markitdown",
          description: "Tool for converting documents to Markdown.",
          topics: ["markdown", "pdf", "document-ai"],
          readmeText: "Converts PDF, Office, CSV, and other documents to Markdown.",
          issueSignals: [
            {
              title: "CsvConverter produces broken Markdown tables",
              body: "Pipe characters break Markdown tables.",
              labels: ["bug"]
            }
          ]
        },
        {
          ...repo(),
          repoId: "repo_cc_switch",
          owner: "farion1231",
          name: "cc-switch",
          description: "Provider manager for Codex, Claude Code, OpenCode, and Gemini CLI.",
          topics: ["codex", "claude-code", "provider-management"],
          readmeText: "Manages AI CLI providers and model routing.",
          issueSignals: [
            {
              title: "Third-party GPT relay cannot use codex app conversation",
              body: "Provider passes health checks but fails during Codex conversation.",
              labels: ["question"]
            }
          ]
        },
        {
          ...repo(),
          repoId: "repo_hermes_agent",
          owner: "NousResearch",
          name: "hermes-agent",
          description: "AI agent desktop client.",
          topics: ["ai-agent", "desktop-app"],
          readmeText: "Agent desktop client with sessions and tools.",
          issueSignals: [
            {
              title:
                "Desktop sessions get spurious parent_session_id, making them invisible from sidebar",
              body: "Session metadata is attached to the wrong parent.",
              labels: ["bug"]
            }
          ]
        }
      ],
      repoInsights: [],
      ghArchiveTrendRepos: [
        {
          repoFullName: "microsoft/markitdown",
          stars: 140_000,
          forks: 9000,
          pushes: 20,
          issues: 10,
          trendScore: 904
        },
        {
          repoFullName: "farion1231/cc-switch",
          stars: 90_000,
          forks: 5000,
          pushes: 12,
          issues: 4,
          trendScore: 532
        },
        {
          repoFullName: "NousResearch/hermes-agent",
          stars: 178_000,
          forks: 30_000,
          pushes: 10,
          issues: 3,
          trendScore: 508
        }
      ],
      generatedAt: "2026-06-03T17:00:00.000Z"
    });

    const allAngles = report.categories
      .flatMap((category) => category.opportunityAngles)
      .join(" ");

    expect(allAngles).toContain("document conversion QA harness");
    expect(allAngles).toContain("AI CLI provider compatibility monitor");
    expect(allAngles).toContain("agent session reliability monitor");
  });
});
