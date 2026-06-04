import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { arxivSourceAdapter } from "@/lib/sources/arxiv";
import { openAlexSourceAdapter } from "@/lib/sources/openAlex";
import { semanticScholarSourceAdapter } from "@/lib/sources/semanticScholar";

function fixtureText(filename: string) {
  return readFileSync(
    join(process.cwd(), "tests", "fixtures", "live-sources", filename),
    "utf8"
  );
}

function mockFetchWithResponse(body: string, init?: ResponseInit) {
  const fetchMock = vi.fn(async () => new Response(body, init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("source adapter contracts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("normalizes arXiv Atom entries into source-grounded papers", async () => {
    const fetchMock = mockFetchWithResponse(
      fixtureText("arxiv-clinical-rag.atom.xml"),
      { status: 200 }
    );

    const papers = await arxivSourceAdapter.searchPapers({
      query: "clinical rag",
      maxResults: 25,
      fromYear: 2020
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]?.toString()).toContain("max_results=25");
    expect(papers).toHaveLength(1);
    expect(papers[0]).toMatchObject({
      id: "arxiv:2401.12345",
      title: "Retrieval-Augmented Generation & Clinical QA",
      abstract: "A clinical RAG system with citations.",
      authors: ["Ada Lovelace", "Alan Turing"],
      year: 2024,
      doi: "10.48550/arXiv.2401.12345",
      arxivId: "2401.12345",
      pdfUrl: "https://arxiv.org/pdf/2401.12345v2",
      venue: "arXiv cs.CL",
      source: "arxiv"
    });
  });

  it("normalizes Semantic Scholar search payloads and skips malformed papers", async () => {
    vi.stubEnv("SEMANTIC_SCHOLAR_API_KEY", "test-key");
    const fetchMock = mockFetchWithResponse(
      fixtureText("semantic-scholar-citation-faithfulness.json"),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

    const papers = await semanticScholarSourceAdapter.searchPapers({
      query: "citation faithfulness",
      maxResults: 100,
      toYear: 2024
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]?.toString()).toContain("limit=50");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: { "x-api-key": "test-key" }
    });
    expect(papers).toHaveLength(1);
    expect(papers[0]).toMatchObject({
      id: "semantic:abc123",
      title: "Evaluating Citation Faithfulness in Medical RAG",
      abstract: "A benchmark for citation support.",
      authors: ["Grace Hopper", "Katherine Johnson"],
      year: 2024,
      publishedAt: "2024-05-01",
      doi: "10.1000/semantic",
      arxivId: "2405.00001",
      semanticScholarId: "abc123",
      pdfUrl: "https://example.org/semantic.pdf",
      venue: "ACL",
      citationCount: 12,
      influentialCitationCount: 2,
      source: "semantic_scholar"
    });
  });

  it("does not send placeholder Semantic Scholar API keys", async () => {
    vi.stubEnv("SEMANTIC_SCHOLAR_API_KEY", "...");
    const fetchMock = mockFetchWithResponse(
      fixtureText("semantic-scholar-citation-faithfulness.json"),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

    await semanticScholarSourceAdapter.searchPapers({
      query: "citation faithfulness",
      maxResults: 1
    });

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: {}
    });
  });

  it("normalizes OpenAlex works, reconstructed abstracts, and DOI URLs", async () => {
    const fetchMock = mockFetchWithResponse(
      fixtureText("openalex-clinical-rag.json"),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

    const papers = await openAlexSourceAdapter.searchPapers({
      query: "clinical rag",
      maxResults: 75,
      fromYear: 2023,
      toYear: 2026
    });

    const url = fetchMock.mock.calls[0]?.[0]?.toString() ?? "";
    expect(url).toContain("per-page=50");
    expect(url).toContain("from_publication_date%3A2023-01-01");
    expect(url).toContain("to_publication_date%3A2026-12-31");
    expect(papers).toHaveLength(1);
    expect(papers[0]).toMatchObject({
      id: "openalex:W123",
      title: "Clinical RAG Systems",
      abstract: "Retrieval augmented generation supports diagnosis",
      authors: ["Marie Curie", "Rosalind Franklin"],
      year: 2025,
      publishedAt: "2025-02-14",
      doi: "10.5555/openalex",
      openAlexId: "https://openalex.org/W123",
      sourceUrls: ["https://example.org/openalex"],
      pdfUrl: "https://example.org/openalex.pdf",
      venue: "Nature Medicine",
      citationCount: 34,
      source: "openalex"
    });
  });
});
