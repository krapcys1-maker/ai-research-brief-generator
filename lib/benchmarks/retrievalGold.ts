import { generateQueryVariants } from "@/lib/ai/generateQueryVariants";
import { scorePapersForQueriesHybrid, selectTopPapers } from "@/lib/pipeline/score";
import type { NormalizedPaper } from "@/lib/sources/types";
import type { OutputLanguage } from "@/lib/utils/language";

export type GoldQuery = {
  name: string;
  query: string;
  outputLanguage?: OutputLanguage;
  papers: NormalizedPaper[];
  expectedTopIds: string[];
  excludedFromTopIds?: string[];
};

export type GoldQueryResult = {
  name: string;
  query: string;
  selectedIds: string[];
  expectedTopIds: string[];
  excludedTopFailures: string[];
  top1Hit: boolean;
  recallAt5: number;
};

export type GoldBenchmarkResult = {
  provider: string;
  caseCount: number;
  top1Accuracy: number;
  meanRecallAt5: number;
  excludedFailureCount: number;
  results: GoldQueryResult[];
};

function createPaper(overrides: Partial<NormalizedPaper>): NormalizedPaper {
  return {
    id: "paper_1",
    title: "Retrieval-Augmented Generation for Medical Diagnosis",
    abstract:
      "A study about retrieval grounded generation in clinical evaluation and reliability.",
    authors: ["Ada Researcher"],
    year: 2024,
    publishedAt: "2024-01-01",
    doi: "10.1000/example",
    arxivId: null,
    semanticScholarId: null,
    openAlexId: null,
    sourceUrls: ["https://example.org/paper"],
    pdfUrl: null,
    venue: "Example Journal",
    citationCount: 10,
    influentialCitationCount: 1,
    source: "mock",
    ...overrides
  };
}

const sharedDistractors = [
  createPaper({
    id: "distractor_weather",
    title: "Climate Forecasting with Satellite Time Series",
    abstract:
      "A paper about meteorological prediction, remote sensing, and atmospheric models.",
    source: "openalex",
    citationCount: 12000,
    influentialCitationCount: 2000
  }),
  createPaper({
    id: "distractor_finance",
    title: "Portfolio Optimization for Financial Markets",
    abstract:
      "A study of risk models, investment allocation, and market forecasting.",
    source: "semantic_scholar",
    citationCount: 9000,
    influentialCitationCount: 900
  })
];

