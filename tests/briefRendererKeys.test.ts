import React from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BriefRenderer } from "@/components/brief/BriefRenderer";
import { createBrief, createPaper } from "./fixtures";

describe("BriefRenderer keys", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders duplicate generated text without React duplicate-key warnings", () => {
    const duplicateTitle =
      "Refine Medical Diagnosis Using Generation Augmented Retrieval and Clinical Practice Guidelines";
    const paper = createPaper({
      id: "paper_duplicate_key",
      title: duplicateTitle
    });
    const evidence = [
      {
        paperId: paper.id,
        evidenceText: paper.abstract ?? paper.title,
        supportLevel: "direct" as const,
        evidenceLevel: "abstract_supported" as const
      }
    ];
    const brief = createBrief({
      keyFindings: [
        {
          finding: duplicateTitle,
          explanation: "First generated explanation.",
          confidence: "low",
          sourcePaperIds: [paper.id],
          evidence,
          caveats: []
        },
        {
          finding: duplicateTitle,
          explanation: "Second generated explanation.",
          confidence: "low",
          sourcePaperIds: [paper.id],
          evidence,
          caveats: []
        }
      ],
      majorThemes: [
        {
          theme: duplicateTitle,
          description: "First duplicate theme.",
          sourcePaperIds: [paper.id],
          evidence
        },
        {
          theme: duplicateTitle,
          description: "Second duplicate theme.",
          sourcePaperIds: [paper.id],
          evidence
        }
      ],
      researchGaps: [
        {
          gap: duplicateTitle,
          whyItMatters: "First duplicate gap.",
          sourcePaperIds: [paper.id],
          evidence
        },
        {
          gap: duplicateTitle,
          whyItMatters: "Second duplicate gap.",
          sourcePaperIds: [paper.id],
          evidence
        }
      ],
      suggestedNextQuestions: [
        "What should be checked next?",
        "What should be checked next?"
      ],
      bibliography: [
        {
          paperId: paper.id,
          title: paper.title,
          authors: paper.authors,
          year: paper.year,
          url: paper.sourceUrls[0] ?? null,
          doi: paper.doi
        }
      ]
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    renderToString(
      React.createElement(BriefRenderer, {
        brief,
        papers: [paper]
      })
    );

    const errorOutput = consoleError.mock.calls
      .map((call) => call.join(" "))
      .join("\n");
    expect(errorOutput).not.toContain("same key");
  });
});
