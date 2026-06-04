import { describe, expect, it } from "vitest";
import {
  findBareGithubTokenInEnvText,
  IdeaDiscoveryReportSchema,
  ProjectIdeaAuditSchema,
  runProjectIdeaDiscovery
} from "@/lib/project-ideas";
import { ProjectIdeaInputSchema } from "@/lib/project-research/schemas";
import type { FetchLike, IdeaSourceRepo } from "@/lib/project-ideas";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const requiredFiles = [
  "manifest.json",
  "source_repos.json",
  "github_collection.json",
  "gh_archive_trends.json",
  "trend_radar.json",
  "trend_radar.md",
  "source_curation_report.json",
  "source_curation_report.md",
  "idea_selection_report.json",
  "idea_selection_report.md",
  "project_ideas_audit.json",
  "project_ideas_audit.md",
  "repo_insights.json",
  "discovered_ideas.json",
  "idea_scores.json",
  "rejected_ideas.json",
  "shortlist.json",
  "project_idea_inputs.json",
  "project_idea_handoff_quality.json",
  "project_idea_handoff_quality.md",
  "idea_discovery_report.json",
  "idea_discovery_report.md"
];

function sourceRepo(): IdeaSourceRepo {
  return {
    repoId: "repo_code_review_agent",
    name: "ai-code-review-agent",
    owner: "benchmark",
    url: "https://github.com/benchmark/ai-code-review-agent",
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
    ]
  };
}

const headers = {
  get(name: string) {
    const values: Record<string, string> = {
      "x-ratelimit-limit": "5000",
      "x-ratelimit-remaining": "4990",
      "x-ratelimit-reset": "1790000000"
    };

    return values[name.toLowerCase()] ?? null;
  }
};

