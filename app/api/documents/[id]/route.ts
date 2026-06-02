import { NextResponse } from "next/server";
import { applyPrivateDocumentHeaders } from "@/lib/documents/privacy";
import { getDocumentRepository } from "@/lib/documents/repository";
import {
  appendDocumentAccessCookieIfNeeded,
  DocumentAuthenticationError,
  getDocumentAccessContext
} from "@/lib/documents/access";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const headers = applyPrivateDocumentHeaders();

  let deleted = false;

  try {
    const access = getDocumentAccessContext(request);
    applyPrivateDocumentHeaders(headers, access.scope);
    const repository = await getDocumentRepository();
    deleted = await repository.deleteDocument(id, access.source);
    appendDocumentAccessCookieIfNeeded(headers, access);
  } catch (error) {
    if (error instanceof DocumentAuthenticationError) {
      return NextResponse.json(
        {
          status: "error",
          error: error.message
        },
        { status: 401, headers }
      );
    }

    throw error;
  }

  if (!deleted) {
    return NextResponse.json(
      {
        status: "error",
        error: "Document not found for this private session."
      },
      { status: 404, headers }
    );
  }

  return NextResponse.json({ status: "deleted" }, { headers });
}
