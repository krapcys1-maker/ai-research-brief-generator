import { beforeEach, describe, expect, it } from "vitest";
import { chunkText } from "@/lib/documents/chunkText";
import { inMemoryDocumentRepository } from "@/lib/documents/inMemoryDocumentRepository";
import { retrieveDocumentChunks } from "@/lib/documents/retrieval";
import type { UserDocument } from "@/lib/documents/schemas";

function createDocument(id: string, filename: string): UserDocument {
  return {
    id,
    ownerId: null,
    sessionId: "session_a",
    filename,
    mimeType: "text/markdown",
    sizeBytes: 1000,
    status: "parsed",
    textHash: `${id}_hash`,
    createdAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
    privacyScope: "session",
    errorMessage: null
  };
}

function repeated(prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => `${prefix}${index}`).join(" ");
}

describe("document retrieval", () => {
  beforeEach(async () => {
    await inMemoryDocumentRepository.clear();
  });

  it("finds the relevant chunk inside longer multi-document uploads", async () => {
    const protocolChunks = chunkText({
      documentId: "doc_protocol",
      sessionId: "session_a",
      chunkSizeTokens: 60,
      overlapTokens: 8,
      text: [
        repeated("intro", 120),
        "The protocol requires dosage titration monitoring and adverse event review every week.",
        repeated("appendix", 120)
      ].join(" ")
    });
    const budgetChunks = chunkText({
      documentId: "doc_budget",
      sessionId: "session_a",
      chunkSizeTokens: 60,
      overlapTokens: 8,
      text: [
        repeated("finance", 80),
        "The budget memo discusses vendor costs procurement approval and invoice cadence.",
        repeated("ledger", 80)
      ].join(" ")
    });

    const results = await retrieveDocumentChunks({
      question: "What does the protocol say about dosage titration and adverse events?",
      chunks: [...protocolChunks, ...budgetChunks],
      topK: 3
    });

    expect(results[0]?.chunk.documentId).toBe("doc_protocol");
    expect(results[0]?.chunk.text).toContain("dosage titration");
    expect(results.some((item) => item.chunk.documentId === "doc_budget")).toBe(false);
  });

  it("diversifies results so one long document cannot consume the whole context", async () => {
    const dominantChunks = Array.from({ length: 8 }, (_, index) => ({
      ...chunkText({
        documentId: "doc_dominant",
        sessionId: "session_a",
        chunkSizeTokens: 40,
        overlapTokens: 0,
        text: `retrieval evidence monitoring protocol shared term block ${index} ${repeated(
          "dominant",
          50
        )}`
      })[0]!,
      id: `doc_dominant:chunk_${index}`,
      chunkIndex: index
    }));
    const secondaryChunks = Array.from({ length: 2 }, (_, index) => ({
      ...chunkText({
        documentId: "doc_secondary",
        sessionId: "session_a",
        chunkSizeTokens: 40,
        overlapTokens: 0,
        text: `retrieval evidence monitoring protocol secondary detail ${index} ${repeated(
          "secondary",
          50
        )}`
      })[0]!,
      id: `doc_secondary:chunk_${index}`,
      chunkIndex: index
    }));

    const results = await retrieveDocumentChunks({
      question: "retrieval evidence monitoring protocol",
      chunks: [...dominantChunks, ...secondaryChunks],
      topK: 6
    });
    const dominantCount = results.filter(
      (item) => item.chunk.documentId === "doc_dominant"
    ).length;

    expect(results).toHaveLength(6);
    expect(dominantCount).toBeLessThanOrEqual(4);
    expect(results.some((item) => item.chunk.documentId === "doc_secondary")).toBe(true);
  });

  it("retrieves only the selected documents from the private repository", async () => {
    const protocolChunks = chunkText({
      documentId: "doc_protocol",
      sessionId: "session_a",
      text: "The protocol requires dosage titration monitoring and adverse event review."
    });
    const budgetChunks = chunkText({
      documentId: "doc_budget",
      sessionId: "session_a",
      text: "The budget memo discusses procurement approval and invoice cadence."
    });

    await inMemoryDocumentRepository.saveParsedDocument({
      document: createDocument("doc_protocol", "protocol.md"),
      chunks: protocolChunks
    });
    await inMemoryDocumentRepository.saveParsedDocument({
      document: createDocument("doc_budget", "budget.md"),
      chunks: budgetChunks
    });

    const chunks = await inMemoryDocumentRepository.listChunks({
      source: { ownerId: null, sessionId: "session_a" },
      documentIds: ["doc_budget"]
    });
    const results = await retrieveDocumentChunks({
      question: "What does the budget memo say about invoices?",
      chunks
    });

    expect(chunks.every((chunk) => chunk.documentId === "doc_budget")).toBe(true);
    expect(results.map((item) => item.chunk.documentId)).toEqual(["doc_budget"]);
  });
});
