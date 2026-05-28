import type { ResearchBrief } from "@/lib/ai/schemas";
import type { EvidenceLink } from "@/lib/ai/schemas";
import type { NormalizedPaper } from "@/lib/sources/types";

const STOPWORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "based",
  "been",
  "being",
  "between",
  "can",
  "could",
  "does",
  "for",
  "from",
  "has",
  "have",
  "into",
  "its",
  "may",
  "not",
  "paper",
  "study",
  "that",
  "the",
  "their",
  "these",
  "this",
  "use",
  "used",
  "using",
  "with"
]);

function tokenize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length >= 4 && !STOPWORDS.has(token));
}

function hasEvidenceOverlap(evidenceText: string, paper: NormalizedPaper) {
  const evidenceTokens = new Set(tokenize(evidenceText));
  const paperTokens = new Set(
    tokenize(`${paper.title} ${paper.abstract ?? ""} ${paper.venue ?? ""}`)
  );

  if (!evidenceTokens.size || !paperTokens.size) {
    return false;
  }

  const overlap = [...evidenceTokens].filter((token) => paperTokens.has(token));
  const requiredOverlap = evidenceTokens.size <= 3 ? 1 : 2;

  return overlap.length >= requiredOverlap;
}

export function validateBriefGrounding(
  brief: ResearchBrief,
  papers: NormalizedPaper[]
) {
  const paperIds = new Set(papers.map((paper) => paper.id));
  const papersById = new Map(papers.map((paper) => [paper.id, paper]));

  function assertValidPaperIds(ids: string[], section: string) {
    if (!ids.length) {
      throw new Error(`${section} has no sourcePaperIds`);
    }

    for (const id of ids) {
      if (!paperIds.has(id)) {
        throw new Error(`${section} cites unknown paperId: ${id}`);
      }
    }
  }

  function assertEvidenceLinks(input: {
    evidence: EvidenceLink[];
    sourcePaperIds: string[];
    section: string;
    allowsWeakSupport?: boolean;
  }) {
    if (!input.evidence.length) {
      throw new Error(`${input.section} has no evidence snippets`);
    }

    const sourcePaperIds = new Set(input.sourcePaperIds);

    for (const evidence of input.evidence) {
      const paper = papersById.get(evidence.paperId);

      if (!paper) {
        throw new Error(`${input.section} evidence cites unknown paperId: ${evidence.paperId}`);
      }

      if (!sourcePaperIds.has(evidence.paperId)) {
        throw new Error(
          `${input.section} evidence paperId is missing from sourcePaperIds: ${evidence.paperId}`
        );
      }

      if (!hasEvidenceOverlap(evidence.evidenceText, paper)) {
        throw new Error(
          `${input.section} evidence is not supported by selected paper metadata: ${evidence.paperId}`
        );
      }

      if (evidence.supportLevel === "weak" && input.allowsWeakSupport === false) {
        throw new Error(`${input.section} has weak evidence without uncertainty caveats`);
      }
    }
  }

  assertValidPaperIds(
    brief.executiveSummary.sourcePaperIds,
    "executiveSummary"
  );
  assertEvidenceLinks({
    evidence: brief.executiveSummary.evidence,
    sourcePaperIds: brief.executiveSummary.sourcePaperIds,
    section: "executiveSummary"
  });

  for (const item of brief.keyFindings) {
    assertValidPaperIds(item.sourcePaperIds, "keyFinding");
    assertEvidenceLinks({
      evidence: item.evidence,
      sourcePaperIds: item.sourcePaperIds,
      section: "keyFinding",
      allowsWeakSupport: item.confidence === "low" || item.caveats.length > 0
    });
  }

  for (const item of brief.majorThemes) {
    assertValidPaperIds(item.sourcePaperIds, "majorTheme");
    assertEvidenceLinks({
      evidence: item.evidence,
      sourcePaperIds: item.sourcePaperIds,
      section: "majorTheme"
    });
  }

  for (const item of brief.researchGaps) {
    assertValidPaperIds(item.sourcePaperIds, "researchGap");
    assertEvidenceLinks({
      evidence: item.evidence,
      sourcePaperIds: item.sourcePaperIds,
      section: "researchGap"
    });
  }

  for (const item of brief.controversiesOrUncertainties) {
    assertValidPaperIds(item.sourcePaperIds, "controversyOrUncertainty");
    assertEvidenceLinks({
      evidence: item.evidence,
      sourcePaperIds: item.sourcePaperIds,
      section: "controversyOrUncertainty"
    });
  }

  for (const item of brief.influentialPapers) {
    if (!paperIds.has(item.paperId)) {
      throw new Error(`influentialPapers cites unknown paperId: ${item.paperId}`);
    }
  }

  for (const item of brief.bibliography) {
    const paper = papersById.get(item.paperId);

    if (!paper) {
      throw new Error(`bibliography cites unknown paperId: ${item.paperId}`);
    }

    if (item.doi !== paper.doi) {
      throw new Error(
        `bibliography DOI mismatch for paperId: ${item.paperId}`
      );
    }
  }
}
