import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { preflightBrief } from "@/lib/pipeline/preflightBrief";
import { getPaperInsight } from "@/lib/pipeline/paperInsights";

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    {
      status: "error",
      error: message
    },
    { status }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const preflight = await preflightBrief(body);

    return NextResponse.json({
      status: "completed",
      outputLanguage: preflight.outputLanguage,
      queryVariants: preflight.queryVariants,
      qualityGate: preflight.qualityGate,
      searchSummary: preflight.searchSummary,
      papers: preflight.selectedPapers.map((paper) => ({
        id: paper.id,
        title: paper.title,
        authors: paper.authors,
        year: paper.year,
        venue: paper.venue,
        source: paper.source,
        doi: paper.doi,
        url: paper.sourceUrls[0] ?? null,
        relevanceScore: paper.relevanceScore ?? null,
        finalScore: paper.finalScore ?? null,
        insight: getPaperInsight(paper)
      }))
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(error.issues.map((issue) => issue.message).join("; "));
    }

    return errorResponse(
      error instanceof Error ? error.message : "Could not check sources.",
      500
    );
  }
}
