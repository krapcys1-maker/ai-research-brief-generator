type EnvLike = {
  NODE_ENV?: string;
  DEPLOYMENT_PRIVACY_NOTICE?: string;
  DOCUMENT_AUTH_REQUIRED?: string;
  PUBLIC_BRIEF_HISTORY_ENABLED?: string;
};

function parseBoolean(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return null;
}

export function isDeploymentPrivacyNoticeEnabled(env: EnvLike = process.env) {
  const configured = parseBoolean(env.DEPLOYMENT_PRIVACY_NOTICE);

  if (configured !== null) {
    return configured;
  }

  return env.NODE_ENV === "production";
}

export function getDeploymentPrivacyNotice(env: EnvLike = process.env) {
  const trustedUserMode = parseBoolean(env.DOCUMENT_AUTH_REQUIRED) === true;
  const publicBriefHistory = parseBoolean(env.PUBLIC_BRIEF_HISTORY_ENABLED) === true;

  return {
    enabled: isDeploymentPrivacyNoticeEnabled(env),
    mode: trustedUserMode ? "trusted_user" : "session_demo",
    title: trustedUserMode
      ? "Trusted user privacy boundary"
      : "Session demo privacy boundary",
    storage:
      publicBriefHistory
        ? "Generated briefs may be stored in the deployment database. Public brief history is explicitly enabled for this deployment."
        : "Generated briefs may be stored in the deployment database. Public brief history is off by default unless explicitly enabled.",
    ownership: trustedUserMode
      ? "Private briefs, jobs, exports, Q&A, uploaded documents, and compare document retrieval are scoped by trusted X-AI-Brief-User-Id and optional X-AI-Brief-Workspace-Id headers."
      : "Private briefs, jobs, exports, Q&A, and uploaded documents use browser session cookies in demo mode. This is intended for local or private deployments, not open public multi-user SaaS.",
    uploads:
      trustedUserMode
        ? "Uploaded documents require trusted user/workspace ownership when DOCUMENT_AUTH_REQUIRED=true."
        : "Session-scoped uploads are for local or private demos and should remain disabled for public multi-user deployments.",
    ai:
      "Research queries, retrieved paper metadata, selected evidence, and relevant uploaded chunks can be sent to the configured AI provider."
  };
}

export type DeploymentPrivacyNoticeConfig = ReturnType<
  typeof getDeploymentPrivacyNotice
>;
