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
  komorek: "cells",
  komorki: "cells",
  lekow: "drug",
  leczenia: "treatment",
  leczenie: "treatment",
  leczeniu: "treatment",
  macierzyste: "stem",
  macierzystych: "stem",
  maszynowe: "machine",
  medycznej: "medical",
  medycznych: "medical",
  modelach: "models",
  modeli: "models",
  oparzenia: "burns",
  oparzen: "burns",
  oparzeniowych: "burn wound",
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
  "nad",
  "do",
  "i",
  "oraz"
]);

const acronymExpansions: Record<string, string> = {
  gnn: "graph neural networks",
  llm: "large language models",
  llms: "large language models",
  rag: "retrieval augmented generation"
};

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

function expandAcronyms(query: string) {
  return query
    .split(/\s+/)
    .map((word) => {
      const normalized = normalizeLookupTerm(word);
      return acronymExpansions[normalized] ?? word;
    })
    .join(" ");
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
    .join(" ")
    .replace(/\bcells stem\b/g, "stem cells")
    .replace(/\btreatment burns\b/g, "burn treatment");
}

export function generateQueryVariants(input: {
  query: string;
  outputLanguage: OutputLanguage;
}) {
  const translated =
    input.outputLanguage === "pl"
      ? translatePolishTerms(input.query)
      : input.query;
  const expandedOriginal = expandAcronyms(input.query);
  const expandedTranslated = expandAcronyms(translated);

  const domainVariants =
    expandedTranslated.includes("stem cells") && expandedTranslated.includes("burn")
      ? [
          "stem cells burn treatment",
          "mesenchymal stem cells burn wound treatment",
          "stem cell therapy burn wounds"
        ]
      : expandedTranslated.includes("transformers") ||
          expandedTranslated.includes("transformer")
        ? [
            "transformer self attention neural networks",
            "transformer architecture language models",
            "attention is all you need transformer"
          ]
      : [];

  const variants = unique([
    input.query,
    translated,
    expandedOriginal,
    expandedTranslated,
    ...domainVariants,
    `${expandedTranslated} systematic review`,
    `${expandedTranslated} benchmark evaluation`,
    `${expandedTranslated} survey`
  ]);

  return variants.slice(0, 5);
}
