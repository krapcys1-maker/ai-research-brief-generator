import type { OutputLanguage } from "@/lib/utils/language";

const polishToEnglishTerms: Record<string, string> = {
  halucynacji: "hallucination",
  halucynacje: "hallucination",
  wykrywanie: "detection",
  detekcja: "detection",
  modelach: "models",
  modeli: "models",
  jezykowych: "language",
  językowych: "language",
  medycznej: "medical",
  medycznych: "medical",
  diagnozie: "diagnosis",
  diagnostyce: "diagnosis",
  zdrowiu: "healthcare",
  uczenie: "learning",
  maszynowe: "machine",
  prywatnosc: "privacy",
  prywatność: "privacy",
  grafowe: "graph",
  grafowych: "graph",
  lekow: "drug",
  leków: "drug",
  agentow: "agents",
  agentów: "agents",
  oprogramowania: "software engineering"
};

const polishStopWords = new Set(["w", "we", "z", "ze", "na", "do", "i", "oraz"]);

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function unique(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values.map(normalizeWhitespace).filter(Boolean)) {
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }

  return result;
}

function translatePolishTerms(query: string) {
  return query
    .split(/\s+/)
    .map((word) => {
      const normalized = word
        .toLowerCase()
        .replace(/[.,;:!?()[\]{}"']/g, "");

      if (polishStopWords.has(normalized)) {
        return "";
      }

      return polishToEnglishTerms[normalized] ?? word;
    })
    .filter(Boolean)
    .join(" ");
}

export function generateQueryVariants(input: {
  query: string;
  outputLanguage: OutputLanguage;
}) {
  const translated =
    input.outputLanguage === "pl"
      ? translatePolishTerms(input.query)
      : input.query;

  const variants = unique([
    input.query,
    translated,
    `${translated} systematic review`,
    `${translated} benchmark evaluation`,
    `${translated} survey`
  ]);

  return variants.slice(0, 4);
}
