import type { NormalizedPaper, SourceAdapter } from "@/lib/sources/types";
import { normalizeDoi } from "@/lib/sources/doi";
import { assertOk, fetchWithRetry } from "@/lib/utils/http";

type SemanticScholarPaper = {
  paperId?: string;
  title?: string;
  abstract?: string | null;
  year?: number | null;
  publicationDate?: string | null;
  venue?: string | null;
  citationCount?: number | null;
  influentialCitationCount?: number | null;
  url?: string | null;
  externalIds?: {
    DOI?: string;
    ArXiv?: string;
  };
  authors?: { name?: string }[];
  openAccessPdf?: {
    url?: string | null;
  } | null;
};

type SemanticScholarResponse = {
  data?: SemanticScholarPaper[];
};

export const semanticScholarSourceAdapter: SourceAdapter = {
  name: "semantic_scholar",
  async searchPapers(input) {
    const params = new URLSearchParams({
      query: input.query,
      limit: String(Math.min(input.maxResults, 50)),
      fields:
        "paperId,title,abstract,year,publicationDate,venue,citationCount,influentialCitationCount,url,externalIds,authors,openAccessPdf"
    });
    const headers: Record<string, string> = {};

    if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
      headers["x-api-key"] = process.env.SEMANTIC_SCHOLAR_API_KEY;
    }

    const response = await fetchWithRetry(
      `https://api.semanticscholar.org/graph/v1/paper/search?${params.toString()}`,
      { timeoutMs: 16000, retries: 1, headers }
    );
    assertOk(response, "Semantic Scholar");

    const payload = (await response.json()) as SemanticScholarResponse;

    return (payload.data ?? [])
      .map<NormalizedPaper | null>((paper) => {
        if (!paper.paperId || !paper.title) {
          return null;
        }

        return {
          id: `semantic:${paper.paperId}`,
          title: paper.title,
          abstract: paper.abstract ?? null,
          authors: paper.authors?.map((author) => author.name).filter(Boolean) as string[],
          year: paper.year ?? null,
          publishedAt: paper.publicationDate ?? null,
          doi: normalizeDoi(paper.externalIds?.DOI),
          arxivId: paper.externalIds?.ArXiv ?? null,
          semanticScholarId: paper.paperId,
          openAlexId: null,
          sourceUrls: paper.url ? [paper.url] : [],
          pdfUrl: paper.openAccessPdf?.url ?? null,
          venue: paper.venue ?? null,
          citationCount: paper.citationCount ?? null,
          influentialCitationCount: paper.influentialCitationCount ?? null,
          source: "semantic_scholar"
        };
      })
      .filter((paper): paper is NormalizedPaper => Boolean(paper))
      .filter((paper) => {
        if (input.fromYear && (paper.year ?? 0) < input.fromYear) {
          return false;
        }
        if (input.toYear && (paper.year ?? 9999) > input.toYear) {
          return false;
        }
        return true;
      });
  }
};
