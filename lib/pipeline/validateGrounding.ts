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

const ABSOLUTE_CLAIM_TERMS = new Set([
  "always",
  "cure",
  "cures",
  "cured",
  "curing",
  "eliminate",
  "eliminates",
  "eliminated",
  "eliminating",
  "ensure",
  "ensures",
  "guarantee",
  "guarantees",
  "prevent",
  "prevents",
  "zero",
  "calkowicie",
  "eliminuje",
  "eliminuja",
  "gwarantuje",
  "gwarantuja",
  "lecza",
  "zawsze",
  "leczy",
  "zapobiega"
]);

function getAbsoluteClaimTerms(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/i)
    .filter((token) => ABSOLUTE_CLAIM_TERMS.has(token));
}

const QUANTITATIVE_SIGNAL_PATTERNS = [
  {
    signal: "statistical_significance",
    patterns: [
      /\bstatistically significant\b/,
      /\bstatistical significance\b/,
      /\bistotn\w* statystyczn\w*\b/,
      /\bstatystyczn\w* istotn\w*\b/
    ]
  },
  {
    signal: "p_value",
    patterns: [
      /\bp\s*(?:<=|>=|<|>|=)\s*0?[.,]\d+\b/,
      /\bp[-\s]?value\b/,
      /\bwartosc p\b/
    ]
  },
  {
    signal: "confidence_interval",
    patterns: [
      /\bconfidence interval\b/,
      /\b95\s*%\s*ci\b/,
      /\bci\b/,
      /\bprzedzial\w* ufnosc\w*\b/
    ]
  },
  {
    signal: "odds_ratio",
    patterns: [/\bodds ratio\b/, /\biloraz szans\b/]
  },
  {
    signal: "hazard_ratio",
    patterns: [/\bhazard ratio\b/, /\bwspolczynnik hazardu\b/]
  },
  {
    signal: "relative_risk",
    patterns: [/\brelative risk\b/, /\brisk ratio\b/, /\bryzyko wzgledne\b/]
  },
  {
    signal: "mean_difference",
    patterns: [/\bmean difference\b/, /\bsrednia roznic\w*\b/]
  },
  {
    signal: "ratio_double",
    patterns: [/\bdouble[ds]?\b/, /\btwice\b/, /\btwofold\b/, /\bdwukrotn\w*\b/]
  },
  {
    signal: "ratio_triple",
    patterns: [/\btriple[ds]?\b/, /\bthreefold\b/, /\btrzykrotn\w*\b/]
  }
];

function normalizeForSignals(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeNumericSignal(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(",", ".")
    .replace(/percentagepoints?/, "percentagepoint")
    .replace(/percent(age)?/, "%")
    .replace(/proc\.?|procent(ow|y|ach)?/, "%");

  if (/^2(\.0)?(x|fold)$/.test(normalized)) {
    return "ratio_double";
  }

  if (/^3(\.0)?(x|fold)$/.test(normalized)) {
    return "ratio_triple";
  }

  return `number:${normalized}`;
}

function getQuantitativeSignals(value: string) {
  const normalized = normalizeForSignals(value);
  const signals = new Set<string>();

  for (const item of QUANTITATIVE_SIGNAL_PATTERNS) {
    if (item.patterns.some((pattern) => pattern.test(normalized))) {
      signals.add(item.signal);
    }
  }

  const numericPattern =
    /\b\d+(?:[.,]\d+)?\s*(?:%|percent(?:age)?(?:\s+points?)?|proc\.?|procent(?:ow|y|ach)?|x|fold)?/g;
  const numericMatches = normalized.match(numericPattern) ?? [];

  for (const match of numericMatches) {
    signals.add(normalizeNumericSignal(match));
  }

  return signals;
}

export function hasUnsupportedQuantitativeDetail(
  statementText: string,
  supportText: string
) {
  const statementSignals = getQuantitativeSignals(statementText);

  if (!statementSignals.size) {
    return false;
  }

  const supportSignals = getQuantitativeSignals(supportText);

  return [...statementSignals].some((signal) => !supportSignals.has(signal));
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

export function hasUnsupportedAbsoluteClaim(
  claimText: string,
  evidence: EvidenceLink[]
) {
  const absoluteClaimTerms = getAbsoluteClaimTerms(claimText);

  if (!absoluteClaimTerms.length) {
    return false;
  }

  const evidenceText = evidence.map((item) => item.evidenceText).join(" ");
  const absoluteEvidenceTerms = new Set(getAbsoluteClaimTerms(evidenceText));

  return absoluteClaimTerms.some((term) => !absoluteEvidenceTerms.has(term));
}

export function hasUnsupportedQuantitativeClaim(
  claimText: string,
  evidence: EvidenceLink[]
) {
  return hasUnsupportedQuantitativeDetail(
    claimText,
    evidence.map((item) => item.evidenceText).join(" ")
  );
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

    const paperText = `${paper.title} ${paper.abstract ?? ""} ${paper.venue ?? ""} ${
      paper.year ?? ""
    } ${paper.citationCount ?? ""}`;

    if (hasUnsupportedQuantitativeDetail(evidence.evidenceText, paperText)) {
      throw new Error(
        `${input.section} evidence includes quantitative/statistical detail not found in selected paper metadata: ${evidence.paperId}`
      );
    }
  }
}

export function validateClaimGrounding(input: {
  evidence: EvidenceLink[];
  sourcePaperIds: string[];
  section: string;
  claimText: string;
  papers: NormalizedPaper[];
  allowsWeakSupport?: boolean;
}) {
  validateEvidenceLinks({
    evidence: input.evidence,
    sourcePaperIds: input.sourcePaperIds,
    section: input.section,
    papers: input.papers
  });

  if (!hasClaimEvidenceOverlap(input.claimText, input.evidence)) {
    throw new Error(
      `${input.section} claim is not supported by its evidence snippets`
    );
  }

  if (hasUnsupportedAbsoluteClaim(input.claimText, input.evidence)) {
    throw new Error(
      `${input.section} claim is stronger than its evidence snippets`
    );
  }

  if (hasUnsupportedQuantitativeClaim(input.claimText, input.evidence)) {
    throw new Error(
      `${input.section} claim includes quantitative/statistical detail not found in evidence snippets`
    );
  }

  for (const evidence of input.evidence) {
    if (evidence.supportLevel === "weak" && input.allowsWeakSupport === false) {
      throw new Error(`${input.section} has weak evidence without uncertainty caveats`);
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
    validateClaimGrounding({ ...input, papers });
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
