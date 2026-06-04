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
});
