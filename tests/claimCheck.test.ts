import { beforeEach, describe, expect, it } from "vitest";
import {
  ClaimCheckReportSchema,
  ClaimCheckItemSchema
} from "@/lib/claimCheck/schemas";
import { compareClaimsWithScience } from "@/lib/claimCheck/compare";
import { extractCandidateClaims } from "@/lib/claimCheck/extractClaims";
import { inMemoryDocumentRepository } from "@/lib/documents/inMemoryDocumentRepository";
import { createPaper } from "@/tests/fixtures";
import type { SearchAllSourcesResult } from "@/lib/sources";

function searchResult(abstract: string, title = "RAG improves clinical reliability"): SearchAllSourcesResult {
  return {
    papers: [
      createPaper({
        id: "paper_claim_1",
        title,
        abstract,
        source: "arxiv",
        arxivId: "2401.00001",
        pdfUrl: "https://arxiv.org/pdf/2401.00001"
      })
    ],
    sourcesUsed: ["arxiv"],
    warnings: [],
    sourceDiagnostics: []
  };
}

describe("claim extraction and Compare With Science", () => {
  beforeEach(async () => {
    await inMemoryDocumentRepository.clear();
  });

  it("validates extracted claim schema and labels non-scientific claims", () => {
    const result = extractCandidateClaims({
      text: "Hello, thanks for reading this note. RAG reduces hallucinations in clinical AI systems."
    });

    expect(result.claims.length).toBeGreaterThan(0);
    expect(result.claims.some((claim) => !claim.checkable)).toBe(true);
    expect(result.claims.some((claim) => claim.checkable)).toBe(true);
  });

  it("labels unsupported claims as insufficient_evidence without hallucinated snippets", async () => {
    const report = await compareClaimsWithScience({
      request: {
        claims: ["RAG improves clinical reliability in hospital diagnosis."],
        sources: ["arxiv"],
        maxPapers: 5
      },
      dependencies: {
        search: async () => ({
          papers: [],
          sourcesUsed: [],
          warnings: [],
          sourceDiagnostics: []
        })
      }
    });

    expect(report.items[0].classification).toBe("insufficient_evidence");
    expect(report.items[0].evidenceSnippets).toEqual([]);
    expect(() => ClaimCheckReportSchema.parse(report)).not.toThrow();
  });

  it("labels contradicted claims with evidence snippets", async () => {
    const report = await compareClaimsWithScience({
      request: {
        claims: ["RAG improves clinical reliability in hospital diagnosis."],
        sources: ["arxiv"],
        maxPapers: 5
      },
      dependencies: {
        search: async () =>
          searchResult(
            "The study reports that RAG does not improve clinical reliability in hospital diagnosis."
          )
      }
    });

    expect(report.items[0].classification).toBe("contradicted");
    expect(report.items[0].evidenceSnippets.length).toBeGreaterThan(0);
    expect(report.items[0].evidenceSnippets[0].supportRelation).toBe("contradicts");
  });

  it("requires similar work evidence for already_known_or_done", () => {
    expect(() =>
      ClaimCheckItemSchema.parse({
        claimText: "A prior system exists.",
        classification: "already_known_or_done",
        confidence: "medium",
        explanation: "Similar work exists.",
        whatMatchesScience: ["Similar title"],
        whatDoesNotMatchScience: [],
        caveats: [],
        suggestedRevision: null,
        evidenceBoundary: "abstract_supported",
        evidenceSnippets: [
          {
            id: "ev_1",
            sourceType: "paper_abstract",
            sourceId: "paper_1",
            paperId: "paper_1",
            text: "A prior system exists.",
            evidenceLevel: "abstract_supported",
            supportRelation: "supports"
          }
        ],
        relatedPapers: []
      })
    ).toThrow("already_known_or_done requires related paper evidence");
  });

  it("classifies close prior work as already_known_or_done with similar work", async () => {
    const report = await compareClaimsWithScience({
      request: {
        claims: ["RAG improves clinical reliability"],
        sources: ["arxiv"],
        maxPapers: 5
      },
      dependencies: {
        search: async () =>
          searchResult(
            "RAG improves clinical reliability in controlled evaluation.",
            "RAG improves clinical reliability"
          )
      }
    });

    expect(report.items[0].classification).toBe("already_known_or_done");
    expect(report.items[0].relatedPapers.length).toBeGreaterThan(0);
    expect(report.similarWork.length).toBeGreaterThan(0);
  });

  it("possible_dead_end requires cautious wording and caveats", async () => {
    const report = await compareClaimsWithScience({
      request: {
        claims: ["This AI approach is impossible for clinical diagnosis."],
        sources: ["arxiv"],
        maxPapers: 5
      },
      dependencies: {
        search: async () =>
          searchResult(
            "This AI approach has weak evidence and uncertain clinical diagnosis utility."
          )
      }
    });

    expect(report.items[0].classification).toBe("possible_dead_end");
    expect(report.items[0].caveats.join(" ")).toContain("not binary");
    expect(report.items[0].explanation).toContain("not a definitive judgment");
  });

  it("does not retrieve private document chunks across sessions", async () => {
    await inMemoryDocumentRepository.saveParsedDocument({
      document: {
        id: "doc_private",
        ownerId: null,
        sessionId: "session_a",
        filename: "private.md",
        mimeType: "text/markdown",
        sizeBytes: 100,
        status: "parsed",
        textHash: "hash",
        createdAt: new Date().toISOString(),
        deletedAt: null,
        privacyScope: "session",
        errorMessage: null
      },
      chunks: [
        {
          id: "doc_private:chunk_0",
          documentId: "doc_private",
          ownerId: null,
          sessionId: "session_a",
          sectionTitle: null,
          chunkIndex: 0,
          text: "RAG improves clinical reliability in hospital diagnosis.",
          tokenEstimate: 7,
          pageStart: null,
          pageEnd: null,
          embedding: null,
          embeddingModel: null,
          evidenceLevel: "uploaded_document_supported"
        }
      ]
    });

    const report = await compareClaimsWithScience({
      request: {
        claims: ["RAG improves clinical reliability in hospital diagnosis."],
        sourceDocumentId: "doc_private",
        sources: ["arxiv"],
        maxPapers: 5
      },
      documentSource: { ownerId: null, sessionId: "session_b" },
      dependencies: {
        documentRepository: inMemoryDocumentRepository,
        search: async () => ({
          papers: [],
          sourcesUsed: [],
          warnings: [],
          sourceDiagnostics: []
        })
      }
    });

    expect(report.items[0].classification).toBe("insufficient_evidence");
    expect(report.items[0].evidenceSnippets).toEqual([]);
  });

  it("does not retrieve private document chunks across workspaces", async () => {
    await inMemoryDocumentRepository.saveParsedDocument({
      document: {
        id: "doc_workspace_private",
        ownerId: "user_a",
        workspaceId: "workspace_a",
        sessionId: null,
        filename: "workspace-private.md",
        mimeType: "text/markdown",
        sizeBytes: 100,
        status: "parsed",
        textHash: "hash",
        createdAt: new Date().toISOString(),
        deletedAt: null,
        privacyScope: "user",
        errorMessage: null
      },
      chunks: [
        {
          id: "doc_workspace_private:chunk_0",
          documentId: "doc_workspace_private",
          ownerId: "user_a",
          workspaceId: "workspace_a",
          sessionId: null,
          sectionTitle: null,
          chunkIndex: 0,
          text: "Workspace-private RAG evidence should not cross tenants.",
          tokenEstimate: 7,
          pageStart: null,
          pageEnd: null,
          embedding: null,
          embeddingModel: null,
          evidenceLevel: "uploaded_document_supported"
        }
      ]
    });

    const report = await compareClaimsWithScience({
      request: {
        claims: ["Workspace-private RAG evidence should not cross tenants."],
        sourceDocumentId: "doc_workspace_private",
        sources: ["arxiv"],
        maxPapers: 5
      },
      documentSource: {
        ownerId: "user_a",
        workspaceId: "workspace_b",
        sessionId: null
      },
      dependencies: {
        documentRepository: inMemoryDocumentRepository,
        search: async () => ({
          papers: [],
          sourcesUsed: [],
          warnings: [],
          sourceDiagnostics: []
        })
      }
    });

    expect(report.items[0].classification).toBe("insufficient_evidence");
    expect(report.items[0].evidenceSnippets).toEqual([]);
  });
});
