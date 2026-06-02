import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  getBriefAccessContextForRequest,
  type BriefAccessContext
} from "@/lib/briefs/access";
import { appendBriefHistorySessionCookie } from "@/lib/briefs/session";
import { getBriefRepository } from "@/lib/storage/repository";
import { paperNoteFilterFromAccess, paperNoteOwnershipFromAccess } from "@/lib/workspace/paperNoteAccess";
import { getPaperNoteRepository } from "@/lib/workspace/paperNoteRepository";
import { CreatePaperNoteRequestSchema } from "@/lib/workspace/paperNoteSchemas";

function appendAccessHeaders(headers: Headers, access: BriefAccessContext) {
  headers.set("Cache-Control", "no-store, private");
  headers.set("X-Paper-Note-Scope", access.scope);

  if (access.scope === "session" && access.sessionId && access.isNewSession) {
    appendBriefHistorySessionCookie(headers, access.sessionId);
  }

  return headers;
}

export async function GET(request: Request) {
  try {
    const access = await getBriefAccessContextForRequest(request);
    const repository = await getPaperNoteRepository();
    const headers = appendAccessHeaders(new Headers(), access);

    return NextResponse.json(
      {
        notes: await repository.list(paperNoteFilterFromAccess(access)),
        historyScope: access.scope
      },
      { headers }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error:
          error instanceof Error ? error.message : "Could not list paper notes."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const access = await getBriefAccessContextForRequest(request);
    const body = CreatePaperNoteRequestSchema.parse(await request.json());
    const briefRepository = await getBriefRepository();
    const accessiblePaperIds = new Set(
      (await briefRepository.list(access.source)).flatMap((brief) =>
        brief.papers.map((paper) => paper.id)
      )
    );

    if (!accessiblePaperIds.has(body.paperId)) {
      return NextResponse.json(
        {
          status: "error",
          error:
            "Paper note targets a paper outside this private session, user, or workspace."
        },
        { status: 403 }
      );
    }

    const repository = await getPaperNoteRepository();
    const headers = appendAccessHeaders(new Headers(), access);
    const note = await repository.save({
      ...body,
      ...paperNoteOwnershipFromAccess(access)
    });

    return NextResponse.json(
      {
        status: "saved",
        note
      },
      {
        status: 201,
        headers
      }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          status: "error",
          error: error.issues.map((issue) => issue.message).join("; ")
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        status: "error",
        error:
          error instanceof Error ? error.message : "Could not save paper note."
      },
      { status: 500 }
    );
  }
}
