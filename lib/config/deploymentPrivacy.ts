type EnvLike = {
  NODE_ENV?: string;
  DEPLOYMENT_PRIVACY_NOTICE?: string;
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
  return {
    enabled: isDeploymentPrivacyNoticeEnabled(env),
    title: "Production privacy boundary",
    storage:
      "Generated briefs may be stored in the deployment database. Public brief history is off by default unless explicitly enabled.",
    uploads:
      "Uploaded documents can be private through trusted user/workspace ownership. Session-scoped uploads are for local or private demos and should remain disabled for public multi-user deployments.",
    ai:
      "Research queries, retrieved paper metadata, selected evidence, and relevant uploaded chunks can be sent to the configured AI provider."
  };
}

export type DeploymentPrivacyNoticeConfig = ReturnType<
  typeof getDeploymentPrivacyNotice
>;
