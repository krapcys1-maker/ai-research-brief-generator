import type { NormalizedPaper } from "@/lib/sources/types";
import type { FullTextCandidate } from "@/lib/fulltext/types";

function normalizeArxivId(value: string) {
  return value
    .trim()
    .replace(/^arxiv:/i, "")
    .replace(/^https?:\/\/arxiv\.org\/abs\//i, "")
    .replace(/^https?:\/\/arxiv\.org\/pdf\//i, "")
    .replace(/\.pdf$/i, "");
}

function isSafeHttpUrl(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "0.0.0.0" ||
      hostname === "::1"
    ) {
      return false;
    }

    const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4) {
      const parts = ipv4.slice(1).map(Number);
      const [first, second] = parts;

      if (parts.some((part) => part < 0 || part > 255)) {
        return false;
      }

      if (
        first === 10 ||
        first === 127 ||
        (first === 169 && second === 254) ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168)
      ) {
        return false;
      }
    }

    if (
      hostname.includes(":") &&
      (hostname.startsWith("fc") ||
        hostname.startsWith("fd") ||
        hostname.startsWith("fe80:"))
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function discoverFullText(paper: NormalizedPaper): FullTextCandidate {
  if (paper.arxivId) {
    const arxivId = normalizeArxivId(paper.arxivId);

    if (arxivId) {
      return {
        status: "available",
        sourceType: "arxiv",
        sourceUrl: `https://arxiv.org/pdf/${arxivId}`
      };
    }
  }

  if (isSafeHttpUrl(paper.pdfUrl)) {
    return {
      status: "available",
      sourceType: "source_pdf_url",
      sourceUrl: paper.pdfUrl
    };
  }

  return {
    status: "unavailable",
    sourceType: "none",
    sourceUrl: null,
    reason: "No legal open-access PDF URL was available in paper metadata."
  };
}
