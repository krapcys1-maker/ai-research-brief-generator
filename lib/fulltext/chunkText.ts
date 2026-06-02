import type { PaperTextChunk } from "@/lib/fulltext/types";

export type ChunkPaperTextInput = {
  paperId: string;
  fullTextId: string;
  text: string;
  chunkSizeTokens?: number;
  overlapTokens?: number;
  pageStart?: number | null;
  pageEnd?: number | null;
};

const SECTION_PATTERNS = [
  "Abstract",
  "Introduction",
  "Related Work",
  "Methods",
  "Methodology",
  "Results",
  "Discussion",
  "Limitations",
  "Conclusion"
];

function cleanText(value: string) {
  return value
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function tokenEstimate(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

function detectSectionTitle(text: string) {
  const firstSlice = text.slice(0, 500);
  const found = SECTION_PATTERNS.find((section) =>
    new RegExp(`(^|\\n)\\s*${section}\\s*(\\n|$|[:.])`, "i").test(firstSlice)
  );

  return found ?? null;
}

export function chunkPaperText(input: ChunkPaperTextInput): PaperTextChunk[] {
  const chunkSize = input.chunkSizeTokens ?? 1000;
  const overlap = input.overlapTokens ?? 140;
  const cleaned = cleanText(input.text);
  const tokens = cleaned.split(/\s+/).filter(Boolean);

  if (!tokens.length) {
    return [];
  }

  const chunks: PaperTextChunk[] = [];
  let start = 0;

  while (start < tokens.length) {
    const end = Math.min(tokens.length, start + chunkSize);
    const text = tokens.slice(start, end).join(" ");
    const index = chunks.length;

    chunks.push({
      id: `${input.fullTextId}:chunk_${index}`,
      paperId: input.paperId,
      fullTextId: input.fullTextId,
      sectionTitle: detectSectionTitle(text),
      chunkIndex: index,
      text,
      tokenEstimate: tokenEstimate(text),
      pageStart: input.pageStart ?? null,
      pageEnd: input.pageEnd ?? null,
      evidenceLevel: "full_text_supported"
    });

    if (end >= tokens.length) {
      break;
    }

    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}
