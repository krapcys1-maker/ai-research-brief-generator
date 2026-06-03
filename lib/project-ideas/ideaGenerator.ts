import { DiscoveredIdeaSchema } from "@/lib/project-ideas/schemas";
import type {
  DiscoveredIdea,
  IdeaSourceRepo,
  RepoInsight
} from "@/lib/project-ideas/types";

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function repoText(repo: IdeaSourceRepo) {
  return [
    repo.description,
    repo.topics.join(" "),
    repo.readmeText,
    repo.issueSignals.map((issue) => `${issue.title} ${issue.body}`).join(" ")
  ]
    .join(" ")
    .toLowerCase();
}

function focusedRepoText(repo: IdeaSourceRepo) {
  return [
    repo.name,
    repo.description,
    repo.topics.join(" "),
    repo.issueSignals.map((issue) => `${issue.title} ${issue.body}`).join(" ")
  ]
    .join(" ")
    .toLowerCase();
}

function adjacentBlueprint(
  repo: IdeaSourceRepo,
  insight: RepoInsight
) {
  const text = repoText(repo);
  const focusedText = focusedRepoText(repo);
  const repoName = repo.name.toLowerCase();

  if (
    focusedText.includes("self-hosted ai workspace") ||
    focusedText.includes("local-first") ||
    focusedText.includes("privacy-first") ||
    focusedText.includes("secrets at rest") ||
    focusedText.includes("sops")
  ) {
    return {
      title: "Self-Hosted AI Workspace Policy Auditor",
      problem:
        "Teams want private AI workspaces, but deployment security, secret handling, and policy readiness are hard to verify before rollout.",
      targetUsers: ["AI platform teams", "self-hosted app operators"],
      mvpScope: [
        "ingest self-hosted AI workspace config, README, issues, and deployment notes",
        "audit secrets, auth, network exposure, local data, and approval settings",
        "produce a rollout readiness report with concrete policy and remediation tasks"
      ],
      differentiation: [
        "audits deployment readiness instead of building another AI workspace",
        "focuses on self-hosted privacy, secrets, and operational controls",
        "keeps recommendations as a reviewable policy checklist before rollout"
      ],
      domains: ["self-hosted AI", "AI security", "workspace governance"],
      researchQuestions: [
        "Which self-hosted AI workspace controls most reduce secret and data exposure risk?",
        "How should local-first AI systems document approval, memory, and network boundaries?"
      ],
      aiLeverage: [
        "maps README and issue signals into deployment risk controls",
        "turns messy configuration evidence into an operator-ready policy checklist"
      ]
    };
  }

  if (
    focusedText.includes("analytics") ||
    focusedText.includes("dashboard") ||
    focusedText.includes("warehouse") ||
    focusedText.includes("business-intelligence") ||
    focusedText.includes("data-modeling") ||
    focusedText.includes("data analysts") ||
    focusedText.includes("data extraction") ||
    focusedText.includes("data-extraction") ||
    focusedText.includes("web scraping") ||
    focusedText.includes("scraping") ||
    focusedText.includes("crawler")
  ) {
    return {
      title: "AI Data Quality Investigation Agent",
      problem:
        "Data teams lose time diagnosing broken datasets, extraction drift, and warehouse quality issues before dashboards and analyses can be trusted.",
      targetUsers: ["data analysts", "analytics engineers"],
      mvpScope: [
        "profile CSV, warehouse, or extracted web data snapshots",
        "detect quality anomalies, schema drift, and suspicious extraction gaps",
        "produce an investigation report with likely causes and next checks"
      ],
      differentiation: [
        "focuses on data quality investigation before dashboard generation",
        "targets operational analysts and analytics engineers instead of generic BI users",
        "outputs audit-friendly diagnostics rather than only charts"
      ],
      domains: ["data quality", "analytics engineering", "AI agents"],
      researchQuestions: [
        "Which anomaly explanations are most useful for data quality triage?",
        "How should agents avoid fabricating causes for data and extraction errors?"
      ],
      aiLeverage: [
        "turns anomaly patterns into investigation hypotheses",
        "summarizes quality risks in analyst-friendly language"
      ]
    };
  }

  if (
    focusedText.includes("markdown") ||
    focusedText.includes("pdf") ||
    focusedText.includes("csvconverter") ||
    focusedText.includes("office documents") ||
    focusedText.includes("document conversion")
  ) {
    return {
      title: "Document Conversion QA Harness",
      problem:
        "Teams using document-to-Markdown pipelines need to catch broken tables, unsafe input handling, and lost structure before documents enter RAG or agent workflows.",
      targetUsers: ["RAG builders", "documentation automation teams"],
      mvpScope: [
        "ingest converted Markdown outputs and source document metadata",
        "detect table, citation, encoding, and structure regressions",
        "produce conversion quality reports with reproducible fixture cases"
      ],
      differentiation: [
        "tests document conversion quality instead of doing the conversion itself",
        "targets downstream RAG and agent reliability",
        "turns GitHub issue patterns into regression fixtures"
      ],
      domains: ["document AI", "RAG ingestion", "conversion quality"],
      researchQuestions: [
        "Which document conversion errors most harm retrieval and answer grounding?",
        "How should Markdown conversion quality be evaluated across tables, PDFs, and Office files?"
      ],
      aiLeverage: [
        "classifies conversion failures into reusable QA cases",
        "summarizes broken document structures into actionable regression reports"
      ]
    };
  }

  if (
    (focusedText.includes("context compression") ||
      focusedText.includes("token optimization") ||
      focusedText.includes("context-window") ||
      focusedText.includes("compress tool outputs") ||
      focusedText.includes("rag chunks")) &&
    !repoName.includes("hermes-agent") &&
    !focusedText.includes("ai-agent") &&
    !focusedText.includes("ai-agents")
  ) {
    return {
      title: "LLM Context Budget QA Monitor",
      problem:
        "Agent and RAG teams compress context to save tokens, but they need to know when compression drops facts, code intent, or retrieval evidence.",
      targetUsers: ["AI agent teams", "RAG platform engineers"],
      mvpScope: [
        "ingest original and compressed context examples",
        "compare answer quality, fact retention, and code-aware failure cases",
        "produce context budget reports with safe compression thresholds"
      ],
      differentiation: [
        "evaluates context compression quality instead of providing another compression proxy",
        "targets factual retention and agent reliability",
        "links token savings to evidence loss and failure risk"
      ],
      domains: ["LLM context engineering", "RAG evaluation", "agent reliability"],
      researchQuestions: [
        "How should context compression be scored for factual retention and downstream task success?",
        "Which context loss patterns are most dangerous for tool-using agents?"
      ],
      aiLeverage: [
        "compares compressed and original context for missing facts",
        "turns logs and RAG chunks into compression risk diagnostics"
      ]
    };
  }

  if (
    focusedText.includes("desktop sessions") ||
    focusedText.includes("parent_session") ||
    focusedText.includes("sidebar") ||
    focusedText.includes("session continuity") ||
    focusedText.includes("conversation continuity")
  ) {
    return {
      title: "Agent Session Reliability Monitor",
      problem:
        "AI agent products lose user trust when conversations, desktop sessions, and cross-platform state disappear or attach to the wrong parent context.",
      targetUsers: ["AI agent product teams", "desktop AI app builders"],
      mvpScope: [
        "ingest session metadata, issue reports, and UI state transitions",
        "detect broken parent-child session links, missing sidebar entries, and continuity gaps",
        "produce reliability reports with reproduction steps and recovery actions"
      ],
      differentiation: [
        "monitors session reliability instead of building another agent client",
        "targets continuity, recovery, and user-visible trust failures",
        "turns issue reports into reproducible product QA scenarios"
      ],
      domains: ["AI agent UX", "session reliability", "desktop AI apps"],
      researchQuestions: [
        "Which session-state failures most damage user trust in AI agent products?",
        "How should cross-platform agent sessions be tested for continuity and recoverability?"
      ],
      aiLeverage: [
        "clusters session bug reports into reproducible reliability scenarios",
        "maps UI state failures to likely metadata and lifecycle causes"
      ]
    };
  }

  if (
    (focusedText.includes("provider-management") ||
      focusedText.includes("cc switch") ||
      focusedText.includes("claude code") ||
      focusedText.includes("codex") ||
      focusedText.includes("opencode") ||
      focusedText.includes("gemini cli")) &&
    !focusedText.includes("approval dialog") &&
    !focusedText.includes("command confirmation") &&
    !focusedText.includes("security approval") &&
    !repoName.includes("hermes-agent") &&
    !focusedText.includes("ai-agent") &&
    !focusedText.includes("ai-agents")
  ) {
    return {
      title: "AI CLI Provider Compatibility Monitor",
      problem:
        "Teams switching between AI coding CLIs and third-party providers hit confusing auth, capability, and model-routing failures that are hard to diagnose.",
      targetUsers: ["AI coding tool users", "developer tooling teams"],
      mvpScope: [
        "ingest provider configs, CLI health checks, and failed conversation logs",
        "classify failures by auth, capability mismatch, proxy behavior, and model routing",
        "produce provider compatibility reports and suggested fallback routes"
      ],
      differentiation: [
        "monitors provider compatibility instead of managing the provider list",
        "focuses on failure diagnosis across AI CLIs",
        "keeps fixes as explainable routing and config recommendations"
      ],
      domains: ["AI developer tools", "provider routing", "CLI reliability"],
      researchQuestions: [
        "Which provider metadata predicts tool, image, and model capability failures?",
        "How should AI CLI routing systems explain proxy and provider incompatibilities?"
      ],
      aiLeverage: [
        "summarizes multilingual issue reports into failure classes",
        "maps failed CLI sessions to provider capability requirements"
      ]
    };
  }

  if (
    focusedText.includes("approval dialog") ||
    focusedText.includes("command confirmation") ||
    focusedText.includes("security approval") ||
    focusedText.includes("tool calls") ||
    focusedText.includes("desktop client")
  ) {
    return {
      title: "Agent Action Approval UX Console",
      problem:
        "Agent products need secure command approval flows, but desktop and chat interfaces often leave users stuck between unsafe auto-approval and blocked automation.",
      targetUsers: ["AI agent product teams", "security-conscious automation builders"],
      mvpScope: [
        "ingest blocked tool calls, approval logs, and user issue reports",
        "classify approval failures by risk, UI state, and missing recovery path",
        "produce approval UX recommendations and test scenarios for agent releases"
      ],
      differentiation: [
        "focuses on human approval UX instead of building another agent",
        "targets command safety, recovery, and trust",
        "turns issue reports into concrete approval-flow test cases"
      ],
      domains: ["AI agent safety", "approval UX", "tool-use governance"],
      researchQuestions: [
        "Which approval UX patterns preserve safety without blocking legitimate agent work?",
        "How should command risk be explained to users in desktop and chat agent interfaces?"
      ],
      aiLeverage: [
        "clusters blocked action reports into UX and safety failure modes",
        "generates approval-flow test scenarios from real issue evidence"
      ]
    };
  }

  if (
    (focusedText.includes("agent") ||
      focusedText.includes("tool calls") ||
      focusedText.includes("tool use") ||
      focusedText.includes("workflow") ||
      focusedText.includes("orchestration")) &&
    !focusedText.includes("code review") &&
    !focusedText.includes("pull request") &&
    !focusedText.includes("review comments") &&
    !focusedText.includes("trading") &&
    !focusedText.includes("market") &&
    !focusedText.includes("backtest") &&
    !focusedText.includes("portfolio") &&
    !focusedText.includes("data") &&
    !focusedText.includes("analytics") &&
    !focusedText.includes("dashboard") &&
    !focusedText.includes("csv")
  ) {
    return {
      title: "AI Agent Run QA Console",
      problem:
        "Teams can prototype agents fast, but they struggle to understand failed runs, unsafe tool calls, and production readiness.",
      targetUsers: ["AI product teams", "automation builders"],
      mvpScope: [
        "ingest agent run logs, tool calls, and issue signals",
        "classify failures by planning, tool use, missing context, and unsafe action risk",
        "produce a QA report with replay cases and release blockers"
      ],
      differentiation: [
        "evaluates agent runs instead of building another agent framework",
        "targets reliability and rollout decisions before automation",
        "keeps the core workflow as QA and governance rather than task execution"
      ],
      domains: ["AI agents", "workflow automation", "agent evaluation"],
      researchQuestions: [
        "Which agent failure categories best predict production risk?",
        "How should tool-using agents be evaluated before real user workflows?"
      ],
      aiLeverage: [
        "clusters failed agent traces into actionable QA themes",
        "turns messy run logs into reproducible test and review cases"
      ]
    };
  }

  if (
    text.includes("code review") ||
    text.includes("review comments") ||
    text.includes("static analysis")
  ) {
    return {
      title: "AI Technical Debt Sprint Planner",
      problem:
        "Engineering teams can detect many code issues, but they lack a prioritized refactor plan sized for real sprint capacity.",
      targetUsers: ["tech leads", "small engineering teams"],
      mvpScope: [
        "ingest README, issues, and repository metadata",
        "cluster technical debt themes",
        "produce sprint-sized refactor plan with risk and effort estimates"
      ],
      differentiation: [
        "moves from pull request comments to sprint planning",
        "targets technical debt prioritization instead of line-level code review",
        "keeps recommendations as a plan rather than automatic code edits"
      ],
      domains: ["software engineering", "technical debt", "LLM code review"],
      researchQuestions: [
        "Which repository mining signals best predict maintainability risk?",
        "How should LLM recommendations be evaluated for developer trust and usefulness?"
      ],
      aiLeverage: [
        "summarizes repo and issue evidence into refactor themes",
        "turns unstructured signals into ordered implementation plans"
      ]
    };
  }

  if (
    focusedText.includes("shortvideo") ||
    focusedText.includes("short video") ||
    focusedText.includes("tiktok") ||
    focusedText.includes("moviepy") ||
    focusedText.includes("video generation") ||
    focusedText.includes("generate short videos")
  ) {
    return {
      title: "AI Short-Video Content QA Console",
      problem:
        "Teams using AI to generate short videos need to catch low-quality scripts, unsafe claims, weak source grounding, and repetitive output before publishing.",
      targetUsers: ["content operations teams", "AI media builders"],
      mvpScope: [
        "ingest generated scripts, prompts, voiceover text, and rendered video metadata",
        "score claims, repetition, source grounding, brand fit, and publishing risk",
        "produce a review queue with concrete fixes before export or upload"
      ],
      differentiation: [
        "audits AI-generated media quality instead of generating another video",
        "focuses on review, evidence, and publishing risk",
        "keeps human approval before public release"
      ],
      domains: ["AI media", "content operations", "publishing QA"],
      researchQuestions: [
        "Which quality signals best predict whether AI-generated short videos are publishable?",
        "How should automated media generation preserve claim grounding and brand safety?"
      ],
      aiLeverage: [
        "classifies generated video scripts into quality and safety failure modes",
        "turns prompt, transcript, and metadata evidence into reviewer actions"
      ]
    };
  }

  if (
    focusedText.includes("llm") ||
    focusedText.includes("inference") ||
    focusedText.includes("model serving") ||
    focusedText.includes("benchmark") ||
    focusedText.includes("deployment")
  ) {
    return {
      title: "LLM Release Readiness Radar",
      problem:
        "AI teams can ship model changes quickly, but they lack a practical release gate for cost, regressions, and rollback readiness.",
      targetUsers: ["AI platform teams", "product engineering teams"],
      mvpScope: [
        "ingest model repo metadata, README, issues, and benchmark notes",
        "extract release risks around quality, cost, latency, and rollback",
        "produce a model release readiness report with required checks and owner actions"
      ],
      differentiation: [
        "focuses on release readiness instead of model training or inference hosting",
        "turns repo and issue signals into operational gates",
        "keeps human approval before deployment decisions"
      ],
      domains: ["LLM operations", "AI release management", "model evaluation"],
      researchQuestions: [
        "Which evaluation signals best predict unsafe or costly LLM releases?",
        "How should model release gates balance regression quality, latency, and cost?"
      ],
      aiLeverage: [
        "summarizes model repo evidence into release risks",
        "maps unstructured issues and benchmark notes into concrete readiness checks"
      ]
    };
  }

  if (
    focusedText.includes("trading") ||
    focusedText.includes("backtest") ||
    focusedText.includes("portfolio") ||
    focusedText.includes("stock market") ||
    text.includes("algorithmic trading")
  ) {
    return {
      title: "AI Strategy Risk Simulator",
      problem:
        "Strategy builders need to test trading ideas against realistic failure modes before any live execution.",
      targetUsers: ["quant learners", "paper-trading builders"],
      mvpScope: [
        "collect strategy assumptions",
        "run backtest-quality checklist",
        "generate risk scenarios and paper-trading validation plan"
      ],
      differentiation: [
        "focuses on risk simulation instead of trade execution",
        "targets paper-trading validation rather than live brokerage automation",
        "produces evidence requirements before model deployment"
      ],
      domains: ["algorithmic trading", "risk management", "time-series validation"],
      researchQuestions: [
        "Which backtesting practices reduce overfitting in retail strategy design?",
        "How should AI-generated trading strategies be constrained before paper trading?"
      ],
      aiLeverage: [
        "converts vague strategy claims into testable assumptions",
        "generates risk and validation checklists from market evidence"
      ]
    };
  }

  if (text.includes("medical") || text.includes("clinical") || text.includes("health")) {
    return {
      title: "Clinical Documentation Evidence Auditor",
      problem:
        "Clinical teams need to verify whether medical document summaries preserve evidence boundaries and uncertainty.",
      targetUsers: ["clinicians", "medical documentation teams"],
      mvpScope: [
        "ingest clinical documents",
        "extract claims and uncertainty markers",
        "audit every summary claim against source passages"
      ],
      differentiation: [
        "audits documentation quality instead of giving diagnoses",
        "targets evidence traceability for clinical notes",
        "keeps human review as mandatory workflow step"
      ],
      domains: ["medical AI", "clinical documentation", "evidence grounding"],
      researchQuestions: [
        "How should clinical summarization systems preserve uncertainty?",
        "Which citation checks reduce unsafe medical answer generation?"
      ],
      aiLeverage: [
        "matches generated claims to supporting passages",
        "flags unsupported clinical certainty and missing caveats"
      ]
    };
  }

  if (text.includes("student") || text.includes("lesson") || text.includes("teacher")) {
    return {
      title: "AI Misconception Lesson Planner",
      problem:
        "Teachers see student mistakes, but turning those mistakes into targeted lesson plans is slow.",
      targetUsers: ["teachers", "course creators"],
      mvpScope: [
        "ingest quiz answers or lesson notes",
        "cluster recurring misconceptions",
        "generate next-lesson plan with practice tasks"
      ],
      differentiation: [
        "focuses on teacher planning rather than direct student chatbot answers",
        "uses misconception clustering as the core workflow",
        "keeps the teacher as final editor"
      ],
      domains: ["education technology", "learning analytics", "AI tutoring"],
      researchQuestions: [
        "How can misconception detection improve lesson planning?",
        "Which teacher-in-the-loop controls improve AI tutoring quality?"
      ],
      aiLeverage: [
        "clusters free-text student mistakes",
        "maps misconception patterns to lesson interventions"
      ]
    };
  }

  if (text.includes("data") || text.includes("analytics") || text.includes("dashboard")) {
    return {
      title: "AI Data Quality Investigation Agent",
      problem:
        "Data teams lose time diagnosing broken datasets before dashboards and analyses can be trusted.",
      targetUsers: ["data analysts", "operations teams"],
      mvpScope: [
        "profile CSV or warehouse extracts",
        "detect quality anomalies",
        "produce an investigation report with likely causes and next checks"
      ],
      differentiation: [
        "focuses on data quality investigation before dashboard generation",
        "targets operational analysts instead of generic BI users",
        "outputs audit-friendly diagnostics rather than only charts"
      ],
      domains: ["data quality", "analytics engineering", "AI agents"],
      researchQuestions: [
        "Which anomaly explanations are most useful for data quality triage?",
        "How should agents avoid fabricating causes for data errors?"
      ],
      aiLeverage: [
        "turns anomaly patterns into investigation hypotheses",
        "summarizes quality risks in analyst-friendly language"
      ]
    };
  }

  return {
    title: "AI Workflow Evidence Planner",
    problem: insight.problemSolved,
    targetUsers: insight.targetUsers,
    mvpScope: [
      "ingest workflow description and source artifacts",
      "extract blockers and missing evidence",
      "produce prioritized implementation plan"
    ],
    differentiation: [
      "focuses on evidence planning instead of direct automation",
      "targets decision support before execution"
    ],
    domains: ["product discovery", "evidence planning", "AI workflow automation"],
    researchQuestions: [
      "Which evidence signals make AI workflow recommendations trustworthy?",
      "How should human review gates be designed for AI-generated plans?"
    ],
    aiLeverage: [
      "summarizes messy source signals",
      "maps blockers to next research and implementation steps"
    ]
  };
}

