import {
  NormalizedProjectIdeaSchema,
  ProjectIdeaInputSchema
} from "@/lib/project-research/schemas";
import type {
  NormalizedProjectIdea,
  ProjectIdeaInput
} from "@/lib/project-research/types";

type DomainProfile = {
  id: string;
  labels: string[];
  keywords: string[];
  targetUsers: string[];
  assumptions: string[];
  nonGoals: string[];
};

const DOMAIN_PROFILES: DomainProfile[] = [
  {
    id: "trading_quant",
    labels: ["algorithmic trading", "quant research", "financial risk"],
    keywords: [
      "trading",
      "bot",
      "quant",
      "giełd",
      "gield",
      "stock",
      "market",
      "portfolio",
      "backtest",
      "slippage",
      "exchange"
    ],
    targetUsers: ["quant researcher", "strategy developer", "risk owner"],
    assumptions: [
      "system bedzie oceniany najpierw offline na danych historycznych",
      "wyniki strategii musza uwzgledniac koszty transakcyjne i ryzyko overfittingu"
    ],
    nonGoals: ["autonomiczny live trading bez bramek ryzyka w MVP"]
  },
  {
    id: "software_code_review",
    labels: ["software engineering", "static analysis", "LLM code review"],
    keywords: [
      "repo",
      "repository",
      "github",
      "code review",
      "static analysis",
      "program repair",
      "refactor",
      "bug",
      "bugs",
      "kod",
      "repozytor",
      "optymaliz"
    ],
    targetUsers: ["software developer", "small engineering team", "tech lead"],
    assumptions: [
      "pierwsza wersja generuje rekomendacje zamiast automatycznie zmieniac kod",
      "wyniki musza byc priorytetyzowane, zeby ograniczyc szum"
    ],
    nonGoals: ["autonomiczne modyfikowanie kodu bez review w MVP"]
  },
  {
    id: "healthcare_medical",
    labels: ["clinical AI", "healthcare safety", "medical validation"],
    keywords: [
      "medical",
      "healthcare",
      "clinical",
      "patient",
      "medycz",
      "pacjent",
      "diagnoza",
      "diagnozy",
      "diagnostyka"
    ],
    targetUsers: ["clinical reviewer", "healthcare operator", "patient safety owner"],
    assumptions: [
      "system wspiera decyzje czlowieka zamiast samodzielnie diagnozowac",
      "research musi objac walidacje kliniczna, prywatnosc i ograniczenia modelu"
    ],
    nonGoals: ["samodzielna diagnoza lub terapia bez nadzoru specjalisty"]
  },
  {
    id: "legal_compliance",
    labels: ["legal retrieval", "compliance risk", "document review"],
    keywords: [
      "legal",
      "law",
      "contract",
      "compliance",
      "regulation",
      "regulatory",
      "praw",
      "umow",
      "zgodn"
    ],
    targetUsers: ["legal analyst", "compliance owner", "operations lead"],
    assumptions: [
      "system ma wspierac analize i cytowac zrodla zamiast dawac porade prawna",
      "kazdy wniosek musi miec slady do dokumentu lub przepisu"
    ],
    nonGoals: ["automatyczne podejmowanie decyzji prawnych bez czlowieka"]
  },
  {
    id: "document_conversion_qa",
    labels: ["document AI", "RAG ingestion", "conversion quality"],
    keywords: [
      "document conversion",
      "markdown",
      "pdf",
      "rag ingestion",
      "conversion quality",
      "broken table",
      "office documents"
    ],
    targetUsers: ["RAG builder", "documentation automation team", "AI platform engineer"],
    assumptions: [
      "system ocenia jakosc konwersji zamiast wykonywac sama konwersje",
      "bledy struktury dokumentu musza byc zamieniane na reprodukowalne fixture cases"
    ],
    nonGoals: ["budowa kolejnego konwertera dokumentow w MVP"]
  },
  {
    id: "llm_context_quality",
    labels: ["LLM context engineering", "RAG evaluation", "agent reliability"],
    keywords: [
      "context budget",
      "context compression",
      "token optimization",
      "rag chunks",
      "fact retention",
      "compressed context"
    ],
    targetUsers: ["AI agent team", "RAG platform engineer", "LLM platform owner"],
    assumptions: [
      "system porownuje kontekst oryginalny i skompresowany przed rekomendacja progu kompresji",
      "utrata faktow i intencji kodu musi byc traktowana jako ryzyko architektoniczne"
    ],
    nonGoals: ["budowa kolejnego proxy do kompresji kontekstu w MVP"]
  },
  {
    id: "ai_cli_provider_reliability",
    labels: ["AI developer tools", "provider routing", "CLI reliability"],
    keywords: [
      "provider compatibility",
      "provider routing",
      "claude code",
      "codex",
      "gemini cli",
      "opencode",
      "model routing"
    ],
    targetUsers: ["AI coding tool user", "developer tooling team", "platform engineer"],
    assumptions: [
      "system diagnozuje awarie providerow zamiast zarzadzac cala lista providerow",
      "wynik musi rozroznic auth, capability mismatch, proxy behavior i routing modelu"
    ],
    nonGoals: ["automatyczne przepinanie produkcyjnych providerow bez review"]
  },
  {
    id: "agent_session_reliability",
    labels: ["AI agent UX", "session reliability", "desktop AI apps"],
    keywords: [
      "agent session",
      "session reliability",
      "desktop sessions",
      "parent_session",
      "sidebar",
      "conversation continuity"
    ],
    targetUsers: ["AI agent product team", "desktop AI app builder", "QA owner"],
    assumptions: [
      "system mapuje bledy sesji na reprodukowalne scenariusze QA",
      "ciaglosc konwersacji i odzyskiwanie stanu sa wymaganiami zaufania uzytkownika"
    ],
    nonGoals: ["budowa kolejnego klienta agenta w MVP"]
  },
  {
    id: "self_hosted_ai_governance",
    labels: ["self-hosted AI", "AI security", "workspace governance"],
    keywords: [
      "self-hosted ai",
      "workspace policy",
      "local-first",
      "privacy-first",
      "secrets",
      "deployment readiness",
      "workspace governance"
    ],
    targetUsers: ["AI platform team", "self-hosted app operator", "security owner"],
    assumptions: [
      "system audytuje gotowosc wdrozenia zamiast budowac workspace UI",
      "sekrety, lokalne dane, tool approval i ekspozycja sieciowa musza byc jawnymi kontrolami"
    ],
    nonGoals: ["automatyczne naprawianie konfiguracji bez zatwierdzenia operatora"]
  }
];

