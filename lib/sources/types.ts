export type ResearchSource = "mock" | "arxiv" | "semantic_scholar" | "openalex";

export type SearchPapersInput = {
  query: string;
  maxResults: number;
  fromYear?: number;
  toYear?: number;
};

export type NormalizedPaper = {
  id: string;
  title: string;
  abstract: string | null;
  authors: string[];
  year: number | null;
  publishedAt: string | null;
  doi: string | null;
  arxivId: string | null;
  semanticScholarId: string | null;
  openAlexId: string | null;
  sourceUrls: string[];
  pdfUrl: string | null;
  venue: string | null;
  citationCount: number | null;
  influentialCitationCount: number | null;
  source: ResearchSource | "merged";
  fullTextStatus?:
    | "not_checked"
    | "unavailable"
    | "available"
    | "fetched"
    | "parsed"
    | "failed";
  fullTextSourceType?:
    | "arxiv"
    | "source_pdf_url"
    | "open_access"
    | "user_upload"
    | "none";
  fullTextChunkCount?: number;
  fullTextQualityScore?: number | null;
  fullTextErrorMessage?: string | null;
  relevanceScore?: number;
  semanticScore?: number;
  citationScore?: number;
  recencyScore?: number;
  completenessScore?: number;
  sourceQualityScore?: number;
  identifierScore?: number;
  qualityScore?: number;
  finalScore?: number;
};

export type SourceAdapter = {
  name: ResearchSource;
  searchPapers(input: SearchPapersInput): Promise<NormalizedPaper[]>;
};

export type SourceSearchDiagnostic = {
  source: ResearchSource;
  query: string;
  status: "success" | "empty" | "failed";
  resultCount: number;
  cached: boolean;
  message?: string;
};