const ghArchiveFetch: FetchLike = async (url) => {
  if (url.endsWith("/repos/deepseek-ai/DeepSeek-V3")) {
    return {
      ok: true,
      status: 200,
      headers,
      async json() {
        return {
          id: 1,
          name: "DeepSeek-V3",
          full_name: "deepseek-ai/DeepSeek-V3",
          owner: { login: "deepseek-ai" },
          html_url: "https://github.com/deepseek-ai/DeepSeek-V3",
          description: "Large language model repository with inference and deployment artifacts.",
          topics: ["ai", "llm", "inference"],
          language: "Python",
          stargazers_count: 4800,
          forks_count: 360,
          open_issues_count: 42,
          created_at: "2024-12-01T12:00:00.000Z",
          pushed_at: "2025-01-01T12:00:00.000Z"
        };
      }
    };
  }

  if (url.endsWith("/repos/deepseek-ai/DeepSeek-V3/readme")) {
    return {
      ok: true,
      status: 200,
      headers,
      async json() {
        return {
          content: Buffer.from(
            "LLM inference project with model serving, benchmark harness, and deployment examples."
          ).toString("base64")
        };
      }
    };
  }

  if (url.includes("/repos/deepseek-ai/DeepSeek-V3/issues")) {
    return {
      ok: true,
      status: 200,
      headers,
      async json() {
        return [
          {
            title: "Need safer deployment checks before inference release",
            body: "Teams need regression gates, cost checks, and rollback planning before shipping model changes.",
            labels: [{ name: "enhancement" }]
          }
        ];
      }
    };
  }

  return {
    ok: false,
    status: 404,
    headers,
    async json() {
      return { message: `Unexpected URL ${url}` };
    }
  };
};

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe("runProjectIdeaDiscovery", () => {
  it("detects bare GitHub PAT lines from .env files", () => {
    const token = findBareGithubTokenInEnvText(
      [
        "AI_PROVIDER=deepseek",
        "github_pat_abcDEF123_456",
        "DATABASE_URL=postgres://example"
      ].join("\n")
    );

    expect(token).toBe("github_pat_abcDEF123_456");
  });

  it("writes complete idea discovery artifacts", async () => {
    const outputDir = join(
      tmpdir(),
      `project-idea-runner-test-${Date.now()}`
    );
    const manifest = await runProjectIdeaDiscovery({
      domain: "AI developer tools",
      constraints: ["MVP in 2 weeks"],
      sourceRepos: [sourceRepo()],
      maxIdeas: 3,
      outputLanguage: "pl",
      outputDir
    });
    const existingCount = (
      await Promise.all(requiredFiles.map((file) => exists(join(outputDir, file))))
    ).filter(Boolean).length;
    const report = JSON.parse(
      await readFile(join(outputDir, "idea_discovery_report.json"), "utf8")
    );
    const projectIdeaInputs = JSON.parse(
      await readFile(join(outputDir, "project_idea_inputs.json"), "utf8")
    );
    const handoffQuality = JSON.parse(
      await readFile(join(outputDir, "project_idea_handoff_quality.json"), "utf8")
    );
    const audit = JSON.parse(
      await readFile(join(outputDir, "project_ideas_audit.json"), "utf8")
    );
    const ideaSelection = JSON.parse(
      await readFile(join(outputDir, "idea_selection_report.json"), "utf8")
    );
    const selectedDecision = ideaSelection.decisions.find(
      (decision: { selected?: boolean }) => decision.selected
    );

    expect(existingCount).toBe(requiredFiles.length);
    expect(manifest.promisingCount).toBeGreaterThanOrEqual(1);
    expect(manifest.handoffReadyCount).toBe(manifest.projectIdeaInputCount);
    expect(manifest.averageHandoffQualityScore).toBeGreaterThanOrEqual(82);
    expect(IdeaDiscoveryReportSchema.parse(report)).toEqual(report);
    expect(ProjectIdeaAuditSchema.parse(audit)).toEqual(audit);
    expect(audit.score).toBeGreaterThanOrEqual(70);
    expect(selectedDecision.sourceEvidenceQuality).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(selectedDecision.reviewFlags)).toBe(true);
    expect(projectIdeaInputs.every((idea: unknown) => ProjectIdeaInputSchema.safeParse(idea).success)).toBe(
      true
    );
    expect(handoffQuality.every((quality: { readiness?: string }) => quality.readiness === "ready")).toBe(
      true
    );
  });

  it("flags single-source ideas with weak issue-level evidence for manual review", async () => {
    const outputDir = join(
      tmpdir(),
      `project-idea-runner-review-flags-test-${Date.now()}`
    );

    await runProjectIdeaDiscovery({
      domain: "self-hosted AI security",
      constraints: ["do not clone workspace UI"],
      sourceRepos: [
        {
          ...sourceRepo(),
          repoId: "repo_single_source_workspace",
          name: "odysseus",
          owner: "example",
          description: "Self-hosted AI workspace.",
          topics: ["ai", "workspace", "self-hosted"],
          stars: 40_000,
          forks: 4000,
          issueSignals: [],
          readmeText:
            "A self-hosted AI workspace, local-first and privacy-first, with deployment settings, model providers, memory and secrets."
        }
      ],
      maxIdeas: 2,
      outputLanguage: "pl",
      outputDir
    });

    const ideaSelection = JSON.parse(
      await readFile(join(outputDir, "idea_selection_report.json"), "utf8")
    );
    const selectedDecision = ideaSelection.decisions.find(
      (decision: { selected?: boolean }) => decision.selected
    );

    expect(selectedDecision.title).toBe("Self-Hosted AI Workspace Policy Auditor");
    expect(selectedDecision.sourceEvidenceQuality).toBeLessThan(0.55);
    expect(selectedDecision.reviewFlags).toContain(
      "Manual review: single-source idea has weak issue-level evidence."
    );
  });

  it("connects GH Archive trends to GitHub enrichment and idea artifacts", async () => {
    const outputDir = join(
      tmpdir(),
      `project-idea-runner-gh-archive-test-${Date.now()}`
    );
    const manifest = await runProjectIdeaDiscovery({
      domain: "AI model operations",
      constraints: ["MVP in 2 weeks", "avoid cloning the source repository"],
      ghArchiveTrends: {
        startDate: "2025-01-01",
        maxRepos: 5,
        maxDays: 1,
        maxBytesBilled: 200_000_000,
        dryRun: false,
        includeReadme: true,
        includeIssues: true,
        timeoutMs: 10_000
      },
      maxIdeas: 3,
      outputLanguage: "pl",
      outputDir,
      bqExecutor: (args) => {
        if (args.includes("--dry_run")) {
          return {
            status: 0,
            stdout:
              "Query successfully validated. Assuming the tables are not modified, running this query will process 155658473 bytes of data.",
            stderr: ""
          };
        }

        return {
          status: 0,
          stdout: JSON.stringify([
            {
              repoFullName: "deepseek-ai/DeepSeek-V3",
              stars: "680",
              forks: "12",
              pushes: "8",
              issues: "3",
              trendScore: "3434"
            }
          ]),
          stderr: ""
        };
      },
      fetchFn: ghArchiveFetch
    });
    const ghArchiveTrends = JSON.parse(
      await readFile(join(outputDir, "gh_archive_trends.json"), "utf8")
    );
    const sourceRepos = JSON.parse(
      await readFile(join(outputDir, "source_repos.json"), "utf8")
    ) as unknown[];
    const projectIdeaInputs = JSON.parse(
      await readFile(join(outputDir, "project_idea_inputs.json"), "utf8")
    ) as unknown[];
    const trendRadar = JSON.parse(
      await readFile(join(outputDir, "trend_radar.json"), "utf8")
    );

    expect(manifest.ghArchiveMode).toBe("used");
    expect(manifest.ghArchiveTrendRepoCount).toBe(1);
    expect(manifest.trendRadarCategoryCount).toBeGreaterThanOrEqual(1);
    expect(manifest.trendRadarTopOpportunityCount).toBeGreaterThanOrEqual(1);
    expect(manifest.handoffReadyCount).toBe(manifest.projectIdeaInputCount);
    expect(sourceRepos).toHaveLength(1);
    expect(ghArchiveTrends.repos[0].repoFullName).toBe("deepseek-ai/DeepSeek-V3");
    expect(trendRadar.repoSignals[0].repoFullName).toBe("deepseek-ai/DeepSeek-V3");
    expect(trendRadar.categories[0].sexinessScore).toBeGreaterThanOrEqual(70);
    expect(projectIdeaInputs.length).toBeGreaterThanOrEqual(1);
    expect(projectIdeaInputs.every((idea) => ProjectIdeaInputSchema.safeParse(idea).success)).toBe(
      true
    );
  });
});
