import {
  buildProjectResearchBrief,
  buildProjectResearchPlan,
  collectProjectEvidenceFromPapers,
  judgePaperRelevance
} from "@/lib/project-research";
import type {
  EvidenceBucket,
  ProjectIdeaInput,
  ReviewedPaper
} from "@/lib/project-research/types";
import type { NormalizedPaper } from "@/lib/sources/types";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type BenchmarkPaper = {
  id: string;
  title: string;
  text: string;
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
  title: string;
  bucketId: string;
  falsePositiveId: string;
  truePositiveId: string;
  falsePositiveDecision: string;
  truePositiveDecision: string;
  falsePositiveRejected: boolean;
  truePositiveKept: boolean;
  passed: boolean;
  falsePositiveRationale: string;
  truePositiveRationale: string;
};

type RealRunCase = {
  id: string;
  idea: ProjectIdeaInput;
  supportPapers: NormalizedPaper[];
  distractorPapers: NormalizedPaper[];
};

type RealRunResult = {
  id: string;
  title: string;
  requiredBucketCount: number;
  collectorReady: boolean;
  judgeReady: boolean;
  collectorRequiredCoverage: number;
  judgeRequiredCoverage: number;
  reviewedPaperCount: number;
  judgeUsefulPaperCount: number;
  reviewedSupportPaperCount: number;
  retainedUsefulSupportPaperCount: number;
  collectorAcceptedDistractorCount: number;
  judgeUsefulDistractorCount: number;
  supportRetentionRate: number;
  passed: boolean;
};

const jsonOutputPath =
  process.env.PROJECT_PAPER_RELEVANCE_JUDGE_BENCHMARK_JSON ??
  "benchmark-results/project-paper-relevance-judge-latest.json";
const markdownOutputPath =
  process.env.PROJECT_PAPER_RELEVANCE_JUDGE_BENCHMARK_MARKDOWN ??
  "benchmark-results/project-paper-relevance-judge-latest.md";

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

function reviewedPaper(input: {
  paper: BenchmarkPaper;
  bucketId: string;
}): ReviewedPaper {
  return {
    paperId: input.paper.id,
    title: input.paper.title,
    year: 2026,
    url: `https://example.com/${input.paper.id}`,
    doi: null,
    bucketIds: [input.bucketId],
    fullTextStatus: "parsed",
    usefulForProject: true,
    evidenceStrength: "full_text_partial",
    keyMethods: ["benchmark fixture"],
    limitations: ["synthetic paper relevance judge benchmark fixture"],
    implementationImplications: [
      "Only relevant if the paper matches the project domain, not just generic bucket wording."
    ],
    riskImplications: [
      "A false positive here can contaminate PRD, architecture and roadmap evidence."
    ]
  };
}

function normalizedPaper(input: {
  id: string;
  title: string;
  abstract: string;
  source?: NormalizedPaper["source"];
}): NormalizedPaper {
  return {
    id: input.id,
    title: input.title,
    abstract: input.abstract,
    authors: ["Paper Relevance Real Run Benchmark"],
    year: 2026,
    publishedAt: "2026-01-01",
    doi: null,
    arxivId: null,
    semanticScholarId: `paper-relevance-${input.id}`,
    openAlexId: null,
    sourceUrls: [`https://example.com/${input.id}`],
    pdfUrl: `https://example.com/${input.id}.pdf`,
    venue: "Paper Relevance Real Run Benchmark Venue",
    citationCount: 10,
    influentialCitationCount: 1,
    source: input.source ?? "semantic_scholar",
    fullTextStatus: "parsed"
  };
}

function supportPaperForBucket(bucket: EvidenceBucket, index: number) {
  return normalizedPaper({
    id: `support_${bucket.id}_${index}`,
    title: `${bucket.label} project-domain evidence ${index}`,
    abstract: [
      bucket.query,
      bucket.keywords.join(" "),
      bucket.targetQuestions.join(" ")
    ].join(". ")
  });
}

function supportPapersForIdea(idea: ProjectIdeaInput) {
  const { researchPlan } = buildProjectResearchPlan(idea);
  return researchPlan.evidenceBuckets.flatMap((bucket) => [
    supportPaperForBucket(bucket, 1),
    supportPaperForBucket(bucket, 2)
  ]);
}

