import { afterEach, describe, expect, it, vi } from "vitest";
import { filterWarningsForSuccessfulSources, searchAllSources } from "@/lib/sources";
import { clearSourceApiMemoryCacheForTests } from "@/lib/storage/sourceApiCache";

const arxivFixture = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>https://arxiv.org/abs/2601.00001v1</id>
    <title>Agent Sandbox Runtime Evaluation</title>
    <summary>Runtime evaluation for tool using agents.</summary>
    <published>2026-01-01T00:00:00Z</published>
    <author><name>Ada Runtime</name></author>
    <link href="https://arxiv.org/abs/2601.00001v1" rel="alternate" type="text/html"/>
    <link title="pdf" href="https://arxiv.org/pdf/2601.00001v1" rel="related" type="application/pdf"/>
    <category term="cs.AI"/>
  </entry>
</feed>`;

const openAlexFixture = {
  results: [
    {
      id: "https://openalex.org/W260100001",
      display_name: "Agent Sandbox Evidence",
      publication_year: 2026,
      publication_date: "2026-01-01",
      cited_by_count: 4,
      primary_location: {
        landing_page_url: "https://example.org/agent-sandbox",
        pdf_url: "https://example.org/agent-sandbox.pdf",
        source: {
          display_name: "OpenAlex Test Venue"
        }
      }
    }
  ]
};

describe("filterWarningsForSuccessfulSources", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearSourceApiMemoryCacheForTests();
  });

  it("hides empty or failed variant warnings for sources that succeeded elsewhere", () => {
    const warnings = [
      "openalex returned no papers.",
      "openalex failed: transient upstream timeout",
      "arxiv failed: rate limited",
      "semantic_scholar returned no papers.",
      "semantic_scholar returned no papers."
    ];

    const filtered = filterWarningsForSuccessfulSources(warnings, [
      {
        source: "openalex",
        query: "query variant 1",
        status: "empty",
        resultCount: 0,
        cached: false
      },
      {
        source: "openalex",
        query: "query variant 2",
        status: "success",
        resultCount: 4,
        cached: false
      },
      {
        source: "arxiv",
        query: "query variant 1",
        status: "failed",
        resultCount: 0,
        cached: false
      },
      {
        source: "semantic_scholar",
        query: "query variant 1",
        status: "empty",
        resultCount: 0,
        cached: false
      }
    ]);

    expect(filtered).toEqual([
      "arxiv failed: rate limited",
      "semantic_scholar returned no papers."
    ]);
  });

  it("queues arXiv query variants instead of firing them concurrently", async () => {
    let activeArxivRequests = 0;
    let maxActiveArxivRequests = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        activeArxivRequests += 1;
        maxActiveArxivRequests = Math.max(
          maxActiveArxivRequests,
          activeArxivRequests
        );
        await new Promise((resolve) => setTimeout(resolve, 5));
        activeArxivRequests -= 1;

        return new Response(arxivFixture, { status: 200 });
      })
    );

    const result = await searchAllSources({
      query: "agent sandbox",
      queryVariants: ["agent sandbox", "tool agents", "runtime evaluation"],
      maxResults: 1,
      sources: ["arxiv"]
    });

    expect(result.papers).toHaveLength(3);
    expect(maxActiveArxivRequests).toBe(1);
  });

  it("opens a source circuit breaker after repeated rate-limit failures", async () => {
    let arxivFetchCount = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const href = url.toString();

        if (href.includes("export.arxiv.org")) {
          arxivFetchCount += 1;
          return new Response("Rate exceeded.", {
            status: 429,
            statusText: "Too Many Requests"
          });
        }

        return new Response(JSON.stringify(openAlexFixture), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      })
    );

    const result = await searchAllSources({
      query: "agent sandbox",
      queryVariants: [
        "agent sandbox",
        "tool agents",
        "runtime evaluation",
        "release gate"
      ],
      maxResults: 1,
      sources: ["arxiv", "openalex"]
    });

    const arxivDiagnostics = result.sourceDiagnostics.filter(
      (diagnostic) => diagnostic.source === "arxiv"
    );

    expect(result.papers.length).toBeGreaterThan(0);
    expect(arxivFetchCount).toBe(2);
    expect(arxivDiagnostics).toHaveLength(4);
    expect(
      arxivDiagnostics.filter((diagnostic) =>
        diagnostic.message?.includes("skipped after 2 consecutive")
      )
    ).toHaveLength(2);
  });

  it("disables Semantic Scholar when the configured key is a placeholder", async () => {
    vi.stubEnv("SEMANTIC_SCHOLAR_API_KEY", "...");
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const href = url.toString();
      expect(href).not.toContain("semanticscholar");

      return new Response(JSON.stringify(openAlexFixture), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchAllSources({
      query: "agent sandbox",
      queryVariants: ["agent sandbox", "runtime evaluation"],
      maxResults: 1,
      sources: ["semantic_scholar", "openalex"]
    });

    const semanticDiagnostics = result.sourceDiagnostics.filter(
      (diagnostic) => diagnostic.source === "semantic_scholar"
    );

    expect(result.papers.length).toBeGreaterThan(0);
    expect(
      semanticDiagnostics.every((diagnostic) =>
        diagnostic.message?.includes("API key is missing or placeholder")
      )
    ).toBe(true);
  });
});
