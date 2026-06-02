import { ClaimExtractionResultSchema, type ExtractedClaim } from "@/lib/claimCheck/schemas";

const SCIENCE_TERMS = [
  "ai",
  "algorithm",
  "analysis",
  "badania",
  "benchmark",
  "clinical",
  "data",
  "dataset",
  "evidence",
  "experiment",
  "model",
  "paper",
  "research",
  "study",
  "system",
  "therapy",
  "treatment",
  "uczenie",
  "wyniki"
];

const NON_CLAIM_PATTERNS = [
  /^(thank|thanks|hello|hi|cześć|czesc)\b/i,
  /\?$/,
  /^(i think|wydaje mi sie|moim zdaniem)\b/i
];

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function splitCandidateClaims(text: string) {
  return text
    .replace(/\r/g, "\n")
    .split(/(?<=[.!?])\s+|\n+(?:[-*]\s*)?/)
    .map(normalizeWhitespace)
    .filter((item) => item.length >= 20)
    .slice(0, 30);
}

export function isScientificClaim(value: string) {
  const normalized = value.toLowerCase();
  const hasScienceTerm = SCIENCE_TERMS.some((term) => normalized.includes(term));
  const hasEnglishAssertiveVerb =
    /\b(reduce|improve|cause|show|support|limit)\b/i.test(value);
  const hasAssertiveVerb =
    /\b(is|are|was|were|can|could|may|reduces|improves|causes|shows|supports|limits|jest|sa|są|moze|może|zmniejsza|poprawia|wspiera|powoduje|wykazuje)\b/i.test(
      value
    );
  const isNonClaim = NON_CLAIM_PATTERNS.some((pattern) => pattern.test(value));

  return !isNonClaim && (hasScienceTerm || hasAssertiveVerb || hasEnglishAssertiveVerb);
}

function reasonForClaim(value: string, checkable: boolean) {
  if (checkable) {
    return "Contains an assertive scientific or technical statement that can be compared with literature.";
  }

  if (value.endsWith("?")) {
    return "Question or prompt rather than a claim.";
  }

  return "Does not look like a scientific claim that can be checked against literature.";
}

export function extractCandidateClaims(input: {
  text: string;
  sourceDocumentId?: string;
}) {
  const claims: ExtractedClaim[] = splitCandidateClaims(input.text).map(
    (claimText, index) => {
      const checkable = isScientificClaim(claimText);

      return {
        id: `claim_${index + 1}`,
        claimText,
        checkable,
        suggestedSearchQuery: claimText.slice(0, 220),
        reason: reasonForClaim(claimText, checkable)
      };
    }
  );

  return ClaimExtractionResultSchema.parse({
    sourceDocumentId: input.sourceDocumentId,
    sourceTextPreview: input.text.slice(0, 500),
    claims
  });
}
