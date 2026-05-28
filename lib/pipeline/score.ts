import type { NormalizedPaper } from "@/lib/sources/types";

const SOURCE_QUALITY_PRIORS: Record<NormalizedPaper["source"], number> = {
  merged: 0.96,
  semantic_scholar: 0.92,
  openalex: 0.9,
  arxiv: 0.82,
  mock: 0.45
};

const STOP_TERMS = new Set([
  "and",
  "for",
  "from",
  "how",
  "the",
  "with",
  "systematic",
  "review",
  "survey",
  "benchmark",
  "evaluation"
]);

const MIN_RELEVANCE_FOR_SELECTION = 0.2;

function tokenize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length > 1 && !STOP_TERMS.has(term))
    .flatMap((term) =>
      term.endsWith("s") && term.length > 3 ? [term, term.slice(0, -1)] : [term]
    );
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function getIdentifierScore(paper: NormalizedPaper) {
  return clamp01(
    [
      paper.doi ? 0.35 : 0,
      paper.arxivId ? 0.2 : 0,
      paper.semanticScholarId ? 0.2 : 0,
      paper.openAlexId ? 0.2 : 0,
      paper.sourceUrls.length ? 0.05 : 0
    ].reduce((sum, value) => sum + value, 0)
  );
}

function getCompletenessScore(paper: NormalizedPaper) {
  return (
    [
      paper.abstract,
      paper.authors.length ? "authors" : null,
      paper.year,
      paper.sourceUrls.length ? "url" : null,
      paper.venue,
      paper.doi ?? paper.arxivId ?? paper.semanticScholarId ?? paper.openAlexId
    ].filter(Boolean).length / 6
  );
}

export function scorePapers(papers: NormalizedPaper[], query: string) {
  return scorePapersForQueries(papers, [query]);
}

export function scorePapersForQueries(
  papers: NormalizedPaper[],
  queries: string[]
) {
  const queryTerms = new Set(queries.flatMap(tokenize));
  const currentYear = new Date().getFullYear();
  const maxCitationLog = Math.max(
    1,
    ...papers.map((paper) => Math.log((paper.citationCount ?? 0) + 1))
  );
  const maxInfluentialCitationLog = Math.max(
    1,
    ...papers.map((paper) =>
      Math.log((paper.influentialCitationCount ?? 0) + 1)
    )
  );

  return papers
    .map((paper) => {
      const titleTerms = new Set(tokenize(paper.title));
      const abstractTerms = new Set(tokenize(`${paper.abstract ?? ""} ${paper.venue ?? ""}`));
      const titleMatches = [...queryTerms].filter((term) => titleTerms.has(term)).length;
      const abstractMatches = [...queryTerms].filter((term) =>
        abstractTerms.has(term)
      ).length;
      const divisor = Math.min(queryTerms.size, 8);
      const relevanceScore = queryTerms.size
        ? clamp01((titleMatches / divisor) * 0.75 + (abstractMatches / divisor) * 0.25)
        : 0.5;
      const citationVolumeScore =
        Math.log((paper.citationCount ?? 0) + 1) / maxCitationLog;
      const influentialCitationScore =
        Math.log((paper.influentialCitationCount ?? 0) + 1) /
        maxInfluentialCitationLog;
      const citationScore =
        citationVolumeScore * 0.75 + influentialCitationScore * 0.25;
      const age = paper.year ? Math.max(0, currentYear - paper.year) : 10;
      const recencyScore = clamp01(1 - age / 12);
      const completenessScore = getCompletenessScore(paper);
      const identifierScore = getIdentifierScore(paper);
      const sourceQualityScore = SOURCE_QUALITY_PRIORS[paper.source] ?? 0.75;

      const qualityScore =
        citationScore * 0.35 +
        recencyScore * 0.15 +
        completenessScore * 0.2 +
        sourceQualityScore * 0.15 +
        identifierScore * 0.15;
      const rawFinalScore =
        relevanceScore * 0.5 +
        citationScore * 0.18 +
        recencyScore * 0.12 +
        completenessScore * 0.08 +
        sourceQualityScore * 0.07 +
        identifierScore * 0.05;
      const lowRelevancePenalty =
        relevanceScore === 0 ? 0.3 : relevanceScore < 0.12 ? 0.65 : 1;
      const mockPenalty = paper.source === "mock" ? 0.72 : 1;
      const finalScore = rawFinalScore * lowRelevancePenalty * mockPenalty;

      return {
        ...paper,
        relevanceScore,
        citationScore,
        recencyScore,
        completenessScore,
        sourceQualityScore,
        identifierScore,
        qualityScore,
        finalScore
      };
    })
    .sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0));
}

export function selectTopPapers(papers: NormalizedPaper[], maxPapers: number) {
  const nonMock = papers.filter((paper) => paper.source !== "mock");
  const mock = papers.filter((paper) => paper.source === "mock");
  const relevantNonMock = nonMock.filter(
    (paper) => (paper.relevanceScore ?? 0) >= MIN_RELEVANCE_FOR_SELECTION
  );
  const relevantMock = mock.filter(
    (paper) => (paper.relevanceScore ?? 0) >= MIN_RELEVANCE_FOR_SELECTION
  );

  if (relevantNonMock.length) {
    return [
      ...relevantNonMock,
      ...relevantMock
    ].slice(0, maxPapers);
  }

  if (relevantMock.length) {
    return relevantMock.slice(0, maxPapers);
  }

  return [];
}
