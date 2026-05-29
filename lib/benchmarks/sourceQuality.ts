import { generateQueryVariants } from "@/lib/ai/generateQueryVariants";
import { scorePapersForQueriesHybrid, selectTopPapers } from "@/lib/pipeline/score";
import type { NormalizedPaper } from "@/lib/sources/types";
import type { OutputLanguage } from "@/lib/utils/language";

export type SourceQualityCase = {
  name: string;
  query: string;
  outputLanguage?: OutputLanguage;
  papers: NormalizedPaper[];
  expectedTopIds: string[];
  excludedFromTopIds?: string[];
};

export type SourceQualityCaseResult = {
  name: string;
  query: string;
  queryVariants: string[];
  selectedIds: string[];
  expectedTopIds: string[];
  excludedTopFailures: string[];
  top1Hit: boolean;
  recallAt5: number;
};

export type SourceQualityBenchmarkResult = {
  provider: string;
  caseCount: number;
  top1Accuracy: number;
  meanRecallAt5: number;
  excludedFailureCount: number;
  results: SourceQualityCaseResult[];
};

function createRecordedPaper(
  overrides: Partial<NormalizedPaper> & Pick<NormalizedPaper, "id" | "title">
): NormalizedPaper {
  const { id, title, ...rest } = overrides;

  return {
    abstract: null,
    arxivId: null,
    authors: [],
    citationCount: 0,
    doi: null,
    id,
    influentialCitationCount: 0,
    openAlexId: null,
    pdfUrl: null,
    publishedAt: null,
    semanticScholarId: null,
    source: "openalex",
    sourceUrls: ["https://openalex.org"],
    title,
    venue: null,
    year: null,
    ...rest
  };
}

const transformerRecordedPapers = [
  createRecordedPaper({
    id: "attention_all_you_need",
    title: "Attention Is All You Need",
    abstract:
      "We propose the Transformer, a new simple network architecture based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Self-attention connects encoder and decoder for machine translation and sequence transduction tasks.",
    authors: ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar"],
    citationCount: 120000,
    influentialCitationCount: 20000,
    source: "arxiv",
    year: 2017
  }),
  createRecordedPaper({
    id: "cross_attention_mt",
    title:
      "Cross-Attention is All You Need: Adapting Pretrained Transformers for Machine Translation",
    abstract:
      "A study of adapting pretrained transformers using cross attention for machine translation.",
    citationCount: 160,
    influentialCitationCount: 10,
    year: 2021
  }),
  createRecordedPaper({
    id: "video_attention",
    title:
      "Attention is all you need for Videos: Self-attention based Video Summarization using Universal Transformers",
    abstract:
      "Self-attention based video summarization using universal transformers.",
    citationCount: 80,
    year: 2019
  }),
  createRecordedPaper({
    id: "linear_attention",
    title: "Linear attention is (maybe) all you need (to understand transformer optimization)",
    abstract: "Analysis of transformer optimization with linear attention mechanisms.",
    citationCount: 70,
    year: 2023
  }),
  createRecordedPaper({
    id: "vision_transformer_review",
    title:
      "Comparing Vision Transformers and Convolutional Neural Networks for Image Classification: A Literature Review",
    abstract:
      "A literature review comparing vision transformers and convolutional neural networks.",
    citationCount: 40,
    year: 2023
  })
];

const stemCellBurnRecordedPapers = [
  createRecordedPaper({
    id: "msc_burn_administration",
    title: "Administration Methods of Mesenchymal Stem Cells in the Treatment of Burn Wounds",
    abstract:
      "Mesenchymal stem cell administration methods for burn wound treatment and tissue repair.",
    citationCount: 28,
    doi: "10.3390/ebj3040043",
    year: 2022
  }),
  createRecordedPaper({
    id: "msc_burn_management",
    title: "Mesenchymal Stem Cells in Burn Wound Management",
    abstract:
      "Mesenchymal stem cells in burn wound management, inflammation control, and regeneration.",
    citationCount: 35,
    doi: "10.3390/ijms232315339",
    year: 2022
  }),
  createRecordedPaper({
    id: "stem_burn_systematic_review",
    title:
      "Stem Cell-Based Tissue Engineering for the Treatment of Burn Wounds: A Systematic Review of Preclinical Studies",
    abstract:
      "A systematic review of stem cell-based tissue engineering for treating burn wounds.",
    citationCount: 44,
    doi: "10.1007/s12015-022-10341-z",
    year: 2022
  }),
  createRecordedPaper({
    id: "plant_stem_cosmetics",
    title: "Plant Stem Cells and Their Use in Cosmetology and Regenerative Medicine",
    abstract:
      "Plant stem cell extracts are used in cosmetology, anti-aging products, and skin regeneration marketing.",
    citationCount: 900,
    year: 2019
  }),
  createRecordedPaper({
    id: "stem_ethics",
    title: "Stem Cells: Ethical Aspects of Research and Applications",
    abstract:
      "Ethical aspects of embryonic stem cell research, applications, and public controversies.",
    citationCount: 1200,
    year: 2025
  })
];

export const sourceQualityCases: SourceQualityCase[] = [
  {
    name: "Broad transformer query prefers the foundational paper",
    query: "jak dzialaja transformey w sieciach ai",
    outputLanguage: "pl",
    expectedTopIds: ["attention_all_you_need"],
    excludedFromTopIds: ["cross_attention_mt", "video_attention"],
    papers: transformerRecordedPapers
  },
  {
    name: "Stem-cell burn query stays on treatment papers",
    query: "komorki macierzyste w leczeniu oparzen",
    outputLanguage: "pl",
    expectedTopIds: [
      "msc_burn_administration",
      "msc_burn_management",
      "stem_burn_systematic_review"
    ],
    excludedFromTopIds: ["plant_stem_cosmetics", "stem_ethics"],
    papers: stemCellBurnRecordedPapers
  }
];

export async function rankSourceQualityCase(sourceQualityCase: SourceQualityCase) {
  const queryVariants = generateQueryVariants({
    query: sourceQualityCase.query,
    outputLanguage: sourceQualityCase.outputLanguage ?? "en"
  });
  const scored = await scorePapersForQueriesHybrid(
    sourceQualityCase.papers,
    queryVariants
  );

  return {
    queryVariants,
    selected: selectTopPapers(scored, 5),
    scored
  };
}

export async function evaluateSourceQualityCase(
  sourceQualityCase: SourceQualityCase
): Promise<SourceQualityCaseResult> {
  const { queryVariants, selected } = await rankSourceQualityCase(sourceQualityCase);
  const selectedIds = selected.map((paper) => paper.id);
  const expectedHitCount = sourceQualityCase.expectedTopIds.filter((id) =>
    selectedIds.includes(id)
  ).length;
  const excludedTopFailures = (sourceQualityCase.excludedFromTopIds ?? []).filter(
    (id) =>
      selectedIds.slice(0, sourceQualityCase.expectedTopIds.length).includes(id)
  );

  return {
    name: sourceQualityCase.name,
    query: sourceQualityCase.query,
    queryVariants,
    selectedIds,
    expectedTopIds: sourceQualityCase.expectedTopIds,
    excludedTopFailures,
    top1Hit: sourceQualityCase.expectedTopIds.includes(selectedIds[0] ?? ""),
    recallAt5:
      expectedHitCount / Math.max(1, sourceQualityCase.expectedTopIds.length)
  };
}

export async function evaluateSourceQualityCases(
  cases = sourceQualityCases
): Promise<SourceQualityBenchmarkResult> {
  const results = await Promise.all(cases.map(evaluateSourceQualityCase));
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
