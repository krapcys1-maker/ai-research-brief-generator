import { describe, expect, it } from "vitest";
import { dedupePapers, normalizeTitle } from "@/lib/pipeline/dedupe";
import { createPaper } from "./fixtures";

describe("dedupePapers", () => {
  it("normalizes titles for duplicate detection", () => {
    expect(normalizeTitle("  RAG: For Medicine! ")).toBe("rag for medicine");
  });

  it("deduplicates by DOI before title", () => {
    const papers = [
      createPaper({ id: "paper_1", doi: "10.1000/example", title: "One" }),
      createPaper({ id: "paper_2", doi: "10.1000/example", title: "Two" })
    ];

    expect(dedupePapers(papers).map((paper) => paper.id)).toEqual(["paper_1"]);
  });

  it("deduplicates by normalized title when IDs are absent", () => {
    const papers = [
      createPaper({
        id: "paper_1",
        doi: null,
        title: "Retrieval Augmented Generation"
      }),
      createPaper({
        id: "paper_2",
        doi: null,
        title: "Retrieval-Augmented Generation!"
      })
    ];

    expect(dedupePapers(papers).map((paper) => paper.id)).toEqual(["paper_1"]);
  });
});
