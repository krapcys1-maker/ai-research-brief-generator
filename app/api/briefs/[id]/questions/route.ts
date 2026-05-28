import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AIConfigurationError, AIProviderError } from "@/lib/ai/client";
import { BriefQuestionRequestSchema } from "@/lib/ai/schemas";
import { synthesizeAnswer } from "@/lib/ai/synthesizeAnswer";
import {
  checkRateLimit,
  getClientIp,
  RateLimitConfigurationError
} from "@/lib/security/rateLimit";
import { getBriefRepository } from "@/lib/storage/repository";
import { detectQueryLanguage } from "@/lib/utils/language";

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    {
      status: "error",
      error: message
    },
    { status }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit({
      key: `brief-question:${clientIp}`
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          status: "error",
          error: "Too many brief question requests. Please try again later."
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

    const body = BriefQuestionRequestSchema.parse(await request.json());
    const briefRepository = await getBriefRepository();
    const record = await briefRepository.getById(id);

    if (!record) {
      return errorResponse(
        "Brief not found. Generate the brief again if it was stored in memory.",
        404
      );
    }

    const answer = await synthesizeAnswer({
      question: body.question,
      outputLanguage: detectQueryLanguage(body.question),
      brief: record.brief,
      papers: record.papers
    });

    return NextResponse.json(
      {
        status: "completed",
        answer
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

    if (error instanceof RateLimitConfigurationError) {
      return NextResponse.json(
        {
          status: "configuration_error",
          error: error.message
        },
        { status: 503 }
      );
    }

    if (error instanceof AIConfigurationError || error instanceof AIProviderError) {
      return errorResponse(error.message, 503);
    }

    const message =
      error instanceof Error ? error.message : "Could not answer this brief question.";

    return errorResponse(message, 500);
  }
}
