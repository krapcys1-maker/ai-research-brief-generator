import { describe, expect, it } from "vitest";
import { validateBriefGrounding } from "@/lib/pipeline/validateGrounding";
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
          finding: "Weak evidence",
          explanation: "Weak evidence must be marked carefully.",
          confidence: "medium",
          sourcePaperIds: ["paper_1"],
          evidence: [
            {
              paperId: "paper_1",
              evidenceText: "grounded generation in clinical settings",
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
});
