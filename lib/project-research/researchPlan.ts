import { normalizeProjectIdea } from "@/lib/project-research/ideaNormalizer";
import {
  NormalizedProjectIdeaSchema,
  ProjectIdeaInputSchema,
  ResearchPlanSchema
} from "@/lib/project-research/schemas";
import type {
  EvidenceBucket,
  NormalizedProjectIdea,
  ProjectIdeaInput,
  ResearchPlan
} from "@/lib/project-research/types";

type ResearchPlanResult = {
  normalizedIdea: NormalizedProjectIdea;
  researchPlan: ResearchPlan;
};

type BucketSeed = Omit<EvidenceBucket, "required" | "minParsedPapers"> & {
  required?: boolean;
  minParsedPapers?: number;
};

const REQUIRED_PAPERS_PER_BUCKET = 2;

function bucket(seed: BucketSeed): EvidenceBucket {
  return {
    required: true,
    minParsedPapers: REQUIRED_PAPERS_PER_BUCKET,
    ...seed
  };
}

const TRADING_BUCKETS: EvidenceBucket[] = [
  bucket({
    id: "model_experiments",
    label: "Modeling methods for trading decisions",
    query:
      "algorithmic trading reinforcement learning transformers market prediction empirical evaluation",
    keywords: [
      "algorithmic trading",
      "reinforcement learning",
      "market prediction",
      "empirical evaluation"
    ],
    targetQuestions: [
      "Jakie metody modelowania maja powtarzalne wyniki na danych rynkowych?",
      "Jak porownywac modele bez mylenia predykcji z rentownoscia strategii?"
    ]
  }),
  bucket({
    id: "backtest_validation",
    label: "Backtest validity and overfitting control",
    query:
      "backtest overfitting deflated sharpe ratio probability of backtest overfitting trading strategies",
    keywords: [
      "backtest overfitting",
      "deflated sharpe ratio",
      "probability of backtest overfitting",
      "strategy validation"
    ],
    targetQuestions: [
      "Jak wykrywac strategie dopasowane do szumu?",
      "Jakie metryki powinny blokowac przejscie z researchu do paper tradingu?"
    ]
  }),
  bucket({
    id: "data_correctness",
    label: "Market data leakage and validation splits",
    query:
      "financial machine learning data leakage purged cross validation embargo look ahead bias",
    keywords: [
      "data leakage",
      "purged cross validation",
      "embargo",
      "look-ahead bias"
    ],
    targetQuestions: [
      "Jak dzielic dane czasowe, zeby nie wpuscic przecieku informacji?",
      "Jak oznaczac cechy i targety w pipeline treningowym?"
    ]
  }),
  bucket({
    id: "execution_market_impact",
    label: "Execution, transaction costs, slippage and market impact",
    query:
      "optimal execution market impact transaction costs slippage algorithmic trading",
    keywords: [
      "optimal execution",
      "market impact",
      "transaction costs",
      "slippage"
    ],
    targetQuestions: [
      "Jak modelowac koszty i poslizg przed symulacja wyniku?",
      "Kiedy strategia przestaje byc wykonalna mimo dobrego backtestu?"
    ]
  }),
  bucket({
    id: "risk_governance",
    label: "Trading risk controls and model governance",
    query:
      "algorithmic trading risk management kill switch model governance pre trade risk controls",
    keywords: [
      "risk management",
      "kill switch",
      "model governance",
      "pre-trade risk controls"
    ],
    targetQuestions: [
      "Jakie bramki ryzyka sa wymagane przed paper/live tradingiem?",
      "Jak audytowac decyzje modelu i zmiany strategii?"
    ]
  })
];

