import type { Prisma } from "@prisma/client";
import { ResearchBriefSchema } from "@/lib/ai/schemas";
import { normalizeTitle } from "@/lib/pipeline/dedupe";
import { prisma } from "@/lib/storage/prismaClient";
import type {
  BriefListFilter,
  BriefListItem,
  BriefVisibility,
  BriefRepository,
  SaveBriefInput,
  StoredBrief
} from "@/lib/storage/types";
import type { NormalizedPaper } from "@/lib/sources/types";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function parseDate(value: string | null) {
  return value ? new Date(value) : null;
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function visibilityToPrisma(value: BriefVisibility | undefined) {
  if (value === "workspace") {
    return "WORKSPACE" as const;
  }

  if (value === "public") {
    return "PUBLIC" as const;
  }

  return "PRIVATE" as const;
}

function visibilityFromPrisma(value: string): BriefVisibility {
  if (value === "WORKSPACE") {
    return "workspace";
  }

  if (value === "PUBLIC") {
    return "public";
  }

  return "private";
}

function briefWhereFromFilter(filter?: BriefListFilter) {
  return {
    ...("ownerSessionId" in (filter ?? {})
      ? { ownerSessionId: filter?.ownerSessionId ?? null }
      : {}),
    ...("ownerId" in (filter ?? {}) ? { ownerId: filter?.ownerId ?? null } : {}),
    ...("workspaceId" in (filter ?? {})
      ? { workspaceId: filter?.workspaceId ?? null }
      : {}),
    ...("createdByUserId" in (filter ?? {})
      ? { createdByUserId: filter?.createdByUserId ?? null }
      : {}),
    ...("visibility" in (filter ?? {})
      ? { visibility: visibilityToPrisma(filter?.visibility) }
      : {})
  };
}

function paperToPrismaInput(paper: NormalizedPaper) {
  return {
    id: paper.id,
    title: paper.title,
    abstract: paper.abstract,
    authorsJson: asJson(paper.authors),
    year: paper.year,
    publishedAt: parseDate(paper.publishedAt),
    doi: paper.doi,
    arxivId: paper.arxivId,
    semanticScholarId: paper.semanticScholarId,
    openAlexId: paper.openAlexId,
    sourceUrlsJson: asJson(paper.sourceUrls),
    pdfUrl: paper.pdfUrl,
    venue: paper.venue,
    citationCount: paper.citationCount,
    influentialCitationCount: paper.influentialCitationCount,
    source: paper.source,
    normalizedTitle: normalizeTitle(paper.title)
  };
}

function paperFromPrisma(record: {
  id: string;
  title: string;
  abstract: string | null;
  authorsJson: Prisma.JsonValue;
  year: number | null;
  publishedAt: Date | null;
  doi: string | null;
  arxivId: string | null;
  semanticScholarId: string | null;
  openAlexId: string | null;
  sourceUrlsJson: Prisma.JsonValue;
  pdfUrl: string | null;
  venue: string | null;
  citationCount: number | null;
  influentialCitationCount: number | null;
  source: string;
  fullText?: {
    status: string;
    sourceType: string;
    qualityScore: number | null;
    errorMessage: string | null;
    chunks?: { id: string }[];
  } | null;
  briefs?: {
    relevanceScore: number | null;
    citationScore: number | null;
    recencyScore: number | null;
    completenessScore: number | null;
    sourceQualityScore: number | null;
    identifierScore: number | null;
    qualityScore: number | null;
    finalScore: number | null;
  }[];
}): NormalizedPaper {
  const scores = record.briefs?.[0];

  return {
    id: record.id,
    title: record.title,
    abstract: record.abstract,
    authors: Array.isArray(record.authorsJson)
      ? record.authorsJson.filter((item): item is string => typeof item === "string")
      : [],
    year: record.year,
    publishedAt: record.publishedAt?.toISOString() ?? null,
    doi: record.doi,
    arxivId: record.arxivId,
    semanticScholarId: record.semanticScholarId,
    openAlexId: record.openAlexId,
    sourceUrls: Array.isArray(record.sourceUrlsJson)
      ? record.sourceUrlsJson.filter((item): item is string => typeof item === "string")
      : [],
    pdfUrl: record.pdfUrl,
    venue: record.venue,
    citationCount: record.citationCount,
    influentialCitationCount: record.influentialCitationCount,
    source:
      record.source === "merged" ||
      record.source === "mock" ||
      record.source === "arxiv" ||
      record.source === "semantic_scholar" ||
      record.source === "openalex"
        ? record.source
        : "merged",
    fullTextStatus:
      record.fullText?.status === "unavailable" ||
      record.fullText?.status === "available" ||
      record.fullText?.status === "fetched" ||
      record.fullText?.status === "parsed" ||
      record.fullText?.status === "failed"
        ? record.fullText.status
        : undefined,
    fullTextSourceType:
      record.fullText?.sourceType === "arxiv" ||
      record.fullText?.sourceType === "source_pdf_url" ||
      record.fullText?.sourceType === "open_access" ||
      record.fullText?.sourceType === "user_upload"
        ? record.fullText.sourceType
        : undefined,
    fullTextChunkCount: record.fullText?.chunks?.length,
    fullTextQualityScore: record.fullText?.qualityScore,
    fullTextErrorMessage: record.fullText?.errorMessage,
    relevanceScore: scores?.relevanceScore ?? undefined,
    citationScore: scores?.citationScore ?? undefined,
    recencyScore: scores?.recencyScore ?? undefined,
    completenessScore: scores?.completenessScore ?? undefined,
    sourceQualityScore: scores?.sourceQualityScore ?? undefined,
    identifierScore: scores?.identifierScore ?? undefined,
    qualityScore: scores?.qualityScore ?? undefined,
    finalScore: scores?.finalScore ?? undefined
  };
}

function storedBriefFromPrisma(record: {
  briefJson: Prisma.JsonValue;
  ownerSessionId: string | null;
  ownerId: string | null;
  workspaceId: string | null;
  createdByUserId: string | null;
  visibility: string;
  createdAt: Date;
  papers: {
    paper: Parameters<typeof paperFromPrisma>[0];
  }[];
}): StoredBrief {
  return {
    brief: ResearchBriefSchema.parse(record.briefJson),
    papers: record.papers.map((item) => paperFromPrisma(item.paper)),
    createdAt: record.createdAt.toISOString(),
    ownerSessionId: record.ownerSessionId,
    ownerId: record.ownerId,
    workspaceId: record.workspaceId,
    createdByUserId: record.createdByUserId,
    visibility: visibilityFromPrisma(record.visibility)
  };
}

function summaryFromPrisma(record: {
  id: string;
  title: string;
  query: string;
  generatedAt: Date;
  outputLanguage: string;
  createdAt: Date;
  ownerId: string | null;
  workspaceId: string | null;
  createdByUserId: string | null;
  visibility: string;
}): BriefListItem {
  return {
    id: record.id,
    title: record.title,
    query: record.query,
    generatedAt: toIsoString(record.generatedAt),
    outputLanguage: record.outputLanguage,
    createdAt: toIsoString(record.createdAt),
    ownerId: record.ownerId,
    workspaceId: record.workspaceId,
    createdByUserId: record.createdByUserId,
    visibility: visibilityFromPrisma(record.visibility)
  };
}

export const prismaBriefRepository: BriefRepository = {
  async saveWithPapers(input: SaveBriefInput) {
    const createdAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.brief.upsert({
        where: { id: input.brief.id },
        create: {
          id: input.brief.id,
          ownerSessionId: input.ownerSessionId ?? null,
          ownerId: input.ownerId ?? null,
          workspaceId: input.workspaceId ?? null,
          createdByUserId: input.createdByUserId ?? null,
          visibility: visibilityToPrisma(input.visibility),
          query: input.brief.query,
          outputLanguage: input.brief.outputLanguage,
          generatedAt: new Date(input.brief.generatedAt),
          title: input.brief.title,
          tldr: input.brief.tldr,
          briefJson: asJson(input.brief),
          totalFound: input.brief.searchSummary.totalFound,
          totalUsed: input.brief.searchSummary.totalUsedInBrief,
          createdAt
        },
        update: {
          query: input.brief.query,
          ownerSessionId: input.ownerSessionId ?? null,
          ownerId: input.ownerId ?? null,
          workspaceId: input.workspaceId ?? null,
          createdByUserId: input.createdByUserId ?? null,
          visibility: visibilityToPrisma(input.visibility),
          outputLanguage: input.brief.outputLanguage,
          generatedAt: new Date(input.brief.generatedAt),
          title: input.brief.title,
          tldr: input.brief.tldr,
          briefJson: asJson(input.brief),
          totalFound: input.brief.searchSummary.totalFound,
          totalUsed: input.brief.searchSummary.totalUsedInBrief
        }
      });

      for (const paper of input.papers) {
        await tx.paper.upsert({
          where: { id: paper.id },
          create: paperToPrismaInput(paper),
          update: paperToPrismaInput(paper)
        });

        await tx.briefPaper.upsert({
          where: {
            briefId_paperId: {
              briefId: input.brief.id,
              paperId: paper.id
            }
          },
          create: {
            briefId: input.brief.id,
            paperId: paper.id,
            relevanceScore: paper.relevanceScore,
            citationScore: paper.citationScore,
            recencyScore: paper.recencyScore,
            completenessScore: paper.completenessScore,
            sourceQualityScore: paper.sourceQualityScore,
            identifierScore: paper.identifierScore,
            qualityScore: paper.qualityScore,
            finalScore: paper.finalScore,
            usedInBrief: true
          },
          update: {
            relevanceScore: paper.relevanceScore,
            citationScore: paper.citationScore,
            recencyScore: paper.recencyScore,
            completenessScore: paper.completenessScore,
            sourceQualityScore: paper.sourceQualityScore,
            identifierScore: paper.identifierScore,
            qualityScore: paper.qualityScore,
            finalScore: paper.finalScore,
            usedInBrief: true
          }
        });
      }
    });

    const saved = await this.getById(input.brief.id);
    if (!saved) {
      throw new Error("Brief was not saved.");
    }

    return saved;
  },

  async getById(id: string) {
    const record = await prisma.brief.findUnique({
      where: { id },
      include: {
        papers: {
          include: {
            paper: {
              include: {
                briefs: {
                  where: { briefId: id }
                },
                fullText: {
                  include: {
                    chunks: {
                      select: {
                        id: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    return record ? storedBriefFromPrisma(record) : null;
  },

  async list(filter?: BriefListFilter) {
    const records = await prisma.brief.findMany({
      where: filter ? briefWhereFromFilter(filter) : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        papers: {
          include: {
            paper: {
              include: {
                briefs: true,
                fullText: {
                  include: {
                    chunks: {
                      select: {
                        id: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    return records.map(storedBriefFromPrisma);
  },

  async listSummaries(filter?: BriefListFilter) {
    const records = await prisma.brief.findMany({
      where: filter ? briefWhereFromFilter(filter) : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        query: true,
        generatedAt: true,
        outputLanguage: true,
        createdAt: true,
        ownerId: true,
        workspaceId: true,
        createdByUserId: true,
        visibility: true
      }
    });

    return records.map(summaryFromPrisma);
  },

  async clear() {
    await prisma.$transaction([
      prisma.briefPaper.deleteMany(),
      prisma.brief.deleteMany(),
      prisma.paper.deleteMany()
    ]);
  }
};
