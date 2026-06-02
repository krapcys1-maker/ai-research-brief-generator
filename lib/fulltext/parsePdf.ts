import { createHash } from "node:crypto";

export type ParsedPdfText = {
  text: string;
  parserName: string;
  parserVersion: string;
  qualityScore: number;
  textHash: string;
  diagnostics: PdfParseDiagnostics;
};

export type PdfParseDiagnostics = {
  parserName: string;
  parserVersion: string;
  pageCount: number | null;
  emptyPageCount: number | null;
  characterCount: number;
  wordCount: number;
  alphanumericRatio: number;
  qualityScore: number;
  warnings: string[];
};

export type ParseExtractedPdfTextOptions = {
  pageCount?: number | null;
  pageTexts?: string[];
};

function cleanExtractedText(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function getWords(text: string) {
  return text.split(/\s+/).filter(Boolean);
}

function getAlphanumericRatio(text: string) {
  const alphanumeric = text.replace(/[^a-z0-9]/gi, "").length;

  return text.length ? alphanumeric / text.length : 0;
}

function qualityScore(text: string) {
  const words = getWords(text).length;
  const ratio = getAlphanumericRatio(text);

  return Math.max(0, Math.min(1, Math.min(words / 1200, 1) * 0.65 + ratio * 0.35));
}

export function hashFullText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function getEmptyPageCount(pageTexts: string[] | undefined) {
  if (!pageTexts?.length) {
    return null;
  }

  return pageTexts.filter((page) => cleanExtractedText(page).length === 0).length;
}

function getWarnings(input: {
  wordCount: number;
  characterCount: number;
  alphanumericRatio: number;
  pageCount: number | null;
  emptyPageCount: number | null;
  qualityScore: number;
}) {
  const warnings: string[] = [];

  if (input.pageCount !== null && input.pageCount <= 0) {
    warnings.push("parser warning: PDF parser reported no pages.");
  }

  if (input.emptyPageCount !== null && input.emptyPageCount > 0) {
    warnings.push(
      `parser warning: ${input.emptyPageCount} extracted PDF page(s) were empty.`
    );
  }

  if (input.wordCount < 120) {
    warnings.push("parser warning: extracted PDF text has a low word count.");
  }

  if (input.characterCount < 1000) {
    warnings.push("parser warning: extracted PDF text has a low character count.");
  }

  if (input.alphanumericRatio < 0.45) {
    warnings.push(
      "parser warning: extracted PDF text has a low alphanumeric ratio."
    );
  }

  if (input.qualityScore < 0.35) {
    warnings.push("parser warning: extracted PDF quality score is low.");
  }

  return warnings;
}

export function createPdfParseDiagnostics(
  value: string,
  options: ParseExtractedPdfTextOptions = {}
): PdfParseDiagnostics {
  const text = cleanExtractedText(value);
  const wordCount = getWords(text).length;
  const characterCount = text.length;
  const alphanumericRatio = getAlphanumericRatio(text);
  const score = qualityScore(text);
  const pageCount =
    typeof options.pageCount === "number"
      ? options.pageCount
      : options.pageTexts?.length
        ? options.pageTexts.length
        : null;
  const emptyPageCount = getEmptyPageCount(options.pageTexts);

  return {
    parserName: "pdf-parse",
    parserVersion: "pdf-parse",
    pageCount,
    emptyPageCount,
    characterCount,
    wordCount,
    alphanumericRatio,
    qualityScore: score,
    warnings: getWarnings({
      wordCount,
      characterCount,
      alphanumericRatio,
      pageCount,
      emptyPageCount,
      qualityScore: score
    })
  };
}

export function parseExtractedPdfText(
  value: string,
  options: ParseExtractedPdfTextOptions = {}
): ParsedPdfText {
  const text = cleanExtractedText(value);
  const diagnostics = createPdfParseDiagnostics(value, options);

  if (diagnostics.wordCount < 80 || diagnostics.characterCount < 500) {
    throw new Error("Parsed PDF text is too short or unusable.");
  }

  return {
    text,
    parserName: "pdf-parse",
    parserVersion: diagnostics.parserVersion,
    qualityScore: diagnostics.qualityScore,
    textHash: hashFullText(text),
    diagnostics
  };
}

function getPdfParsePageCount(result: {
  total?: unknown;
  pages?: unknown;
  pageCount?: unknown;
  numpages?: unknown;
}) {
  for (const value of [result.total, result.pageCount, result.numpages]) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  if (Array.isArray(result.pages)) {
    return result.pages.length;
  }

  return null;
}

export async function parsePdf(bytes: Uint8Array): Promise<ParsedPdfText> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: Buffer.from(bytes) });

  try {
    const result = await parser.getText();
    return parseExtractedPdfText(result.text ?? "", {
      pageCount: getPdfParsePageCount(result)
    });
  } finally {
    await parser.destroy();
  }
}
