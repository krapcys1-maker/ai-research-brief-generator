import { describe, expect, it } from "vitest";
import {
  scorePapers,
  scorePapersForQueriesHybrid,
  selectTopPapers
} from "@/lib/pipeline/score";
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

  it("does not let generic expansion terms inflate off-topic systematic reviews", () => {
    const scored = scorePapers(
      [
        createPaper({
          id: "off_topic_systematic_review",
          title: "Prediction models for diagnosis and prognosis: systematic review",
          abstract: "A clinical review about prognosis models and healthcare.",
          source: "openalex",
          citationCount: 5000
        }),
        createPaper({
          id: "software_agent",
          title: "AI Agents in Software Engineering",
          abstract:
            "A survey of autonomous agents for code generation, testing, and software maintenance.",
          source: "openalex",
          citationCount: 20
        })
      ],
      "AI agents in software engineering systematic review"
    );

    expect(scored[0].id).toBe("software_agent");
    expect(scored[0].relevanceScore).toBeGreaterThan(
      scored[1].relevanceScore ?? 0
    );
  });

  it("does not fill a live-source brief with weak mock fallback papers", () => {
    const scored = scorePapers(
      [
        createPaper({
          id: "live_burns",
          title: "Mesenchymal stem cells in burn wound treatment",
          abstract: "Stem cells are evaluated for burn wound healing.",
          source: "openalex"
        }),
        createPaper({
          id: "mock_llm",
          title: "Safety and Reliability Challenges for Clinical Large Language Models",
          abstract: "A review of clinical language model deployment.",
          source: "mock",
          citationCount: 10000
        })
      ],
      "stem cells burn treatment"
    );

    const selected = selectTopPapers(scored, 10);

    expect(selected.map((paper) => paper.id)).toEqual(["live_burns"]);
  });

  it("returns no papers when every candidate is irrelevant", () => {
    const scored = scorePapers(
      [
        createPaper({
          id: "mock_llm",
          title: "Survey of Hallucination in Natural Language Generation",
          abstract: "A paper about language model hallucinations.",
          source: "mock"
        })
      ],
      "stem cells burn treatment"
    );

    expect(selectTopPapers(scored, 10)).toEqual([]);
  });

  it("adds semantic scores through the hybrid scorer", async () => {
    const scored = await scorePapersForQueriesHybrid(
      [
        createPaper({
          id: "stem_cell",
          title: "Mesenchymal Stem Cell Therapy for Burn Wounds",
          abstract: "Stem cells support tissue regeneration after burn injury.",
          source: "openalex"
        }),
        createPaper({
          id: "software_agent",
          title: "AI Agents in Software Engineering",
          abstract: "Agents automate code maintenance tasks.",
          source: "openalex"
        })
      ],
      ["stem cells burn treatment"]
    );

    expect(scored[0].id).toBe("stem_cell");
    expect(scored[0].semanticScore).toBeGreaterThan(0);
    expect(scored[0].finalScore).toBeGreaterThan(scored[1].finalScore ?? 0);
  });
});