const CODE_REVIEW_BUCKETS: EvidenceBucket[] = [
  bucket({
    id: "static_analysis",
    label: "Static analysis and bug detection",
    query:
      "static analysis bug detection false positives software engineering empirical study",
    keywords: [
      "static analysis",
      "bug detection",
      "false positives",
      "empirical study"
    ],
    targetQuestions: [
      "Ktore klasyczne analizatory daja stabilne sygnaly dla MVP?",
      "Jak ograniczyc false positives przed pokazaniem rekomendacji?"
    ]
  }),
  bucket({
    id: "llm_code_review",
    label: "LLM assisted code review",
    query:
      "large language models automated code review code quality software engineering",
    keywords: [
      "large language models",
      "code review",
      "code quality",
      "software engineering"
    ],
    targetQuestions: [
      "Gdzie LLM realnie pomaga w review, a gdzie halucynuje?",
      "Czy LLM ma wykrywac problemy, wyjasniac je, czy tylko priorytetyzowac?"
    ]
  }),
  bucket({
    id: "program_repair",
    label: "Automated program repair and patch validation",
    query:
      "automated program repair patch generation validation test adequacy software engineering",
    keywords: [
      "automated program repair",
      "patch generation",
      "patch validation",
      "test adequacy"
    ],
    targetQuestions: [
      "Kiedy sugerowanie poprawek jest bezpieczne?",
      "Jak walidowac patch bez niszczenia zaufania uzytkownika?"
    ]
  }),
  bucket({
    id: "repository_mining",
    label: "Mining software repositories and technical debt",
    query:
      "mining software repositories technical debt code smells maintainability prioritization",
    keywords: [
      "mining software repositories",
      "technical debt",
      "code smells",
      "maintainability"
    ],
    targetQuestions: [
      "Jak agregowac sygnaly z historii repozytorium?",
      "Jak priorytetyzowac problemy techniczne w wielu plikach?"
    ]
  }),
  bucket({
    id: "developer_workflow",
    label: "Developer workflow and actionable recommendations",
    query:
      "developer tools code review recommendation triage human factors software engineering",
    keywords: [
      "developer tools",
      "recommendation",
      "triage",
      "human factors"
    ],
    targetQuestions: [
      "Jak przedstawic rekomendacje, zeby byly uzyteczne dla developera?",
      "Jakie metryki mierza akceptacje i uzytecznosc narzedzia?"
    ]
  })
];

const HEALTHCARE_BUCKETS: EvidenceBucket[] = [
  bucket({
    id: "clinical_evidence",
    label: "Clinical evidence and diagnostic support limits",
    query:
      "clinical decision support artificial intelligence diagnostic accuracy validation systematic review",
    keywords: [
      "clinical decision support",
      "diagnostic accuracy",
      "validation",
      "systematic review"
    ],
    targetQuestions: [
      "Jakie sa granice systemu wspierajacego decyzje kliniczne?",
      "Jak mierzyc jakosc bez obiecywania diagnozy?"
    ]
  }),
  bucket({
    id: "safety_validation",
    label: "Safety, calibration and human oversight",
    query:
      "medical AI safety calibration uncertainty human oversight clinical workflow",
    keywords: ["medical AI", "safety", "calibration", "human oversight"],
    targetQuestions: [
      "Jak sygnalizowac niepewnosc i eskalowac przypadki?",
      "Jakie bramki bezpieczenstwa sa wymagane przed wdrozeniem?"
    ]
  }),
  bucket({
    id: "privacy_compliance",
    label: "Privacy and data governance",
    query:
      "healthcare AI privacy data governance patient data de identification compliance",
    keywords: [
      "privacy",
      "data governance",
      "patient data",
      "de-identification"
    ],
    targetQuestions: [
      "Jak chronione sa dane pacjenta?",
      "Co musi byc logowane i anonimizowane?"
    ]
  }),
  bucket({
    id: "workflow_integration",
    label: "Clinical workflow integration",
    query:
      "clinical workflow integration AI decision support usability implementation study",
    keywords: [
      "clinical workflow",
      "decision support",
      "usability",
      "implementation study"
    ],
    targetQuestions: [
      "Jak system wchodzi w prace lekarza bez blokowania procesu?",
      "Jak mierzyc uzytecznosc i zaufanie?"
    ]
  })
];

