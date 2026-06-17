import {
  buildProjectResearchPlan,
  collectProjectEvidenceFromPapers
} from "@/lib/project-research";
import type {
  ProjectIdeaInput,
  ResearchPlan
} from "@/lib/project-research/types";
import type { NormalizedPaper } from "@/lib/sources/types";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type BenchmarkPaper = {
  id: string;
  title: string;
  abstract: string;
};

type BenchmarkCase = {
  id: string;
  idea: ProjectIdeaInput;
  bucketId: string;
  falsePositive: BenchmarkPaper;
  truePositive: BenchmarkPaper;
};

type CaseResult = {
  id: string;
  bucketId: string;
  title: string;
  falsePositiveId: string;
  truePositiveId: string;
  acceptedPaperIds: string[];
  falsePositiveRejected: boolean;
  truePositiveAccepted: boolean;
  passed: boolean;
};

const jsonOutputPath =
  process.env.PROJECT_BUCKET_RELEVANCE_BENCHMARK_JSON ??
  "benchmark-results/project-bucket-relevance-latest.json";
const markdownOutputPath =
  process.env.PROJECT_BUCKET_RELEVANCE_BENCHMARK_MARKDOWN ??
  "benchmark-results/project-bucket-relevance-latest.md";

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

function paper(input: BenchmarkPaper): NormalizedPaper {
  return {
    id: input.id,
    title: input.title,
    abstract: input.abstract,
    authors: ["Bucket Relevance Benchmark"],
    year: 2026,
    publishedAt: "2026-01-01",
    doi: null,
    arxivId: input.id.startsWith("arxiv_") ? input.id.replace("arxiv_", "") : null,
    semanticScholarId: null,
    openAlexId: null,
    sourceUrls: [`https://example.com/${input.id}`],
    pdfUrl: `https://example.com/${input.id}.pdf`,
    venue: "Bucket Relevance Benchmark Venue",
    citationCount: 0,
    influentialCitationCount: 0,
    source: "arxiv",
    fullTextStatus: "parsed"
  };
}

function narrowedPlan(plan: ResearchPlan, bucketId: string): ResearchPlan {
  const bucket = plan.evidenceBuckets.find((item) => item.id === bucketId);

  if (!bucket) {
    throw new Error(`Unknown bucket in benchmark case: ${bucketId}`);
  }

  return {
    ...plan,
    evidenceBuckets: [bucket]
  };
}

function evaluateCase(testCase: BenchmarkCase): CaseResult {
  const { researchPlan } = buildProjectResearchPlan(testCase.idea);
  const collection = collectProjectEvidenceFromPapers({
    researchPlan: narrowedPlan(researchPlan, testCase.bucketId),
    papers: [paper(testCase.falsePositive), paper(testCase.truePositive)],
    maxPapersPerBucket: 4
  });
  const acceptedPaperIds = collection.reviewedPapers.map((item) => item.paperId);
  const falsePositiveRejected = !acceptedPaperIds.includes(
    testCase.falsePositive.id
  );
  const truePositiveAccepted = acceptedPaperIds.includes(testCase.truePositive.id);

  return {
    id: testCase.id,
    bucketId: testCase.bucketId,
    title: testCase.idea.title,
    falsePositiveId: testCase.falsePositive.id,
    truePositiveId: testCase.truePositive.id,
    acceptedPaperIds,
    falsePositiveRejected,
    truePositiveAccepted,
    passed: falsePositiveRejected && truePositiveAccepted
  };
}

function bucketKeywords(idea: ProjectIdeaInput, bucketId: string) {
  const { researchPlan } = buildProjectResearchPlan(idea);
  const bucket = researchPlan.evidenceBuckets.find((item) => item.id === bucketId);

  if (!bucket) {
    throw new Error(`Unknown bucket fixture: ${bucketId}`);
  }

  return bucket.keywords.join(" ");
}

function truePositiveForBucket(input: {
  idea: ProjectIdeaInput;
  bucketId: string;
  id: string;
  title: string;
  domainText: string;
}) {
  return {
    id: input.id,
    title: input.title,
    abstract: `${input.domainText}. ${bucketKeywords(input.idea, input.bucketId)}.`
  };
}

