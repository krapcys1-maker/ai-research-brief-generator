import { randomUUID } from "node:crypto";
import {
  ClaimCheckItemSchema,
  ClaimCheckReportSchema,
  type ClaimCheckItem,
  type ClaimCheckRequest,
  type ClaimEvidenceBoundary,
  type ClaimEvidenceSnippet,
  type RelatedPaper,
  type SimilarWorkItem
} from "@/lib/claimCheck/schemas";
import { isScientificClaim } from "@/lib/claimCheck/extractClaims";
import type { UserDocumentChunk } from "@/lib/documents/schemas";
import type { DocumentRepository } from "@/lib/documents/types";
import { getFullTextRepository } from "@/lib/fulltext/repository";
import { retrievePaperTextChunks } from "@/lib/fulltext/retrieval";
import { dedupePapers } from "@/lib/pipeline/dedupe";
import { scorePapersForQueriesHybrid, selectTopPapers } from "@/lib/pipeline/score";
import { searchAllSources, type SearchAllSourcesResult } from "@/lib/sources";
import type { NormalizedPaper } from "@/lib/sources/types";

type CompareDependencies = {
  search?: typeof searchAllSources;
  documentRepository?: DocumentRepository;
};

type DocumentSource = {
  ownerId?: string | null;
  workspaceId?: string | null;
  sessionId?: string | null;
};

const BROAD_PATTERNS = [
  /\ball\b/i,
  /\balways\b/i,
  /\bnever\b/i,
  /\bdefinitely\b/i,
  /\bguarantees?\b/i,
  /\bkażd/i,
  /\bzawsze\b/i,
  /\bnigdy\b/i,
  /\bgwarant/i
];

const DEAD_END_PATTERNS = [
  /\bdead end\b/i,
  /\bimpossible\b/i,
  /\bdoes not work\b/i,
  /\bfails to\b/i,
  /\bnie dziala\b/i,
  /\bniemożliw/i,
  /\bniemozliw/i
];

const CONTRADICTION_PATTERNS = [
  /\bnot\b/i,
  /\bno evidence\b/i,
  /\bdoes not\b/i,
  /\bfails to\b/i,
  /\binsufficient\b/i,
  /\bnie\b/i,
  /\bbrak dowod/i,
  /\bniewystarczaj/i
];

function tokenize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 3);
}

function overlapScore(left: string, right: string) {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return overlap / Math.min(leftTokens.size, 12);
}

function truncateEvidence(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 420 ? `${cleaned.slice(0, 417).trim()}...` : cleaned;
}

function paperUrl(paper: NormalizedPaper) {
  return paper.sourceUrls[0] ?? null;
}

function evidenceBoundaryForPaper(paper: NormalizedPaper): ClaimEvidenceBoundary {
  if (paper.fullTextStatus === "parsed") {
    return "full_text_supported";
  }

  if (paper.abstract?.trim()) {
    return "abstract_supported";
  }

  return "metadata_only";
}

function relatedPaper(paper: NormalizedPaper): RelatedPaper {
  return {
    paperId: paper.id,
    title: paper.title,
    authors: paper.authors,
    year: paper.year,
    url: paperUrl(paper),
    doi: paper.doi,
    evidenceBoundary: evidenceBoundaryForPaper(paper)
  };
}

function similarWorkItem(
  paper: NormalizedPaper,
  reasonRelevant: string,
  noveltyImplication: SimilarWorkItem["noveltyImplication"]
): SimilarWorkItem {
  return {
    paperId: paper.id,
    title: paper.title,
    authors: paper.authors,
    year: paper.year,
    reasonRelevant,
    similarityType: "same_problem",
    noveltyImplication
  };
}

async function safeSearchClaim(
  claim: string,
  request: ClaimCheckRequest,
  search: typeof searchAllSources
): Promise<SearchAllSourcesResult> {
  try {
    return await search({
      query: claim,
      queryVariants: [claim, `${claim} systematic review`, `${claim} benchmark`],
      maxResults: request.maxPapers * 2,
      sources: request.sources
    });
  } catch {
    return {
      papers: [],
      sourcesUsed: [],
      warnings: [],
      sourceDiagnostics: []
    };
  }
}