function normalizeText(value: string) {
  return value.toLowerCase();
}

function includesKeyword(haystack: string, keyword: string) {
  return haystack.includes(normalizeText(keyword));
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function firstSentence(description: string) {
  const sentence = description.split(/[.!?]\s/)[0]?.trim();
  return sentence && sentence.length >= 10 ? sentence : description.trim();
}

function detectProfiles(input: ProjectIdeaInput) {
  const preferredDomains = input.preferredDomains.map(normalizeText).join(" ");
  const text = normalizeText(
    `${input.title} ${input.description} ${preferredDomains}`
  );

  const matched = DOMAIN_PROFILES.filter((profile) =>
    profile.keywords.some((keyword) => includesKeyword(text, keyword))
  );

  return matched.length > 0 ? matched : [];
}

export function normalizeProjectIdea(value: unknown): NormalizedProjectIdea {
  const input = ProjectIdeaInputSchema.parse(value);
  const profiles = detectProfiles(input);
  const primaryProfile = profiles[0];
  const fallbackDomains = ["product discovery", "evidence planning", "software architecture"];

  const domains = unique([
    ...input.preferredDomains,
    ...(profiles.length > 0
      ? profiles.flatMap((profile) => profile.labels)
      : fallbackDomains)
  ]);

  const targetUsers = unique(
    profiles.length > 0
      ? profiles.flatMap((profile) => profile.targetUsers)
      : ["project owner", "builder", "technical decision maker"]
  );

  const assumptions = unique([
    ...input.constraints.map((constraint) => `constraint: ${constraint}`),
    ...(profiles.length > 0
      ? profiles.flatMap((profile) => profile.assumptions)
      : [
          "najpierw trzeba potwierdzic problem, uzytkownika, dane i kryteria sukcesu",
          "research musi rozdzielic evidence, ryzyka i zalozenia bez zrodel"
        ])
  ]);

  const nonGoals = unique(
    profiles.length > 0
      ? profiles.flatMap((profile) => profile.nonGoals)
      : ["budowa produkcyjnego systemu przed walidacja evidence i ryzyk"]
  );

  const normalized: NormalizedProjectIdea = {
    ideaId: `idea_${slugify(input.title) || "untitled"}`,
    title: input.title,
    oneSentence: firstSentence(input.description),
    problem: primaryProfile
      ? `Trzeba zaprojektowac ${input.title} w domenie ${primaryProfile.labels[0]} tak, zeby decyzje architektoniczne wynikaly z evidence, a nie z ogolnych zalozen.`
      : `Trzeba doprecyzowac ${input.title} przez research problemu, danych, ryzyk i wymagan architektonicznych.`,
    targetUsers,
    domains,
    assumptions,
    nonGoals
  };

  return NormalizedProjectIdeaSchema.parse(normalized);
}