function coverageRatio(input: {
  requiredCoveredCount: number;
  requiredBucketCount: number;
}) {
  return input.requiredBucketCount === 0
    ? 0
    : input.requiredCoveredCount / input.requiredBucketCount;
}

function textByPaperId(papers: NormalizedPaper[]) {
  return Object.fromEntries(
    papers.map((paper) => [
      paper.id,
      [paper.title, paper.abstract, paper.venue].filter(Boolean).join(" ")
    ])
  );
}

function evaluateCase(testCase: BenchmarkCase): CaseResult {
  const { researchPlan } = buildProjectResearchPlan(testCase.idea);
  const result = judgePaperRelevance({
    idea: testCase.idea,
    researchPlan,
    reviewedPapers: [
      reviewedPaper({
        paper: testCase.falsePositive,
        bucketId: testCase.bucketId
      }),
      reviewedPaper({
        paper: testCase.truePositive,
        bucketId: testCase.bucketId
      })
    ],
    paperTextsById: {
      [testCase.falsePositive.id]: testCase.falsePositive.text,
      [testCase.truePositive.id]: testCase.truePositive.text
    }
  });
  const falsePositiveJudgment = result.judgments.find(
    (judgment) => judgment.paperId === testCase.falsePositive.id
  );
  const truePositiveJudgment = result.judgments.find(
    (judgment) => judgment.paperId === testCase.truePositive.id
  );

  if (!falsePositiveJudgment || !truePositiveJudgment) {
    throw new Error(`Missing paper relevance judgment for case ${testCase.id}`);
  }

  const falsePositiveRejected = falsePositiveJudgment.decision === "reject";
  const truePositiveKept = truePositiveJudgment.decision === "keep";

  return {
    id: testCase.id,
    title: testCase.idea.title,
    bucketId: testCase.bucketId,
    falsePositiveId: testCase.falsePositive.id,
    truePositiveId: testCase.truePositive.id,
    falsePositiveDecision: falsePositiveJudgment.decision,
    truePositiveDecision: truePositiveJudgment.decision,
    falsePositiveRejected,
    truePositiveKept,
    passed: falsePositiveRejected && truePositiveKept,
    falsePositiveRationale: falsePositiveJudgment.rationale,
    truePositiveRationale: truePositiveJudgment.rationale
  };
}

function evaluateRealRunCase(testCase: RealRunCase): RealRunResult {
  const { researchPlan } = buildProjectResearchPlan(testCase.idea);
  const allPapers = [...testCase.supportPapers, ...testCase.distractorPapers];
  const supportPaperIds = new Set(testCase.supportPapers.map((paper) => paper.id));
  const distractorPaperIds = new Set(
    testCase.distractorPapers.map((paper) => paper.id)
  );
  const collection = collectProjectEvidenceFromPapers({
    researchPlan,
    papers: allPapers,
    maxPapersPerBucket: 4
  });
  const judge = judgePaperRelevance({
    idea: testCase.idea,
    researchPlan,
    reviewedPapers: collection.reviewedPapers,
    paperTextsById: textByPaperId(allPapers)
  });
  const collectorBrief = buildProjectResearchBrief({
    idea: testCase.idea,
    reviewedPapers: collection.reviewedPapers,
    generatedAt: "2026-06-04T19:00:00.000Z"
  });
  const judgeBrief = buildProjectResearchBrief({
    idea: testCase.idea,
    reviewedPapers: judge.filteredReviewedPapers,
    generatedAt: "2026-06-04T19:00:00.000Z"
  });
  const reviewedSupportPaperIds = new Set(
    collection.reviewedPapers
      .filter((paper) => supportPaperIds.has(paper.paperId))
      .map((paper) => paper.paperId)
  );
  const retainedUsefulSupportPaperCount = judge.filteredReviewedPapers.filter(
    (paper) => supportPaperIds.has(paper.paperId) && paper.usefulForProject
  ).length;
  const collectorAcceptedDistractorCount = collection.reviewedPapers.filter(
    (paper) => distractorPaperIds.has(paper.paperId) && paper.usefulForProject
  ).length;
  const judgeUsefulDistractorCount = judge.filteredReviewedPapers.filter(
    (paper) => distractorPaperIds.has(paper.paperId) && paper.usefulForProject
  ).length;
  const supportRetentionRate =
    reviewedSupportPaperIds.size === 0
      ? 0
      : retainedUsefulSupportPaperCount / reviewedSupportPaperIds.size;
  const collectorRequiredCoverage = coverageRatio(collectorBrief.evidenceCoverage);
  const judgeRequiredCoverage = coverageRatio(judgeBrief.evidenceCoverage);
  const passed =
    collectorBrief.readyForArchitecture &&
    judgeBrief.readyForArchitecture &&
    supportRetentionRate >= 1 &&
    judgeUsefulDistractorCount === 0 &&
    judgeRequiredCoverage >= collectorRequiredCoverage;

  return {
    id: testCase.id,
    title: testCase.idea.title,
    requiredBucketCount: collectorBrief.evidenceCoverage.requiredBucketCount,
    collectorReady: collectorBrief.readyForArchitecture,
    judgeReady: judgeBrief.readyForArchitecture,
    collectorRequiredCoverage,
    judgeRequiredCoverage,
    reviewedPaperCount: collection.reviewedPapers.length,
    judgeUsefulPaperCount: judge.filteredReviewedPapers.filter(
      (paper) => paper.usefulForProject
    ).length,
    reviewedSupportPaperCount: reviewedSupportPaperIds.size,
    retainedUsefulSupportPaperCount,
    collectorAcceptedDistractorCount,
    judgeUsefulDistractorCount,
    supportRetentionRate,
    passed
  };
}