const LEGAL_BUCKETS: EvidenceBucket[] = [
  bucket({
    id: "legal_retrieval",
    label: "Legal retrieval and citation grounding",
    query:
      "legal information retrieval citation grounding document question answering evaluation",
    keywords: [
      "legal information retrieval",
      "citation grounding",
      "question answering",
      "evaluation"
    ],
    targetQuestions: [
      "Jak wyszukiwac przepisy i fragmenty dokumentow z cytowaniem?",
      "Jak mierzyc trafnosc odpowiedzi prawnych?"
    ]
  }),
  bucket({
    id: "contract_analysis",
    label: "Contract analysis and clause extraction",
    query:
      "contract analysis clause extraction legal NLP obligation risk classification",
    keywords: [
      "contract analysis",
      "clause extraction",
      "legal NLP",
      "risk classification"
    ],
    targetQuestions: [
      "Jak ekstraktowac klauzule, obowiazki i ryzyka?",
      "Jak walidowac klasyfikacje klauzul?"
    ]
  }),
  bucket({
    id: "compliance_risk",
    label: "Compliance risk and auditability",
    query:
      "compliance risk management auditability legal AI governance explainability",
    keywords: ["compliance risk", "auditability", "legal AI", "governance"],
    targetQuestions: [
      "Jak zapewnic audytowalnosc decyzji?",
      "Jak oddzielic rekomendacje od porady prawnej?"
    ]
  }),
  bucket({
    id: "human_review",
    label: "Human legal review workflow",
    query:
      "legal AI human review workflow document review decision support",
    keywords: ["human review", "legal workflow", "document review", "decision support"],
    targetQuestions: [
      "Gdzie czlowiek zatwierdza wnioski?",
      "Jak projektowac workflow review, zeby ograniczyc ryzyko?"
    ]
  })
];

const DOCUMENT_CONVERSION_BUCKETS: EvidenceBucket[] = [
  bucket({
    id: "document_structure_preservation",
    label: "Document structure preservation for Markdown conversion",
    query:
      "document conversion Markdown table structure preservation PDF Office RAG ingestion evaluation",
    keywords: [
      "document conversion",
      "Markdown tables",
      "structure preservation",
      "RAG ingestion"
    ],
    targetQuestions: [
      "Ktore bledy konwersji najbardziej niszcza wyszukiwanie i grounding?",
      "Jak wykrywac utrate tabel, cytowan, sekcji i kolejnosci tresci?"
    ]
  }),
  bucket({
    id: "rag_ingestion_quality",
    label: "RAG ingestion quality and retrieval impact",
    query:
      "RAG ingestion document preprocessing retrieval quality grounding evaluation",
    keywords: ["RAG ingestion", "retrieval quality", "grounding", "document preprocessing"],
    targetQuestions: [
      "Jak jakosc konwersji dokumentu wplywa na retrieval i odpowiedzi?",
      "Jakie metryki lacza regresje konwersji z downstream RAG quality?"
    ]
  }),
  bucket({
    id: "conversion_regression_fixtures",
    label: "Conversion regression fixtures and reproducible QA",
    query:
      "document processing regression test fixtures OCR PDF tables benchmark",
    keywords: ["regression fixtures", "PDF tables", "OCR", "document benchmark"],
    targetQuestions: [
      "Jak budowac fixture cases dla trudnych dokumentow?",
      "Jak odtwarzac i wersjonowac regresje konwersji?"
    ]
  }),
  bucket({
    id: "unsafe_document_inputs",
    label: "Unsafe document inputs and content risk controls",
    query:
      "document ingestion security prompt injection untrusted documents LLM RAG",
    keywords: ["untrusted documents", "prompt injection", "document ingestion security"],
    targetQuestions: [
      "Jakie ryzyka niosa dokumenty przed wejsciem do RAG?",
      "Jak oddzielic QA struktury od kontroli bezpieczenstwa tresci?"
    ]
  })
];

const LLM_CONTEXT_BUCKETS: EvidenceBucket[] = [
  bucket({
    id: "context_compression_fidelity",
    label: "Context compression fidelity and fact retention",
    query:
      "LLM context compression fidelity fact retention information loss faithfulness summarization evaluation",
    keywords: [
      "context compression",
      "fact retention",
      "information loss",
      "faithfulness",
      "summarization evaluation",
      "long context"
    ],
    targetQuestions: [
      "Jak mierzyc utrate faktow po kompresji kontekstu?",
      "Ktore typy informacji sa krytyczne dla agentow i RAG?"
    ]
  }),
  bucket({
    id: "token_budget_tradeoffs",
    label: "Token budget tradeoffs and threshold selection",
    query:
      "large language model token budget context window tradeoff evaluation cost latency",
    keywords: ["token budget", "context window", "cost latency", "threshold"],
    targetQuestions: [
      "Jak wybrac bezpieczny prog kompresji?",
      "Jak laczyc oszczednosc tokenow z ryzykiem utraty evidence?"
    ]
  }),
  bucket({
    id: "agent_task_success",
    label: "Agent task success after context transformation",
    query:
      "LLM agent task success context compression agent memory long horizon tasks summarization tool use benchmark",
    keywords: [
      "agent task success",
      "tool use",
      "context summarization",
      "agent memory",
      "long horizon tasks",
      "benchmark"
    ],
    targetQuestions: [
      "Jak kompresja wplywa na wykonywanie zadan przez agentow?",
      "Jakie testy wykrywaja utrate intencji kodu lub instrukcji?"
    ]
  }),
  bucket({
    id: "rag_evidence_loss",
    label: "RAG evidence loss and citation quality",
    query:
      "retrieval augmented generation context compression citation quality evidence loss",
    keywords: ["RAG", "citation quality", "evidence loss", "retrieval augmented generation"],
    targetQuestions: [
      "Kiedy kompresja niszczy cytowalnosc odpowiedzi?",
      "Jak wykrywac brakujace fragmenty evidence w skompresowanym kontekscie?"
    ]
  })
];

