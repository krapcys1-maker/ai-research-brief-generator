import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AIConfigurationError, AIProviderError } from "@/lib/ai/client";
import { askDocuments } from "@/lib/documents/askDocuments";
import {
  applyPrivateDocumentHeaders,
  getDocumentPrivacyPolicy
} from "@/lib/documents/privacy";
import { getDocumentRepository } from "@/lib/documents/repository";
import { retrieveDocumentChunks } from "@/lib/documents/retrieval";
import { AskDocumentsRequestSchema } from "@/lib/documents/schemas";
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
    {
      status: "error",
      error: message
    },
    { status, headers }
  );
}

export async function POST(request: Request) {
  const headers = applyPrivateDocumentHeaders();

  try {
    const access = getDocumentAccessContext(request);
    applyPrivateDocumentHeaders(headers, access.scope);
    appendDocumentAccessCookieIfNeeded(headers, access);

    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit({
      key: `documents-ask:${access.ownerId ?? access.sessionId ?? clientIp}`
    });

    if (!rateLimit.allowed) {
      headers.set("Retry-After", rateLimit.retryAfterSeconds.toString());
      headers.set("X-RateLimit-Limit", rateLimit.limit.toString());
      headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
      headers.set("X-RateLimit-Reset", Math.ceil(rateLimit.resetAt / 1000).toString());
      return errorResponse(
        "Too many document question requests. Please try again later.",
        429,
        headers
      );
    }

    const body = AskDocumentsRequestSchema.parse(await request.json());
    const repository = await getDocumentRepository();
    const [documents, chunks] = await Promise.all([
      repository.listDocuments(access.source),
      repository.listChunks({
        source: access.source,
        documentIds: body.documentIds
      })
    ]);
    const selectedDocumentIds = new Set(body.documentIds ?? documents.map((item) => item.id));
    const selectedDocuments = documents.filter((document) =>
      selectedDocumentIds.has(document.id)
    );
    const retrievedChunks = await retrieveDocumentChunks({
      question: body.question,
      chunks,
      topK: body.topK
    });
    const answer = await askDocuments({
      question: body.question,
      documents: selectedDocuments,
      retrievedChunks
    });

    headers.set("X-RateLimit-Limit", rateLimit.limit.toString());
    headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
    headers.set("X-RateLimit-Reset", Math.ceil(rateLimit.resetAt / 1000).toString());

    return NextResponse.json(
      {
        status: "completed",
        answer,
        retrievedChunkCount: retrievedChunks.length,
        privacy: getDocumentPrivacyPolicy(access)
      },
      { headers }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(
        error.issues.map((issue) => issue.message).join("; "),
        400,
        headers
      );
    }

    if (error instanceof RateLimitConfigurationError) {
      return errorResponse(error.message, 503, headers);
    }

    if (error instanceof DocumentAuthenticationError) {
      return errorResponse(error.message, 401, headers);
    }

    if (error instanceof AIConfigurationError || error instanceof AIProviderError) {
      return errorResponse(error.message, 503, headers);
    }

    const message =
      error instanceof Error ? error.message : "Could not answer document question.";

    if (message.startsWith("Could not generate a valid grounded document answer")) {
      return errorResponse(
        "The uploaded documents were not enough to produce a validated grounded answer. Try a narrower question or upload stronger source material.",
        422,
        headers
      );
    }

    return errorResponse(message, 500, headers);
  }
}
