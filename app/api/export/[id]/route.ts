import { NextResponse } from "next/server";
import {
  canAccessBrief,
  getBriefAccessContextForRequest,
  privateBriefError
} from "@/lib/briefs/access";
import { researchBriefToMarkdown } from "@/lib/export/markdown";
import { getBriefRepository } from "@/lib/storage/repository";
import { exportHistoryOwnershipFromAccess } from "@/lib/workspace/exportHistoryAccess";
import { getExportHistoryRepository } from "@/lib/workspace/exportHistoryRepository";

function safeFilename(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "markdown";

  if (format !== "markdown") {
    return NextResponse.json(
      {
        status: "error",
        error: "Only format=markdown is supported in this MVP."
      },
      { status: 400 }
    );
  }

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

  const access = await getBriefAccessContextForRequest(request);

  if (!canAccessBrief(record, access)) {
    return NextResponse.json(privateBriefError(), { status: 403 });
  }

  const markdown = researchBriefToMarkdown(record);
  const filename = `${safeFilename(record.brief.title) || id}.md`;
  const exportHistoryRepository = await getExportHistoryRepository();

  await exportHistoryRepository.save({
    resourceType: "brief",
    resourceId: record.brief.id,
    title: record.brief.title,
    format: "markdown",
    filename,
    ...exportHistoryOwnershipFromAccess(access)
  });

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
