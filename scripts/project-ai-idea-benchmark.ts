import {
  evaluateAiIdeaBenchmarkCase,
  summarizeAiIdeaBenchmark
} from "@/lib/project-ideas";
import type { AiIdeaBenchmarkCase } from "@/lib/project-ideas";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const jsonOutputPath =
  process.env.PROJECT_AI_IDEA_BENCHMARK_JSON ??
  "benchmark-results/project-ai-idea-latest.json";
const markdownOutputPath =
  process.env.PROJECT_AI_IDEA_BENCHMARK_MARKDOWN ??
  "benchmark-results/project-ai-idea-latest.md";

async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

function renderMarkdownReport(input: ReturnType<typeof summarizeAiIdeaBenchmark>) {
  const lines = [
    "# Project AI Idea Benchmark",
    "",
    `Cases: ${input.caseCount}`,
    `Pass count: ${input.passCount}/${input.caseCount}`,
    `Raw rejects: ${input.rawRejectCount}`,
    `Guarded usable: ${input.guardedUsableCount}`,
    `Guarded strong: ${input.guardedStrongCount}`,
    `Clone candidates rejected: ${input.cloneCandidateRejectedCount}`,
    `Average raw score: ${input.averageRawScore}`,
    `Average guarded score: ${input.averageGuardedScore}`,
    "",
    "## Cases",
    ""
  ];

  for (const result of input.results) {
    lines.push(`### ${result.passed ? "PASS" : "FAIL"} ${result.id}`);
    lines.push("");
    lines.push(`- Raw rejects: ${result.rawRejectCount}`);
    lines.push(`- Guarded usable: ${result.guardedUsableCount}`);
    lines.push(`- Guarded strong: ${result.guardedStrongCount}`);
    lines.push(`- Clone candidates rejected: ${result.cloneCandidateRejectedCount}`);
    lines.push(`- Average raw score: ${result.averageRawScore}`);
    lines.push(`- Average guarded score: ${result.averageGuardedScore}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

const cases: AiIdeaBenchmarkCase[] = [
  {
    id: "document_conversion_guardrails",
    rawCandidates: [
      {
        title: "Universal Markdown Converter Pro",
        sourceRepos: ["microsoft/markitdown"],
        problem:
          "Teams need another converter that supports more file types and replaces the source repository in production.",
        mvpScope: [
          "fork MarkItDown and add more file converters",
          "add web dashboard for conversion jobs",
          "add team edition for bulk uploads"
        ],
        differentiation: [
          "another converter with more formats",
          "team edition of the source conversion workflow"
        ],
        evidenceSignals: [
          "MarkItDown converts files to Markdown",
          "README lists PDF Office and CSV conversion"
        ],
        cloneRisk: "high",
        estimatedMvpWeeks: 7,
        scoreOutOf10: 8,
        rejectionReasons: []
      }
    ],
    guardedCandidates: [
      {
        title: "Document Conversion Regression Lab for RAG",
        sourceRepos: ["microsoft/markitdown"],
        problem:
          "Document conversion bugs silently poison RAG with broken tables, lost citations and malformed structure.",
        mvpScope: [
          "build fixture library for PDF CSV and Office edge cases",
          "diff source documents against converted Markdown structure",
          "score retrieval and grounding impact"
        ],
        differentiation: [
          "tests conversion quality instead of doing conversion",
          "turns issue patterns into regression fixtures"
        ],
        evidenceSignals: [
          "MarkItDown converts PDF CSV and Office files to Markdown",
          "CsvConverter issue reports broken Markdown tables"
        ],
        cloneRisk: "low",
        estimatedMvpWeeks: 3,
        scoreOutOf10: 9,
        rejectionReasons: []
      }
    ]
  },
  {
    id: "context_compression_guardrails",
    rawCandidates: [
      {
        title: "Headroom Compressor Cloud",
        sourceRepos: ["chopratejas/headroom"],
        problem:
          "Teams need another compressor service that wraps the source compression workflow in a hosted product.",
        mvpScope: [
          "build another compressor endpoint",
          "add hosted API keys and billing",
          "copy the same token reduction workflow"
        ],
        differentiation: [
          "another compressor with cloud hosting",
          "same workflow packaged as a service"
        ],
        evidenceSignals: [
          "Headroom compresses context windows",
          "README claims fewer tokens with same answers"
        ],
        cloneRisk: "high",
        estimatedMvpWeeks: 6,
        scoreOutOf10: 8,
        rejectionReasons: []
      }
    ],
    guardedCandidates: [
      {
        title: "Headroom Fidelity Auditor",
        sourceRepos: ["chopratejas/headroom"],
        problem:
          "Teams compress LLM context to save tokens but cannot prove that facts, code intent and retrieval evidence survived compression.",
        mvpScope: [
          "compare original and compressed context examples",
          "score fact retention and downstream answer quality",
          "produce safe threshold reports for compression settings"
        ],
        differentiation: [
          "audits fidelity instead of compressing context",
          "links token savings to evidence loss and task risk"
        ],
        evidenceSignals: [
          "Headroom claims fewer tokens with same answers",
          "Issues mention unpredictable code-aware compression failures"
        ],
        cloneRisk: "low",
        estimatedMvpWeeks: 3,
        scoreOutOf10: 8,
        rejectionReasons: []
      }
    ]
  },
  {
    id: "workspace_guardrails",
    rawCandidates: [
      {
        title: "Team Odysseus Workspace",
        sourceRepos: ["pewdiepie-archdaemon/odysseus"],
        problem:
          "Teams need a collaborative workspace fork of the source repository with more multi-user features.",
        mvpScope: [
          "fork Odysseus and add multi-user authentication",
          "add shared agent sessions",
          "add collaborative document editing"
        ],
        differentiation: [
          "team edition of the source workspace",
          "collaborative workspace clone for enterprise users"
        ],
        evidenceSignals: [
          "Odysseus is a self-hosted AI workspace",
          "README lists chat agents documents and tools"
        ],
        cloneRisk: "high",
        estimatedMvpWeeks: 8,
        scoreOutOf10: 9,
        rejectionReasons: []
      }
    ],
    guardedCandidates: [
      {
        title: "Self-Hosted AI Deployment Risk Auditor",
        sourceRepos: ["pewdiepie-archdaemon/odysseus"],
        problem:
          "Self-hosted AI workspace operators need to verify secrets, network exposure, approval policy and local data risks before rollout.",
        mvpScope: [
          "ingest deployment settings and README evidence",
          "audit secrets auth network exposure and approval policy",
          "produce rollout readiness and remediation reports"
        ],
        differentiation: [
          "audits deployment risk instead of building another workspace",
          "focuses on policy readiness and governance gates"
        ],
        evidenceSignals: [
          "Odysseus runs a self-hosted AI workspace",
          "README lists agents local data memory tools and deployment controls"
        ],
        cloneRisk: "low",
        estimatedMvpWeeks: 3,
        scoreOutOf10: 9,
        rejectionReasons: []
      }
    ]
  }
];

async function main() {
  const results = cases.map(evaluateAiIdeaBenchmarkCase);
  const report = summarizeAiIdeaBenchmark(results);

  await writeTextFile(jsonOutputPath, JSON.stringify(report, null, 2));
  await writeTextFile(markdownOutputPath, renderMarkdownReport(report));

  console.log(
    [
      "Project AI idea benchmark",
      `Cases: ${report.passCount}/${report.caseCount}`,
      `Raw rejects: ${report.rawRejectCount}`,
      `Guarded usable: ${report.guardedUsableCount}`,
      `Clone candidates rejected: ${report.cloneCandidateRejectedCount}`,
      `Average raw score: ${report.averageRawScore}`,
      `Average guarded score: ${report.averageGuardedScore}`,
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
