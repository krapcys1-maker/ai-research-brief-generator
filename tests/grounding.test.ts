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
