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
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

type BenchmarkCase = {
  id: string;
  domain: string;
  sourceRepos: IdeaSourceRepo[];
};

type CaseResult = {
  id: string;
  domain: string;
  discoveredIdeaTitle: string | null;
  ideaArtifactCompleteness: number;
  researchArtifactCompleteness: number;
  ideaInputValid: boolean;
  briefSchemaValid: boolean;
  prdSchemaValid: boolean;
  architectureSchemaValid: boolean;
  readyForArchitecture: boolean;
  architectureStatus: "ready" | "blocked";
  architectureJudgeScore: number;
  architectureJudgeVerdict: "pass" | "needs_review" | "fail";
  passed: boolean;
};

const ideaRequiredFiles = [
  "manifest.json",
  "source_repos.json",
  "github_collection.json",
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
const researchRequiredFiles = [
  "manifest.json",
  "normalized_idea.json",
  "research_plan.json",
  "coverage.json",
  "source_search.json",
  "source_papers.json",
  "evidence_collection.json",
  "reviewed_papers.json",
  "project_research_brief.json",
  "project_research_brief.md",
  "project_prd.json",
  "project_prd.md",
  "project_architecture.json",
  "project_architecture.md",
  "project_architecture_judge.json",
  "project_architecture_judge.md"
];
const jsonOutputPath =
  process.env.PROJECT_IDEA_TO_RESEARCH_BENCHMARK_JSON ??
  "benchmark-results/project-idea-to-research-latest.json";
const markdownOutputPath =
  process.env.PROJECT_IDEA_TO_RESEARCH_BENCHMARK_MARKDOWN ??
  "benchmark-results/project-idea-to-research-latest.md";

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function artifactCompleteness(outputDir: string, files: string[]) {
  const existingCount = (
    await Promise.all(files.map((file) => exists(join(outputDir, file))))
  ).filter(Boolean).length;

  return existingCount / files.length;
}

function repo(input: {
  repoId: string;
  name: string;
  description: string;
  topics: string[];
  readmeText: string;
  issueTitle: string;
  issueBody: string;
}): IdeaSourceRepo {
  return {
    repoId: input.repoId,
    name: input.name,
    owner: "handoff-benchmark",
    url: `https://github.com/handoff-benchmark/${input.name}`,
    description: input.description,
    topics: input.topics,
    primaryLanguage: "TypeScript",
    stars: 1600,
    forks: 120,
    openIssues: 20,
    createdAt: "2025-10-01T12:00:00.000Z",
    pushedAt: "2026-05-28T12:00:00.000Z",
    readmeText: input.readmeText,
    issueSignals: [
      {
        title: input.issueTitle,
        body: input.issueBody,
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

async function evaluateCase(
  testCase: BenchmarkCase,
  index: number
): Promise<CaseResult> {
  const ideaOutputDir = join(
    tmpdir(),
    `project-idea-to-research-idea-${Date.now()}-${index}`
  );
  const researchOutputDir = join(
    tmpdir(),
    `project-idea-to-research-research-${Date.now()}-${index}`
  );

  await runProjectIdeaDiscovery({
    domain: testCase.domain,
    constraints: ["MVP in 2 weeks"],
    sourceRepos: testCase.sourceRepos,
    maxIdeas: 1,
    outputLanguage: "pl",
    outputDir: ideaOutputDir
  });

  const projectIdeaInputs = JSON.parse(
    await readFile(join(ideaOutputDir, "project_idea_inputs.json"), "utf8")
  ) as ProjectIdeaInput[];
  const idea = projectIdeaInputs[0];
  const ideaInputValid = Boolean(idea?.title && idea.description);

  if (!idea) {
    return {
      id: testCase.id,
      domain: testCase.domain,
      discoveredIdeaTitle: null,
      ideaArtifactCompleteness: await artifactCompleteness(
        ideaOutputDir,
        ideaRequiredFiles
      ),
      researchArtifactCompleteness: 0,
      ideaInputValid: false,
      briefSchemaValid: false,
      prdSchemaValid: false,
      architectureSchemaValid: false,
      readyForArchitecture: false,
      architectureStatus: "blocked",
      architectureJudgeScore: 0,
      architectureJudgeVerdict: "fail",
      passed: false
    };
  }

  const manifest = await runProjectResearch({
    idea,
    reviewedPapers: evidenceForIdea(idea),
    outputDir: researchOutputDir,
    generatedAt: "2026-06-03T18:30:00.000Z"
  });
  const brief = JSON.parse(
    await readFile(join(researchOutputDir, "project_research_brief.json"), "utf8")
  );
  const prd = JSON.parse(await readFile(join(researchOutputDir, "project_prd.json"), "utf8"));
  const architecture = JSON.parse(
    await readFile(join(researchOutputDir, "project_architecture.json"), "utf8")
  );
  const architectureJudge = JSON.parse(
    await readFile(join(researchOutputDir, "project_architecture_judge.json"), "utf8")
  ) as { score: number; verdict: "pass" | "needs_review" | "fail" };
  const parsedArchitecture = ProjectArchitectureSchema.safeParse(architecture);
  const result = {
    id: testCase.id,
    domain: testCase.domain,
    discoveredIdeaTitle: idea.title,
    ideaArtifactCompleteness: await artifactCompleteness(
      ideaOutputDir,
      ideaRequiredFiles
    ),
    researchArtifactCompleteness: await artifactCompleteness(
      researchOutputDir,
      researchRequiredFiles
    ),
    ideaInputValid,
    briefSchemaValid: ProjectResearchBriefSchema.safeParse(brief).success,
    prdSchemaValid: ProjectPrdSchema.safeParse(prd).success,
    architectureSchemaValid: parsedArchitecture.success,
    readyForArchitecture: manifest.readyForArchitecture,
    architectureStatus: parsedArchitecture.success
      ? parsedArchitecture.data.status
      : "blocked",
    architectureJudgeScore: architectureJudge.score,
    architectureJudgeVerdict: architectureJudge.verdict
  };

  return {
    ...result,
    passed:
      result.ideaArtifactCompleteness === 1 &&
      result.researchArtifactCompleteness === 1 &&
      result.ideaInputValid &&
      result.briefSchemaValid &&
      result.prdSchemaValid &&
      result.architectureSchemaValid &&
      result.readyForArchitecture &&
      result.architectureStatus === "ready" &&
      result.architectureJudgeVerdict === "pass" &&
      result.architectureJudgeScore >= 90
  };
}

function renderMarkdownReport(input: {
  generatedAt: string;
  caseCount: number;
  passCount: number;
  averageIdeaArtifactCompleteness: number;
  averageResearchArtifactCompleteness: number;
  ideaInputValidCount: number;
  briefSchemaValidCount: number;
  prdSchemaValidCount: number;
  architectureSchemaValidCount: number;
  readyForArchitectureCount: number;
  results: CaseResult[];
}) {
  const lines = [
    "# Project Idea To Research Benchmark",
    "",
    `Generated at: ${input.generatedAt}`,
    `Cases: ${input.caseCount}`,
    `Pass count: ${input.passCount}/${input.caseCount}`,
    `Idea artifact completeness: ${pct(input.averageIdeaArtifactCompleteness)}`,
    `Research artifact completeness: ${pct(input.averageResearchArtifactCompleteness)}`,
    `Idea input valid: ${input.ideaInputValidCount}/${input.caseCount}`,
    `Brief schema valid: ${input.briefSchemaValidCount}/${input.caseCount}`,
    `PRD schema valid: ${input.prdSchemaValidCount}/${input.caseCount}`,
    `Architecture schema valid: ${input.architectureSchemaValidCount}/${input.caseCount}`,
    `Ready for architecture: ${input.readyForArchitectureCount}/${input.caseCount}`,
    "",
    "## Cases",
    ""
  ];

  for (const result of input.results) {
    lines.push(`### ${result.passed ? "PASS" : "FAIL"} ${result.id}`);
    lines.push("");
    lines.push(`- Domain: ${result.domain}`);
    lines.push(`- Discovered idea: ${result.discoveredIdeaTitle ?? "none"}`);
    lines.push(`- Idea artifacts: ${pct(result.ideaArtifactCompleteness)}`);
    lines.push(`- Research artifacts: ${pct(result.researchArtifactCompleteness)}`);
    lines.push(`- Brief schema valid: ${result.briefSchemaValid ? "yes" : "no"}`);
    lines.push(`- PRD schema valid: ${result.prdSchemaValid ? "yes" : "no"}`);
    lines.push(
      `- Architecture schema valid: ${
        result.architectureSchemaValid ? "yes" : "no"
      }`
    );
    lines.push(`- Ready for architecture: ${result.readyForArchitecture ? "yes" : "no"}`);
    lines.push(`- Architecture status: ${result.architectureStatus}`);
    lines.push(`- Architecture judge score: ${result.architectureJudgeScore}/100`);
    lines.push(`- Architecture judge verdict: ${result.architectureJudgeVerdict}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function main() {
  const cases: BenchmarkCase[] = [
    {
      id: "developer_tool_idea_to_architecture",
      domain: "AI developer tools",
      sourceRepos: [
        repo({
          repoId: "repo_code_review_agent",
          name: "ai-code-review-agent",
          description: "AI agent for code review and pull request comments.",
          topics: ["ai", "code-review", "developer-tools"],
          readmeText:
            "AI code review agent that reads repositories, reviews pull requests, and comments on code quality.",
          issueTitle: "Need better sprint planning for refactors",
          issueBody:
            "Review comments are useful, but we need prioritization and sprint-sized plans."
        })
      ]
    },
    {
      id: "data_agent_idea_to_architecture",
      domain: "AI data analysis agents",
      sourceRepos: [
        repo({
          repoId: "repo_data_agent",
          name: "ai-data-analysis-agent",
          description: "AI data analysis agent for CSV files and reports.",
          topics: ["ai", "data-analysis", "analytics"],
          readmeText:
            "Data analytics agent that profiles CSV files, generates dashboards, and writes reports.",
          issueTitle: "Need data quality investigation before charts",
          issueBody:
            "Charts are not useful when data has missing values, duplicates, or broken joins."
        })
      ]
    }
  ];
  const results = await Promise.all(cases.map(evaluateCase));
  const report = {
    generatedAt: new Date().toISOString(),
    caseCount: results.length,
    passCount: results.filter((result) => result.passed).length,
    averageIdeaArtifactCompleteness: average(
      results.map((result) => result.ideaArtifactCompleteness)
    ),
    averageResearchArtifactCompleteness: average(
      results.map((result) => result.researchArtifactCompleteness)
    ),
    ideaInputValidCount: results.filter((result) => result.ideaInputValid).length,
    briefSchemaValidCount: results.filter((result) => result.briefSchemaValid)
      .length,
    prdSchemaValidCount: results.filter((result) => result.prdSchemaValid)
      .length,
    architectureSchemaValidCount: results.filter(
      (result) => result.architectureSchemaValid
    ).length,
    readyForArchitectureCount: results.filter(
      (result) => result.readyForArchitecture
    ).length,
    results
  };

  await writeTextFile(jsonOutputPath, JSON.stringify(report, null, 2));
  await writeTextFile(markdownOutputPath, renderMarkdownReport(report));

  console.log(
    [
      "Project idea to research benchmark",
      `Cases: ${report.passCount}/${report.caseCount}`,
      `Idea artifacts: ${pct(report.averageIdeaArtifactCompleteness)}`,
      `Research artifacts: ${pct(report.averageResearchArtifactCompleteness)}`,
      `Ready for architecture: ${report.readyForArchitectureCount}/${report.caseCount}`,
      `JSON: ${jsonOutputPath}`,
      `Markdown: ${markdownOutputPath}`
    ].join("\n")
  );

  if (report.passCount !== report.caseCount) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
