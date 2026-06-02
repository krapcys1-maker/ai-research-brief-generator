import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ClaimCheckRequestSchema } from "@/lib/claimCheck/schemas";
import { compareClaimsWithScience } from "@/lib/claimCheck/compare";
import { getCompareReportRepository } from "@/lib/claimCheck/reportRepository";
import { compareReportOwnershipFromAccess } from "@/lib/claimCheck/reportAccess";
import { getDocumentRepository } from "@/lib/documents/repository";
import {
  appendDocumentAccessCookieIfNeeded,
  DocumentAuthenticationError,
  getDocumentAccessContext
} from "@/lib/documents/access";
import {
  checkRateLimit,
  getClientIp,
  RateLimitConfigurationError
} from "@/lib/security/rateLimit";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ status: "error", error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit({
      key: `claim-check:${clientIp}`
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          status: "error",
          error: "Too many claim-check requests. Please try again later."
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

    const access = getDocumentAccessContext(request);
    const body = ClaimCheckRequestSchema.parse(await request.json());
    const documentRepository = await getDocumentRepository();
    const report = await compareClaimsWithScience({
      request: body,
      documentSource: access.source,
      dependencies: { documentRepository }
    });
    const compareReportRepository = await getCompareReportRepository();
    const savedReport = await compareReportRepository.save({
      request: body,
      report,
      ...compareReportOwnershipFromAccess(access)
    });
    const headers = new Headers({
      "X-RateLimit-Limit": rateLimit.limit.toString(),
      "X-RateLimit-Remaining": rateLimit.remaining.toString(),
      "X-RateLimit-Reset": Math.ceil(rateLimit.resetAt / 1000).toString()
    });

    appendDocumentAccessCookieIfNeeded(headers, access);

    return NextResponse.json(
      {
        status: "completed",
        report,
        savedReport: {
          id: savedReport.id,
          title: savedReport.title,
          summary: savedReport.summary,
          sourceDocumentId: savedReport.sourceDocumentId,
          claimCount: savedReport.claimCount,
          visibility: savedReport.visibility,
          createdAt: savedReport.createdAt,
          updatedAt: savedReport.updatedAt
        }
      },
      { headers }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(error.issues.map((issue) => issue.message).join("; "));
    }

    if (error instanceof RateLimitConfigurationError) {
      return NextResponse.json(
        { status: "configuration_error", error: error.message },
        { status: 503 }
      );
    }

    if (error instanceof DocumentAuthenticationError) {
      return errorResponse(error.message, 401);
    }

    return errorResponse(
      error instanceof Error ? error.message : "Could not compare claims.",
      500
    );
  }
}
