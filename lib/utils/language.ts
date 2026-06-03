export type OutputLanguage = "pl" | "en";

const POLISH_MARKERS = [
  " czy ",
  " dlaczego ",
  " jak ",
  " oraz ",
  " ktory ",
  " wplyw ",
  " badania ",
  " bota ",
  " bot ",
  " sztuczna ",
  " tworzenie ",
  " uczenie ",
  " uczenia ",
  " gieldzie ",
  " gielda ",
  " wykrywanie ",
  " halucynacji ",
  " modelach ",
  " jezykowych ",
  " modeli ",
  " diagnostyce ",
  " diagnozie ",
  " raka ",
  " piersi ",
  " tlumaczenie ",
  " transformatorow ",
  " badawczy ",
  " badawcze ",
  " medycznej ",
  " medycznych "
];

function normalizeLanguageLookup(value: string) {
  return value
    .replace(/[łŁ]/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function detectQueryLanguage(query: string): OutputLanguage {
  const normalized = ` ${normalizeLanguageLookup(query)} `;
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
