import { describe, expect, it } from "vitest";
import {
  validateBriefGrounding,
  validateClaimGrounding
} from "@/lib/pipeline/validateGrounding";
import { createBrief, createPaper } from "./fixtures";

describe("validateBriefGrounding", () => {
  it("accepts briefs that cite selected papers", () => {
    expect(() =>
      validateBriefGrounding(createBrief(), [createPaper()])
    ).not.toThrow();
  });

  it("rejects unknown paper IDs in key findings", () => {
    const brief = createBrief({
      keyFindings: [
        {
          finding: "Unsupported",
          explanation: "This cites an unknown paper.",
          confidence: "low",
          sourcePaperIds: ["missing"],
          caveats: []
        }
      ]
    });

    expect(() => validateBriefGrounding(brief, [createPaper()])).toThrow(
      "unknown paperId"
    );
  });

  it("rejects empty sourcePaperIds", () => {
    const brief = createBrief({
      researchGaps: [
        {
          gap: "No grounding",
          whyItMatters: "Every gap must cite papers.",
          sourcePaperIds: []
        }
      ]
    });

    expect(() => validateBriefGrounding(brief, [createPaper()])).toThrow(
      "has no sourcePaperIds"
    );
  });

  it("rejects claims without evidence snippets", () => {
    const brief = createBrief({
      keyFindings: [
        {
          finding: "No evidence",
          explanation: "This cites a paper but does not show evidence.",
          confidence: "medium",
          sourcePaperIds: ["paper_1"],
          evidence: [],
          caveats: []
        }
      ]
    });

    expect(() => validateBriefGrounding(brief, [createPaper()])).toThrow(
      "has no evidence snippets"
    );
  });

  it("rejects evidence text that is not supported by selected paper metadata", () => {
    const brief = createBrief({
      majorThemes: [
        {
          theme: "Unsupported evidence",
          description: "The source ID exists but the snippet is unrelated.",
          sourcePaperIds: ["paper_1"],
          evidence: [
            {
              paperId: "paper_1",
              evidenceText: "quantum banana market volatility",
              supportLevel: "direct"
            }
          ]
        }
      ]
    });

    expect(() => validateBriefGrounding(brief, [createPaper()])).toThrow(
      "evidence is not supported"
    );
  });

  it("rejects weak key-finding evidence unless confidence or caveats reflect uncertainty", () => {
    const brief = createBrief({
      keyFindings: [
        {
          finding: "Retrieval grounding has weak clinical evidence.",
          explanation: "Weak retrieval evidence must be marked carefully.",
          confidence: "medium",
          sourcePaperIds: ["paper_1"],
          evidence: [
            {
              paperId: "paper_1",
              evidenceText:
                "retrieval grounded generation supports clinical evaluation and reliability",
              supportLevel: "weak"
            }
          ],
          caveats: []
        }
      ]
    });

    expect(() => validateBriefGrounding(brief, [createPaper()])).toThrow(
      "weak evidence"
    );
  });

  it("rejects bibliography DOI values that do not match selected paper metadata", () => {
    const brief = createBrief({
      bibliography: [
        {
          paperId: "paper_1",
          title: "Retrieval-Augmented Generation for Medical Diagnosis",
          authors: ["Ada Researcher"],
          year: 2024,
          url: "https://example.org/paper",
          doi: "10.9999/invented"
        }
      ]
    });

    expect(() => validateBriefGrounding(brief, [createPaper()])).toThrow(
      "bibliography DOI mismatch"
    );
  });

  it("allows quantitative technical details when cited paper metadata supports them", () => {
    const paper = createPaper({
      title:
        "Fault Detection in 5G Networks using Bi-level Federated Graph Neural Networks",
      abstract:
        "5G and Beyond Networks become increasingly complex and heterogeneous."
    });

    expect(() =>
      validateClaimGrounding({
        section: "executiveSummary",
        claimText:
          "Federated graph neural networks can be discussed in the context of 5G network fault detection.",
        sourcePaperIds: [paper.id],
        evidence: [
          {
            paperId: paper.id,
            evidenceText:
              "Bi-level Federated Graph Neural Networks for network fault detection",
            supportLevel: "direct"
          }
        ],
        papers: [paper],
        additionalSupportText: `${paper.title} ${paper.abstract ?? ""}`
      })
    ).not.toThrow();
  });
});
