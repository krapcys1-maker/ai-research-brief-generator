import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  appendDocumentAccessCookieIfNeeded,
  DocumentAuthenticationError,
  getDocumentAccessContext
} from "@/lib/documents/access";
import { applyPrivateDocumentHeaders } from "@/lib/documents/privacy";
import { getDocumentRepository } from "@/lib/documents/repository";
import {
  documentCollectionFilterFromAccess,
  documentCollectionOwnershipFromAccess
} from "@/lib/workspace/documentCollectionAccess";
import { getDocumentCollectionRepository } from "@/lib/workspace/documentCollectionRepository";
import { CreateDocumentCollectionRequestSchema } from "@/lib/workspace/documentCollectionSchemas";

export async function GET(request: Request) {
  try {
    const access = getDocumentAccessContext(request);
    const repository = await getDocumentCollectionRepository();
    const headers = applyPrivateDocumentHeaders(undefined, access.scope);

    headers.set("X-Document-Collection-Scope", access.scope);
    appendDocumentAccessCookieIfNeeded(headers, access);

    return NextResponse.json(
      {
        collections: await repository.list(
          documentCollectionFilterFromAccess(access)
        ),
        historyScope: access.scope
      },
      { headers }
    );
  } catch (error) {
    if (error instanceof DocumentAuthenticationError) {
      return NextResponse.json(
        { status: "error", error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Could not list document collections."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const access = getDocumentAccessContext(request);
    const body = CreateDocumentCollectionRequestSchema.parse(await request.json());
    const documentRepository = await getDocumentRepository();
    const accessibleDocumentIds = new Set(
      (await documentRepository.listDocuments(access.source)).map(
        (document) => document.id
      )
    );
    const unavailableDocumentIds = body.documentIds.filter(
      (documentId) => !accessibleDocumentIds.has(documentId)
    );

    if (unavailableDocumentIds.length) {
      return NextResponse.json(
        {
          status: "error",
          error:
            "Document collection contains documents outside this private session, user, or workspace."
        },
        { status: 403 }
      );
    }

    const repository = await getDocumentCollectionRepository();
    const headers = applyPrivateDocumentHeaders(undefined, access.scope);
    const collection = await repository.save({
      ...body,
      ...documentCollectionOwnershipFromAccess(access)
    });

    headers.set("X-Document-Collection-Scope", access.scope);
    appendDocumentAccessCookieIfNeeded(headers, access);

    return NextResponse.json(
      {
        status: "saved",
        collection
      },
      {
        status: 201,
        headers
      }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          status: "error",
          error: error.issues.map((issue) => issue.message).join("; ")
        },
        { status: 400 }
      );
    }

    if (error instanceof DocumentAuthenticationError) {
      return NextResponse.json(
        { status: "error", error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Could not save document collection."
      },
      { status: 500 }
    );
  }
}
