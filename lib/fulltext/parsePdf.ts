import { createHash } from "node:crypto";

export type ParsedPdfText = {
  text: string;
  parserName: string;
  qualityScore: number;
  textHash: string;
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

function qualityScore(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const alphanumeric = text.replace(/[^a-z0-9]/gi, "").length;
  const ratio = text.length ? alphanumeric / text.length : 0;

  return Math.max(0, Math.min(1, Math.min(words / 1200, 1) * 0.65 + ratio * 0.35));
}

export function hashFullText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function parseExtractedPdfText(value: string): ParsedPdfText {
  const text = cleanExtractedText(value);
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length < 80 || text.length < 500) {
    throw new Error("Parsed PDF text is too short or unusable.");
  }

  return {
    text,
    parserName: "pdf-parse",
    qualityScore: qualityScore(text),
    textHash: hashFullText(text)
  };
}

export async function parsePdf(bytes: Uint8Array): Promise<ParsedPdfText> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: Buffer.from(bytes) });

  try {
    const result = await parser.getText();
    return parseExtractedPdfText(result.text ?? "");
  } finally {
    await parser.destroy();
  }
}
