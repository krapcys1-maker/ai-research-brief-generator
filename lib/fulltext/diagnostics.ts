import type { NormalizedPaper } from "@/lib/sources/types";

type SerializedPdfDiagnostics = {
  type?: string;
  parserName?: string;
  parserVersion?: string;
  pageCount?: number;
  emptyPageCount?: number;
  characterCount?: number;
  wordCount?: number;
  alphanumericRatio?: number;
  qualityScore?: number;
  warnings?: unknown;
};

export type FullTextParserWarning = {
  label: string;
  detail: string;
};

const LOW_QUALITY_THRESHOLD = 0.35;

function parseSerializedDiagnostics(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as SerializedPdfDiagnostics;

    if (parsed.type !== "pdf_parse_diagnostics") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function stripParserPrefix(value: string) {
  return value.replace(/^parser warning:\s*/i, "").trim();
}

export function getFullTextParserWarnings(
  paper: Pick<
    NormalizedPaper,
    | "fullTextStatus"
    | "fullTextChunkCount"
    | "fullTextQualityScore"
    | "fullTextErrorMessage"
  >
): FullTextParserWarning[] {
  const diagnostics = parseSerializedDiagnostics(paper.fullTextErrorMessage);
  const qualityScore =
    typeof diagnostics?.qualityScore === "number"
      ? diagnostics.qualityScore
      : paper.fullTextQualityScore;
  const warnings: FullTextParserWarning[] = [];
  const diagnosticWarnings = Array.isArray(diagnostics?.warnings)
    ? diagnostics.warnings.filter((item): item is string => typeof item === "string")
    : [];

  for (const warning of diagnosticWarnings) {
    warnings.push({
      label: "Parser warning",
      detail: stripParserPrefix(warning)
    });
  }

  if (
    paper.fullTextStatus === "parsed" &&
    typeof qualityScore === "number" &&
    qualityScore < LOW_QUALITY_THRESHOLD &&
    !warnings.some((warning) => warning.detail.toLowerCase().includes("quality"))
  ) {
    warnings.push({
      label: "Low parser quality",
      detail: `Extracted text quality score is ${qualityScore.toFixed(2)}. Treat full-text evidence from this PDF as weak until manually checked.`
    });
  }

  if (paper.fullTextStatus === "parsed" && (paper.fullTextChunkCount ?? 0) === 0) {
    warnings.push({
      label: "No parsed chunks",
      detail:
        "The PDF was marked parsed, but no retrievable full-text chunks were stored."
    });
  }

  if (paper.fullTextStatus === "failed" && paper.fullTextErrorMessage?.trim()) {
    warnings.push({
      label: "Full-text extraction failed",
      detail: paper.fullTextErrorMessage.trim()
    });
  }

  return warnings;
}
