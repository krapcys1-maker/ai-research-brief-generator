import type { NormalizedPaper } from "@/lib/sources/types";

export type PaperInsight = {
  role: string;
  whyRead: string;
  strengths: string[];
  limitations: string[];
};

export type SourceQualitySummary = {
  label: "Strong source base" | "Usable source base" | "Weak source base";
  description: string;
  metrics: {
    totalPapers: number;
    livePapers: number;
    mockPapers: number;
    papersWithAbstracts: number;
    papersWithDoi: number;
    papersWithPdfLinks: number;
    highRelevancePapers: number;
    lowRelevancePapers: number;
    sourceDiversity: number;
    averageRelevance: number;
  };
  strengths: string[];
  cautions: string[];
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function isLiveSource(paper: NormalizedPaper) {
  return paper.source !== "mock";
}

function hasStableIdentifier(paper: NormalizedPaper) {
  return Boolean(
    paper.doi || paper.arxivId || paper.semanticScholarId || paper.openAlexId
  );
}

function getRole(paper: NormalizedPaper, currentYear: number) {
  const title = paper.title.toLowerCase();

  if (/\b(systematic review|review|survey|meta-analysis)\b/.test(title)) {
    return "Review or synthesis";
  }

  if (/\b(benchmark|benchmarking|evaluation|evaluating|dataset|protocol)\b/.test(title)) {
    return "Benchmark or evaluation";
  }

  if ((paper.citationCount ?? 0) >= 1000) {
    return "Highly cited foundation";
  }

  if (paper.year && paper.year >= currentYear - 2) {
    return "Recent evidence";
  }

  if ((paper.relevanceScore ?? 0) >= 0.65) {
    return "Strong query match";
  }

  return "Supporting source";
}

export function getPaperInsight(
  paper: NormalizedPaper,
  currentYear = new Date().getFullYear()
): PaperInsight {
  const strengths: string[] = [];
  const limitations: string[] = [];
  const relevance = paper.relevanceScore ?? 0;
  const citations = paper.citationCount ?? 0;
  const role = getRole(paper, currentYear);

  if (relevance >= 0.65) {
    strengths.push("strong title/abstract match to the query");
  } else if (relevance >= 0.35) {
    strengths.push("reasonable topical match");
  } else {
    limitations.push("weak query match, so verify whether it really fits");
  }

  if (isLiveSource(paper)) {
    strengths.push(`retrieved from ${paper.source}`);
  } else {
    limitations.push("mock/demo source, useful for testing but weaker evidence");
  }

  if (paper.abstract) {
    strengths.push("abstract available for grounding");
  } else {
    limitations.push("no abstract available, so grounding is metadata-heavy");
  }

  if (paper.doi) {
    strengths.push("DOI available");
  } else if (hasStableIdentifier(paper)) {
    strengths.push("stable source identifier available");
  } else {
    limitations.push("no DOI or stable external identifier");
  }

  if (paper.year && paper.year >= currentYear - 2) {
    strengths.push("recent paper");
  } else if (paper.year && paper.year < currentYear - 12) {
    limitations.push("older paper, check whether the field has moved on");
  }

  if (citations >= 1000) {
    strengths.push("highly cited");
  } else if (citations > 0 && citations < 10) {
    limitations.push("low citation count");
  }

  const whyParts = strengths.slice(0, 3);
  const whyRead = whyParts.length
    ? `${role}: selected because it has ${whyParts.join(", ")}.`
    : `${role}: selected as supporting context, but it needs manual checking.`;

  return {
    role,
    whyRead,
    strengths,
    limitations
  };
}

export function getSourceQualitySummary(
  papers: NormalizedPaper[]
): SourceQualitySummary {
  const totalPapers = papers.length;
  const livePapers = papers.filter(isLiveSource).length;
  const mockPapers = totalPapers - livePapers;
  const papersWithAbstracts = papers.filter((paper) => paper.abstract).length;
  const papersWithDoi = papers.filter((paper) => paper.doi).length;
  const papersWithPdfLinks = papers.filter((paper) => paper.pdfUrl).length;
  const highRelevancePapers = papers.filter(
    (paper) => (paper.relevanceScore ?? 0) >= 0.45
  ).length;
  const lowRelevancePapers = papers.filter(
    (paper) => (paper.relevanceScore ?? 0) < 0.25
  ).length;
  const averageRelevance = totalPapers
    ? papers.reduce((sum, paper) => sum + (paper.relevanceScore ?? 0), 0) /
      totalPapers
    : 0;
  const sourceDiversity = new Set(papers.map((paper) => paper.source)).size;
  const strengths: string[] = [];
  const cautions: string[] = [];

  if (livePapers >= Math.max(1, totalPapers * 0.6)) {
    strengths.push("mostly live academic-source records");
  } else {
    cautions.push("source set relies heavily on mock/demo records");
  }

  if (papersWithAbstracts >= Math.max(1, totalPapers * 0.7)) {
    strengths.push("most selected papers include abstracts");
  } else {
    cautions.push("limited abstract coverage weakens claim grounding");
  }

  if (papersWithDoi >= Math.max(1, totalPapers * 0.4)) {
    strengths.push("several papers have DOI-backed identifiers");
  } else {
    cautions.push("few DOI-backed identifiers");
  }

  if (highRelevancePapers >= Math.max(1, totalPapers * 0.5)) {
    strengths.push("many papers have a solid query match");
  } else {
    cautions.push("few papers have a strong query match");
  }

  if (sourceDiversity >= 2) {
    strengths.push("evidence comes from multiple source types");
  }

  const label =
    totalPapers >= 6 &&
    livePapers >= totalPapers * 0.6 &&
    papersWithAbstracts >= totalPapers * 0.7 &&
    highRelevancePapers >= totalPapers * 0.5
      ? "Strong source base"
      : totalPapers >= 2 && averageRelevance >= 0.25
        ? "Usable source base"
        : "Weak source base";

  const description =
    label === "Strong source base"
      ? "The selected papers are broad enough for a useful source-grounded brief."
      : label === "Usable source base"
        ? "The selected papers can support a brief, but important claims should be checked against the bibliography."
        : "The selected papers are too thin or weakly matched for confident synthesis.";

  return {
    label,
    description,
    metrics: {
      totalPapers,
      livePapers,
      mockPapers,
      papersWithAbstracts,
      papersWithDoi,
      papersWithPdfLinks,
      highRelevancePapers,
      lowRelevancePapers,
      sourceDiversity,
      averageRelevance: round2(averageRelevance)
    },
    strengths,
    cautions
  };
}
