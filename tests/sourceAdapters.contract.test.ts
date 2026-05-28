import { afterEach, describe, expect, it, vi } from "vitest";
import { arxivSourceAdapter } from "@/lib/sources/arxiv";
import { openAlexSourceAdapter } from "@/lib/sources/openAlex";
import { semanticScholarSourceAdapter } from "@/lib/sources/semanticScholar";

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
      `<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <id>https://arxiv.org/abs/2401.12345v2</id>
          <updated>2024-01-03T00:00:00Z</updated>
          <published>2024-01-01T00:00:00Z</published>
          <title> Retrieval-Augmented Generation &amp; Clinical QA </title>
          <summary><![CDATA[ A clinical RAG system with citations. ]]></summary>
          <author><name>Ada Lovelace</name></author>
          <author><name>Alan Turing</name></author>
          <arxiv:doi xmlns:arxiv="http://arxiv.org/schemas/atom">10.48550/arXiv.2401.12345</arxiv:doi>
          <category term="cs.CL" />
          <link href="https://arxiv.org/abs/2401.12345v2" rel="alternate" type="text/html" />
          <link title="pdf" href="https://arxiv.org/pdf/2401.12345v2" rel="related" type="application/pdf" />
        </entry>
        <entry>
          <id>https://arxiv.org/abs/1999.00001</id>
          <published>1999-01-01T00:00:00Z</published>
          <title>Too Old</title>
        </entry>
      </feed>`,
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
      JSON.stringify({
        data: [
          {
            paperId: "abc123",
            title: "Evaluating Citation Faithfulness in Medical RAG",
            abstract: "A benchmark for citation support.",
            year: 2024,
            publicationDate: "2024-05-01",
            venue: "ACL",
            citationCount: 12,
            influentialCitationCount: 2,
            url: "https://semanticscholar.org/paper/abc123",
            externalIds: {
              DOI: "10.1000/semantic",
              ArXiv: "2405.00001"
            },
            authors: [{ name: "Grace Hopper" }, { name: "Katherine Johnson" }],
            openAccessPdf: {
              url: "https://example.org/semantic.pdf"
            }
          },
          {
            paperId: "missing-title"
          },
          {
            title: "Missing ID"
          }
        ]
      }),
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

  it("normalizes OpenAlex works, reconstructed abstracts, and DOI URLs", async () => {
    const fetchMock = mockFetchWithResponse(
      JSON.stringify({
        results: [
          {
            id: "https://openalex.org/W123",
            doi: "https://doi.org/10.5555/openalex",
            title: "Clinical\u0000 RAG Systems",
            publication_year: 2025,
            publication_date: "2025-02-14",
            cited_by_count: 34,
            abstract_inverted_index: {
              Retrieval: [0],
              augmented: [1],
              generation: [2],
              supports: [3],
              diagnosis: [4]
            },
            ids: {
              openalex: "https://openalex.org/W123",
              doi: "https://doi.org/10.5555/openalex"
            },
            authorships: [
              { author: { display_name: "Marie Curie" } },
              { author: { display_name: "Rosalind Franklin" } }
            ],
            primary_location: {
              landing_page_url: "https://example.org/openalex",
              pdf_url: "https://example.org/openalex.pdf",
              source: {
                display_name: "Nature Medicine"
              }
            }
          },
          {
            id: "https://openalex.org/W999",
            title: null
          }
        ]
      }),
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