function buildAdjacentIdea(input: {
  repo: IdeaSourceRepo;
  insight: RepoInsight;
  constraints: string[];
}) {
  const blueprint = adjacentBlueprint(input.repo, input.insight);
  const idea: DiscoveredIdea = {
    ideaId: `idea_${slug(blueprint.title)}_${slug(input.repo.repoId)}`,
    title: blueprint.title,
    oneSentence: `${blueprint.title} helps ${blueprint.targetUsers[0]} solve a narrower adjacent workflow inspired by ${input.repo.name}.`,
    problem: blueprint.problem,
    targetUsers: blueprint.targetUsers,
    mvpScope: blueprint.mvpScope,
    nonGoals: [
      "do not clone the source repository",
      "do not automate irreversible actions in MVP",
      ...input.constraints.slice(0, 2)
    ],
    sourceRepos: [input.repo.repoId],
    originalInspiration: `${input.repo.owner}/${input.repo.name}: ${input.insight.coreWorkflow}`,
    differentiation: blueprint.differentiation,
    aiLeverage: blueprint.aiLeverage,
    researchQuestions: blueprint.researchQuestions,
    risks: [
      "source repo popularity may not equal buyer demand",
      "AI recommendations may be too vague without evidence gates"
    ],
    domains: blueprint.domains
  };

  return DiscoveredIdeaSchema.parse(idea);
}

