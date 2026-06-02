import { MAX_DOCUMENT_UPLOAD_BYTES } from "@/lib/documents/validation";

function booleanEnv(name: string) {
  const raw = process.env[name]?.trim().toLowerCase();

  if (!raw) {
    return null;
  }

  if (["1", "true", "yes", "on"].includes(raw)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(raw)) {
    return false;
  }

  return null;
}

function numberEnv(name: string, fallback: number) {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getDocumentSessionTtlSeconds() {
  return Math.round(numberEnv("DOCUMENT_SESSION_TTL_DAYS", 30) * 24 * 60 * 60);
}

export function areDocumentUploadsEnabled(scope: "session" | "user" = "session") {
  const explicit = booleanEnv("DOCUMENT_UPLOADS_ENABLED");

  if (explicit !== null) {
    return explicit;
  }

  if (scope === "user") {
    return true;
  }

  if (process.env.NODE_ENV === "production") {
    return booleanEnv("ALLOW_SESSION_DOCUMENT_UPLOADS_IN_PRODUCTION") === true;
  }

  return true;
}

export const areSessionDocumentUploadsEnabled = () =>
  areDocumentUploadsEnabled("session");

export function getDocumentPrivacyPolicy(
  access: { scope?: "session" | "user"; workspaceId?: string | null } = {}
) {
  const sessionTtlSeconds = getDocumentSessionTtlSeconds();
  const scope = access.scope ?? "session";
  const isUserScoped = scope === "user";

  return {
    uploadsEnabled: areDocumentUploadsEnabled(scope),
    privacyScope: scope,
    workspaceScoped: Boolean(access.workspaceId),
    sessionTtlSeconds,
    maxUploadBytes: MAX_DOCUMENT_UPLOAD_BYTES,
    supportedFileTypes: ["PDF", "TXT", "MD"],
    storageBoundary:
      "Uploaded text and chunks are stored in the private document repository, not in public brief history or Brief.briefJson.",
    retrievalBoundary: isUserScoped
      ? "Ask My Documents retrieves only chunks owned by the authenticated user and workspace context."
      : "Ask My Documents retrieves only chunks owned by the current private session.",
    aiBoundary:
      "Only retrieved relevant chunks are sent to the AI provider for a given answer.",
    deletionPolicy: isUserScoped
      ? "Deleting a document removes its stored chunks and hides the document from the authenticated user/workspace context."
      : "Deleting a document removes its stored chunks and hides the document from the current private session.",
    retentionPolicy: isUserScoped
      ? "Authenticated document retention depends on the deployment workspace policy and deletion controls."
      : `The session cookie lasts about ${Math.ceil(
          sessionTtlSeconds / 60 / 60 / 24
        )} days. Database retention still depends on the deployment policy until authenticated accounts and explicit retention controls are added.`,
    productionWarning: isUserScoped
      ? "Authenticated uploads use durable user/workspace ownership. Ensure auth headers are set only by a trusted gateway or server layer."
      : "Session-scoped uploads are suitable for local/private demos. Public multi-user deployment still requires authentication and user/workspace ownership."
  };
}

export type DocumentPrivacyPolicy = ReturnType<typeof getDocumentPrivacyPolicy>;

export function getDocumentUploadsDisabledMessage() {
  return "Document uploads are disabled for this deployment. Enable DOCUMENT_UPLOADS_ENABLED=true for private deployments, or add authentication/user ownership before public multi-user upload.";
}

export function assertDocumentUploadsEnabled(scope: "session" | "user" = "session") {
  if (!areDocumentUploadsEnabled(scope)) {
    throw new Error(getDocumentUploadsDisabledMessage());
  }
}

export function applyPrivateDocumentHeaders(
  headers = new Headers(),
  scope: "session" | "user" = "session"
) {
  headers.set("Cache-Control", "no-store, private");
  headers.set("X-Document-Privacy-Scope", scope);
  return headers;
}