async function selectedPapersForClaim(
  claim: string,
  request: ClaimCheckRequest,
  search: typeof searchAllSources
) {
  const result = await safeSearchClaim(claim, request, search);
  const deduped = dedupePapers(result.papers);
  const scored = await scorePapersForQueriesHybrid(deduped, [claim]);
  return selectTopPapers(scored, request.maxPapers);
}

function documentEvidenceForClaim(
  claim: string,
  chunks: UserDocumentChunk[]
): ClaimEvidenceSnippet[] {
  return chunks
    .map((chunk) => ({ chunk, score: overlapScore(claim, chunk.text) }))
    .filter((item) => item.score >= 0.18)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item, index) => ({
      id: `doc_ev_${index}_${item.chunk.id}`,
      sourceType: "user_document" as const,
      sourceId: item.chunk.documentId,
      documentId: item.chunk.documentId,
      chunkId: item.chunk.id,
      text: truncateEvidence(item.chunk.text),
      sectionTitle: item.chunk.sectionTitle,
      evidenceLevel: "uploaded_document_supported" as const,
      supportRelation: "contextual" as const
    }));
}

async function paperEvidenceForClaim(
  claim: string,
  papers: NormalizedPaper[]
): Promise<ClaimEvidenceSnippet[]> {
  const fullTextRepository = await getFullTextRepository().catch(() => null);
  const fullTextChunks = fullTextRepository
    ? await fullTextRepository
        .getChunksByPaperIds(papers.map((paper) => paper.id))
        .catch(() => [])
    : [];
  const retrievedFullText = retrievePaperTextChunks({
    question: claim,
    chunks: fullTextChunks,
    topK: 3
  });

  const fullTextEvidence = retrievedFullText.map((item, index) => ({
    id: `paper_full_ev_${index}_${item.chunk.id}`,
    sourceType: "paper_full_text" as const,
    sourceId: item.chunk.fullTextId,
    paperId: item.chunk.paperId,
    chunkId: item.chunk.id,
    text: truncateEvidence(item.chunk.text),
    sectionTitle: item.chunk.sectionTitle,
    evidenceLevel: "full_text_supported" as const,
    supportRelation: supportRelationForEvidence(claim, item.chunk.text)
  }));

  if (fullTextEvidence.length) {
    return fullTextEvidence;
  }

  return papers
    .map((paper) => {
      const text = paper.abstract?.trim() || [paper.title, paper.venue, paper.year].filter(Boolean).join(" ");
      return { paper, text, score: overlapScore(claim, text) };
    })
    .filter((item) => item.score >= 0.12)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item, index) => ({
      id: `paper_ev_${index}_${item.paper.id}`,
      sourceType: item.paper.abstract ? ("paper_abstract" as const) : ("paper_metadata" as const),
      sourceId: item.paper.id,
      paperId: item.paper.id,
      text: truncateEvidence(item.text),
      sectionTitle: item.paper.abstract ? "Abstract" : null,
      evidenceLevel: item.paper.abstract
        ? ("abstract_supported" as const)
        : ("metadata_only" as const),
      supportRelation: supportRelationForEvidence(claim, item.text)
    }));
}

function supportRelationForEvidence(
  claim: string,
  evidence: string
): ClaimEvidenceSnippet["supportRelation"] {
  const claimNegative = CONTRADICTION_PATTERNS.some((pattern) => pattern.test(claim));
  const evidenceNegative = CONTRADICTION_PATTERNS.some((pattern) =>
    pattern.test(evidence)
  );

  if (claimNegative !== evidenceNegative && overlapScore(claim, evidence) >= 0.2) {
    return "contradicts";
  }

  const score = overlapScore(claim, evidence);
  if (score >= 0.45) {
    return "supports";
  }

  if (score >= 0.25) {
    return "partially_supports";
  }

  return "weak";
}

