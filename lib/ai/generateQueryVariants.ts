import type { OutputLanguage } from "@/lib/utils/language";

const polishToEnglishTerms: Record<string, string> = {
  agentow: "agents",
  ai: "artificial intelligence",
  detekcja: "detection",
  diagnozie: "diagnosis",
  diagnostyce: "diagnosis",
  dzialaja: "",
  grafowe: "graph",
  grafowych: "graph",
  halucynacje: "hallucination",
  halucynacji: "hallucination",
  jak: "",
  jezykowych: "language",
  lekow: "drug",
  maszynowe: "machine",
  medycznej: "medical",
  medycznych: "medical",
  modelach: "models",
  modeli: "models",
  oprogramowania: "software engineering",
  prywatnosc: "privacy",
  sieciach: "networks",
  sieci: "networks",
  transformerach: "transformers",
  transformery: "transformers",
  transformey: "transformers",
  uczenie: "learning",
  wykrywanie: "detection",
  zdrowiu: "healthcare"
};

const polishStopWords = new Set([
  "w",
  "we",
  "z",
  "ze",
  "na",
  "do",
  "i",
  "oraz"
]);

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeLookupTerm(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,;:!?()[\]{}"']/g, "");
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
      const normalized = normalizeLookupTerm(word);

      if (polishStopWords.has(normalized)) {
        return "";
      }

      return polishToEnglishTerms[normalized] ?? normalized;
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
