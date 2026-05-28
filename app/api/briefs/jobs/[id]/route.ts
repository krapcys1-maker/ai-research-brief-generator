import { NextResponse } from "next/server";
import { getBriefJob } from "@/lib/jobs/briefJobs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = getBriefJob(id);

  if (!job) {
    return NextResponse.json(
      {
        status: "not_found",
        error: "Brief generation job not found."
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    briefId: job.briefId,
    error: job.error,
    qualityGate: job.qualityGate
  });
}

