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
});
