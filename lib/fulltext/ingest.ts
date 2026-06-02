import { randomUUID } from "node:crypto";
import { chunkPaperText } from "@/lib/fulltext/chunkText";
import { discoverFullText } from "@/lib/fulltext/discoverFullText";
import { fetchPdf, type FetchPdfInput } from "@/lib/fulltext/fetchPdf";
import { parsePdf } from "@/lib/fulltext/parsePdf";
import { getFullTextRepository } from "@/lib/fulltext/repository";
import type {
  FullTextIngestionResult,
  FullTextRepository,
  FullTextSourceType,
  PaperFullText,
  PaperFullTextStatus
} from "@/lib/fulltext/types";
import type { NormalizedPaper } from "@/lib/sources/types";

export type IngestFullTextOptions = {
  limit?: number;
  repository?: FullTextRepository;
  fetchImpl?: FetchPdfInput["fetchImpl"];
  timeoutMs?: number;
  maxBytes?: number;
  includeMockPapers?: boolean;
};

function nowIso() {
  return new Date().toISOString();
}

function getFullTextLimit() {
  const raw = Number(process.env.FULL_TEXT_MAX_PAPERS_PER_BRIEF);
  return Number.isInteger(raw) && raw > 0 ? raw : 10;
}

function makeFullTextRecord(input: {
  paperId: string;
  status: PaperFullTextStatus;
  sourceType: FullTextSourceType;
  sourceUrl: string | null;
  parserName?: string | null;
  textHash?: string | null;
  extractedAt?: string | null;
  errorMessage?: string | null;
  qualityScore?: number | null;
}): PaperFullText {
  const timestamp = nowIso();

  return {
    id: `paper_fulltext_${randomUUID()}`,
    paperId: input.paperId,
    status: input.status,
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl,
    parserName: input.parserName ?? null,
    textHash: input.textHash ?? null,
    extractedAt: input.extractedAt ?? null,
    errorMessage: input.errorMessage ?? null,
    qualityScore: input.qualityScore ?? null,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function withFullTextStatus(
  paper: NormalizedPaper,
  fullText: PaperFullText,
  chunkCount: number
): NormalizedPaper {
  return {
    ...paper,
    fullTextStatus: fullText.status,
    fullTextSourceType: fullText.sourceType,
    fullTextChunkCount: chunkCount,
    fullTextQualityScore: fullText.qualityScore,
    fullTextErrorMessage: fullText.errorMessage
  };
}

async function ingestOnePaper(
  paper: NormalizedPaper,
  repository: FullTextRepository,
  options: IngestFullTextOptions
): Promise<FullTextIngestionResult> {
  const existing = await repository.getByPaperId(paper.id);

  if (existing?.status === "parsed") {
    const chunks = await repository.getChunksByPaperIds([paper.id]);
    return {
      paper: withFullTextStatus(paper, existing, chunks.length),
      fullText: existing,
      chunks
    };
  }

  const candidate = discoverFullText(paper);

  if (candidate.status === "unavailable" || !candidate.sourceUrl) {
    const fullText = makeFullTextRecord({
      paperId: paper.id,
      status: "unavailable",
      sourceType: candidate.sourceType,
      sourceUrl: candidate.sourceUrl,
      errorMessage: candidate.reason
    });

    await repository.save({ fullText, chunks: [] });
    return {
      paper: withFullTextStatus(paper, fullText, 0),
      fullText,
      chunks: []
    };
  }

  try {
    const fetched = await fetchPdf({
      url: candidate.sourceUrl,
      fetchImpl: options.fetchImpl,
      timeoutMs: options.timeoutMs,
      maxBytes: options.maxBytes
    });
    const parsed = await parsePdf(fetched.bytes);
    const fullText = makeFullTextRecord({
      paperId: paper.id,
      status: "parsed",
      sourceType: candidate.sourceType,
      sourceUrl: candidate.sourceUrl,
      parserName: parsed.parserName,
      textHash: parsed.textHash,
      extractedAt: nowIso(),
      qualityScore: parsed.qualityScore
    });
    const chunks = chunkPaperText({
      paperId: paper.id,
      fullTextId: fullText.id,
      text: parsed.text
    });

    await repository.save({ fullText, chunks });
    return {
      paper: withFullTextStatus(paper, fullText, chunks.length),
      fullText,
      chunks
    };
  } catch (error) {
    const fullText = makeFullTextRecord({
      paperId: paper.id,
      status: "failed",
      sourceType: candidate.sourceType,
      sourceUrl: candidate.sourceUrl,
      errorMessage:
        error instanceof Error ? error.message : "PDF fetch or parse failed."
    });

    await repository.save({ fullText, chunks: [] });
    return {
      paper: withFullTextStatus(paper, fullText, 0),
      fullText,
      chunks: []
    };
  }
}

export async function ingestFullTextForPapers(
  papers: NormalizedPaper[],
  options: IngestFullTextOptions = {}
) {
  const repository = options.repository ?? (await getFullTextRepository());
  const limit = options.limit ?? getFullTextLimit();
  const includeMockPapers =
    options.includeMockPapers ??
    ["1", "true", "yes"].includes(
      (process.env.FULL_TEXT_INGEST_MOCK_PAPERS ?? "").toLowerCase()
    );
  const selected = papers
    .filter((paper) => includeMockPapers || paper.source !== "mock")
    .slice(0, limit);
  const selectedIds = new Set(selected.map((paper) => paper.id));
  const resultPapers = new Map(papers.map((paper) => [paper.id, paper]));
  const results: FullTextIngestionResult[] = [];

  for (const paper of selected) {
    const result = await ingestOnePaper(paper, repository, options);
    resultPapers.set(paper.id, result.paper);
    results.push(result);
  }

  return {
    papers: papers.map((paper) =>
      selectedIds.has(paper.id)
        ? resultPapers.get(paper.id) ?? paper
        : { ...paper, fullTextStatus: paper.fullTextStatus ?? "not_checked" }
    ),
    results
  };
}
