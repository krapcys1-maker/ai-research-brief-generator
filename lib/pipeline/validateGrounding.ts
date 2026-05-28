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
  "evidence",
  "for",
  "from",
  "claim",
  "has",
  "have",
  "into",
  "its",
  "may",
  "not",
  "paper",
  "study",
  "support",
  "supports",
  "that",
  "the",
  "their",
  "these",
  "this",
  "unrelated",
  "use",
  "used",
  "valid",
  "using",
  "with"
]);

function stemToken(token: string) {
  if (token === "grounded" || token === "grounding") {
    return "ground";
  }

  if (token === "retrieved" || token === "retrieval") {
    return "retrieve";
  }

  if (token.endsWith("ing") && token.length > 6) {
    return token.slice(0, -3);
  }

  if (token.endsWith("ed") && token.length > 5) {
    return token.slice(0, -2);
  }

  if (token.endsWith("s") && token.length > 4) {
    return token.slice(0, -1);
  }

  return token;
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/i)
    .map(stemToken)
    .filter((token) => token.length >= 4 && !STOPWORDS.has(token));
}

export function hasEvidenceOverlap(evidenceText: string, paper: NormalizedPaper) {
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

export function hasClaimEvidenceOverlap(
  claimText: string,
  evidence: EvidenceLink[]
) {
  const claimTokens = new Set(tokenize(claimText));
  const evidenceTokens = new Set(
    evidence.flatMap((item) => tokenize(item.evidenceText))
  );

  if (!claimTokens.size || !evidenceTokens.size) {
    return false;
  }

  const overlap = [...claimTokens].filter((token) => evidenceTokens.has(token));
  const requiredOverlap = claimTokens.size <= 5 ? 1 : 2;

  return overlap.length >= requiredOverlap;
}

export function validateEvidenceLinks(input: {
  evidence: EvidenceLink[];
  sourcePaperIds: string[];
  section: string;
  papers: NormalizedPaper[];
}) {
  if (!input.evidence.length) {
    throw new Error(`${input.section} has no evidence snippets`);
  }

  const papersById = new Map(input.papers.map((paper) => [paper.id, paper]));
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
  }
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
    claimText: string;
    allowsWeakSupport?: boolean;
  }) {
    validateEvidenceLinks({
      evidence: input.evidence,
      sourcePaperIds: input.sourcePaperIds,
      section: input.section,
      papers
    });

    if (!hasClaimEvidenceOverlap(input.claimText, input.evidence)) {
      throw new Error(
        `${input.section} claim is not supported by its evidence snippets`
      );
    }

    for (const evidence of input.evidence) {
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
    section: "executiveSummary",
    claimText: brief.executiveSummary.paragraph
  });

  for (const item of brief.keyFindings) {
    assertValidPaperIds(item.sourcePaperIds, "keyFinding");
    assertEvidenceLinks({
      evidence: item.evidence,
      sourcePaperIds: item.sourcePaperIds,
      section: "keyFinding",
      claimText: `${item.finding} ${item.explanation}`,
      allowsWeakSupport: item.confidence === "low" || item.caveats.length > 0
    });
  }

  for (const item of brief.majorThemes) {
    assertValidPaperIds(item.sourcePaperIds, "majorTheme");
    assertEvidenceLinks({
      evidence: item.evidence,
      sourcePaperIds: item.sourcePaperIds,
      section: "majorTheme",
      claimText: `${item.theme} ${item.description}`
    });
  }

  for (const item of brief.researchGaps) {
    assertValidPaperIds(item.sourcePaperIds, "researchGap");
    assertEvidenceLinks({
      evidence: item.evidence,
      sourcePaperIds: item.sourcePaperIds,
      section: "researchGap",
      claimText: `${item.gap} ${item.whyItMatters}`
    });
  }

  for (const item of brief.controversiesOrUncertainties) {
    assertValidPaperIds(item.sourcePaperIds, "controversyOrUncertainty");
    assertEvidenceLinks({
      evidence: item.evidence,
      sourcePaperIds: item.sourcePaperIds,
      section: "controversyOrUncertainty",
      claimText: `${item.issue} ${item.explanation}`
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
