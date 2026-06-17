import { describe, expect, it } from "vitest";
import {
  buildProjectResearchBrief,
  buildProjectResearchPlan,
  collectProjectEvidenceFromPapers
} from "@/lib/project-research";
import type {
  EvidenceBucket,
  ProjectIdeaInput
} from "@/lib/project-research/types";
import type { NormalizedPaper } from "@/lib/sources/types";

function paperForBucket(bucket: EvidenceBucket, index: number): NormalizedPaper {
  return {
    id: `collector_${bucket.id}_${index}`,
    title: `${bucket.label} ${bucket.keywords.join(" ")} evidence ${index}`,
    abstract: `${bucket.query}. ${bucket.targetQuestions.join(" ")}`,
    authors: ["Benchmark Author"],
    year: 2025,
    publishedAt: "2025-01-01",
    doi: `10.1000/${bucket.id}.${index}`,
    arxivId: null,
    semanticScholarId: `${bucket.id}-${index}`,
    openAlexId: null,
    sourceUrls: [`https://example.com/${bucket.id}/${index}`],
    pdfUrl: `https://example.com/${bucket.id}/${index}.pdf`,
    venue: "Collector Test Venue",
    citationCount: 42,
    influentialCitationCount: 7,
    source: "semantic_scholar",
    fullTextStatus: "parsed"
  };
}

function thinPaperForBucket(bucket: EvidenceBucket): NormalizedPaper {
  return {
    ...paperForBucket(bucket, 1),
    id: `collector_thin_${bucket.id}`,
    abstract: null,
    doi: null,
    arxivId: null,
    semanticScholarId: null,
    openAlexId: null,
    pdfUrl: null,
    fullTextStatus: "unavailable"
  };
}

const tradingIdea: ProjectIdeaInput = {
  title: "AI Trading Bot",
  description:
    "Bot tradingowy na gieldzie uzywajacy AI, backtestow i kontroli ryzyka.",
  constraints: ["najpierw paper trading"],
  preferredDomains: ["algorithmic trading"],
  outputLanguage: "pl"
};

function candidatePaper(input: {
  id: string;
  title: string;
  abstract: string;
  arxivId?: string | null;
  source?: NormalizedPaper["source"];
}): NormalizedPaper {
  return {
    id: input.id,
    title: input.title,
    abstract: input.abstract,
    authors: ["Benchmark Author"],
    year: 2026,
    publishedAt: "2026-01-01",
    doi: null,
    arxivId: input.arxivId ?? null,
    semanticScholarId: null,
    openAlexId: null,
    sourceUrls: [`https://example.com/${input.id}`],
    pdfUrl: `https://example.com/${input.id}.pdf`,
    venue: "Benchmark Venue",
    citationCount: 0,
    influentialCitationCount: 0,
    source: input.source ?? "arxiv",
    fullTextStatus: "parsed"
  };
}

