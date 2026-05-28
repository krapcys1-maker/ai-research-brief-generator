import type { NormalizedPaper } from "@/lib/sources/types";

export type EvidenceBoundary = {
  title: string;
  summary: string;
  bullets: string[];
  metrics: {
    totalPapers: number;
    papersWithAbstracts: number;
    papersWithPdfLinks: number;
    papersWithDoi: number;
  };
};

function formatCount(value: number, total: number) {
  return `${value}/${total}`;
}

export function getEvidenceBoundary(input: {
  outputLanguage: string;
  papers: NormalizedPaper[];
}): EvidenceBoundary {
  const totalPapers = input.papers.length;
  const papersWithAbstracts = input.papers.filter((paper) =>
    paper.abstract?.trim()
  ).length;
  const papersWithPdfLinks = input.papers.filter((paper) => paper.pdfUrl).length;
  const papersWithDoi = input.papers.filter((paper) => paper.doi).length;
  const metrics = {
    totalPapers,
    papersWithAbstracts,
    papersWithPdfLinks,
    papersWithDoi
  };

  if (input.outputLanguage === "pl") {
    return {
      title: "Granica dowodow",
      summary:
        "Ten brief jest oparty na metadanych wybranych publikacji, tytulach, abstraktach i identyfikatorach zrodel. Aplikacja nie weryfikuje jeszcze pelnej tresci PDF.",
      bullets: [
        `Abstrakty dostepne dla ${formatCount(papersWithAbstracts, totalPapers)} wybranych publikacji.`,
        `Linki PDF wykryte dla ${formatCount(papersWithPdfLinks, totalPapers)} publikacji, ale PDF-y nie sa jeszcze parsowane.`,
        `DOI dostepne dla ${formatCount(papersWithDoi, totalPapers)} publikacji.`,
        "Traktuj wnioski jako source-grounded briefing z metadanych i abstraktow, nie jako pelny przeglad full-text."
      ],
      metrics
    };
  }

  return {
    title: "Evidence Boundary",
    summary:
      "This brief is grounded in selected paper metadata, titles, abstracts, and source identifiers. The app does not yet verify full PDF text.",
    bullets: [
      `Abstracts available for ${formatCount(papersWithAbstracts, totalPapers)} selected papers.`,
      `PDF links detected for ${formatCount(papersWithPdfLinks, totalPapers)} papers, but PDFs are not parsed yet.`,
      `DOI values available for ${formatCount(papersWithDoi, totalPapers)} papers.`,
      "Treat conclusions as a source-grounded metadata/abstract briefing, not a full-text systematic review."
    ],
    metrics
  };
}
