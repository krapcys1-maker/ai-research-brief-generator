import { NextResponse } from "next/server";
import {
  getBriefAccessContextForRequest
} from "@/lib/briefs/access";
import { appendBriefHistorySessionCookie } from "@/lib/briefs/session";
import {
  appendDocumentAccessCookieIfNeeded,
  DocumentAuthenticationError,
  getDocumentAccessContext
} from "@/lib/documents/access";
import { applyPrivateDocumentHeaders } from "@/lib/documents/privacy";
import { getWorkspaceDashboard } from "@/lib/workspace/dashboard";

export async function GET(request: Request) {
  try {
    const briefAccess = await getBriefAccessContextForRequest(request);
    const documentAccess = getDocumentAccessContext(request);
    const dashboard = await getWorkspaceDashboard({
      briefAccess,
      documentAccess
    });
    const headers = applyPrivateDocumentHeaders(undefined, dashboard.scope);

    headers.set("X-Workspace-Dashboard-Scope", dashboard.scope);
    headers.set("X-Brief-History-Scope", briefAccess.scope);
    appendDocumentAccessCookieIfNeeded(headers, documentAccess);

    if (
      briefAccess.scope === "session" &&
      briefAccess.sessionId &&
      briefAccess.isNewSession
    ) {
      appendBriefHistorySessionCookie(headers, briefAccess.sessionId);
    }

    return NextResponse.json(
      {
        dashboard
      },
      { headers }
    );
  } catch (error) {
    if (error instanceof DocumentAuthenticationError) {
      return NextResponse.json(
        { status: "error", error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Could not load workspace dashboard."
      },
      { status: 500 }
    );
  }
}
