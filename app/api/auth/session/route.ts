import { NextResponse } from "next/server";
import { resolveAppSession } from "@/lib/identity/appSession";

export async function GET(request: Request) {
  const session = await resolveAppSession(request);
  const headers = {
    "Cache-Control": "no-store, private"
  };

  if (!session) {
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        workspace: null
      },
      { headers }
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: session.userId,
        email: session.email,
        name: session.name
      },
      workspace: session.workspaceId
        ? {
            id: session.workspaceId,
            role: session.workspaceRole
          }
        : null,
      expiresAt: session.expiresAt.toISOString()
    },
    { headers }
  );
}
