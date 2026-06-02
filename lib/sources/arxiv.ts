import type { NormalizedPaper, SourceAdapter } from "@/lib/sources/types";
import { normalizeDoi } from "@/lib/sources/doi";
import { assertOk, fetchWithRetry } from "@/lib/utils/http";

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getTag(entry: string, tag: string) {
  const match = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1] ? decodeXml(match[1]) : null;
}

function getAllTags(entry: string, tag: string) {
  return [...entry.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi"))]
    .map((match) => decodeXml(match[1] ?? ""))
    .filter(Boolean);
}

function getLinks(entry: string) {
  return [...entry.matchAll(/<link\b([^>]*)\/?>/gi)]
    .map((match) => {
      const attrs = match[1] ?? "";
      const href = attrs.match(/\bhref="([^"]+)"/i)?.[1] ?? null;
      const title = attrs.match(/\btitle="([^"]+)"/i)?.[1] ?? null;
      const type = attrs.match(/\btype="([^"]+)"/i)?.[1] ?? null;
      return { href, title, type };
    })
    .filter((link) => link.href);
}

function arxivIdFromUrl(url: string) {
  return url.replace(/^https?:\/\/arxiv\.org\/abs\//, "").replace(/v\d+$/, "");
}

function yearFromDate(value: string | null) {
  return value ? Number(value.slice(0, 4)) || null : null;
}

export const arxivSourceAdapter: SourceAdapter = {
  name: "arxiv",
  async searchPapers(input) {
    const params = new URLSearchParams({
      search_query: `all:${input.query}`,
      start: "0",
      max_results: String(Math.min(input.maxResults, 50)),
      sortBy: "relevance",
      sortOrder: "descending"
    });

    const response = await fetchWithRetry(
      `https://export.arxiv.org/api/query?${params.toString()}`,
      { timeoutMs: 18000, retries: 1 }
    );
    assertOk(response, "arXiv");

    const xml = await response.text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map(
      (match) => match[1] ?? ""
    );

    return entries
      .map<NormalizedPaper | null>((entry) => {
        const idUrl = getTag(entry, "id");
        const title = getTag(entry, "title");
        const publishedAt = getTag(entry, "published");
        const links = getLinks(entry);
        const pdfUrl =
          links.find((link) => link.title === "pdf" || link.type === "application/pdf")
            ?.href ?? null;
        const sourceUrl = idUrl ?? links[0]?.href ?? null;

        if (!idUrl || !title) {
          return null;
        }

        const categories = [...entry.matchAll(/<category\b[^>]*term="([^"]+)"/gi)]
          .map((match) => match[1])
          .filter(Boolean);

        return {
          id: `arxiv:${arxivIdFromUrl(idUrl)}`,
          title,
          abstract: getTag(entry, "summary"),
          authors: getAllTags(entry, "name"),
          year: yearFromDate(publishedAt),
          publishedAt,
          doi: normalizeDoi(getTag(entry, "arxiv:doi")),
          arxivId: arxivIdFromUrl(idUrl),
          semanticScholarId: null,
          openAlexId: null,
          sourceUrls: sourceUrl ? [sourceUrl] : [],
          pdfUrl,
          venue: categories[0] ? `arXiv ${categories[0]}` : "arXiv",
          citationCount: null,
          influentialCitationCount: null,
          source: "arxiv"
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