export const goldQueries: GoldQuery[] = [
  {
    name: "Polish RAG hallucination query",
    query: "jak RAG ogranicza halucynacje w medycznych systemach AI",
    outputLanguage: "pl",
    expectedTopIds: ["rag_healthcare", "rag_biomed_eval"],
    excludedFromTopIds: ["clinical_general"],
    papers: [
      createPaper({
        id: "rag_healthcare",
        title: "Retrieval-Augmented Generation for Large Language Models in Healthcare",
        abstract:
          "Retrieval systems ground language models in clinical guidelines and biomedical literature while reducing unsupported medical answers and hallucinations.",
        source: "openalex",
        citationCount: 180
      }),
      createPaper({
        id: "rag_biomed_eval",
        title: "Benchmarking Retrieval-Augmented Generation in Biomedical Question Answering",
        abstract:
          "The benchmark shows retrieval quality affects answer faithfulness, hallucination reduction, citation support, and biomedical coverage.",
        source: "semantic_scholar",
        citationCount: 90
      }),
      createPaper({
        id: "clinical_general",
        title: "Large Language Models Encode Clinical Knowledge",
        abstract:
          "Clinical question answering and medical decision support without retrieval augmentation.",
        source: "openalex",
        citationCount: 2500
      }),
      ...sharedDistractors
    ]
  },
  {
    name: "AI agents in software engineering",
    query: "AI agents in software engineering",
    expectedTopIds: ["swe_bench", "openhands_agents"],
    excludedFromTopIds: ["clinical_llm"],
    papers: [
      createPaper({
        id: "swe_bench",
        title: "SWE-bench: Can Language Models Resolve Real-World GitHub Issues?",
        abstract:
          "Language model agents are evaluated on real software engineering issues, code maintenance, repositories, tests, and pull requests.",
        source: "arxiv",
        citationCount: 1200
      }),
      createPaper({
        id: "openhands_agents",
        title: "OpenHands: An Open Platform for AI Software Engineering Agents",
        abstract:
          "AI agents plan, edit, test, and repair software projects in developer workflows.",
        source: "openalex",
        citationCount: 120
      }),
      createPaper({
        id: "clinical_llm",
        title: "Safety and Reliability Challenges for Clinical Large Language Models",
        abstract: "A medical review of clinical language model deployment.",
        source: "openalex",
        citationCount: 10000
      }),
      ...sharedDistractors
    ]
  },
  {
    name: "Polish transformer typo recovery",
    query: "jak dzialaja transformey w sieciach ai",
    outputLanguage: "pl",
    expectedTopIds: ["attention_transformer", "self_attention_networks"],
    excludedFromTopIds: ["graph_drug"],
    papers: [
      createPaper({
        id: "attention_transformer",
        title: "Attention Is All You Need",
        abstract:
          "The transformer architecture uses self-attention networks for sequence modeling and language tasks without recurrent neural networks.",
        source: "arxiv",
        citationCount: 90000
      }),
      createPaper({
        id: "self_attention_networks",
        title: "Transformers and Self-Attention in Artificial Intelligence Networks",
        abstract:
          "Transformer neural networks use attention mechanisms to model token relationships in language models.",
        source: "openalex",
        citationCount: 1500
      }),
      createPaper({
        id: "graph_drug",
        title: "Graph Neural Networks for Drug Discovery",
        abstract: "Graph neural networks model molecules for drug discovery.",
        source: "openalex",
        citationCount: 5000
      }),
      ...sharedDistractors
    ]
  },
  {
    name: "Stem-cell burn treatment",
    query: "komorki macierzyste w leczeniu oparzen",
    outputLanguage: "pl",
    expectedTopIds: ["msc_burn_wounds", "epidermal_stem_wounds"],
    excludedFromTopIds: ["plant_stem_cosmetics"],
    papers: [
      createPaper({
        id: "msc_burn_wounds",
        title: "Mesenchymal Stem Cells in Deep Burn Wound Treatment",
        abstract:
          "Mesenchymal stem cells secrete growth factors and anti-inflammatory cytokines that may support burn wound healing and tissue regeneration.",
        source: "openalex",
        citationCount: 75
      }),
      createPaper({
        id: "epidermal_stem_wounds",
        title: "Epidermal Stem Cells for Burn Wounds and Chronic Ulcers",
        abstract:
          "Epidermal stem cells and cultured keratinocytes can support wound closure, skin repair, and burn treatment.",
        source: "openalex",
        citationCount: 120
      }),
      createPaper({
        id: "plant_stem_cosmetics",
        title: "Plant Stem Cells and Their Use in Cosmetology",
        abstract:
          "Plant stem cell extracts are used in anti-aging cosmetics and antioxidant skin products.",
        source: "openalex",
        citationCount: 5000
      }),
      ...sharedDistractors
    ]
  },
  {
    name: "GNN drug discovery acronym",
    query: "GNN drug discovery",
    expectedTopIds: ["gnn_drug_discovery", "molecular_graph_learning"],
    excludedFromTopIds: ["rag_healthcare"],
    papers: [
      createPaper({
        id: "gnn_drug_discovery",
        title: "Graph Neural Networks for Drug Discovery",
        abstract:
          "Graph neural networks learn molecular graph representations for property prediction, virtual screening, and drug discovery.",
        source: "openalex",
        citationCount: 980
      }),
      createPaper({
        id: "molecular_graph_learning",
        title: "Molecular Graph Representation Learning for Virtual Screening",
        abstract:
          "Graph neural network models encode molecules for drug response prediction and candidate screening.",
        source: "semantic_scholar",
        citationCount: 650
      }),
      createPaper({
        id: "rag_healthcare",
        title: "Retrieval-Augmented Generation in Healthcare",
        abstract: "Retrieval systems ground clinical question answering.",
        source: "openalex",
        citationCount: 2000
      }),
      ...sharedDistractors
    ]
  },
  {
    name: "Comparison query RAG versus fine-tuning",
    query: "RAG vs fine-tuning in medical question answering",
    expectedTopIds: ["rag_finetune_comparison"],
    excludedFromTopIds: ["generic_medqa"],
    papers: [
      createPaper({
        id: "rag_finetune_comparison",
        title: "Retrieval-Augmented Generation versus Fine-Tuning for Medical Question Answering",
        abstract:
          "The study compares RAG with fine-tuning for medical question answering, citation support, answer faithfulness, and clinical reliability.",
        source: "semantic_scholar",
        citationCount: 80
      }),
      createPaper({
        id: "generic_medqa",
        title: "Large Language Models Encode Clinical Knowledge",
        abstract:
          "Large language models answer medical questions and encode clinical knowledge.",
        source: "openalex",
        citationCount: 5000
      }),
      createPaper({
        id: "rag_healthcare",
        title: "Retrieval-Augmented Generation in Healthcare",
        abstract:
          "Retrieval augmented generation grounds language models in clinical literature.",
        source: "openalex",
        citationCount: 200
      }),
      ...sharedDistractors
    ]
  },
  {
    name: "Privacy-preserving healthcare ML",
    query: "privacy preserving machine learning in healthcare",
    expectedTopIds: ["federated_healthcare"],
    excludedFromTopIds: ["generic_clinical_qa"],
    papers: [
      createPaper({
        id: "federated_healthcare",
        title: "Federated Learning for Healthcare Informatics",
        abstract:
          "Federated learning enables privacy preserving machine learning across healthcare institutions without centralizing sensitive patient data.",
        source: "semantic_scholar",
        citationCount: 4100
      }),
      createPaper({
        id: "generic_clinical_qa",
        title: "Clinical Question Answering with Large Language Models",
        abstract:
          "Language models answer medical questions and support clinical decisions.",
        source: "openalex",
        citationCount: 8000
      }),
      ...sharedDistractors
    ]
  }
];

