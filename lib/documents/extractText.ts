import { createHash } from "node:crypto";
import type { ExtractedDocumentText } from "@/lib/documents/types";

export function hashText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function cleanExtractedText(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function qualityScore(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const alphanumeric = text.replace(/[^a-z0-9ąćęłńóśźż]/gi, "").length;
  const ratio = text.length ? alphanumeric / text.length : 0;

  return Math.max(0, Math.min(1, Math.min(words / 250, 1) * 0.6 + ratio * 0.4));
}

function assertUsableText(text: string) {
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length < 20 || text.length < 120) {
    throw new Error("Extracted text is too short to use for grounded Q&A.");
  }
}

export async function extractTextFromUpload(input: {
  bytes: Uint8Array;
  kind: "pdf" | "text" | "markdown";
}): Promise<ExtractedDocumentText> {
  if (input.kind === "text" || input.kind === "markdown") {
    const text = cleanExtractedText(new TextDecoder("utf-8").decode(input.bytes));
    assertUsableText(text);

    return {
      text,
      parserName: input.kind === "markdown" ? "text-md" : "text-plain",
      qualityScore: qualityScore(text)
    };
  }

  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: Buffer.from(input.bytes) });

  try {
    const result = await parser.getText();
    const text = cleanExtractedText(result.text ?? "");
    assertUsableText(text);

    return {
      text,
      parserName: "pdf-parse",
      qualityScore: qualityScore(text)
    };
  } finally {
    await parser.destroy();
  }
}
