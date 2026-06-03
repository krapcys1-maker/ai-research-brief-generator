import { describe, expect, it } from "vitest";
import { ProjectArchitectureSchema } from "@/lib/project-architecture";
import { ProjectPrdSchema } from "@/lib/project-prd";
import {
  buildProjectResearchPlan,
  ProjectResearchBriefSchema,
  runProjectResearch
} from "@/lib/project-research";
import { runProjectIdeaDiscovery } from "@/lib/project-ideas";
import type { IdeaSourceRepo } from "@/lib/project-ideas";
import type { ProjectIdeaInput, ReviewedPaper } from "@/lib/project-research";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

function sourceRepo(): IdeaSourceRepo {
  return {
    repoId: "repo_code_review_agent",
    name: "ai-code-review-agent",
    owner: "handoff",
    url: "https://github.com/handoff/ai-code-review-agent",
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

function evidenceForIdea(idea: ProjectIdeaInput): ReviewedPaper[] {
  const { researchPlan } = buildProjectResearchPlan(idea);

  return researchPlan.evidenceBuckets.flatMap((bucket) => [
    {
      paperId: `handoff_${bucket.id}_1`,
      title: `Handoff evidence for ${bucket.label} 1`,
      year: 2026,
      url: `https://example.com/handoff/${bucket.id}/1`,
      doi: null,
      bucketIds: [bucket.id],
      fullTextStatus: "parsed",
      usefulForProject: true,
      evidenceStrength: "full_text_partial",
      keyMethods: [`method for ${bucket.label}`],
      limitations: [`limitation for ${bucket.label}`],
      implementationImplications: [`implementation implication for ${bucket.label}`],
      riskImplications: [`risk implication for ${bucket.label}`]
    },
    {
      paperId: `handoff_${bucket.id}_2`,
      title: `Handoff evidence for ${bucket.label} 2`,
      year: 2026,
      url: `https://example.com/handoff/${bucket.id}/2`,
      doi: null,
      bucketIds: [bucket.id],
      fullTextStatus: "parsed",
      usefulForProject: true,
      evidenceStrength: "full_text_partial",
      keyMethods: [`second method for ${bucket.label}`],
      limitations: [`second limitation for ${bucket.label}`],
      implementationImplications: [
        `second implementation implication for ${bucket.label}`
      ],
      riskImplications: [`second risk implication for ${bucket.label}`]
    }
  ]);
}

describe("Idea Scout to research handoff", () => {
  it("turns a discovered idea into ready PRD and architecture artifacts", async () => {
    const ideaOutputDir = join(tmpdir(), `idea-handoff-${Date.now()}`);
    await runProjectIdeaDiscovery({
      domain: "AI developer tools",
      constraints: ["MVP in 2 weeks"],
      sourceRepos: [sourceRepo()],
      maxIdeas: 1,
      outputLanguage: "pl",
      outputDir: ideaOutputDir
    });
    const projectIdeaInputs = JSON.parse(
      await readFile(join(ideaOutputDir, "project_idea_inputs.json"), "utf8")
    ) as ProjectIdeaInput[];
    const idea = projectIdeaInputs[0];

    expect(idea).toBeDefined();

    const researchOutputDir = join(tmpdir(), `research-handoff-${Date.now()}`);
    const manifest = await runProjectResearch({
      idea: idea!,
      reviewedPapers: evidenceForIdea(idea!),
      outputDir: researchOutputDir,
      generatedAt: "2026-06-03T18:30:00.000Z"
    });
    const brief = JSON.parse(
      await readFile(join(researchOutputDir, "project_research_brief.json"), "utf8")
    );
    const prd = JSON.parse(
      await readFile(join(researchOutputDir, "project_prd.json"), "utf8")
    );
    const architecture = JSON.parse(
      await readFile(join(researchOutputDir, "project_architecture.json"), "utf8")
    );

    expect(manifest.readyForArchitecture).toBe(true);
    expect(ProjectResearchBriefSchema.safeParse(brief).success).toBe(true);
    expect(ProjectPrdSchema.safeParse(prd).success).toBe(true);
    expect(ProjectArchitectureSchema.safeParse(architecture).success).toBe(true);
    expect(ProjectArchitectureSchema.parse(architecture).status).toBe("ready");
  });
});