describe("collectProjectEvidenceFromPapers", () => {
  it("maps normalized papers to reviewed papers with complete bucket coverage", () => {
    const { researchPlan } = buildProjectResearchPlan(tradingIdea);
    const papers = researchPlan.evidenceBuckets.flatMap((bucket) => [
      paperForBucket(bucket, 1),
      paperForBucket(bucket, 2)
    ]);

    const result = collectProjectEvidenceFromPapers({
      researchPlan,
      papers,
      maxPapersPerBucket: 2
    });

    expect(result.canBuildReadyBrief).toBe(true);
    expect(result.requiredReadyCount).toBe(result.requiredBucketCount);
    expect(result.missingRequiredBuckets).toEqual([]);
    expect(result.bucketMetrics.every((metric) => metric.coverageReady)).toBe(true);
    expect(result.reviewedPapers.length).toBeGreaterThanOrEqual(
      researchPlan.evidenceBuckets.length
    );

    const brief = buildProjectResearchBrief({
      idea: tradingIdea,
      reviewedPapers: result.reviewedPapers,
      generatedAt: "2026-06-03T14:00:00.000Z"
    });

    expect(brief.readyForArchitecture).toBe(true);
  });

  it("does not mark metadata-only papers as enough for ready coverage", () => {
    const { researchPlan } = buildProjectResearchPlan(tradingIdea);
    const papers = researchPlan.evidenceBuckets.map(thinPaperForBucket);

    const result = collectProjectEvidenceFromPapers({
      researchPlan,
      papers,
      maxPapersPerBucket: 2
    });

    expect(result.canBuildReadyBrief).toBe(false);
    expect(result.requiredReadyCount).toBe(0);
    expect(result.missingRequiredBuckets).toEqual(
      researchPlan.evidenceBuckets.map((bucket) => bucket.id)
    );
    expect(
      result.reviewedPapers.every((paper) => paper.usefulForProject === false)
    ).toBe(true);
  });

  it("keeps bucket IDs compatible with ProjectResearchBrief validation", () => {
    const { researchPlan } = buildProjectResearchPlan(tradingIdea);
    const papers = researchPlan.evidenceBuckets.flatMap((bucket) => [
      paperForBucket(bucket, 1),
      paperForBucket(bucket, 2)
    ]);

    const result = collectProjectEvidenceFromPapers({ researchPlan, papers });
    const planBucketIds = new Set(
      researchPlan.evidenceBuckets.map((bucket) => bucket.id)
    );

    expect(
      result.reviewedPapers.every((paper) =>
        paper.bucketIds.every((bucketId) => planBucketIds.has(bucketId))
      )
    ).toBe(true);
  });

  it("does not cover LLM context buckets with weak one-token topical overlap", () => {
    const { researchPlan } = buildProjectResearchPlan({
      title: "LLM Context Budget QA Monitor",
      description:
        "Monitor context compression, token budget tradeoffs, fact retention and agent task success.",
      constraints: ["MVP must be evidence-backed"],
      preferredDomains: ["LLM context engineering", "RAG evaluation", "agent reliability"],
      outputLanguage: "pl"
    });
    const contextBucket = researchPlan.evidenceBuckets.find(
      (bucket) => bucket.id === "context_compression_fidelity"
    );

    expect(contextBucket).toBeDefined();

    const result = collectProjectEvidenceFromPapers({
      researchPlan: {
        ...researchPlan,
        evidenceBuckets: [contextBucket!]
      },
      papers: [
        {
          id: "weak_context_overlap",
          title: "Visual Place Recognition in Robot Navigation",
          abstract:
            "This survey evaluates visual recognition methods in changing environmental context for robot localization.",
          authors: ["Mismatch Author"],
          year: 2024,
          publishedAt: "2024-01-01",
          doi: "10.1000/weak-context-overlap",
          arxivId: null,
          semanticScholarId: "weak-context-overlap",
          openAlexId: null,
          sourceUrls: ["https://example.com/weak-context-overlap"],
          pdfUrl: "https://example.com/weak-context-overlap.pdf",
          venue: "Robotics Survey",
          citationCount: 10,
          influentialCitationCount: 1,
          source: "semantic_scholar",
          fullTextStatus: "parsed"
        }
      ],
      maxPapersPerBucket: 2
    });

    expect(result.canBuildReadyBrief).toBe(false);
    expect(result.requiredReadyCount).toBe(0);
    expect(result.reviewedPapers).toHaveLength(0);
  });

  it("covers agent sandbox runtime readiness with runtime trust and execution gate papers", () => {
    const { researchPlan } = buildProjectResearchPlan({
      title: "Agent Sandbox Health Monitor",
      description:
        "Agent Sandbox Health Monitor helps AI agent platform teams solve a narrower adjacent workflow inspired by NemoClaw. Problem: Teams running AI agents inside sandboxes need to catch startup failures, network misconfiguration, capability drops, and unsafe policy drift before live runs.",
      constraints: ["MVP must be evidence-backed"],
      preferredDomains: ["AI agents", "sandbox reliability", "agent safety"],
      outputLanguage: "pl"
    });
    const sandboxBucket = researchPlan.evidenceBuckets.find(
      (bucket) => bucket.id === "sandbox_preflight_checks"
    );

    expect(sandboxBucket).toBeDefined();

    const result = collectProjectEvidenceFromPapers({
      researchPlan: {
        ...researchPlan,
        evidenceBuckets: [sandboxBucket!]
      },
      papers: [
        {
          id: "agenttrap",
          title: "AgentTrap: Measuring Runtime Trust Failures in Third-Party Agent Skills",
          abstract:
            "AgentTrap evaluates LLM agents in a sandboxed environment and measures malicious runtime behavior, blocked behavior, attack success and no-attack-evidence outcomes.",
          authors: ["Benchmark Author"],
          year: 2026,
          publishedAt: "2026-05-13",
          doi: null,
          arxivId: "2605.13940",
          semanticScholarId: null,
          openAlexId: null,
          sourceUrls: ["https://arxiv.org/abs/2605.13940"],
          pdfUrl: "https://arxiv.org/pdf/2605.13940",
          venue: "arXiv",
          citationCount: 0,
          influentialCitationCount: 0,
          source: "openalex",
          fullTextStatus: "parsed"
        },
        {
          id: "authority_frontier",
          title:
            "Insuring Every Action: An Authority Frontier Framework for Runtime Actuarial Control of Autonomous AI Agents",
          abstract:
            "The framework defines a deterministic runtime contract that gates execution of tool calls against safe defaults and reserve budgets for autonomous AI agents.",
          authors: ["Benchmark Author"],
          year: 2026,
          publishedAt: "2026-05-25",
          doi: null,
          arxivId: "2605.25632",
          semanticScholarId: null,
          openAlexId: null,
          sourceUrls: ["https://arxiv.org/abs/2605.25632"],
          pdfUrl: "https://arxiv.org/pdf/2605.25632",
          venue: "arXiv",
          citationCount: 0,
          influentialCitationCount: 0,
          source: "openalex",
          fullTextStatus: "parsed"
        }
      ],
      maxPapersPerBucket: 4
    });

    expect(result.canBuildReadyBrief).toBe(true);
    expect(result.bucketMetrics[0]).toMatchObject({
      bucketId: "sandbox_preflight_checks",
      coverageReady: true,
      usefulReviewedCount: 2,
      parsedCount: 2
    });
  });

  it("does not let medical diagnostics outrank real CLI observability evidence", () => {
    const { researchPlan } = buildProjectResearchPlan({
      title: "AI CLI Provider Compatibility Monitor",
      description:
        "Monitor compatibility, routing failures, provider capability drift and reproducible diagnostics for AI coding CLIs.",
      constraints: ["MVP must be evidence-backed"],
      preferredDomains: ["AI developer tools", "provider routing", "CLI reliability"],
      outputLanguage: "pl"
    });
    const cliBucket = researchPlan.evidenceBuckets.find(
      (bucket) => bucket.id === "cli_observability"
    );

    expect(cliBucket).toBeDefined();

    const result = collectProjectEvidenceFromPapers({
      researchPlan: {
        ...researchPlan,
        evidenceBuckets: [cliBucket!]
      },
      papers: [
        {
          id: "remote_patient_monitoring",
          title:
            "Mobile Health in Remote Patient Monitoring for Chronic Diseases: Principles, Trends, and Challenges",
          abstract:
            "Remote patient monitoring systems improve diagnosis speed and clinical disease reports.",
          authors: ["Mismatch Author"],
          year: 2021,
          publishedAt: "2021-03-29",
          doi: "10.3390/diagnostics11040607",
          arxivId: null,
          semanticScholarId: null,
          openAlexId: "W3151989229",
          sourceUrls: ["https://doi.org/10.3390/diagnostics11040607"],
          pdfUrl: "https://example.com/medical.pdf",
          venue: "Diagnostics",
          citationCount: 250,
          influentialCitationCount: 0,
          source: "openalex",
          fullTextStatus: "parsed"
        },
        {
          id: "cli_gym",
          title: "CLI-Gym: Scalable CLI Task Generation via Agentic Environment Inversion",
          abstract:
            "Agentic coding requires command line interfaces, executable programs, execution feedback, terminal tasks and reproducible environment histories.",
          authors: ["Benchmark Author"],
          year: 2026,
          publishedAt: "2026-05-01",
          doi: null,
          arxivId: "2605.00001",
          semanticScholarId: null,
          openAlexId: null,
          sourceUrls: ["https://arxiv.org/abs/2605.00001"],
          pdfUrl: "https://arxiv.org/pdf/2605.00001",
          venue: "arXiv cs.SE",
          citationCount: 0,
          influentialCitationCount: 0,
          source: "arxiv",
          fullTextStatus: "parsed"
        }
      ],
      maxPapersPerBucket: 4
    });

    expect(result.reviewedPapers.map((paper) => paper.paperId)).toContain("cli_gym");
    expect(result.reviewedPapers.map((paper) => paper.paperId)).not.toContain(
      "remote_patient_monitoring"
    );
  });

  it("rejects generic infrastructure monitoring when researching agent sandbox runtime observability", () => {
    const { researchPlan } = buildProjectResearchPlan({
      title: "Agent Sandbox Health Monitor",
      description:
        "Preflight and observe AI agent sandbox runtime failures, network misconfiguration and unsafe policy drift.",
      constraints: ["MVP must be evidence-backed"],
      preferredDomains: ["AI agents", "sandbox reliability", "agent safety"],
      outputLanguage: "pl"
    });
    const bucket = researchPlan.evidenceBuckets.find(
      (item) => item.id === "runtime_observability"
    );

    expect(bucket).toBeDefined();

    const result = collectProjectEvidenceFromPapers({
      researchPlan: { ...researchPlan, evidenceBuckets: [bucket!] },
      papers: [
        candidatePaper({
          id: "fog_cloud_monitoring",
          title: "A Survey on Intrusion Detection Systems for Fog and Cloud Computing",
          abstract:
            "Network configuration monitoring and failure diagnosis are used for cloud infrastructure security and anomaly detection."
        }),
        candidatePaper({
          id: "agent_container_runtime_logs",
          title: "Runtime Observability for Containerized AI Agents",
          abstract:
            "AI agent sandboxes need runtime observability, container logs, telemetry, network configuration checks and failure diagnosis for tool execution."
        })
      ]
    });

    const paperIds = result.reviewedPapers.map((paper) => paper.paperId);
    expect(paperIds).toContain("agent_container_runtime_logs");
    expect(paperIds).not.toContain("fog_cloud_monitoring");
  });

  it("rejects generic security papers when researching self-hosted AI controls", () => {
    const { researchPlan } = buildProjectResearchPlan({
      title: "Self-Hosted AI Workspace Policy Auditor",
      description:
        "Audit self-hosted AI workspace readiness, local data boundaries, secrets and deployment security.",
      constraints: ["MVP must be evidence-backed"],
      preferredDomains: ["self-hosted AI", "workspace governance", "security audit"],
      outputLanguage: "pl"
    });
    const bucket = researchPlan.evidenceBuckets.find(
      (item) => item.id === "self_hosted_security_controls"
    );

    expect(bucket).toBeDefined();

    const result = collectProjectEvidenceFromPapers({
      researchPlan: { ...researchPlan, evidenceBuckets: [bucket!] },
      papers: [
        candidatePaper({
          id: "transport_blockchain_security",
          title: "Blockchain Technology for Intelligent Transportation Systems",
          abstract:
            "This survey covers security controls, privacy, governance and risk management for transportation data sharing."
        }),
        candidatePaper({
          id: "self_hosted_workspace_secrets",
          title: "Security Controls for Self-Hosted AI Workspaces",
          abstract:
            "Self-hosted AI deployments require secrets management, local data controls, workspace policy boundaries and deployment audit checks."
        })
      ]
    });

    const paperIds = result.reviewedPapers.map((paper) => paper.paperId);
    expect(paperIds).toContain("self_hosted_workspace_secrets");
    expect(paperIds).not.toContain("transport_blockchain_security");
  });

  it("rejects non-document conversion papers when researching Markdown conversion quality", () => {
    const { researchPlan } = buildProjectResearchPlan({
      title: "Document Conversion QA for RAG",
      description:
        "Check PDF and Office document conversion to Markdown for table preservation and RAG ingestion quality.",
      constraints: ["MVP must be evidence-backed"],
      preferredDomains: ["document AI", "RAG ingestion", "conversion quality"],
      outputLanguage: "pl"
    });
    const bucket = researchPlan.evidenceBuckets.find(
      (item) => item.id === "document_structure_preservation"
    );

    expect(bucket).toBeDefined();

    const result = collectProjectEvidenceFromPapers({
      researchPlan: { ...researchPlan, evidenceBuckets: [bucket!] },
      papers: [
        candidatePaper({
          id: "chemical_conversion_tables",
          title: "Conversion Tables for Chemical Reaction Structure Preservation",
          abstract:
            "The method preserves table structure during chemical conversion and evaluates downstream accuracy."
        }),
        candidatePaper({
          id: "pdf_markdown_structure",
          title: "Document Conversion to Markdown with PDF Table Structure Preservation",
          abstract:
            "Document conversion pipelines for PDF and Office files need Markdown tables, section ordering and structure preservation for RAG ingestion."
        })
      ]
    });

    const paperIds = result.reviewedPapers.map((paper) => paper.paperId);
    expect(paperIds).toContain("pdf_markdown_structure");
    expect(paperIds).not.toContain("chemical_conversion_tables");
  });
});
