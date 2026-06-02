import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { BriefRequestSchema } from "@/lib/ai/schemas";
import {
  getBriefAccessContextForRequest,
  getBriefRateLimitKeyForRequest
} from "@/lib/briefs/access";
import {
  appendBriefHistorySessionCookie
} from "@/lib/briefs/session";
import { createBriefJob } from "@/lib/jobs/briefJobs";
import { structuredLogger } from "@/lib/observability/structuredLogger";
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
    const rateLimitKey = await getBriefRateLimitKeyForRequest(
      "brief",
      request,
      clientIp
    );
    const rateLimit = await checkRateLimit({
      key: rateLimitKey
    });

    if (!rateLimit.allowed) {
      structuredLogger.warn("brief_api.rate_limited", {
        rateLimitKey,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
        limit: rateLimit.limit,
        resetAt: rateLimit.resetAt
      });

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
    const access = await getBriefAccessContextForRequest(request);
    const job = await createBriefJob(
      body,
      access.scope === "user"
        ? {
            ownerId: access.ownerId,
            workspaceId: access.workspaceId,
            createdByUserId: access.ownerId,
            visibility: access.workspaceId ? "workspace" : "private"
          }
        : {
            ownerSessionId: access.sessionId
          }
    );
    structuredLogger.info("brief_api.job_created", {
      jobId: job.id,
      jobStatus: job.status,
      scope: access.scope,
      workspaceId: access.scope === "user" ? access.workspaceId : undefined,
      visibility:
        access.scope === "user"
          ? access.workspaceId
            ? "workspace"
            : "private"
          : "session"
    });
    const headers = new Headers({
      "X-RateLimit-Limit": rateLimit.limit.toString(),
      "X-RateLimit-Remaining": rateLimit.remaining.toString(),
      "X-RateLimit-Reset": Math.ceil(rateLimit.resetAt / 1000).toString(),
      "X-Brief-History-Scope": access.scope
    });

    if (access.scope === "session" && access.sessionId && access.isNewSession) {
      appendBriefHistorySessionCookie(headers, access.sessionId);
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
      structuredLogger.error("brief_api.rate_limit_configuration_error", {
        error
      });

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

    structuredLogger.error("brief_api.job_create_failed", {
      status,
      error
    });

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

  const access = await getBriefAccessContextForRequest(request);
  const headers = new Headers({
    "Cache-Control": "no-store, private",
    "X-Brief-History-Scope": access.scope
  });

  if (access.scope === "session" && access.sessionId && access.isNewSession) {
    appendBriefHistorySessionCookie(headers, access.sessionId);
  }

  return NextResponse.json(
    {
      briefs: await briefRepository.listSummaries(access.source),
      historyScope: access.scope
    },
    { headers }
  );
}
