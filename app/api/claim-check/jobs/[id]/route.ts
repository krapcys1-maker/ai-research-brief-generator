import { NextResponse } from "next/server";
import { getCompareJob } from "@/lib/claimCheck/jobs";
import { canAccessCompareReport } from "@/lib/claimCheck/reportAccess";
import {
  appendDocumentAccessCookieIfNeeded,
  DocumentAuthenticationError,
  getDocumentAccessContext
} from "@/lib/documents/access";
import { applyPrivateDocumentHeaders } from "@/lib/documents/privacy";

function jobNotFound(headers: Headers) {
  return NextResponse.json(
    {
      status: "not_found",
      error: "Compare job not found for this private session or workspace."
    },
    { status: 404, headers }
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const access = getDocumentAccessContext(request);
    const headers = applyPrivateDocumentHeaders(undefined, access.scope);
    const { id } = await context.params;
    const job = await getCompareJob(id);

    appendDocumentAccessCookieIfNeeded(headers, access);

    if (!job || !canAccessCompareReport(job, access)) {
      return jobNotFound(headers);
    }

    return NextResponse.json(
      {
        jobId: job.id,
        status: job.status,
        stage: job.stage,
        stageStartedAt: job.stageStartedAt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        reportId: job.reportId ?? null,
        report: job.status === "completed" ? job.report : undefined,
        error: job.error
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
        error: error instanceof Error ? error.message : "Could not load compare job."
      },
      { status: 500 }
    );
  }
}