function buildCloneCandidate(repo: IdeaSourceRepo, insight: RepoInsight) {
  const title = `${repo.name.replace(/[-_]+/g, " ")} AI Assistant`;
  const idea: DiscoveredIdea = {
    ideaId: `idea_clone_${slug(repo.repoId)}`,
    title,
    oneSentence: `A similar AI assistant that repeats the source repository workflow for ${insight.targetUsers[0]}.`,
    problem: insight.problemSolved,
    targetUsers: insight.targetUsers,
    mvpScope: [insight.coreWorkflow],
    nonGoals: ["none"],
    sourceRepos: [repo.repoId],
    originalInspiration: `${repo.owner}/${repo.name}: ${insight.coreWorkflow}`,
    differentiation: ["same workflow with a different name"],
    aiLeverage: insight.technicalMechanisms,
    researchQuestions: ["Can the same repository workflow be rebuilt as a product?"],
    risks: ["high clone risk"],
    domains: repo.topics.length ? repo.topics : ["AI product"]
  };

  return DiscoveredIdeaSchema.parse(idea);
}

export function generateIdeasFromRepo(input: {
  repo: IdeaSourceRepo;
  insight: RepoInsight;
  constraints?: string[];
}) {
  return [
    buildCloneCandidate(input.repo, input.insight),
    buildAdjacentIdea({
      repo: input.repo,
      insight: input.insight,
      constraints: input.constraints ?? []
    })
  ];
}

export function generateIdeasFromRepos(input: {
  repos: IdeaSourceRepo[];
  insights: RepoInsight[];
  constraints?: string[];
}) {
  const insightsByRepoId = new Map(
    input.insights.map((insight) => [insight.repoId, insight])
  );

  return input.repos.flatMap((repo) => {
    const insight = insightsByRepoId.get(repo.repoId);
    if (!insight) {
      return [];
    }

    return generateIdeasFromRepo({
      repo,
      insight,
      constraints: input.constraints
    });
  });
}
