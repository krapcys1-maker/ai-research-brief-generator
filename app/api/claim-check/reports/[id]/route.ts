import { NextResponse } from "next/server";
import {
  appendDocumentAccessCookieIfNeeded,
  DocumentAuthenticationError,
  getDocumentAccessContext
} from "@/lib/documents/access";
import { applyPrivateDocumentHeaders } from "@/lib/documents/privacy";
import { getCompareReportRepository } from "@/lib/claimCheck/reportRepository";
import { canAccessCompareReport } from "@/lib/claimCheck/reportAccess";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const access = getDocumentAccessContext(request);
    const repository = await getCompareReportRepository();
    const { id } = await context.params;
    const storedReport = await repository.getById(id);
    const headers = applyPrivateDocumentHeaders(undefined, access.scope);

    appendDocumentAccessCookieIfNeeded(headers, access);

    if (!storedReport || !canAccessCompareReport(storedReport, access)) {
      return NextResponse.json(
        {
          status: "not_found",
          error: "Compare report not found for this private session or workspace."
        },
        { status: 404, headers }
      );
    }

    return NextResponse.json(
      {
        report: storedReport.report,
        savedReport: {
          id: storedReport.id,
          title: storedReport.title,
          summary: storedReport.summary,
          sourceDocumentId: storedReport.sourceDocumentId,
          claimCount: storedReport.claimCount,
          visibility: storedReport.visibility,
          createdAt: storedReport.createdAt,
          updatedAt: storedReport.updatedAt
        }
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
          error instanceof Error ? error.message : "Could not load compare report."
      },
      { status: 500 }
    );
  }
}
