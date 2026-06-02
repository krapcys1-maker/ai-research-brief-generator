import { describe, expect, it } from "vitest";
import { discoverFullText } from "@/lib/fulltext/discoverFullText";
import { createPaper } from "@/tests/fixtures";

describe("discoverFullText", () => {
  it("returns a legal arXiv PDF URL for arxivId", () => {
    const result = discoverFullText(createPaper({ arxivId: "2401.12345" }));

    expect(result).toMatchObject({
      status: "available",
      sourceType: "arxiv",
      sourceUrl: "https://arxiv.org/pdf/2401.12345"
    });
  });

  it("uses pdfUrl when available", () => {
    const result = discoverFullText(
      createPaper({
        arxivId: null,
        pdfUrl: "https://example.org/open-paper.pdf"
      })
    );

    expect(result).toMatchObject({
      status: "available",
      sourceType: "source_pdf_url",
      sourceUrl: "https://example.org/open-paper.pdf"
    });
  });

  it("rejects private or local pdfUrl candidates", () => {
    for (const pdfUrl of [
      "http://localhost/paper.pdf",
      "http://127.0.0.1/paper.pdf",
      "http://10.0.0.5/paper.pdf",
      "http://172.16.0.10/paper.pdf",
      "http://192.168.1.20/paper.pdf",
      "http://169.254.169.254/latest/meta-data"
    ]) {
      const result = discoverFullText(createPaper({ arxivId: null, pdfUrl }));

      expect(result.status).toBe("unavailable");
      expect(result.sourceUrl).toBeNull();
    }
  });

  it("returns unavailable when no legal PDF source exists", () => {
    const result = discoverFullText(createPaper({ arxivId: null, pdfUrl: null }));

    expect(result.status).toBe("unavailable");
    expect(result.sourceUrl).toBeNull();
  });
});
