import { NextResponse } from "next/server";
import {
  appendDocumentAccessCookieIfNeeded,
  DocumentAuthenticationError,
  getDocumentAccessContext
} from "@/lib/documents/access";
import { applyPrivateDocumentHeaders } from "@/lib/documents/privacy";
import { getCompareReportRepository } from "@/lib/claimCheck/reportRepository";
import { compareReportFilterFromAccess } from "@/lib/claimCheck/reportAccess";

export async function GET(request: Request) {
  try {
    const access = getDocumentAccessContext(request);
    const repository = await getCompareReportRepository();
    const headers = applyPrivateDocumentHeaders(undefined, access.scope);

    appendDocumentAccessCookieIfNeeded(headers, access);

    return NextResponse.json(
      {
        reports: await repository.listSummaries(compareReportFilterFromAccess(access)),
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
          error instanceof Error ? error.message : "Could not list compare reports."
      },
      { status: 500 }
    );
  }
}