const AI_CLI_PROVIDER_BUCKETS: EvidenceBucket[] = [
  bucket({
    id: "provider_capability_modeling",
    label: "Provider capability modeling for AI coding CLIs",
    query:
      "AI coding assistants provider capabilities tool use model routing evaluation",
    keywords: ["provider capabilities", "AI coding assistants", "tool use", "model routing"],
    targetQuestions: [
      "Jak modelowac roznice capability miedzy providerami?",
      "Ktore capability musza blokowac wybor modelu lub narzedzia?"
    ]
  }),
  bucket({
    id: "auth_proxy_failure_modes",
    label: "Auth, proxy and routing failure modes",
    query:
      "AI coding CLI API integration configuration authentication proxy terminal command failure diagnostics",
    keywords: [
      "authentication",
      "proxy failure",
      "routing diagnostics",
      "developer tools",
      "API integration",
      "configuration errors",
      "terminal problems",
      "command failures"
    ],
    targetQuestions: [
      "Jak klasyfikowac awarie auth, proxy i routingu?",
      "Jakie health checki wykrywaja awarie przed rozmowa z modelem?"
    ]
  }),
  bucket({
    id: "cli_observability",
    label: "CLI observability and reproducible diagnostics",
    query:
      "AI coding CLI command failures terminal problems issue reports reproducible bug reports logs telemetry",
    keywords: [
      "CLI observability",
      "diagnostics",
      "logs",
      "reproducible bug report",
      "command failures",
      "terminal problems",
      "issue reports",
      "CLI task"
    ],
    targetQuestions: [
      "Jakie logi sa potrzebne do wyjasnienia failure providerow?",
      "Jak generowac bezpieczne raporty diagnostyczne bez sekretow?"
    ]
  }),
  bucket({
    id: "fallback_routing_governance",
    label: "Fallback routing governance and human review",
    query:
      "AI model routing fallback governance human review reliability",
    keywords: ["fallback routing", "governance", "human review", "reliability"],
    targetQuestions: [
      "Kiedy system moze sugerowac fallback route?",
      "Jak unikac automatycznej zmiany providera bez zgody uzytkownika?"
    ]
  })
];

const AGENT_SESSION_BUCKETS: EvidenceBucket[] = [
  bucket({
    id: "session_state_consistency",
    label: "Session state consistency and lifecycle modeling",
    query:
      "conversation session state consistency lifecycle desktop application reliability",
    keywords: ["session state", "lifecycle", "desktop application", "consistency"],
    targetQuestions: [
      "Jak modelowac parent-child session links i lifecycle?",
      "Jak wykrywac sesje znikajace albo podpiete do zlego parenta?"
    ]
  }),
  bucket({
    id: "agent_ux_recovery",
    label: "Agent UX recovery and trust after state failures",
    query:
      "AI agent user experience trust recovery state failure conversation continuity",
    keywords: ["agent UX", "trust recovery", "state failure", "conversation continuity"],
    targetQuestions: [
      "Jakie awarie sesji najbardziej niszcza zaufanie?",
      "Jak projektowac recovery path dla uzytkownika?"
    ]
  }),
  bucket({
    id: "cross_platform_sync",
    label: "Cross-platform sync and desktop state reliability",
    query:
      "desktop application cross platform synchronization state reliability offline conflict resolution",
    keywords: ["cross-platform sync", "desktop state", "offline", "conflict resolution"],
    targetQuestions: [
      "Jak testowac synchronizacje stanu miedzy klientami?",
      "Jak unikac konfliktow i utraty sesji?"
    ]
  }),
  bucket({
    id: "session_qa_repro_cases",
    label: "Session QA reproduction and telemetry",
    query:
      "software reliability telemetry reproduction test cases session bugs",
    keywords: ["telemetry", "reproduction test cases", "session bugs", "software reliability"],
    targetQuestions: [
      "Jak zamieniac issue reports w scenariusze QA?",
      "Jakie telemetry events sa potrzebne do debugowania sesji?"
    ]
  })
];

