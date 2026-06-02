import { NextResponse } from "next/server";
import { ingestUploadedDocument } from "@/lib/documents/ingest";
import {
  applyPrivateDocumentHeaders,
  assertDocumentUploadsEnabled,
  getDocumentUploadsDisabledMessage,
  getDocumentPrivacyPolicy
} from "@/lib/documents/privacy";
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

function errorResponse(message: string, status = 400, headers?: Headers) {
  return NextResponse.json(
    { status: "error", error: message, privacy: getDocumentPrivacyPolicy() },
    { status, headers }
  );
}

function applyRateLimitHeaders(
  headers: Headers,
  rateLimit: Awaited<ReturnType<typeof checkRateLimit>>
) {
  headers.set("X-RateLimit-Limit", rateLimit.limit.toString());
  headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
  headers.set("X-RateLimit-Reset", Math.ceil(rateLimit.resetAt / 1000).toString());

  if (!rateLimit.allowed) {
    headers.set("Retry-After", rateLimit.retryAfterSeconds.toString());
  }
}

export async function POST(request: Request) {
  const headers = applyPrivateDocumentHeaders();

  try {
    const access = getDocumentAccessContext(request);
    applyPrivateDocumentHeaders(headers, access.scope);
    assertDocumentUploadsEnabled(access.scope);

    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit({
      key: `documents-upload:${access.ownerId ?? clientIp}`
    });

    applyRateLimitHeaders(headers, rateLimit);

    if (!rateLimit.allowed) {
      return errorResponse(
        "Too many document upload requests. Please try again later.",
        429,
        headers
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return errorResponse("Upload a file using the form field named file.");
    }

    const repository = await getDocumentRepository();
    const result = await ingestUploadedDocument({
      file,
      source: access.source,
      repository
    });
    appendDocumentAccessCookieIfNeeded(headers, access);

    return NextResponse.json(
      {
        status: result.document.status === "parsed" ? "completed" : "failed",
        document: result.document,
        chunkCount: result.chunkCount,
        parserName: result.parserName,
        qualityScore: result.qualityScore,
        privacy: getDocumentPrivacyPolicy(access)
      },
      { headers }
    );
  } catch (error) {
    if (error instanceof RateLimitConfigurationError) {
      return errorResponse(error.message, 503, headers);
    }

    if (error instanceof DocumentAuthenticationError) {
      return errorResponse(error.message, 401, headers);
    }

    return errorResponse(
      error instanceof Error ? error.message : "Could not upload document.",
      areUploadDisabledError(error) ? 403 : 400,
      headers
    );
  }
}

function areUploadDisabledError(error: unknown) {
  return (
    error instanceof Error &&
    error.message === getDocumentUploadsDisabledMessage()
  );
}