function renderMarkdownReport(input: {
  generatedAt: string;
  caseCount: number;
  passCount: number;
  falsePositiveRejectRate: number;
  truePositiveAcceptRate: number;
  paperJudgeFalsePositiveRejectRate: number;
  paperJudgeTruePositiveKeepRate: number;
  results: CaseResult[];
  realRunCaseCount: number;
  realRunPassCount: number;
  realRunCoveragePreservationRate: number;
  realRunSupportRetentionRate: number;
  realRunDistractorLeakCount: number;
  realRunResults: RealRunResult[];
}) {
  const lines = [
    "# Project Paper Relevance Judge Benchmark",
    "",
    `Generated at: ${input.generatedAt}`,
    `Cases: ${input.caseCount}`,
    `Pass count: ${input.passCount}/${input.caseCount}`,
    `False-positive reject rate: ${pct(input.falsePositiveRejectRate)}`,
    `True-positive accept rate: ${pct(input.truePositiveAcceptRate)}`,
    `Paper judge false-positive reject rate: ${pct(input.paperJudgeFalsePositiveRejectRate)}`,
    `Paper judge true-positive keep rate: ${pct(input.paperJudgeTruePositiveKeepRate)}`,
    `Real-run pass count: ${input.realRunPassCount}/${input.realRunCaseCount}`,
    `Real-run coverage preservation rate: ${pct(input.realRunCoveragePreservationRate)}`,
    `Real-run support retention rate: ${pct(input.realRunSupportRetentionRate)}`,
    `Real-run distractor leak count: ${input.realRunDistractorLeakCount}`,
    "",
    "## Synthetic Assignment Cases",
    ""
  ];

  for (const result of input.results) {
    lines.push(`### ${result.passed ? "PASS" : "FAIL"} ${result.id}`);
    lines.push("");
    lines.push(`- Title: ${result.title}`);
    lines.push(`- Bucket: ${result.bucketId}`);
    lines.push(`- False positive: ${result.falsePositiveId}`);
    lines.push(`- False positive decision: ${result.falsePositiveDecision}`);
    lines.push(`- False positive rationale: ${result.falsePositiveRationale}`);
    lines.push(`- True positive: ${result.truePositiveId}`);
    lines.push(`- True positive decision: ${result.truePositiveDecision}`);
    lines.push(`- True positive rationale: ${result.truePositiveRationale}`);
    lines.push("");
  }

  lines.push("## Real-Run Collector To Judge Cases");
  lines.push("");

  for (const result of input.realRunResults) {
    lines.push(`### ${result.passed ? "PASS" : "FAIL"} ${result.id}`);
    lines.push("");
    lines.push(`- Title: ${result.title}`);
    lines.push(`- Required buckets: ${result.requiredBucketCount}`);
    lines.push(`- Collector ready: ${result.collectorReady ? "yes" : "no"}`);
    lines.push(`- Judge ready: ${result.judgeReady ? "yes" : "no"}`);
    lines.push(`- Collector coverage: ${pct(result.collectorRequiredCoverage)}`);
    lines.push(`- Judge coverage: ${pct(result.judgeRequiredCoverage)}`);
    lines.push(`- Reviewed papers: ${result.reviewedPaperCount}`);
    lines.push(`- Judge useful papers: ${result.judgeUsefulPaperCount}`);
    lines.push(
      `- Support retained: ${result.retainedUsefulSupportPaperCount}/${result.reviewedSupportPaperCount}`
    );
    lines.push(
      `- Collector accepted distractors: ${result.collectorAcceptedDistractorCount}`
    );
    lines.push(`- Judge useful distractors: ${result.judgeUsefulDistractorCount}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
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
      id: "legal_retrieval_rejects_biomedical_citation_qa",
      idea: legalIdea,
      bucketId: "legal_retrieval",
      falsePositive: {
        id: "biomedical_citation_qa",
        title: "Citation Grounding for Biomedical Question Answering",
        text:
          "Citation grounding document question answering evaluation for biomedical articles and scientific evidence retrieval."
      },
      truePositive: {
        id: "legal_case_citation_retrieval",
        title: "Legal Information Retrieval with Grounded Case Law Citations",
        text:
          "Legal information retrieval over court cases, statutes and case law needs citation grounding, question answering and evaluation."
      }
    },
    {
      id: "contract_analysis_rejects_software_contract_testing",
      idea: legalIdea,
      bucketId: "contract_analysis",
      falsePositive: {
        id: "microservice_contract_testing",
        title: "Contract Analysis and Validation for Microservice APIs",
        text:
          "API contract analysis extracts interface clauses, validates obligations and classifies risk across distributed services."
      },
      truePositive: {
        id: "legal_clause_extraction",
        title: "Legal Contract Clause Extraction and Obligation Risk Classification",
        text:
          "Legal NLP for contract analysis extracts clauses, obligations and risk classification signals from agreements under law."
      }
    },
    {
      id: "healthcare_privacy_rejects_smart_city_privacy",
      idea: healthcareIdea,
      bucketId: "privacy_compliance",
      falsePositive: {
        id: "smart_city_privacy_governance",
        title: "Privacy and Data Governance for Smart City Sensor Platforms",
        text:
          "Privacy, data governance, compliance and de-identification controls for municipal sensor data platforms."
      },
      truePositive: {
        id: "patient_data_governance",
        title: "Healthcare AI Privacy and Patient Data Governance",
        text:
          "Healthcare AI systems require patient data governance, clinical privacy, medical de-identification and compliance controls."
      }
    },
    {
      id: "trading_data_correctness_rejects_sensor_data_leakage",
      idea: tradingIdea,
      bucketId: "data_correctness",
      falsePositive: {
        id: "wireless_sensor_data_leakage",
        title: "Data Leakage Detection in Wireless Sensor Networks",
        text:
          "Data leakage, validation splits, embargo policies and pipeline evaluation for private wireless sensor telemetry."
      },
      truePositive: {
        id: "financial_ml_leakage",
        title: "Financial Machine Learning Data Leakage and Purged Cross Validation",
        text:
          "Financial machine learning for market time series, trading returns, prices and assets needs purged cross validation, embargo and leakage control."
      }
    },
    {
      id: "generic_ai_risk_rejects_industrial_safety",
      idea: genericAiIdea,
      bucketId: "risk_safety",
      falsePositive: {
        id: "industrial_safety_governance",
        title: "Risk Safety and Human Oversight in Industrial Operations",
        text:
          "Risk, safety, failure modes, governance and human oversight for factory operations and industrial control."
      },
      truePositive: {
        id: "ai_system_model_risk",
        title: "AI System Risk, Safety and Failure Mode Governance",
        text:
          "Artificial intelligence systems and machine learning models need model risk controls, safety evaluation, failure modes and human oversight."
      }
    }
  ];
  const realRunCases: RealRunCase[] = [
    {
      id: "trading_real_run_preserves_support_and_rejects_ad_market_distractor",
      idea: tradingIdea,
      supportPapers: supportPapersForIdea(tradingIdea),
      distractorPapers: [
        normalizedPaper({
          id: "distractor_ad_market_impact",
          title:
            "Market Impact and Transaction Costs in Digital Advertising Order Allocation",
          abstract:
            "Market impact transaction costs slippage order execution evaluation for advertising auctions and retail inventory allocation."
        })
      ]
    },
    {
      id: "legal_real_run_preserves_support_and_rejects_software_contract_distractor",
      idea: legalIdea,
      supportPapers: supportPapersForIdea(legalIdea),
      distractorPapers: [
        normalizedPaper({
          id: "distractor_microservice_contract_testing",
          title: "Contract Analysis and Validation for Microservice APIs",
          abstract:
            "API contract analysis clause extraction obligation validation risk classification and evaluation for distributed software services."
        })
      ]
    },
    {
      id: "healthcare_real_run_preserves_support_and_rejects_smart_city_privacy_distractor",
      idea: healthcareIdea,
      supportPapers: supportPapersForIdea(healthcareIdea),
      distractorPapers: [
        normalizedPaper({
          id: "distractor_smart_city_privacy",
          title: "Privacy and Data Governance for Smart City Sensor Platforms",
          abstract:
            "Privacy data governance compliance de-identification workflow integration and usability evaluation for municipal sensor platforms."
        })
      ]
    }
  ];
  const results = cases.map(evaluateCase);
  const realRunResults = realRunCases.map(evaluateRealRunCase);
  const passCount = results.filter((result) => result.passed).length;
  const realRunPassCount = realRunResults.filter((result) => result.passed).length;
  const falsePositiveRejectRate =
    results.filter((result) => result.falsePositiveRejected).length / results.length;
  const truePositiveAcceptRate =
    results.filter((result) => result.truePositiveKept).length / results.length;
  const realRunCoveragePreservationRate =
    realRunResults.filter(
      (result) => result.judgeRequiredCoverage >= result.collectorRequiredCoverage
    ).length / realRunResults.length;
  const realRunSupportRetentionRate =
    realRunResults.reduce((sum, result) => sum + result.supportRetentionRate, 0) /
    realRunResults.length;
  const realRunDistractorLeakCount = realRunResults.reduce(
    (sum, result) => sum + result.judgeUsefulDistractorCount,
    0
  );
  const report = {
    generatedAt: new Date().toISOString(),
    caseCount: results.length + realRunResults.length,
    passCount: passCount + realRunPassCount,
    syntheticCaseCount: results.length,
    syntheticPassCount: passCount,
    falsePositiveRejectRate,
    truePositiveAcceptRate,
    paperJudgeFalsePositiveRejectRate: falsePositiveRejectRate,
    paperJudgeTruePositiveKeepRate: truePositiveAcceptRate,
    realRunCaseCount: realRunResults.length,
    realRunPassCount,
    realRunCoveragePreservationRate,
    realRunSupportRetentionRate,
    realRunDistractorLeakCount,
    results,
    realRunResults
  };

  await writeTextFile(jsonOutputPath, JSON.stringify(report, null, 2));
  await writeTextFile(markdownOutputPath, renderMarkdownReport(report));

  console.log(
    [
      "Project paper relevance judge benchmark",
      `Cases: ${report.caseCount}`,
      `Pass: ${report.passCount}/${report.caseCount}`,
      `False-positive reject rate: ${pct(report.falsePositiveRejectRate)}`,
      `True-positive accept rate: ${pct(report.truePositiveAcceptRate)}`,
      `Real-run pass: ${report.realRunPassCount}/${report.realRunCaseCount}`,
      `Real-run coverage preservation: ${pct(report.realRunCoveragePreservationRate)}`,
      `Real-run support retention: ${pct(report.realRunSupportRetentionRate)}`,
      `Real-run distractor leaks: ${report.realRunDistractorLeakCount}`,
      `JSON: ${jsonOutputPath}`,
      `Markdown: ${markdownOutputPath}`
    ].join("\n")
  );

  if (
    report.passCount !== report.caseCount ||
    report.falsePositiveRejectRate < 1 ||
    report.truePositiveAcceptRate < 1 ||
    report.realRunPassCount !== report.realRunCaseCount ||
    report.realRunCoveragePreservationRate < 1 ||
    report.realRunSupportRetentionRate < 1 ||
    report.realRunDistractorLeakCount > 0
  ) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