export async function rankGoldQuery(goldQuery: GoldQuery) {
  const queryVariants = generateQueryVariants({
    query: goldQuery.query,
    outputLanguage: goldQuery.outputLanguage ?? "en"
  });
  const scored = await scorePapersForQueriesHybrid(goldQuery.papers, queryVariants);

  return {
    queryVariants,
    selected: selectTopPapers(scored, 5),
    scored
  };
}

export async function evaluateGoldQuery(
  goldQuery: GoldQuery
): Promise<GoldQueryResult> {
  const { selected } = await rankGoldQuery(goldQuery);
  const selectedIds = selected.map((paper) => paper.id);
  const expectedHitCount = goldQuery.expectedTopIds.filter((id) =>
    selectedIds.includes(id)
  ).length;
  const excludedTopFailures = (goldQuery.excludedFromTopIds ?? []).filter((id) =>
    selectedIds.slice(0, goldQuery.expectedTopIds.length).includes(id)
  );

  return {
    name: goldQuery.name,
    query: goldQuery.query,
    selectedIds,
    expectedTopIds: goldQuery.expectedTopIds,
    excludedTopFailures,
    top1Hit: goldQuery.expectedTopIds.includes(selectedIds[0] ?? ""),
    recallAt5: expectedHitCount / Math.max(1, goldQuery.expectedTopIds.length)
  };
}

export async function evaluateGoldQueries(
  queries = goldQueries
): Promise<GoldBenchmarkResult> {
  const results = await Promise.all(queries.map(evaluateGoldQuery));
  const top1Accuracy =
    results.filter((result) => result.top1Hit).length / Math.max(1, results.length);
  const meanRecallAt5 =
    results.reduce((sum, result) => sum + result.recallAt5, 0) /
    Math.max(1, results.length);
  const excludedFailureCount = results.reduce(
    (sum, result) => sum + result.excludedTopFailures.length,
    0
  );

  return {
    provider: process.env.EMBEDDING_PROVIDER || "local",
    caseCount: results.length,
    top1Accuracy,
    meanRecallAt5,
    excludedFailureCount,
    results
  };
}