function renderMarkdownReport(input: {
  generatedAt: string;
  caseCount: number;
  passCount: number;
  falsePositiveRejectRate: number;
  truePositiveAcceptRate: number;
  results: CaseResult[];
}) {
  const lines = [
    "# Project Bucket Relevance Benchmark",
    "",
    `Generated at: ${input.generatedAt}`,
    `Cases: ${input.caseCount}`,
    `Pass count: ${input.passCount}/${input.caseCount}`,
    `False-positive reject rate: ${pct(input.falsePositiveRejectRate)}`,
    `True-positive accept rate: ${pct(input.truePositiveAcceptRate)}`,
    "",
    "## Cases",
    ""
  ];

  for (const result of input.results) {
    lines.push(`### ${result.passed ? "PASS" : "FAIL"} ${result.id}`);
    lines.push("");
    lines.push(`- Title: ${result.title}`);
    lines.push(`- Bucket: ${result.bucketId}`);
    lines.push(`- False positive: ${result.falsePositiveId}`);
    lines.push(`- True positive: ${result.truePositiveId}`);
    lines.push(`- Accepted papers: ${result.acceptedPaperIds.join(", ") || "none"}`);
    lines.push(
      `- False positive rejected: ${result.falsePositiveRejected ? "yes" : "no"}`
    );
    lines.push(
      `- True positive accepted: ${result.truePositiveAccepted ? "yes" : "no"}`
    );
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const aiCliIdea: ProjectIdeaInput = {
    title: "AI CLI Provider Compatibility Monitor",
    description:
      "Monitor compatibility, routing failures, provider capability drift and reproducible diagnostics for AI coding CLIs.",
    constraints: ["MVP must be evidence-backed"],
    preferredDomains: ["AI developer tools", "provider routing", "CLI reliability"],
    outputLanguage: "pl"
  };
  const sandboxIdea: ProjectIdeaInput = {
    title: "Agent Sandbox Health Monitor",
    description:
      "Preflight and observe AI agent sandbox runtime failures, network misconfiguration and unsafe policy drift.",
    constraints: ["MVP must be evidence-backed"],
    preferredDomains: ["AI agents", "sandbox reliability", "agent safety"],
    outputLanguage: "pl"
  };
  const selfHostedIdea: ProjectIdeaInput = {
    title: "Self-Hosted AI Workspace Policy Auditor",
    description:
      "Audit self-hosted AI workspace readiness, local data boundaries, secrets and deployment security.",
    constraints: ["MVP must be evidence-backed"],
    preferredDomains: ["self-hosted AI", "workspace governance", "security audit"],
    outputLanguage: "pl"
  };
  const documentIdea: ProjectIdeaInput = {
    title: "Document Conversion QA for RAG",
    description:
      "Check PDF and Office document conversion to Markdown for table preservation and RAG ingestion quality.",
    constraints: ["MVP must be evidence-backed"],
    preferredDomains: ["document AI", "RAG ingestion", "conversion quality"],
    outputLanguage: "pl"
  };
  const llmContextIdea: ProjectIdeaInput = {
    title: "LLM Context Budget QA Monitor",
    description:
      "Monitor context compression, token budget tradeoffs, fact retention and agent task success.",
    constraints: ["MVP must be evidence-backed"],
    preferredDomains: ["LLM context engineering", "RAG evaluation", "agent reliability"],
    outputLanguage: "pl"
  };
  const tradingIdea: ProjectIdeaInput = {
    title: "AI Trading Bot",
    description:
      "Bot tradingowy na gieldzie uzywajacy AI, backtestow i kontroli ryzyka.",
    constraints: ["najpierw paper trading"],
    preferredDomains: ["algorithmic trading"],
    outputLanguage: "pl"
  };
  const legalIdea: ProjectIdeaInput = {
    title: "Contract Compliance Reviewer",
    description:
      "Legal AI system for contract analysis, compliance review, document review and grounded citations.",
    constraints: ["czlowiek zatwierdza decyzje"],
    preferredDomains: [],
    outputLanguage: "pl"
  };
  const healthcareIdea: ProjectIdeaInput = {
    title: "Medical RAG Assistant",
    description:
      "Clinical AI assistant for healthcare evidence retrieval, diagnostic support limits, safety validation and patient data governance.",
    constraints: ["human clinician review required"],
    preferredDomains: ["clinical AI", "healthcare safety", "medical validation"],
    outputLanguage: "pl"
  };
  const genericAiIdea: ProjectIdeaInput = {
    title: "Applied AI System Reliability Monitor",
    description:
      "Applied AI system design monitor for evaluation, data quality, operational reliability, risk and safety gates.",
    constraints: ["evidence-backed MVP"],
    preferredDomains: [],
    outputLanguage: "pl"
  };

  const cases: BenchmarkCase[] = [
    {
      id: "cli_observability_rejects_medical_diagnostics",
      idea: aiCliIdea,
      bucketId: "cli_observability",
      falsePositive: {
        id: "remote_patient_monitoring",
        title:
          "Mobile Health in Remote Patient Monitoring for Chronic Diseases: Principles, Trends, and Challenges",
        abstract:
          "Remote patient monitoring systems improve diagnosis speed and clinical disease reports."
      },
      truePositive: truePositiveForBucket({
        idea: aiCliIdea,
        bucketId: "cli_observability",
        id: "cli_gym",
        title: "CLI-Gym: Scalable CLI Task Generation via Agentic Environment Inversion",
        domainText:
          "Agentic coding requires command line interfaces, terminal tasks, execution feedback and reproducible environment histories"
      })
    },
    {
      id: "auth_proxy_rejects_generic_proxy_networking",
      idea: aiCliIdea,
      bucketId: "auth_proxy_failure_modes",
      falsePositive: {
        id: "video_proxy_servers",
        title: "Stochastic Model Based Proxy Servers Architecture for Video Streaming",
        abstract:
          "Proxy servers reduce client waiting time and route cached video requests across distributed regions."
      },
      truePositive: truePositiveForBucket({
        idea: aiCliIdea,
        bucketId: "auth_proxy_failure_modes",
        id: "coding_tool_api_errors",
        title: "Engineering Pitfalls in AI Coding Tools",
        domainText:
          "AI coding CLIs fail through API integration errors, configuration errors, terminal problems and command failures"
      })
    },
    {
      id: "sandbox_runtime_rejects_cloud_monitoring",
      idea: sandboxIdea,
      bucketId: "runtime_observability",
      falsePositive: {
        id: "fog_cloud_monitoring",
        title: "A Survey on Intrusion Detection Systems for Fog and Cloud Computing",
        abstract:
          "Network configuration monitoring and failure diagnosis are used for cloud infrastructure security."
      },
      truePositive: truePositiveForBucket({
        idea: sandboxIdea,
        bucketId: "runtime_observability",
        id: "agent_container_runtime_logs",
        title: "Runtime Observability for Containerized AI Agents",
        domainText:
          "AI agent sandboxes need runtime observability, container logs, telemetry and network configuration checks"
      })
    },
    {
      id: "self_hosted_rejects_generic_security",
      idea: selfHostedIdea,
      bucketId: "self_hosted_security_controls",
      falsePositive: {
        id: "transport_blockchain_security",
        title: "Blockchain Technology for Intelligent Transportation Systems",
        abstract:
          "This survey covers security controls, privacy, governance and risk management for transportation data sharing."
      },
      truePositive: truePositiveForBucket({
        idea: selfHostedIdea,
        bucketId: "self_hosted_security_controls",
        id: "self_hosted_workspace_secrets",
        title: "Security Controls for Self-Hosted AI Workspaces",
        domainText:
          "Self-hosted AI deployments require secrets management, local data controls and workspace policy boundaries"
      })
    },
    {
      id: "document_conversion_rejects_non_document_tables",
      idea: documentIdea,
      bucketId: "document_structure_preservation",
      falsePositive: {
        id: "chemical_conversion_tables",
        title: "Conversion Tables for Chemical Reaction Structure Preservation",
        abstract:
          "The method preserves table structure during chemical conversion and evaluates downstream accuracy."
      },
      truePositive: truePositiveForBucket({
        idea: documentIdea,
        bucketId: "document_structure_preservation",
        id: "pdf_markdown_structure",
        title: "Document Conversion to Markdown with PDF Table Structure Preservation",
        domainText:
          "Document conversion pipelines for PDF and Office files need Markdown tables and section ordering"
      })
    },
    {
      id: "llm_context_rejects_robot_context_overlap",
      idea: llmContextIdea,
      bucketId: "context_compression_fidelity",
      falsePositive: {
        id: "weak_context_overlap",
        title: "Visual Place Recognition in Robot Navigation",
        abstract:
          "This survey evaluates visual recognition methods in changing environmental context for robot localization."
      },
      truePositive: truePositiveForBucket({
        idea: llmContextIdea,
        bucketId: "context_compression_fidelity",
        id: "prompt_compression_fidelity",
        title: "Information Preservation in Prompt Compression for LLMs",
        domainText:
          "LLM context compression must preserve facts, faithfulness and information needed for downstream answers"
      })
    },
    {
      id: "trading_data_correctness_rejects_generic_data_leakage",
      idea: tradingIdea,
      bucketId: "data_correctness",
      falsePositive: {
        id: "wireless_sensor_data_leakage",
        title: "Data Leakage Detection in Wireless Sensor Networks",
        abstract:
          "The method studies data leakage, validation splits and embargo policies for private sensor telemetry."
      },
      truePositive: truePositiveForBucket({
        idea: tradingIdea,
        bucketId: "data_correctness",
        id: "financial_ml_leakage",
        title: "Financial Machine Learning Data Leakage and Purged Cross Validation",
        domainText:
          "Financial machine learning for market time series, trading returns, prices and assets needs leakage control"
      })
    },
    {
      id: "legal_retrieval_rejects_biomedical_citation_qa",
      idea: legalIdea,
      bucketId: "legal_retrieval",
      falsePositive: {
        id: "biomedical_citation_qa",
        title: "Citation Grounding for Biomedical Question Answering",
        abstract:
          "The system improves citation grounding, document question answering and evaluation for biomedical articles."
      },
      truePositive: truePositiveForBucket({
        idea: legalIdea,
        bucketId: "legal_retrieval",
        id: "legal_case_citation_retrieval",
        title: "Legal Information Retrieval with Grounded Case Law Citations",
        domainText:
          "Legal question answering over court cases, statutes and case law requires citation grounding"
      })
    },
    {
      id: "contract_analysis_rejects_software_contract_testing",
      idea: legalIdea,
      bucketId: "contract_analysis",
      falsePositive: {
        id: "microservice_contract_testing",
        title: "Contract Analysis and Validation for Microservice APIs",
        abstract:
          "API contract analysis extracts interface clauses and validates obligations between distributed services."
      },
      truePositive: truePositiveForBucket({
        idea: legalIdea,
        bucketId: "contract_analysis",
        id: "legal_clause_extraction",
        title: "Legal Contract Clause Extraction and Obligation Risk Classification",
        domainText:
          "Legal NLP for contract clauses extracts obligations, rights and risk categories from agreements"
      })
    },
    {
      id: "healthcare_privacy_rejects_smart_city_privacy",
      idea: healthcareIdea,
      bucketId: "privacy_compliance",
      falsePositive: {
        id: "smart_city_privacy_governance",
        title: "Privacy and Data Governance for Smart City Sensor Platforms",
        abstract:
          "The framework covers privacy, data governance, compliance and de-identification for municipal sensor data."
      },
      truePositive: truePositiveForBucket({
        idea: healthcareIdea,
        bucketId: "privacy_compliance",
        id: "patient_data_governance",
        title: "Healthcare AI Privacy and Patient Data Governance",
        domainText:
          "Healthcare AI systems require patient data de-identification, clinical privacy controls and medical data governance"
      })
    },
    {
      id: "generic_ai_risk_rejects_industrial_safety",
      idea: genericAiIdea,
      bucketId: "risk_safety",
      falsePositive: {
        id: "industrial_safety_governance",
        title: "Risk Safety and Human Oversight in Industrial Operations",
        abstract:
          "The safety governance framework analyzes failure modes, human oversight and risk controls for factories."
      },
      truePositive: truePositiveForBucket({
        idea: genericAiIdea,
        bucketId: "risk_safety",
        id: "ai_system_model_risk",
        title: "AI System Risk, Safety and Failure Mode Governance",
        domainText:
          "Artificial intelligence systems need model risk controls, safety evaluation and human oversight gates"
      })
    }
  ];

  const results = cases.map(evaluateCase);
  const passCount = results.filter((result) => result.passed).length;
  const falsePositiveRejectRate =
    results.filter((result) => result.falsePositiveRejected).length / results.length;
  const truePositiveAcceptRate =
    results.filter((result) => result.truePositiveAccepted).length / results.length;
  const report = {
    generatedAt: new Date().toISOString(),
    caseCount: results.length,
    passCount,
    falsePositiveRejectRate,
    truePositiveAcceptRate,
    results
  };

  await writeTextFile(jsonOutputPath, JSON.stringify(report, null, 2));
  await writeTextFile(markdownOutputPath, renderMarkdownReport(report));

  console.log(
    [
      "Project bucket relevance benchmark",
      `Cases: ${report.caseCount}`,
      `Pass: ${report.passCount}/${report.caseCount}`,
      `False-positive reject rate: ${pct(report.falsePositiveRejectRate)}`,
      `True-positive accept rate: ${pct(report.truePositiveAcceptRate)}`,
      `JSON: ${jsonOutputPath}`,
      `Markdown: ${markdownOutputPath}`
    ].join("\n")
  );

  if (
    report.passCount !== report.caseCount ||
    report.falsePositiveRejectRate < 1 ||
    report.truePositiveAcceptRate < 1
  ) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
