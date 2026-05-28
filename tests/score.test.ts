import { describe, expect, it } from "vitest";
import { scorePapers, selectTopPapers } from "@/lib/pipeline/score";
import { createPaper } from "@/tests/fixtures";

describe("scorePapers", () => {
  it("adds source and identifier quality signals to scored papers", () => {
    const [paper] = scorePapers(
      [
        createPaper({
          source: "openalex",
          doi: "10.1000/source-quality",
          openAlexId: "W123",
          citationCount: 10,
          influentialCitationCount: 2
        })
      ],
      "retrieval augmented generation"
    );

    expect(paper.sourceQualityScore).toBeGreaterThan(0);
    expect(paper.identifierScore).toBeGreaterThan(0.5);
    expect(paper.citationScore).toBeGreaterThan(0);
    expect(paper.finalScore).toBeGreaterThan(0);
  });

  it("prefers richer source metadata when relevance is otherwise comparable", () => {
    const scored = scorePapers(
      [
        createPaper({
          id: "thin_arxiv",
          source: "arxiv",
          doi: null,
          arxivId: "2401.00001",
          semanticScholarId: null,
          openAlexId: null,
          sourceUrls: ["https://arxiv.org/abs/2401.00001"],
          venue: null,
          citationCount: 0,
          influentialCitationCount: 0
        }),
        createPaper({
          id: "rich_openalex",
          source: "openalex",
          doi: "10.1000/rich-openalex",
          arxivId: null,
          semanticScholarId: "semantic-rich",
          openAlexId: "W456",
          sourceUrls: ["https://example.org/rich"],
          venue: "Example Journal",
          citationCount: 0,
          influentialCitationCount: 0
        })
      ],
      "retrieval augmented generation"
    );

    expect(scored[0].id).toBe("rich_openalex");
  });

  it("keeps relevance as the strongest signal", () => {
    const scored = scorePapers(
      [
        createPaper({
          id: "metadata_rich_but_off_topic",
          title: "Quantum Sensors for Materials Science",
          abstract: "A paper about measurement devices and materials.",
          source: "openalex",
          doi: "10.1000/off-topic",
          openAlexId: "W789",
          citationCount: 10000,
          influentialCitationCount: 2000
        }),
        createPaper({
          id: "relevant_recent",
          title: "Retrieval-Augmented Generation for Clinical Question Answering",
          abstract: "A paper about retrieval augmented generation in healthcare.",
          source: "arxiv",
          doi: null,
          arxivId: "2402.00002",
          citationCount: 1,
          influentialCitationCount: 0
        })
      ],
      "retrieval augmented generation healthcare"
    );

    expect(selectTopPapers(scored, 1)[0].id).toBe("relevant_recent");
  });

  it("uses query variants for relevance scoring", () => {
    const scored = scorePapers(
      [
        createPaper({
          id: "transformer_paper",
          title: "Attention Is All You Need",
          abstract: "Transformers use self attention for sequence modeling.",
          source: "arxiv",
          citationCount: 100,
          influentialCitationCount: 10
        })
      ],
      "transformers artificial intelligence networks"
    );

    expect(scored[0].relevanceScore).toBeGreaterThan(0);
  });

  it("prefers relevant live papers over mock papers when both are available", () => {
    const scored = scorePapers(
      [
        createPaper({
          id: "mock_off_topic",
          title: "Federated Learning for Healthcare Informatics",
          abstract: "Privacy preserving healthcare model training.",
          source: "mock",
          citationCount: 10000,
          influentialCitationCount: 1000
        }),
        createPaper({
          id: "live_transformer",
          title: "Transformer Attention Mechanisms in Language Models",
          abstract: "A study of transformers and self attention.",
          source: "arxiv",
          citationCount: 5,
          influentialCitationCount: 1
        })
      ],
      "transformer attention language models"
    );

    expect(selectTopPapers(scored, 1)[0].id).toBe("live_transformer");
  });
});
