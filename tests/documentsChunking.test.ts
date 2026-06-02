import { describe, expect, it } from "vitest";
import { chunkText } from "@/lib/documents/chunkText";

describe("chunkText", () => {
  it("preserves document IDs and chunk indexes", () => {
    const text = Array.from({ length: 1300 }, (_, index) => `token${index}`).join(" ");
    const chunks = chunkText({
      documentId: "doc_1",
      sessionId: "session_1",
      text,
      chunkSizeTokens: 500,
      overlapTokens: 50
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toMatchObject({
      documentId: "doc_1",
      sessionId: "session_1",
      chunkIndex: 0,
      evidenceLevel: "uploaded_document_supported"
    });
    expect(chunks[1].chunkIndex).toBe(1);
    expect(chunks[1].id).toBe("doc_1:chunk_1");
  });
});
