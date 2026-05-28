export function normalizeDoi(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed
    .replace(/^doi:\s*/i, "")
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
}

export function getDoiUrl(value: string | null | undefined) {
  const normalized = normalizeDoi(value);

  return normalized ? `https://doi.org/${encodeURI(normalized)}` : null;
}

export function formatDoi(value: string | null | undefined) {
  return normalizeDoi(value) ?? "N/A";
}
