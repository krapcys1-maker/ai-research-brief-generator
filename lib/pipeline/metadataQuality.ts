import type { NormalizedPaper } from "@/lib/sources/types";

type CanonicalPaperRule = {
  title: string;
  label: string;
  expectedYear: number;
  expectedDoi?: string;
  expectedArxivId?: string;
};

const canonicalPaperRules: CanonicalPaperRule[] = [
  {
    title: "attention is all you need",
    label: "Attention Is All You Need",
    expectedYear: 2017,
    expectedDoi: "10.48550/arXiv.1706.03762",
    expectedArxivId: "1706.03762"
  }
];

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeDoi(value: string | null | undefined) {
  return value
    ?.trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .toLowerCase();
}

function hasExpectedCanonicalIdentifier(
  paper: NormalizedPaper,
  rule: CanonicalPaperRule
) {
  const doi = normalizeDoi(paper.doi);
  const expectedDoi = normalizeDoi(rule.expectedDoi);
  const arxivId = paper.arxivId?.toLowerCase();
  const sourceUrls = paper.sourceUrls.join(" ").toLowerCase();

  return Boolean(
    (expectedDoi && doi === expectedDoi) ||
      (rule.expectedArxivId &&
        (arxivId === rule.expectedArxivId ||
          sourceUrls.includes(rule.expectedArxivId.toLowerCase())))
  );
}

export function getPaperMetadataWarnings(
  paper: NormalizedPaper,
  currentYear = new Date().getFullYear()
) {
  const warnings: string[] = [];
  const title = normalizeTitle(paper.title);

  if (typeof paper.year === "number" && paper.year > currentYear) {
    warnings.push(
      `metadata warning: "${paper.title}" reports future year ${paper.year}; verify source metadata before citing date-sensitive claims.`
    );
  }

  if (
    paper.source !== "mock" &&
    !paper.doi &&
    !paper.arxivId &&
    !paper.semanticScholarId &&
    !paper.openAlexId &&
    !paper.sourceUrls.length
  ) {
    warnings.push(
      `metadata warning: "${paper.title}" has no stable identifier or source URL.`
    );
  }

  for (const rule of canonicalPaperRules) {
    if (title !== rule.title) {
      continue;
    }

    if (typeof paper.year === "number" && paper.year !== rule.expectedYear) {
      warnings.push(
        `metadata warning: "${rule.label}" is normally cited as a ${rule.expectedYear} paper, but this record reports ${paper.year}. Verify source metadata before relying on chronology.`
      );
    }

    if (!hasExpectedCanonicalIdentifier(paper, rule)) {
      warnings.push(
        `metadata warning: "${rule.label}" does not expose the expected canonical DOI/arXiv identifier in this record. Verify identifiers before citing.`
      );
    }
  }

  return warnings;
}

export function getPapersMetadataWarnings(papers: NormalizedPaper[]) {
  return papers.flatMap((paper) => getPaperMetadataWarnings(paper));
}
