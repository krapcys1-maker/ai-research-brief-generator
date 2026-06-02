import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { inMemoryDocumentRepository } from "@/lib/documents/inMemoryDocumentRepository";
import { resetRateLimitForTests } from "@/lib/security/rateLimit";

function longText() {
  return Array.from(
    { length: 80 },
    (_, index) => `retrieval grounded document evidence token${index}`
  ).join(" ");
}

describe("documents API routes", () => {
  beforeEach(async () => {
    await inMemoryDocumentRepository.clear();
    resetRateLimitForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetRateLimitForTests();
  });

  it("rejects unsupported uploads", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File(["not supported"], "notes.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      })
    );

    const { POST } = await import("@/app/api/documents/upload/route");
    const response = await POST(
      new Request("http://localhost/api/documents/upload", {
        method: "POST",
        body: formData
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("Unsupported file type");
  });

  it("blocks document uploads when disabled for the deployment", async () => {
    vi.stubEnv("DOCUMENT_UPLOADS_ENABLED", "false");

    const formData = new FormData();
    formData.set(
      "file",
      new File([longText()], "notes.md", { type: "text/markdown" })
    );

    const { POST } = await import("@/app/api/documents/upload/route");
    const response = await POST(
      new Request("http://localhost/api/documents/upload", {
        method: "POST",
        body: formData
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(payload.privacy.uploadsEnabled).toBe(false);
    expect(payload.error).toContain("Document uploads are disabled");
  });

  it("uploads text documents and lists them only for the same session", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File([longText()], "notes.md", { type: "text/markdown" })
    );

    const uploadRoute = await import("@/app/api/documents/upload/route");
    const uploadResponse = await uploadRoute.POST(
      new Request("http://localhost/api/documents/upload", {
        method: "POST",
        body: formData
      })
    );
    const uploadPayload = await uploadResponse.json();
    const cookie = uploadResponse.headers.get("set-cookie");

    expect(uploadResponse.status).toBe(200);
    expect(uploadResponse.headers.get("cache-control")).toContain("no-store");
    expect(uploadPayload.status).toBe("completed");
    expect(uploadPayload.document.status).toBe("parsed");
    expect(uploadPayload.chunkCount).toBeGreaterThan(0);
    expect(cookie).toContain("ai_brief_doc_session");

    const { GET } = await import("@/app/api/documents/route");
    const sameSessionResponse = await GET(
      new Request("http://localhost/api/documents", {
        headers: { cookie: cookie ?? "" }
      })
    );
    const sameSessionPayload = await sameSessionResponse.json();
    const otherSessionResponse = await GET(
      new Request("http://localhost/api/documents", {
        headers: { cookie: "ai_brief_doc_session=other_session" }
      })
    );
    const otherSessionPayload = await otherSessionResponse.json();

    expect(sameSessionPayload.documents).toHaveLength(1);
    expect(sameSessionPayload.privacy.privacyScope).toBe("session");
    expect(otherSessionPayload.documents).toEqual([]);
  });

  it("uses authenticated user and workspace ownership when trusted headers are present", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File([longText()], "workspace-notes.md", { type: "text/markdown" })
    );

    const uploadRoute = await import("@/app/api/documents/upload/route");
    const uploadResponse = await uploadRoute.POST(
      new Request("http://localhost/api/documents/upload", {
        method: "POST",
        headers: {
          "x-ai-brief-user-id": "user_1",
          "x-ai-brief-workspace-id": "workspace_a"
        },
        body: formData
      })
    );
    const uploadPayload = await uploadResponse.json();

    expect(uploadResponse.status).toBe(200);
    expect(uploadResponse.headers.get("set-cookie")).toBeNull();
    expect(uploadResponse.headers.get("x-document-privacy-scope")).toBe("user");
    expect(uploadPayload.document.ownerId).toBe("user_1");
    expect(uploadPayload.document.workspaceId).toBe("workspace_a");
    expect(uploadPayload.document.sessionId).toBeNull();
    expect(uploadPayload.document.privacyScope).toBe("user");
    expect(uploadPayload.privacy.privacyScope).toBe("user");
    expect(uploadPayload.privacy.workspaceScoped).toBe(true);

    const { GET } = await import("@/app/api/documents/route");
    const sameWorkspaceResponse = await GET(
      new Request("http://localhost/api/documents", {
        headers: {
          "x-ai-brief-user-id": "user_1",
          "x-ai-brief-workspace-id": "workspace_a"
        }
      })
    );
    const sameWorkspacePayload = await sameWorkspaceResponse.json();
    const otherWorkspaceResponse = await GET(
      new Request("http://localhost/api/documents", {
        headers: {
          "x-ai-brief-user-id": "user_1",
          "x-ai-brief-workspace-id": "workspace_b"
        }
      })
    );
    const otherWorkspacePayload = await otherWorkspaceResponse.json();

    expect(sameWorkspacePayload.documents).toHaveLength(1);
    expect(otherWorkspacePayload.documents).toEqual([]);
  });

  it("requires authenticated ownership when document auth is enforced", async () => {
    vi.stubEnv("DOCUMENT_AUTH_REQUIRED", "true");

    const formData = new FormData();
    formData.set(
      "file",
      new File([longText()], "notes.md", { type: "text/markdown" })
    );

    const { POST } = await import("@/app/api/documents/upload/route");
    const response = await POST(
      new Request("http://localhost/api/documents/upload", {
        method: "POST",
        body: formData
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(payload.error).toContain("Authenticated document ownership");
  });

  it("rate limits document uploads before accepting more files", async () => {
    vi.stubEnv("BRIEF_RATE_LIMIT_MAX", "1");
    vi.stubEnv("BRIEF_RATE_LIMIT_WINDOW_MS", "60000");

    function createUploadRequest() {
      const formData = new FormData();
      formData.set(
        "file",
        new File([longText()], "notes.md", { type: "text/markdown" })
      );

      return new Request("http://localhost/api/documents/upload", {
        method: "POST",
        headers: {
          "x-forwarded-for": "203.0.113.20"
        },
        body: formData
      });
    }

    const { POST } = await import("@/app/api/documents/upload/route");
    const firstResponse = await POST(createUploadRequest());
    const secondResponse = await POST(createUploadRequest());
    const payload = await secondResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(429);
    expect(secondResponse.headers.get("cache-control")).toContain("no-store");
    expect(secondResponse.headers.get("Retry-After")).toBeTruthy();
    expect(payload.error).toContain("Too many document upload requests");
  });
});
