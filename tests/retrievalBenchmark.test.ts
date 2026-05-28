import { describe, expect, it } from "vitest";
import { generateQueryVariants } from "@/lib/ai/generateQueryVariants";
import { scorePapersForQueries, selectTopPapers } from "@/lib/pipeline/score";
import { createPaper } from "@/tests/fixtures";
import type { NormalizedPaper } from "@/lib/sources/types";
import type { OutputLanguage } from "@/lib/utils/language";

function rankFixture(input: {
  query: string;
  outputLanguage?: OutputLanguage;
  papers: NormalizedPaper[];
}) {
  const variants = generateQueryVariants({
    query: input.query,
    outputLanguage: input.outputLanguage ?? "en"
  });
  const scored = scorePapersForQueries(input.papers, variants);

  return {
    variants,
    selected: selectTopPapers(scored, 5),
    scored
  };
}

describe("retrieval benchmark fixtures", () => {
  it("handles Polish acronym queries for RAG in medical diagnosis", () => {
    const { variants, selected } = rankFixture({
      query: "RAG w diagnozie medycznej",
      outputLanguage: "pl",
      papers: [
        createPaper({
          id: "rag_med",
          title: "Retrieval-Augmented Generation in Medical Diagnosis",
          abstract:
            "Retrieval augmented generation supports clinical diagnosis with grounded evidence.",
          source: "openalex"
        }),
        createPaper({
          id: "federated_health",
          title: "Federated Learning for Healthcare Informatics",
          abstract: "Privacy preserving model training in healthcare.",
          source: "openalex"
        })
      ]
    });

    expect(variants).toContain("retrieval augmented generation diagnosis medical");
    expect(selected[0].id).toBe("rag_med");
  });

  it("expands GNN acronyms for drug discovery searches", () => {
    const { variants, selected } = rankFixture({
      query: "GNN drug discovery",
      papers: [
        createPaper({
          id: "gnn_drug",
          title: "Graph Neural Networks for Drug Discovery",
          abstract:
            "Graph neural networks model molecular structures for property prediction.",
          source: "openalex"
        }),
        createPaper({
          id: "rag_med",
          title: "Retrieval-Augmented Generation in Medical Diagnosis",
          abstract: "Clinical question answering with retrieval.",
          source: "openalex"
        })
      ]
    });

    expect(variants).toContain("graph neural networks drug discovery");
    expect(selected[0].id).toBe("gnn_drug");
  });

  it("keeps interdisciplinary healthcare privacy queries on topic", () => {
    const { selected } = rankFixture({
      query: "privacy preserving machine learning in healthcare",
      papers: [
        createPaper({
          id: "federated_healthcare",
          title: "Federated Learning for Healthcare Informatics",
          abstract:
            "Federated learning enables privacy preserving machine learning across healthcare data silos.",
          source: "semantic_scholar"
        }),
        createPaper({
          id: "clinical_llm",
          title: "Large Language Models Encode Clinical Knowledge",
          abstract: "Clinical question answering and medical decision support.",
          source: "semantic_scholar",
          citationCount: 10000
        })
      ]
    });

    expect(selected[0].id).toBe("federated_healthcare");
  });

  it("recovers common Polish typos for transformer queries", () => {
    const { variants, selected } = rankFixture({
      query: "jak dzialaja transformey w sieciach ai",
      outputLanguage: "pl",
      papers: [
        createPaper({
          id: "transformers",
          title: "Transformers and Self-Attention in Artificial Intelligence Networks",
          abstract:
            "Transformer models use self attention for language modeling and sequence tasks.",
          source: "arxiv"
        }),
        createPaper({
          id: "gnn_drug",
          title: "Graph Neural Networks for Drug Discovery",
          abstract: "Molecular graph learning for drug discovery.",
          source: "arxiv"
        })
      ]
    });

    expect(variants).toContain("transformers networks artificial intelligence");
    expect(selected[0].id).toBe("transformers");
  });

  it("prioritizes stem-cell burn treatment over generic stem-cell papers", () => {
    const { variants, selected } = rankFixture({
      query: "komorki macierzyste w leczeniu oparzen",
      outputLanguage: "pl",
      papers: [
        createPaper({
          id: "burn_wounds",
          title: "Mesenchymal Stem Cells in Burn Wound Treatment",
          abstract:
            "Stem cell therapy for burn wounds and tissue regeneration.",
          source: "openalex"
        }),
        createPaper({
          id: "stem_ethics",
          title: "Stem Cells: Ethical Aspects of Research",
          abstract: "Ethics of embryonic stem cell research and applications.",
          source: "openalex",
          citationCount: 10000
        })
      ]
    });

    expect(variants).toContain("stem cells burn treatment");
    expect(selected[0].id).toBe("burn_wounds");
  });
});
