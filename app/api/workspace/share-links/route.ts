import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  getBriefAccessContextForRequest,
  type BriefAccessContext
} from "@/lib/briefs/access";
import { appendBriefHistorySessionCookie } from "@/lib/briefs/session";
import { getBriefRepository } from "@/lib/storage/repository";
import {
  shareLinkFilterFromAccess,
  shareLinkOwnershipFromAccess
} from "@/lib/workspace/shareLinkAccess";
import { getShareLinkRepository } from "@/lib/workspace/shareLinkRepository";
import { CreateShareLinkRequestSchema } from "@/lib/workspace/shareLinkSchemas";

function appendAccessHeaders(headers: Headers, access: BriefAccessContext) {
  headers.set("Cache-Control", "no-store, private");
  headers.set("X-Share-Link-Scope", access.scope);

  if (access.scope === "session" && access.sessionId && access.isNewSession) {
    appendBriefHistorySessionCookie(headers, access.sessionId);
  }

  return headers;
}

export async function GET(request: Request) {
  try {
    const access = await getBriefAccessContextForRequest(request);
    const repository = await getShareLinkRepository();
    const headers = appendAccessHeaders(new Headers(), access);

    return NextResponse.json(
      {
        links: await repository.list(shareLinkFilterFromAccess(access)),
        historyScope: access.scope
      },
      { headers }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error:
          error instanceof Error ? error.message : "Could not list share links."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const access = await getBriefAccessContextForRequest(request);
    const body = CreateShareLinkRequestSchema.parse(await request.json());
    const briefRepository = await getBriefRepository();
    const accessibleBrief = (await briefRepository.listSummaries(access.source))
      .find((brief) => brief.id === body.resourceId);

    if (!accessibleBrief) {
      return NextResponse.json(
        {
          status: "error",
          error:
            "Share link targets a brief outside this private session, user, or workspace."
        },
        { status: 403 }
      );
    }

    const repository = await getShareLinkRepository();
    const headers = appendAccessHeaders(new Headers(), access);
    const link = await repository.save({
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      title: accessibleBrief.title,
      ...shareLinkOwnershipFromAccess(access, body.visibility)
    });

    return NextResponse.json(
      {
        status: "saved",
        link
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
          error instanceof Error ? error.message : "Could not save share link."
      },
      { status: 500 }
    );
  }
}
