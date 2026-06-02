import { describe, expect, it } from "vitest";
import { chunkPaperText } from "@/lib/fulltext/chunkText";
import { fetchPdf } from "@/lib/fulltext/fetchPdf";
import { parseExtractedPdfText } from "@/lib/fulltext/parsePdf";

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