function boundaryForEvidence(snippets: ClaimEvidenceSnippet[]): ClaimEvidenceBoundary {
  const levels = new Set(snippets.map((snippet) => snippet.evidenceLevel));

  if (!levels.size) {
    return "insufficient_evidence";
  }

  if (levels.size > 1) {
    return "mixed_evidence";
  }

  return [...levels][0] ?? "insufficient_evidence";
}

function classifyClaim(input: {
  claim: string;
  evidence: ClaimEvidenceSnippet[];
  papers: NormalizedPaper[];
}): Pick<
  ClaimCheckItem,
  | "classification"
  | "confidence"
  | "explanation"
  | "whatMatchesScience"
  | "whatDoesNotMatchScience"
  | "caveats"
  | "suggestedRevision"
> {
  if (!isScientificClaim(input.claim)) {
    return {
      classification: "not_scientific_claim",
      confidence: "high",
      explanation: "This does not read as a scientific claim that can be checked against literature.",
      whatMatchesScience: [],
      whatDoesNotMatchScience: [],
      caveats: ["No literature comparison was attempted for this item."],
      suggestedRevision: null
    };
  }

  if (BROAD_PATTERNS.some((pattern) => pattern.test(input.claim))) {
    return {
      classification: "too_broad",
      confidence: "medium",
      explanation:
        "The wording is broader than retrieved evidence can responsibly support.",
      whatMatchesScience: [],
      whatDoesNotMatchScience: ["The claim uses absolute or overly broad wording."],
      caveats: ["Narrow the population, method, dataset, or evaluation context."],
      suggestedRevision: `A narrower version to check: ${input.claim.replace(/\b(all|always|never|definitely|guarantees?)\b/gi, "may")}`
    };
  }

  if (!input.evidence.length) {
    return {
      classification: "insufficient_evidence",
      confidence: "low",
      explanation:
        "Retrieved sources did not provide enough evidence to classify support for this claim.",
      whatMatchesScience: [],
      whatDoesNotMatchScience: [],
      caveats: ["This is not proof that the claim is wrong; retrieval may have missed relevant sources."],
      suggestedRevision: null
    };
  }

  if (
    DEAD_END_PATTERNS.some((pattern) => pattern.test(input.claim)) ||
    input.evidence.some((snippet) => snippet.supportRelation === "contradicts")
  ) {
    const hasContradiction = input.evidence.some(
      (snippet) => snippet.supportRelation === "contradicts"
    );

    return {
      classification: hasContradiction ? "contradicted" : "possible_dead_end",
      confidence: hasContradiction ? "medium" : "low",
      explanation: hasContradiction
        ? "Some retrieved evidence conflicts with the claim."
        : "Available evidence suggests this direction may be weak, but this is not a definitive judgment.",
      whatMatchesScience: [],
      whatDoesNotMatchScience: input.evidence
        .filter((snippet) => snippet.supportRelation === "contradicts")
        .map((snippet) => snippet.text),
      caveats: [
        "Scientific evidence is not binary; this classification only reflects retrieved sources.",
        "Full-text review may be required before making a strong judgment."
      ],
      suggestedRevision: `A safer wording: available retrieved evidence does not yet strongly support that ${input.claim}`
    };
  }

  const strongMatches = input.evidence.filter(
    (snippet) => snippet.supportRelation === "supports"
  );
  const partialMatches = input.evidence.filter(
    (snippet) => snippet.supportRelation === "partially_supports"
  );

  if (strongMatches.length >= 2 || input.papers.some((paper) => overlapScore(input.claim, paper.title) >= 0.55)) {
    return {
      classification: "already_known_or_done",
      confidence: "medium",
      explanation:
        "Retrieved papers appear to address a very similar claim, method, or problem.",
      whatMatchesScience: strongMatches.map((snippet) => snippet.text),
      whatDoesNotMatchScience: [],
      caveats: ["This does not prove the idea is not novel; it indicates similar prior work exists."],
      suggestedRevision: `Position the claim as an extension or comparison against existing work: ${input.claim}`
    };
  }

  if (strongMatches.length) {
    return {
      classification: "supported",
      confidence: "medium",
      explanation: "Retrieved evidence supports the claim within the available evidence boundary.",
      whatMatchesScience: strongMatches.map((snippet) => snippet.text),
      whatDoesNotMatchScience: [],
      caveats: ["Support is limited to retrieved sources and available evidence levels."],
      suggestedRevision: null
    };
  }

  if (partialMatches.length || input.evidence.length) {
    return {
      classification: "partially_supported",
      confidence: "low",
      explanation:
        "Retrieved evidence is related but does not fully establish the claim as written.",
      whatMatchesScience: input.evidence.map((snippet) => snippet.text),
      whatDoesNotMatchScience: ["The claim may need narrower wording or stronger source coverage."],
      caveats: ["Do not treat this as definitive support."],
      suggestedRevision: `A safer wording: retrieved sources partially relate to the idea that ${input.claim}`
    };
  }

  return {
    classification: "insufficient_evidence",
    confidence: "low",
    explanation: "Retrieved evidence was too weak to classify the claim.",
    whatMatchesScience: [],
    whatDoesNotMatchScience: [],
    caveats: ["Try a narrower claim or add more sources."],
    suggestedRevision: null
  };
}

