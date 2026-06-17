import type { NormalizedPaper, SourceAdapter } from "@/lib/sources/types";
import { normalizeDoi } from "@/lib/sources/doi";
import { assertOk, fetchWithRetry } from "@/lib/utils/http";

type OpenAlexWork = {
  id?: string;
  doi?: string | null;
  title?: string | null;
  display_name?: string | null;
  publication_year?: number | null;
  publication_date?: string | null;
  cited_by_count?: number | null;
  abstract_inverted_index?: Record<string, number[]> | null;
  ids?: {
    openalex?: string;
    doi?: string;
    arxiv?: string;
  };
  authorships?: {
    author?: {
      display_name?: string;
    };
  }[];
  primary_location?: {
    landing_page_url?: string | null;
    pdf_url?: string | null;
    source?: {
      display_name?: string | null;
    } | null;
  } | null;
};

type OpenAlexResponse = {
  results?: OpenAlexWork[];
};

function reconstructAbstract(index: Record<string, number[]> | null | undefined) {
  if (!index) {
    return null;
  }

  const words: string[] = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions) {
      words[position] = word;
    }
  }

  return words.filter(Boolean).join(" ") || null;
}

function cleanText(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const cleaned = value
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, "")
    .replace(/[�]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || null;
}

function arxivIdFromUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = value.match(/arxiv\.org\/(?:abs|pdf)\/([^?#\s/]+)/i);
  const raw = match?.[1]?.replace(/\.pdf$/i, "").replace(/v\d+$/i, "");

  return raw || null;
}

function normalizeArxivId(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return arxivIdFromUrl(trimmed) ?? trimmed.replace(/^arxiv:/i, "").replace(/v\d+$/i, "");
}

export const openAlexSourceAdapter: SourceAdapter = {
  name: "openalex",
  async searchPapers(input) {
    const filters: string[] = [];
    if (input.fromYear) {
      filters.push(`from_publication_date:${input.fromYear}-01-01`);
    }
    if (input.toYear) {
      filters.push(`to_publication_date:${input.toYear}-12-31`);
    }

    const params = new URLSearchParams({
      search: input.query,
      "per-page": String(Math.min(input.maxResults, 50)),
      sort: "relevance_score:desc",
      select:
        "id,doi,title,display_name,publication_year,publication_date,cited_by_count,abstract_inverted_index,ids,authorships,primary_location"
    });

    if (filters.length) {
      params.set("filter", filters.join(","));
    }

    const response = await fetchWithRetry(
      `https://api.openalex.org/works?${params.toString()}`,
      { timeoutMs: 16000, retries: 1 }
    );
    assertOk(response, "OpenAlex");

    const payload = (await response.json()) as OpenAlexResponse;

    return (payload.results ?? [])
      .map<NormalizedPaper | null>((work) => {
        const openAlexId = work.ids?.openalex ?? work.id ?? null;
        const title = cleanText(work.title ?? work.display_name ?? null);

        if (!openAlexId || !title) {
          return null;
        }

        return {
          id: `openalex:${openAlexId.replace(/^https?:\/\/openalex\.org\//i, "")}`,
          title,
          abstract: cleanText(reconstructAbstract(work.abstract_inverted_index)),
          authors:
            work.authorships
              ?.map((authorship) => authorship.author?.display_name)
              .map((author) => cleanText(author))
              .filter(Boolean) as string[],
          year: work.publication_year ?? null,
          publishedAt: work.publication_date ?? null,
          doi: normalizeDoi(work.doi ?? work.ids?.doi),
          arxivId:
            normalizeArxivId(work.ids?.arxiv) ??
            arxivIdFromUrl(work.primary_location?.landing_page_url) ??
            arxivIdFromUrl(work.primary_location?.pdf_url),
          semanticScholarId: null,
          openAlexId,
          sourceUrls: [
            work.primary_location?.landing_page_url ?? openAlexId
          ].filter(Boolean) as string[],
          pdfUrl: work.primary_location?.pdf_url ?? null,
          venue: cleanText(work.primary_location?.source?.display_name),
          citationCount: work.cited_by_count ?? null,
          influentialCitationCount: null,
          source: "openalex"
        };
      })
      .filter((paper): paper is NormalizedPaper => Boolean(paper));
  }
};
