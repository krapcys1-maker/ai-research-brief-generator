import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chunkPaperText } from "@/lib/fulltext/chunkText";
import { fetchPdf } from "@/lib/fulltext/fetchPdf";
import {
  createPdfParseDiagnostics,
  parseExtractedPdfText
} from "@/lib/fulltext/parsePdf";

function pdfFixtureText(filename: string) {
  return readFileSync(
    join(process.cwd(), "tests", "fixtures", "pdf-parser", filename),
    "utf8"
  );
}

describe("full-text fetch, parse, and chunking", () => {
  it("enforces max PDF size from content-length", async () => {
    const fetchImpl = async () =>
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-length": "1000"
        }
      });

    await expect(
      fetchPdf({
        url: "https://example.org/paper.pdf",
        maxBytes: 10,
        fetchImpl
      })
    ).rejects.toThrow("too large");
  });

  it("handles PDF fetch timeout", async () => {
    const fetchImpl = (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      });

    await expect(
      fetchPdf({
        url: "https://example.org/slow.pdf",
        timeoutMs: 5,
        fetchImpl: fetchImpl as typeof fetch
      })
    ).rejects.toThrow("timed out");
  });

  it("enforces max PDF size while streaming when content-length is missing", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3, 4, 5]));
        controller.enqueue(new Uint8Array([6, 7, 8, 9, 10, 11]));
        controller.close();
      }
    });
    const fetchImpl = async () =>
      new Response(stream, {
        status: 200,
        headers: {
          "content-type": "application/pdf"
        }
      });

    await expect(
      fetchPdf({
        url: "https://example.org/large.pdf",
        maxBytes: 10,
        fetchImpl
      })
    ).rejects.toThrow("too large");
  });

  it("marks unusable extracted PDF text as failed", () => {
    expect(() => parseExtractedPdfText("too short")).toThrow("too short");
  });

  it("records parser diagnostics for extracted PDF text fixtures", () => {
    const pageOne = pdfFixtureText("recorded-arxiv-extracted.txt");
    const parsed = parseExtractedPdfText(`${pageOne}\n\n`, {
      pageTexts: [pageOne, ""]
    });

    expect(parsed.parserName).toBe("pdf-parse");
    expect(parsed.parserVersion).toBe("pdf-parse");
    expect(parsed.text).toContain("Retrieval augmented generation");
    expect(parsed.textHash).toHaveLength(64);
    expect(parsed.qualityScore).toBeGreaterThan(0.3);
    expect(parsed.diagnostics).toMatchObject({
      parserName: "pdf-parse",
      parserVersion: "pdf-parse",
      pageCount: 2,
      emptyPageCount: 1
    });
    expect(parsed.diagnostics.characterCount).toBe(parsed.text.length);
    expect(parsed.diagnostics.wordCount).toBeGreaterThan(80);
    expect(parsed.diagnostics.alphanumericRatio).toBeGreaterThan(0.45);
    expect(parsed.diagnostics.warnings).toContain(
      "parser warning: 1 extracted PDF page(s) were empty."
    );
  });

  it("warns when parser diagnostics show low-quality extracted text", () => {
    const diagnostics = createPdfParseDiagnostics("@@@ ### !!!", {
      pageTexts: ["@@@ ### !!!"]
    });

    expect(diagnostics.qualityScore).toBeLessThan(0.35);
    expect(diagnostics.warnings).toEqual(
      expect.arrayContaining([
        "parser warning: extracted PDF text has a low word count.",
        "parser warning: extracted PDF text has a low character count.",
        "parser warning: extracted PDF text has a low alphanumeric ratio.",
        "parser warning: extracted PDF quality score is low."
      ])
    );
  });

  it("chunks paper text while preserving paperId and chunkIndex", () => {
    const text = Array.from({ length: 220 }, (_, index) => `token${index}`).join(" ");
    const chunks = chunkPaperText({
      paperId: "paper_1",
      fullTextId: "fulltext_1",
      text,
      chunkSizeTokens: 80,
      overlapTokens: 10
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toMatchObject({
      paperId: "paper_1",
      chunkIndex: 0,
      evidenceLevel: "full_text_supported"
    });
    expect(chunks[1].chunkIndex).toBe(1);
  });
});
