import type { NormalizedPaper } from "@/lib/sources/types";

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((term) => term.length > 2);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function scorePapers(papers: NormalizedPaper[], query: string) {
  const queryTerms = new Set(tokenize(query));
  const currentYear = new Date().getFullYear();
  const maxCitationLog = Math.max(
    1,
    ...papers.map((paper) => Math.log((paper.citationCount ?? 0) + 1))
  );

  return papers
    .map((paper) => {
      const haystack = tokenize(`${paper.title} ${paper.abstract ?? ""} ${paper.venue ?? ""}`);
      const matches = haystack.filter((term) => queryTerms.has(term)).length;
      const relevanceScore = queryTerms.size
        ? clamp01(matches / queryTerms.size)
        : 0.5;
      const citationScore =
        Math.log((paper.citationCount ?? 0) + 1) / maxCitationLog;
      const age = paper.year ? Math.max(0, currentYear - paper.year) : 10;
      const recencyScore = clamp01(1 - age / 12);
      const completenessScore =
        [
          paper.abstract,
          paper.authors.length ? "authors" : null,
          paper.year,
          paper.sourceUrls.length ? "url" : null,
          paper.doi ?? paper.arxivId ?? paper.semanticScholarId ?? paper.openAlexId
        ].filter(Boolean).length / 5;

      const qualityScore =
        citationScore * 0.55 + recencyScore * 0.25 + completenessScore * 0.2;
      const finalScore =
        relevanceScore * 0.55 +
        citationScore * 0.25 +
        recencyScore * 0.15 +
        completenessScore * 0.05;

      return {
        ...paper,
        relevanceScore,
        qualityScore,
        finalScore
      };
    })
    .sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0));
}

export function selectTopPapers(papers: NormalizedPaper[], maxPapers: number) {
  return papers.slice(0, maxPapers);
}