const AGENT_SANDBOX_BUCKETS: EvidenceBucket[] = [
  bucket({
    id: "sandbox_preflight_checks",
    label: "Agent sandbox runtime readiness and preflight gates",
    query:
      "LLM agent sandboxed environment runtime trust failures runtime contract execution gate safe default readiness evaluation",
    keywords: [
      "agent sandbox",
      "sandboxed environment",
      "environment readiness",
      "runtime trust failures",
      "runtime contract",
      "execution gate",
      "startup failure",
      "network policy"
    ],
    targetQuestions: [
      "Ktore sygnaly srodowiska najlepiej przewiduja nieudany albo niebezpieczny run agenta?",
      "Jakie preflight checks powinny blokowac uruchomienie workflow?"
    ]
  }),
  bucket({
    id: "tool_policy_safety",
    label: "Tool policy safety and capability exposure",
    query:
      "tool using AI agents safety policy capability exposure sandbox permissions evaluation",
    keywords: [
      "tool using agents",
      "safety policy",
      "capability exposure",
      "sandbox permissions",
      "evaluation"
    ],
    targetQuestions: [
      "Jak wykrywac niebezpieczna ekspozycje narzedzi i uprawnien?",
      "Jak laczyc polityki tool-use z mierzalnymi gate'ami bezpieczenstwa?"
    ]
  }),
  bucket({
    id: "runtime_observability",
    label: "Runtime observability for agent and container failures",
    query:
      "agent runtime observability container logs failure diagnosis network configuration monitoring",
    keywords: [
      "runtime observability",
      "container logs",
      "failure diagnosis",
      "network configuration",
      "monitoring"
    ],
    targetQuestions: [
      "Jakie logi i telemetry events sa potrzebne do wyjasnienia awarii sandboxa?",
      "Jak odroznic blad konfiguracji, sieci, runtime i polityki?"
    ]
  }),
  bucket({
    id: "release_gate_replay",
    label: "Release gates, replay fixtures and reproducible sandbox QA",
    query:
      "AI agent evaluation replay fixtures release gates reproducible failures sandbox reliability",
    keywords: [
      "agent evaluation",
      "replay fixtures",
      "release gates",
      "reproducible failures",
      "sandbox reliability"
    ],
    targetQuestions: [
      "Jak zamieniac failed run traces w reprodukowalne fixture cases?",
      "Jakie progi jakosci powinny blokowac release agenta?"
    ]
  })
];

const SELF_HOSTED_AI_BUCKETS: EvidenceBucket[] = [
  bucket({
    id: "self_hosted_security_controls",
    label: "Self-hosted AI security controls",
    query:
      "self hosted AI security controls secrets management local data deployment",
    keywords: ["self-hosted AI", "security controls", "secrets management", "local data"],
    targetQuestions: [
      "Jakie kontrole sa wymagane przed rolloutem self-hosted AI?",
      "Jak audytowac sekrety, storage i ekspozycje sieciowa?"
    ]
  }),
  bucket({
    id: "ai_workspace_governance",
    label: "AI workspace governance and policy readiness",
    query:
      "AI workspace governance policy readiness audit tool approval data privacy",
    keywords: ["workspace governance", "policy readiness", "tool approval", "data privacy"],
    targetQuestions: [
      "Jak opisac polityki workspace przed wdrozeniem?",
      "Jak oceniac approval settings, memory i tool boundaries?"
    ]
  }),
  bucket({
    id: "local_first_privacy",
    label: "Local-first privacy and data boundary design",
    query:
      "local first software privacy data boundary self hosted applications",
    keywords: ["local-first", "privacy", "data boundary", "self-hosted"],
    targetQuestions: [
      "Jak definiowac granice danych w lokalnym AI workspace?",
      "Co musi byc widoczne dla operatora przed wlaczeniem integracji?"
    ]
  }),
  bucket({
    id: "deployment_readiness_audit",
    label: "Deployment readiness audit and remediation workflow",
    query:
      "deployment readiness audit configuration security remediation workflow",
    keywords: ["deployment readiness", "configuration audit", "security remediation"],
    targetQuestions: [
      "Jak punktowac readiness konfiguracji?",
      "Jak zamieniac wykryte luki na konkretne remediation tasks?"
    ]
  })
];

