import { describe, expect, it } from "vitest";
import {
  IdeaDiscoveryReportSchema,
  runProjectIdeaDiscovery
} from "@/lib/project-ideas";
import { ProjectIdeaInputSchema } from "@/lib/project-research/schemas";
import type { IdeaSourceRepo } from "@/lib/project-ideas";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const requiredFiles = [
  "manifest.json",
  "source_repos.json",
  "github_collection.json",
  "repo_insights.json",
  "discovered_ideas.json",
  "idea_scores.json",
  "rejected_ideas.json",
  "shortlist.json",
  "project_idea_inputs.json",
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

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe("runProjectIdeaDiscovery", () => {
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

    expect(existingCount).toBe(requiredFiles.length);
    expect(manifest.promisingCount).toBeGreaterThanOrEqual(1);
    expect(IdeaDiscoveryReportSchema.parse(report)).toEqual(report);
    expect(projectIdeaInputs.every((idea: unknown) => ProjectIdeaInputSchema.safeParse(idea).success)).toBe(
      true
    );
  });
});

