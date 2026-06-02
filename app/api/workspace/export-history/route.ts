import { NextResponse } from "next/server";
import {
  getBriefAccessContextForRequest,
  type BriefAccessContext
} from "@/lib/briefs/access";
import { appendBriefHistorySessionCookie } from "@/lib/briefs/session";
import { exportHistoryFilterFromAccess } from "@/lib/workspace/exportHistoryAccess";
import { getExportHistoryRepository } from "@/lib/workspace/exportHistoryRepository";

function appendAccessHeaders(headers: Headers, access: BriefAccessContext) {
  headers.set("Cache-Control", "no-store, private");
  headers.set("X-Export-History-Scope", access.scope);

  if (access.scope === "session" && access.sessionId && access.isNewSession) {
    appendBriefHistorySessionCookie(headers, access.sessionId);
  }

  return headers;
}

export async function GET(request: Request) {
  try {
    const access = await getBriefAccessContextForRequest(request);
    const repository = await getExportHistoryRepository();
    const headers = appendAccessHeaders(new Headers(), access);

    return NextResponse.json(
      {
        exports: await repository.list(exportHistoryFilterFromAccess(access)),
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
            : "Could not list export history."
      },
      { status: 500 }
    );
  }
}
