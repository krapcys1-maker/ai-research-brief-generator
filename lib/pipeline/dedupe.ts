import type { NormalizedPaper } from "@/lib/sources/types";
import { normalizeDoi } from "@/lib/sources/doi";

export function normalizeTitle(title: string) {
  return title
    .replace(/\\[nrt]/g, " ")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getDedupeKeys(paper: NormalizedPaper) {
  const doi = normalizeDoi(paper.doi);

  return [
    doi ? `doi:${doi.toLowerCase()}` : null,
    paper.arxivId ? `arxiv:${paper.arxivId.toLowerCase()}` : null,
    paper.semanticScholarId
      ? `semantic:${paper.semanticScholarId.toLowerCase()}`
      : null,
    paper.openAlexId ? `openalex:${paper.openAlexId.toLowerCase()}` : null,
    `title:${normalizeTitle(paper.title)}`
  ].filter(Boolean) as string[];
}

export function dedupePapers(papers: NormalizedPaper[]) {
  const seen = new Set<string>();
  const deduped: NormalizedPaper[] = [];

  for (const paper of papers) {
    const keys = getDedupeKeys(paper);
    const duplicate = keys.some((key) => seen.has(key));

    if (!duplicate) {
      deduped.push(paper);
      keys.forEach((key) => seen.add(key));
    }
  }

  return deduped;
}