const GENERIC_BUCKETS: EvidenceBucket[] = [
  bucket({
    id: "domain_methods",
    label: "Domain methods and prior art",
    query:
      "applied AI system design empirical evaluation prior work methods",
    keywords: ["applied AI", "system design", "empirical evaluation", "methods"],
    targetQuestions: [
      "Jakie metody sa uzywane w podobnych systemach?",
      "Co jest sprawdzone, a co jest tylko zalozeniem?"
    ]
  }),
  bucket({
    id: "data_requirements",
    label: "Data requirements and data quality",
    query:
      "machine learning system data quality dataset requirements evaluation pipeline",
    keywords: ["data quality", "dataset requirements", "evaluation", "pipeline"],
    targetQuestions: [
      "Jakich danych potrzebuje MVP?",
      "Jak mierzyc jakosc i pokrycie danych?"
    ]
  }),
  bucket({
    id: "evaluation_validation",
    label: "Evaluation and validation",
    query:
      "AI system evaluation validation benchmark metrics reliability",
    keywords: ["evaluation", "validation", "benchmark", "reliability"],
    targetQuestions: [
      "Jakie metryki mowia, ze system dziala?",
      "Jak wyglada minimalny uczciwy benchmark?"
    ]
  }),
  bucket({
    id: "risk_safety",
    label: "Risk, safety and failure modes",
    query:
      "AI system risk safety failure modes human oversight governance",
    keywords: ["risk", "safety", "failure modes", "human oversight"],
    targetQuestions: [
      "Jakie sa najgrozniejsze tryby awarii?",
      "Jak ograniczyc skutki blednych decyzji?"
    ]
  }),
  bucket({
    id: "implementation_operations",
    label: "Implementation and operations",
    query:
      "production AI system architecture monitoring operations reliability",
    keywords: ["architecture", "monitoring", "operations", "reliability"],
    targetQuestions: [
      "Jakie komponenty sa potrzebne w pierwszej wersji?",
      "Jak monitorowac jakosc po wdrozeniu?"
    ]
  })
];

function uniqueBuckets(buckets: EvidenceBucket[]) {
  const seen = new Set<string>();
  return buckets.filter((bucketItem) => {
    if (seen.has(bucketItem.id)) {
      return false;
    }
    seen.add(bucketItem.id);
    return true;
  });
}

