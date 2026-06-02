import { describe, expect, it } from "vitest";
import {
  AskDocumentsAnswerSchema,
  type UserDocument,
  type UserDocumentChunk
} from "@/lib/documents/schemas";
import {
  askDocuments,
  validateDocumentAnswerGrounding
} from "@/lib/documents/askDocuments";

const document: UserDocument = {
  id: "doc_1",
  ownerId: null,
  sessionId: "session_a",
  filename: "rag-notes.md",
  mimeType: "text/markdown",
  sizeBytes: 500,
  status: "parsed",
  textHash: "hash",
  createdAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
  privacyScope: "session",
  errorMessage: null
};

const chunk: UserDocumentChunk = {
  id: "doc_1:chunk_0",
  documentId: "doc_1",
  ownerId: null,
  sessionId: "session_a",
  sectionTitle: "Introduction",
  chunkIndex: 0,
  text: "Retrieval augmented generation grounds answers in retrieved evidence and reduces unsupported claims.",
  tokenEstimate: 11,
  pageStart: null,
  pageEnd: null,
  embedding: null,
  embeddingModel: null,
  evidenceLevel: "uploaded_document_supported"
};

describe("Ask My Documents grounding", () => {
  it("validates the structured answer schema", () => {
    expect(() =>
      AskDocumentsAnswerSchema.parse({
        question: "What does it say?",
        answer: "RAG grounds answers in evidence.",
        confidence: "medium",
        notAnswerableFromDocuments: false,
        evidenceSnippets: [
          {
            id: "ev_1",
            sourceType: "user_document",
            sourceId: "doc_1",
            documentId: "doc_1",
            chunkId: "doc_1:chunk_0",
            text: "Retrieval augmented generation grounds answers in retrieved evidence",
            sectionTitle: "Introduction",
            evidenceLevel: "uploaded_document_supported",
            supportRelation: "supports"
          }
        ],
        citedDocumentIds: ["doc_1"],
        limitations: [],
        followUpQuestions: []
      })
    ).not.toThrow();
  });

  it("refuses unsupported questions when no chunks are retrieved", async () => {
    const answer = await askDocuments({
      question: "What does the document say about pricing?",
      documents: [document],
      retrievedChunks: []
    });

    expect(answer.notAnswerableFromDocuments).toBe(true);
    expect(answer.evidenceSnippets).toEqual([]);
  });

  it("accepts answers that cite uploaded document chunks", async () => {
    const answer = await askDocuments(
      {
        question: "How does RAG reduce unsupported claims?",
        documents: [document],
        retrievedChunks: [{ chunk, score: 0.8 }]
      },
      {
        generateStructured: async () => ({
          answer: "The document says RAG grounds answers in retrieved evidence.",
          confidence: "medium",
          notAnswerableFromDocuments: false,
          evidenceSnippets: [
            {
              id: "ev_1",
              sourceType: "user_document",
              sourceId: "doc_1",
              documentId: "doc_1",
              chunkId: "doc_1:chunk_0",
              text: "Retrieval augmented generation grounds answers in retrieved evidence",
              sectionTitle: "Introduction",
              evidenceLevel: "uploaded_document_supported",
              supportRelation: "supports"
            }
          ],
          citedDocumentIds: ["doc_1"],
          limitations: [],
          followUpQuestions: []
        })
      }
    );

    expect(answer.notAnswerableFromDocuments).toBe(false);
    expect(answer.evidenceSnippets[0]?.chunkId).toBe("doc_1:chunk_0");
  });

  it("rejects evidence snippets that do not overlap the cited chunk", () => {
    const answer = AskDocumentsAnswerSchema.parse({
      question: "What does it say?",
      answer: "The document discusses pricing.",
      confidence: "medium",
      notAnswerableFromDocuments: false,
      evidenceSnippets: [
        {
          id: "ev_1",
          sourceType: "user_document",
          sourceId: "doc_1",
          documentId: "doc_1",
          chunkId: "doc_1:chunk_0",
          text: "pricing subscription revenue",
          sectionTitle: "Introduction",
          evidenceLevel: "uploaded_document_supported",
          supportRelation: "supports"
        }
      ],
      citedDocumentIds: ["doc_1"],
      limitations: [],
      followUpQuestions: []
    });

    expect(() => validateDocumentAnswerGrounding(answer, [chunk])).toThrow(
      "evidence is not supported"
    );
  });
});
