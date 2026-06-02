import { NextResponse } from "next/server";
import {
  canAccessBrief,
  privateBriefJobError
} from "@/lib/briefs/access";
import { getBriefHistorySessionId } from "@/lib/briefs/session";
import { getBriefJob } from "@/lib/jobs/briefJobs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await getBriefJob(id);

  if (!job) {
    return NextResponse.json(
      {
        status: "not_found",
        error: "Brief generation job not found."
      },
      { status: 404 }
    );
  }

  if (!canAccessBrief(job, getBriefHistorySessionId(request))) {
    return NextResponse.json(privateBriefJobError(), { status: 403 });
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    stage: job.stage,
    stageStartedAt: job.stageStartedAt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    briefId: job.briefId,
    error: job.error,
    qualityGate: job.qualityGate
  });
}
