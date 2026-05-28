type EnvLike = {
  NODE_ENV?: string;
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

export function isPublicBriefHistoryEnabled(env: EnvLike = process.env) {
  const configured = parseBoolean(env.PUBLIC_BRIEF_HISTORY_ENABLED);

  if (configured !== null) {
    return configured;
  }

  return env.NODE_ENV !== "production";
}
