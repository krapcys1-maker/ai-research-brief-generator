import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { BriefRequestSchema } from "@/lib/ai/schemas";
import {
  appendBriefHistorySessionCookie,
  getOrCreateBriefHistorySession
} from "@/lib/briefs/session";
import { createBriefJob } from "@/lib/jobs/briefJobs";
import {
  checkRateLimit,
  getClientIp,
  RateLimitConfigurationError
} from "@/lib/security/rateLimit";
import { getBriefRepository } from "@/lib/storage/repository";
import { isPublicBriefHistoryEnabled } from "@/lib/config/briefHistory";

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
    const rateLimit = await checkRateLimit({
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

    const body = BriefRequestSchema.parse(await request.json());
    const session = getOrCreateBriefHistorySession(request);
    const job = await createBriefJob(body, {
      ownerSessionId: session.sessionId
    });
    const headers = new Headers({
      "X-RateLimit-Limit": rateLimit.limit.toString(),
      "X-RateLimit-Remaining": rateLimit.remaining.toString(),
      "X-RateLimit-Reset": Math.ceil(rateLimit.resetAt / 1000).toString(),
      "X-Brief-History-Scope": "session"
    });

    if (session.isNew) {
      appendBriefHistorySessionCookie(headers, session.sessionId);
    }

    return NextResponse.json(
      {
        jobId: job.id,
        status: job.status
      },
      {
        status: 202,
        headers
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

export async function GET(request: Request) {
  const briefRepository = await getBriefRepository();

  if (isPublicBriefHistoryEnabled()) {
    return NextResponse.json({
      briefs: await briefRepository.listSummaries(),
      historyScope: "public"
    });
  }

  const session = getOrCreateBriefHistorySession(request);
  const headers = new Headers({
    "Cache-Control": "no-store, private",
    "X-Brief-History-Scope": "session"
  });

  if (session.isNew) {
    appendBriefHistorySessionCookie(headers, session.sessionId);
  }

  return NextResponse.json(
    {
      briefs: await briefRepository.listSummaries({
        ownerSessionId: session.sessionId
      }),
      historyScope: "session"
    },
    { headers }
  );
}
