import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createBrief } from "@/lib/pipeline/createBrief";
import { ResearchQualityGateError } from "@/lib/pipeline/qualityGate";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import { getBriefRepository } from "@/lib/storage/repository";

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
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit({
      key: `brief:${clientIp}`
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          status: "error",
          error: "Too many brief generation requests. Please try again later."
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateLimit.retryAfterSeconds.toString(),
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": Math.ceil(rateLimit.resetAt / 1000).toString()
          }
        }
      );
    }

    const body = await request.json();
    const record = await createBrief(body);

    return NextResponse.json(
      {
        briefId: record.brief.id,
        status: "completed"
      },
      {
        headers: {
          "X-RateLimit-Limit": rateLimit.limit.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": Math.ceil(rateLimit.resetAt / 1000).toString()
        }
      }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(error.issues.map((issue) => issue.message).join("; "));
    }

    if (error instanceof ResearchQualityGateError) {
      return NextResponse.json(
        {
          status: "quality_gate_failed",
          error: error.message,
          qualityGate: error.qualityGate
        },
        { status: 422 }
      );
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
  const briefRepository = await getBriefRepository();

  return NextResponse.json({
    briefs: await briefRepository.listSummaries()
  });
}
