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
  relevanceScore?: number;
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
