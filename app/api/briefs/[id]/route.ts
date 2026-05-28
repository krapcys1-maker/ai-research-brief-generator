import { NextResponse } from "next/server";
import { inMemoryBriefRepository } from "@/lib/storage/inMemoryBriefStore";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const record = await inMemoryBriefRepository.getById(id);

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

  return NextResponse.json(record);
}
