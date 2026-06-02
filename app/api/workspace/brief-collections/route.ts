import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  getBriefAccessContextForRequest,
  type BriefAccessContext
} from "@/lib/briefs/access";
import { appendBriefHistorySessionCookie } from "@/lib/briefs/session";
import {
  briefCollectionFilterFromAccess,
  briefCollectionOwnershipFromAccess
} from "@/lib/workspace/briefCollectionAccess";
import { getBriefCollectionRepository } from "@/lib/workspace/briefCollectionRepository";
import { CreateBriefCollectionRequestSchema } from "@/lib/workspace/briefCollectionSchemas";
import { getBriefRepository } from "@/lib/storage/repository";

function appendAccessHeaders(headers: Headers, access: BriefAccessContext) {
  headers.set("Cache-Control", "no-store, private");
  headers.set("X-Brief-Collection-Scope", access.scope);

  if (access.scope === "session" && access.sessionId && access.isNewSession) {
    appendBriefHistorySessionCookie(headers, access.sessionId);
  }

  return headers;
}

export async function GET(request: Request) {
  try {
    const access = await getBriefAccessContextForRequest(request);
    const repository = await getBriefCollectionRepository();
    const headers = appendAccessHeaders(new Headers(), access);

    return NextResponse.json(
      {
        collections: await repository.list(briefCollectionFilterFromAccess(access)),
        historyScope: access.scope
      },
      { headers }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Could not list brief collections."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const access = await getBriefAccessContextForRequest(request);
    const body = CreateBriefCollectionRequestSchema.parse(await request.json());
    const briefRepository = await getBriefRepository();
    const accessibleBriefIds = new Set(
      (await briefRepository.listSummaries(access.source)).map((brief) => brief.id)
    );
    const unavailableBriefIds = body.briefIds.filter(
      (briefId) => !accessibleBriefIds.has(briefId)
    );

    if (unavailableBriefIds.length) {
      return NextResponse.json(
        {
          status: "error",
          error:
            "Brief collection contains briefs outside this private session, user, or workspace."
        },
        { status: 403 }
      );
    }

    const repository = await getBriefCollectionRepository();
    const headers = appendAccessHeaders(new Headers(), access);
    const collection = await repository.save({
      ...body,
      ...briefCollectionOwnershipFromAccess(access)
    });

    return NextResponse.json(
      {
        status: "saved",
        collection
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
          error instanceof Error
            ? error.message
            : "Could not save brief collection."
      },
      { status: 500 }
    );
  }
}