function selectBuckets(idea: NormalizedProjectIdea) {
  const normalizedDomains = idea.domains.map((domain) => domain.toLowerCase());
  const titleText = `${idea.title} ${idea.oneSentence}`.toLowerCase();
  const hasDomain = (domain: string) => normalizedDomains.includes(domain);
  const buckets: EvidenceBucket[] = [];

  if (
    hasDomain("algorithmic trading") ||
    hasDomain("quant research") ||
    hasDomain("financial risk") ||
    titleText.includes("trading") ||
    titleText.includes("quant")
  ) {
    buckets.push(...TRADING_BUCKETS);
  }

  if (
    hasDomain("software engineering") ||
    hasDomain("static analysis") ||
    hasDomain("llm code review") ||
    titleText.includes("code review") ||
    titleText.includes("repo")
  ) {
    buckets.push(...CODE_REVIEW_BUCKETS);
  }

  if (
    hasDomain("clinical ai") ||
    hasDomain("healthcare safety") ||
    hasDomain("medical validation") ||
    titleText.includes("clinical") ||
    titleText.includes("healthcare") ||
    titleText.includes("medical")
  ) {
    buckets.push(...HEALTHCARE_BUCKETS);
  }

  if (
    hasDomain("legal retrieval") ||
    hasDomain("compliance risk") ||
    hasDomain("document review") ||
    titleText.includes("legal") ||
    titleText.includes("compliance") ||
    titleText.includes("contract")
  ) {
    buckets.push(...LEGAL_BUCKETS);
  }

  if (
    hasDomain("document ai") ||
    hasDomain("rag ingestion") ||
    hasDomain("conversion quality") ||
    titleText.includes("document conversion") ||
    titleText.includes("markdown")
  ) {
    buckets.push(...DOCUMENT_CONVERSION_BUCKETS);
  }

  if (
    hasDomain("llm context engineering") ||
    hasDomain("rag evaluation") ||
    hasDomain("agent reliability") ||
    titleText.includes("context budget") ||
    titleText.includes("context compression")
  ) {
    buckets.push(...LLM_CONTEXT_BUCKETS);
  }

  if (
    hasDomain("provider routing") ||
    hasDomain("cli reliability") ||
    titleText.includes("provider compatibility") ||
    titleText.includes("ai cli")
  ) {
    buckets.push(...AI_CLI_PROVIDER_BUCKETS);
  }

  if (
    hasDomain("ai agent ux") ||
    hasDomain("session reliability") ||
    hasDomain("desktop ai apps") ||
    titleText.includes("session reliability")
  ) {
    buckets.push(...AGENT_SESSION_BUCKETS);
  }

  if (
    hasDomain("AI agents") ||
    hasDomain("sandbox reliability") ||
    hasDomain("agent safety") ||
    titleText.includes("agent sandbox") ||
    titleText.includes("sandbox health") ||
    titleText.includes("nemoclaw")
  ) {
    buckets.push(...AGENT_SANDBOX_BUCKETS);
  }

  if (
    hasDomain("self-hosted ai") ||
    hasDomain("ai security") ||
    hasDomain("workspace governance") ||
    titleText.includes("self-hosted") ||
    titleText.includes("workspace policy")
  ) {
    buckets.push(...SELF_HOSTED_AI_BUCKETS);
  }

  return uniqueBuckets(buckets.length > 0 ? buckets : GENERIC_BUCKETS);
}

function buildResearchGoals(idea: NormalizedProjectIdea, buckets: EvidenceBucket[]) {
  return [
    `Zbudowac ResearchPlan dla: ${idea.title}.`,
    "Oddzielic evidence-backed decisions od zalozen bez zrodel.",
    "Zebrac pelnotekstowe lub przynajmniej abstraktowe dowody dla kazdego wymaganego bucketu.",
    `Pokryc buckety: ${buckets.map((bucketItem) => bucketItem.id).join(", ")}.`
  ];
}

function buildQueryVariants(idea: NormalizedProjectIdea, buckets: EvidenceBucket[]) {
  return Array.from(
    new Set([
      `${idea.title} ${idea.problem}`,
      `${idea.title} ${idea.domains.join(" ")}`,
      `${idea.title} ${idea.assumptions.join(" ")}`,
      ...buckets.map((bucketItem) => bucketItem.query),
      ...buckets.flatMap((bucketItem) =>
        bucketItem.targetQuestions.map(
          (question) => `${idea.title} ${bucketItem.label} ${question}`
        )
      ),
      ...buckets.flatMap((bucketItem) =>
        bucketItem.keywords.slice(0, 2).map((keyword) => `${idea.title} ${keyword}`)
      )
    ])
  );
}

export function createResearchPlanForIdea(
  value: NormalizedProjectIdea
): ResearchPlan {
  const idea = NormalizedProjectIdeaSchema.parse(value);
  const evidenceBuckets = selectBuckets(idea);
  const researchPlan: ResearchPlan = {
    ideaId: idea.ideaId,
    researchGoals: buildResearchGoals(idea, evidenceBuckets),
    evidenceBuckets,
    queryVariants: buildQueryVariants(idea, evidenceBuckets),
    sources: ["arxiv", "semantic_scholar", "openalex"]
  };

  return ResearchPlanSchema.parse(researchPlan);
}

export function buildProjectResearchPlan(value: unknown): ResearchPlanResult {
  const normalizedIdea = ProjectIdeaInputSchema.safeParse(value).success
    ? normalizeProjectIdea(value as ProjectIdeaInput)
    : NormalizedProjectIdeaSchema.parse(value);

  return {
    normalizedIdea,
    researchPlan: createResearchPlanForIdea(normalizedIdea)
  };
}
