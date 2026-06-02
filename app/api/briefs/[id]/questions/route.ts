import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AIConfigurationError, AIProviderError } from "@/lib/ai/client";
import { BriefQuestionRequestSchema } from "@/lib/ai/schemas";
import { synthesizeAnswer } from "@/lib/ai/synthesizeAnswer";
import {
  canAccessBriefFromRequestAsync,
  getBriefRateLimitKeyForRequest,
  privateBriefError
} from "@/lib/briefs/access";
import { getFullTextRepository } from "@/lib/fulltext/repository";
import { retrievePaperTextChunks } from "@/lib/fulltext/retrieval";
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
      key: await getBriefRateLimitKeyForRequest(
        "brief-question",
        request,
        clientIp
      )
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

    if (!(await canAccessBriefFromRequestAsync(record, request))) {
      return NextResponse.json(privateBriefError(), { status: 403 });
    }

    const fullTextChunks = await (async () => {
      try {
        const fullTextRepository = await getFullTextRepository();
        return await fullTextRepository.getChunksByPaperIds(
          record.papers.map((paper) => paper.id)
        );
      } catch {
        return [];
      }
    })();
    const retrievedFullTextChunks = retrievePaperTextChunks({
      question: body.question,
      chunks: fullTextChunks,
      topK: 6
    });

    const answer = await synthesizeAnswer({
      question: body.question,
      outputLanguage: detectQueryLanguage(body.question),
      brief: record.brief,
      papers: record.papers,
      ...(retrievedFullTextChunks.length
        ? { fullTextChunks: retrievedFullTextChunks }
        : {})
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

    if (message.startsWith("Could not generate a valid grounded answer")) {
      return errorResponse(
        "The selected sources were not enough to produce a validated grounded answer. Try a narrower question or generate a brief with stronger source coverage.",
        422
      );
    }

    return errorResponse(message, 500);
  }
}
