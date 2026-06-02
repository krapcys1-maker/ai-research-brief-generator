import { NextResponse } from "next/server";
import { canAccessBriefFromRequest, privateBriefError } from "@/lib/briefs/access";
import { getBriefRepository } from "@/lib/storage/repository";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const briefRepository = await getBriefRepository();
  const record = await briefRepository.getById(id);

  if (!record) {
    return NextResponse.json(
      {
        status: "error",
        error:
          "Brief not found. In-memory results disappear when the dev server restarts."
      },
      { status: 404 }
    );
  }

  if (!canAccessBriefFromRequest(record, request)) {
    return NextResponse.json(privateBriefError(), { status: 403 });
  }

  return NextResponse.json(record);
}
