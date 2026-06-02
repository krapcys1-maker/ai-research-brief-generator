import type { NormalizedPaper } from "@/lib/sources/types";

export type EvidenceBoundary = {
  title: string;
  summary: string;
  bullets: string[];
  metrics: {
    totalPapers: number;
    papersWithAbstracts: number;
    papersWithPdfLinks: number;
    papersWithParsedFullText: number;
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
  const papersWithParsedFullText = input.papers.filter(
    (paper) => paper.fullTextStatus === "parsed"
  ).length;
  const papersWithDoi = input.papers.filter((paper) => paper.doi).length;
  const metrics = {
    totalPapers,
    papersWithAbstracts,
    papersWithPdfLinks,
    papersWithParsedFullText,
    papersWithDoi
  };

  if (input.outputLanguage === "pl") {
    return {
      title: "Granica dowodow",
      summary:
        papersWithParsedFullText
          ? "Ten brief pokazuje metadane i abstrakty wybranych publikacji, a dla czesci paperow aplikacja ma tez sparsowane fragmenty pelnego tekstu dostepne dla Ask This Brief."
          : "Ten brief jest oparty na metadanych wybranych publikacji, tytulach, abstraktach i identyfikatorach zrodel. Aplikacja nie zweryfikowala pelnej tresci PDF dla tych paperow.",
      bullets: [
        `Abstrakty dostepne dla ${formatCount(papersWithAbstracts, totalPapers)} wybranych publikacji.`,
        `Pelny tekst sparsowany dla ${formatCount(papersWithParsedFullText, totalPapers)} publikacji.`,
        `DOI dostepne dla ${formatCount(papersWithDoi, totalPapers)} publikacji.`,
        papersWithParsedFullText
          ? "Claims oparte na pelnym tekscie musza miec evidenceLevel=full_text_supported; pozostale nadal sa ograniczone do abstraktow/metadanych."
          : "Traktuj wnioski jako source-grounded briefing z metadanych i abstraktow, nie jako pelny przeglad full-text."
      ],
      metrics
    };
  }

  return {
    title: "Evidence Boundary",
    summary:
      papersWithParsedFullText
        ? "This brief shows selected paper metadata and abstracts, and parsed full-text chunks are available for some papers in Ask This Brief."
        : "This brief is grounded in selected paper metadata, titles, abstracts, and source identifiers. Full PDF text was not parsed for these papers.",
    bullets: [
      `Abstracts available for ${formatCount(papersWithAbstracts, totalPapers)} selected papers.`,
      `Full text parsed for ${formatCount(papersWithParsedFullText, totalPapers)} selected papers.`,
      `DOI values available for ${formatCount(papersWithDoi, totalPapers)} papers.`,
      papersWithParsedFullText
        ? "Claims backed by parsed full text must use evidenceLevel=full_text_supported; other claims remain abstract/metadata-bound."
        : "Treat conclusions as a source-grounded metadata/abstract briefing, not a full-text systematic review."
    ],
    metrics
  };
}
