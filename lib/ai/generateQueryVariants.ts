import type { OutputLanguage } from "@/lib/utils/language";

const polishToEnglishTerms: Record<string, string> = {
  agentow: "agents",
  ai: "artificial intelligence",
  bota: "bot",
  bot: "bot",
  odpowiedzi: "responses",
  raka: "cancer",
  rak: "cancer",
  detekcja: "detection",
  diagnozie: "diagnosis",
  diagnostyce: "diagnosis",
  dzialaja: "",
  grafowe: "graph",
  grafowych: "graph",
  halucynacje: "hallucination",
  halucynacji: "hallucination",
  instrukcyjnego: "instruction",
  jak: "",
  jakosc: "quality",
  jezykowych: "language",
  gra: "trading",
  gieldzie: "stock market",
  gielda: "stock market",
  gieldowy: "stock market",
  gieldowa: "stock market",
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
  modeli: "models",
  modelach: "models",
  oparzenia: "burns",
  oparzen: "burns",
  oparzeniowych: "burn wound",
  oprogramowania: "software engineering",
  piersi: "breast",
  prywatnosc: "privacy",
  sieciach: "networks",
  sieci: "networks",
  tlumaczenie: "translation",
  tlumaczenia: "translation",
  transformatorow: "transformers",
  transformerach: "transformers",
  transformery: "transformers",
  transformey: "transformers",
  tworzenie: "building",
  uczenie: "learning",
  uczenia: "learning",
  wplyw: "impact",
  wykrywanie: "detection",
  zastosowanie: "application",
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
    .replace(/[łŁ]/g, "l")
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
    .replace(/\btreatment burns\b/g, "burn treatment")
    .replace(/\blearning machine\b/g, "machine learning")
    .replace(/\bcancer breast\b/g, "breast cancer")
    .replace(/\btranslation machine\b/g, "machine translation");
}

function getPolishAcademicPhraseVariants(query: string) {
  const normalized = normalizeLookupTerm(query);
  const variants: string[] = [];
  const mentionsInstructionTuning =
    /\bfine[-\s]?tuningu\b/.test(normalized) ||
    /\bfine[-\s]?tuning\b/.test(normalized) ||
    /\binstrukcyjn\w*\b/.test(normalized);
  const mentionsLanguageModels =
    /\bmodel\w*\b/.test(normalized) && /\bjezykow\w*\b/.test(normalized);
  const mentionsResponseQuality =
    /\bjakosc\b/.test(normalized) || /\bodpowiedz\w*\b/.test(normalized);
  const mentionsMachineLearning =
    /\buczen\w*\b/.test(normalized) && /\bmaszynow\w*\b/.test(normalized);
  const mentionsDiagnosis = /\bdiagnost\w*\b/.test(normalized);
  const mentionsBreastCancer =
    /\brak\w*\b/.test(normalized) && /\bpiers\w*\b/.test(normalized);
  const mentionsTransformers = /\btransformator\w*\b/.test(normalized);
  const mentionsMachineTranslation =
    /\btlumaczen\w*\b/.test(normalized) && /\bmaszynow\w*\b/.test(normalized);
  const mentionsTradingBot =
    (/\bbot\w*\b/.test(normalized) || /\bautomaty\w*\b/.test(normalized)) &&
    (/\bgield\w*\b/.test(normalized) ||
      /\btrading\b/.test(normalized) ||
      /\brynk\w*\b/.test(normalized));

  if (mentionsInstructionTuning && mentionsLanguageModels) {
    variants.push(
      mentionsResponseQuality
        ? "instruction tuning response quality language models"
        : "instruction tuning language models",
      "instruction fine-tuning language models response quality",
      "instruction tuning large language models evaluation",
      "fine tuning language models instruction following"
    );
  }

  if (mentionsMachineLearning && mentionsDiagnosis && mentionsBreastCancer) {
    variants.push(
      "machine learning breast cancer diagnosis",
      "breast cancer diagnosis machine learning",
      "artificial intelligence breast cancer diagnosis",
      "deep learning breast cancer detection"
    );
  }

  if (mentionsTransformers && mentionsMachineTranslation) {
    variants.push(
      "transformer machine translation",
      "transformer neural machine translation",
      "Attention Is All You Need machine translation",
      "transformer architecture sequence transduction"
    );
  }

  if (mentionsTradingBot) {
    variants.push(
      "algorithmic trading bot stock market",
      "automated trading systems stock market",
      "reinforcement learning algorithmic trading",
      "machine learning stock trading strategies"
    );
  }

  return variants;
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
  const phraseVariants =
    input.outputLanguage === "pl"
      ? getPolishAcademicPhraseVariants(input.query)
      : [];

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
            "Attention Is All You Need",
            "transformer self attention neural networks",
            "transformer architecture language models"
          ]
      : [];

  const variants = unique([
    input.query,
    ...phraseVariants,
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