export async function compareClaimsWithScience(input: {
  request: ClaimCheckRequest;
  documentSource?: DocumentSource;
  dependencies?: CompareDependencies;
}) {
  const search = input.dependencies?.search ?? searchAllSources;
  const documentChunks =
    input.request.sourceDocumentId && input.dependencies?.documentRepository
      ? await input.dependencies.documentRepository.listChunks({
          source: {
            ownerId: input.documentSource?.ownerId ?? null,
            workspaceId: input.documentSource?.workspaceId ?? null,
            sessionId: input.documentSource?.sessionId ?? null
          },
          documentIds: [input.request.sourceDocumentId]
        })
      : [];

  const items: ClaimCheckItem[] = [];
  const similarWorkMap = new Map<string, SimilarWorkItem>();

  for (const claim of input.request.claims) {
    const papers = isScientificClaim(claim)
      ? await selectedPapersForClaim(claim, input.request, search)
      : [];
    const paperEvidence = papers.length ? await paperEvidenceForClaim(claim, papers) : [];
    const userEvidence = documentEvidenceForClaim(claim, documentChunks);
    const evidence = [...paperEvidence, ...userEvidence].slice(0, 6);
    const relatedPapers = papers.slice(0, 5).map(relatedPaper);
    const classification = classifyClaim({ claim, evidence, papers });

    for (const paper of papers.slice(0, 3)) {
      const reason =
        overlapScore(claim, paper.title) >= 0.55
          ? "Paper title closely overlaps with the claim."
          : "Paper was retrieved as related literature for this claim.";
      const noveltyImplication =
        classification.classification === "already_known_or_done"
          ? "already_done"
          : "unclear";
      similarWorkMap.set(
        paper.id,
        similarWorkItem(paper, reason, noveltyImplication)
      );
    }

    items.push(
      ClaimCheckItemSchema.parse({
        claimText: claim,
        ...classification,
        evidenceSnippets: evidence,
        relatedPapers,
        evidenceBoundary: boundaryForEvidence(evidence)
      })
    );
  }

  const report = ClaimCheckReportSchema.parse({
    id: `claim_report_${randomUUID()}`,
    title: "Compare With Science Report",
    sourceDocumentId: input.request.sourceDocumentId,
    createdAt: new Date().toISOString(),
    summary:
      "This is not a definitive scientific review. It compares your claims with retrieved sources and available evidence.",
    items,
    similarWork: [...similarWorkMap.values()].slice(0, 10),
    overallCaveats: [
      "The report uses retrieved sources and available evidence only.",
      "Do not interpret classifications as true/false verdicts.",
      "Full-text evidence is used only where parsed chunks are available; otherwise the boundary is abstract or metadata."
    ],
    recommendedNextSteps: [
      "Review the cited papers manually.",
      "Narrow claims that were too broad or only partially supported.",
      "Run a deeper full-text review before making scientific, clinical, legal, financial, or product decisions."
    ]
  });

  return report;
}
