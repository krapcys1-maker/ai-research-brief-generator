import { buildProjectResearchPlan, runProjectResearch } from "@/lib/project-research";
import type { ProjectIdeaInput, ReviewedPaper } from "@/lib/project-research";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const DEFAULT_OUTPUT_DIR = join(
  "D:",
  "projekty moje",
  "pipline pomysl plus archiotektura",
  "testy",
  "repo_mri_architektura_plan_2026-06-04",
  "01_system_output"
);

const repoMriIdea: ProjectIdeaInput = {
  title: "Repo MRI",
  description:
    "Developer tool that turns a repository into an explainable code map with files, symbols, imports, calls, tests and a Bug Path mode from issue or stacktrace to likely files, symbols, tests and hypotheses.",
  constraints: [
    "do not build a generic chat with repo",
    "deterministic index and code knowledge graph before LLM summaries",
    "MVP must show evidence, line ranges, confidence and unknowns",
    "Cursor-ready output must include architecture, roadmap, risk register, evaluation plan, API contract, ADRs, Cursor rules and plans"
  ],
  preferredDomains: ["software engineering", "static analysis", "code intelligence"],
  outputLanguage: "pl"
};

const paperCatalog = [
  {
    id: "repograph",
    title: "RepoGraph: Enhancing AI Software Engineering with Repository-level Code Graph",
    methods: ["repository-level code graph", "repository navigation", "SWE-bench", "CrossCodeEval"]
  },
  {
    id: "codesearchnet",
    title: "CodeSearchNet Challenge: Evaluating the State of Semantic Code Search",
    methods: ["semantic code search", "natural language queries", "code vocabulary"]
  },
  {
    id: "graphcodebert",
    title: "GraphCodeBERT: Pre-training Code Representations with Data Flow",
    methods: ["data flow", "code structure", "code search", "clone detection"]
  },
  {
    id: "swebench",
    title: "SWE-bench: Can Language Models Resolve Real-World GitHub Issues?",
    methods: ["real GitHub issues", "multi-file repair", "tests"]
  },
  {
    id: "agentless",
    title: "Agentless: Demystifying LLM-based Software Engineering Agents",
    methods: ["localization before repair", "structured workflow", "reduced agent complexity"]
  },
  {
    id: "crosscodeeval",
    title: "CrossCodeEval: A Diverse Benchmark for Cross-File Code Completion",
    methods: ["cross-file context", "repository dependencies", "multi-language code"]
  },
  {
    id: "rag",
    title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
    methods: ["retrieval", "provenance", "external memory"]
  },
  {
    id: "lost_middle",
    title: "Lost in the Middle: How Language Models Use Long Contexts",
    methods: ["long-context failure", "retrieval ranking", "evidence selection"]
  },
  {
    id: "tree_sitter",
    title: "Tree-sitter and LSP/SCIP indexing practice",
    methods: ["incremental parsing", "language server protocol", "precise references"]
  },
  {
    id: "cpg",
    title: "Code Property Graphs for vulnerability discovery",
    methods: ["AST", "control flow", "dependence graph", "unified code representation"]
  }
] as const;

function parseOutputDir(argv: string[]) {
  const outIndex = argv.indexOf("--out");
  return resolve(outIndex >= 0 ? argv[outIndex + 1] : DEFAULT_OUTPUT_DIR);
}

function reviewedPapersForRepoMri(): ReviewedPaper[] {
  const { researchPlan } = buildProjectResearchPlan(repoMriIdea);

  return researchPlan.evidenceBuckets.flatMap((bucket, bucketIndex) =>
    [0, 1].map((offset) => {
      const paper = paperCatalog[(bucketIndex * 2 + offset) % paperCatalog.length];
      return {
        paperId: `${paper.id}_${bucket.id}`,
        title: paper.title,
        year: offset === 0 ? 2025 : 2024,
        url: `https://example.com/research/${paper.id}`,
        doi: null,
        bucketIds: [bucket.id],
        fullTextStatus: "parsed",
        usefulForProject: true,
        evidenceStrength: "full_text_partial",
        keyMethods: [...paper.methods],
        limitations: [
          "fixture evidence for architecture-and-plan test; live full-text validation still required before final product claims"
        ],
        implementationImplications: [
          `Use ${bucket.label} evidence to design Repo MRI around deterministic code indexing, graph-backed retrieval, Bug Path localization and source-cited outputs.`
        ],
        riskImplications: [
          `Weak ${bucket.id} evidence can make Repo MRI look like a generic chat-with-repo instead of evidence-first code intelligence.`
        ]
      } satisfies ReviewedPaper;
    })
  );
}

async function main() {
  const outputDir = parseOutputDir(process.argv.slice(2));
  await mkdir(outputDir, { recursive: true });
  await writeFile(
    join(outputDir, "..", "00_forced_repo_mri_input.json"),
    `${JSON.stringify(
      {
        idea: repoMriIdea,
        reviewedPapers: reviewedPapersForRepoMri(),
        generatedAt: "2026-06-04T08:00:00.000Z"
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  const manifest = await runProjectResearch({
    idea: repoMriIdea,
    reviewedPapers: reviewedPapersForRepoMri(),
    generatedAt: "2026-06-04T08:00:00.000Z",
    outputDir
  });

  console.log(
    JSON.stringify(
      {
        outputDir,
        title: manifest.title,
        architectureJudgeScore: manifest.architectureJudgeScore,
        architectureJudgeVerdict: manifest.architectureJudgeVerdict,
        coverage: `${manifest.requiredCoveredCount}/${manifest.requiredBucketCount}`,
        projectPack: manifest.files.projectPackReadinessMarkdown
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
