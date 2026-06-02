const SECTION_TITLES = [
  "Abstract",
  "Introduction",
  "Related Work",
  "Methods",
  "Methodology",
  "Results",
  "Discussion",
  "Limitations",
  "Conclusion",
  "Conclusions",
  "References"
];

export function detectSectionTitle(line: string) {
  const cleaned = line.trim().replace(/^\d+\.?\s+/, "");

  return (
    SECTION_TITLES.find(
      (title) => title.toLowerCase() === cleaned.toLowerCase()
    ) ?? null
  );
}

export function getSectionForText(text: string) {
  const firstLines = text
    .split(/\n+/)
    .slice(0, 4)
    .map((line) => detectSectionTitle(line))
    .filter(Boolean);

  return firstLines[0] ?? null;
}
