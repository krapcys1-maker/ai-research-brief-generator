export type OutputLanguage = "pl" | "en";

const POLISH_MARKERS = [
  "ą",
  "ć",
  "ę",
  "ł",
  "ń",
  "ó",
  "ś",
  "ź",
  "ż",
  " czy ",
  " jak ",
  " oraz ",
  " wpływ ",
  " badania ",
  " sztuczna ",
  " uczenie ",
  " wykrywanie ",
  " halucynacji ",
  " modelach ",
  " językowych ",
  " jezykowych ",
  " modeli ",
  " badawczy ",
  " badawcze ",
  " medycznej ",
  " medycznych "
];

export function detectQueryLanguage(query: string): OutputLanguage {
  const normalized = ` ${query.toLowerCase()} `;
  return POLISH_MARKERS.some((marker) => normalized.includes(marker))
    ? "pl"
    : "en";
}

export function getLanguageInstruction(language: OutputLanguage) {
  if (language === "pl") {
    return "Write all summaries, explanations, findings, gaps, uncertainties, recommendations, and section content in Polish. Keep paper titles, author names, journal names, DOI values, and URLs unchanged.";
  }

  return "Write all summaries, explanations, findings, gaps, uncertainties, recommendations, and section content in English. Keep paper titles, author names, journal names, DOI values, and URLs unchanged.";
}
