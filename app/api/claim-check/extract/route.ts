import { NextResponse } from "next/server";
import { extractCandidateClaims } from "@/lib/claimCheck/extractClaims";
import {
  appendDocumentAccessCookieIfNeeded,
  DocumentAuthenticationError,
  getDocumentAccessContext
} from "@/lib/documents/access";
import { ingestUploadedDocument } from "@/lib/documents/ingest";
import {
  applyPrivateDocumentHeaders,
  assertDocumentUploadsEnabled,
  getDocumentPrivacyPolicy
} from "@/lib/documents/privacy";
import { getDocumentRepository } from "@/lib/documents/repository";
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

async function textFromJson(request: Request) {
  const body = (await request.json()) as { text?: unknown };
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (text.length < 20) {
    throw new Error("Paste at least 20 characters to extract claims.");
  }

  return text;
}

export async function POST(request: Request) {
  const access = getDocumentAccessContext(request);
  const source = access.source;
  const headers = applyPrivateDocumentHeaders(undefined, access.scope);

  appendDocumentAccessCookieIfNeeded(headers, access);

  try {
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit({
      key: `claim-check-extract:${clientIp}`
    });

    applyRateLimitHeaders(headers, rateLimit);

    if (!rateLimit.allowed) {
      return errorResponse(
        "Too many claim extraction requests. Please try again later.",
        429,
        headers
      );
    }

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      assertDocumentUploadsEnabled(access.scope);

      const repository = await getDocumentRepository();
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return errorResponse("Upload a PDF, TXT, or MD file.");
      }

      const ingest = await ingestUploadedDocument({
        file,
        source,
        repository
      });
      const chunks = await repository.listChunks({
        source,
        documentIds: [ingest.document.id]
      });
      const text = chunks.map((chunk) => chunk.text).join("\n\n");
      const result = extractCandidateClaims({
        text,
        sourceDocumentId: ingest.document.id
      });

      return NextResponse.json(
        {
          status: "completed",
          document: ingest.document,
          privacy: getDocumentPrivacyPolicy(access),
          ...result
        },
        { headers }
      );
    }

    const text = await textFromJson(request);
    const result = extractCandidateClaims({ text });

    return NextResponse.json(
      {
        status: "completed",
        privacy: getDocumentPrivacyPolicy(access),
        ...result
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
      error instanceof Error ? error.message : "Could not extract claims.",
      error instanceof Error && error.message.includes("Document uploads are disabled")
        ? 403
        : 400,
      headers
    );
  }
}
