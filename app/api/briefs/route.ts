import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createBrief } from "@/lib/pipeline/createBrief";
import { listBriefRecords } from "@/lib/storage/inMemoryBriefStore";

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
    const record = await createBrief(body);

    return NextResponse.json({
      briefId: record.brief.id,
      status: "completed"
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(error.issues.map((issue) => issue.message).join("; "));
    }

    const message =
      error instanceof Error
        ? error.message
        : "Could not generate the research brief.";

    const status =
      message.includes("DEEPSEEK_API_KEY") || message.includes("AI_PROVIDER")
        ? 503
        : 500;

    return errorResponse(message, status);
  }
}

export async function GET() {
  return NextResponse.json({
    briefs: listBriefRecords().map((record) => ({
      id: record.brief.id,
      title: record.brief.title,
      query: record.brief.query,
      generatedAt: record.brief.generatedAt,
      outputLanguage: record.brief.outputLanguage
    }))
  });
}
