import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  getBriefAccessContextForRequest,
  type BriefAccessContext
} from "@/lib/briefs/access";
import { appendBriefHistorySessionCookie } from "@/lib/briefs/session";
import {
  researchProjectFilterFromAccess,
  researchProjectOwnershipFromAccess
} from "@/lib/workspace/projectAccess";
import { getResearchProjectRepository } from "@/lib/workspace/projectRepository";
import { CreateResearchProjectRequestSchema } from "@/lib/workspace/projectSchemas";

function appendAccessHeaders(headers: Headers, access: BriefAccessContext) {
  headers.set("Cache-Control", "no-store, private");
  headers.set("X-Research-Project-Scope", access.scope);

  if (access.scope === "session" && access.sessionId && access.isNewSession) {
    appendBriefHistorySessionCookie(headers, access.sessionId);
  }

  return headers;
}

export async function GET(request: Request) {
  try {
    const access = await getBriefAccessContextForRequest(request);
    const repository = await getResearchProjectRepository();
    const headers = appendAccessHeaders(new Headers(), access);

    return NextResponse.json(
      {
        projects: await repository.list(researchProjectFilterFromAccess(access)),
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
            : "Could not list research projects."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const access = await getBriefAccessContextForRequest(request);
    const body = CreateResearchProjectRequestSchema.parse(await request.json());
    const repository = await getResearchProjectRepository();
    const headers = appendAccessHeaders(new Headers(), access);
    const project = await repository.save({
      ...body,
      ...researchProjectOwnershipFromAccess(access)
    });

    return NextResponse.json(
      {
        status: "saved",
        project
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
            : "Could not save research project."
      },
      { status: 500 }
    );
  }
}
