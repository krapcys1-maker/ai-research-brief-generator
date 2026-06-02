import { NextResponse } from "next/server";
import {
  applyPrivateDocumentHeaders,
  getDocumentPrivacyPolicy
} from "@/lib/documents/privacy";
import { getDocumentRepository } from "@/lib/documents/repository";
import {
  appendDocumentAccessCookieIfNeeded,
  getDocumentAccessContext
} from "@/lib/documents/access";

export async function GET(request: Request) {
  const access = getDocumentAccessContext(request);
  const repository = await getDocumentRepository();
  const headers = applyPrivateDocumentHeaders(undefined, access.scope);

  appendDocumentAccessCookieIfNeeded(headers, access);

  return NextResponse.json(
    {
      documents: await repository.listDocuments(access.source),
      privacy: getDocumentPrivacyPolicy(access)
    },
    { headers }
  );
}
