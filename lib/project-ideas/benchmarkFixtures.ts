import type { IdeaSourceRepo } from "@/lib/project-ideas/types";

export type ProjectIdeaBenchmarkCase = {
  id: string;
  domain: string;
  constraints: string[];
  sourceRepos: IdeaSourceRepo[];
  expectedTopIdeaTitle?: string;
  tags: string[];
};

export function benchmarkIdeaSourceRepo(input: {
  repoId: string;
  name: string;
  description: string;
  topics: string[];
  primaryLanguage?: string;
  stars: number;
  forks: number;
  openIssues: number;
  readmeText: string;
  issueTitle: string;
  issueBody: string;
  issueLabels?: string[];
  owner?: string;
}): IdeaSourceRepo {
  return {
    repoId: input.repoId,
    name: input.name,
    owner: input.owner ?? "benchmark",
    url: `https://github.com/${input.owner ?? "benchmark"}/${input.name}`,
    description: input.description,
    topics: input.topics,
    primaryLanguage: input.primaryLanguage ?? "TypeScript",
    stars: input.stars,
    forks: input.forks,
    openIssues: input.openIssues,
    createdAt: "2025-10-01T12:00:00.000Z",
    pushedAt: "2026-05-28T12:00:00.000Z",
    readmeText: input.readmeText,
    issueSignals: [
      {
        title: input.issueTitle,
        body: input.issueBody,
        labels: input.issueLabels ?? ["enhancement"]
      }
    ]
  };
}

export const projectIdeaBenchmarkCases: ProjectIdeaBenchmarkCase[] = [
  {
    id: "ai_developer_tools",
    domain: "AI developer tools",
    constraints: ["MVP in 2 weeks", "no automatic code edits"],
    expectedTopIdeaTitle: "AI Technical Debt Sprint Planner",
    tags: ["developer-tools", "baseline"],
    sourceRepos: [
      benchmarkIdeaSourceRepo({
        repoId: "repo_code_review_agent",
        name: "ai-code-review-agent",
        description: "AI agent for code review and pull request comments.",
        topics: ["ai", "code-review", "developer-tools"],
        stars: 1800,
        forks: 140,
        openIssues: 24,
        readmeText:
          "AI code review agent that reads repositories, reviews pull requests, and comments on code quality.",
        issueTitle: "Need better sprint planning for refactors",
        issueBody:
          "Review comments are useful, but we need prioritization and sprint-sized plans."
      })
    ]
  },
  {
    id: "ai_trading_support",
    domain: "AI trading support",
    constraints: ["paper trading only", "no live execution"],
    expectedTopIdeaTitle: "AI Strategy Risk Simulator",
    tags: ["trading", "risk"],
    sourceRepos: [
      benchmarkIdeaSourceRepo({
        repoId: "repo_trading_agent",
        name: "ai-trading-agent",
        description: "AI trading bot with backtesting and market strategy generation.",
        topics: ["ai", "trading", "backtesting"],
        primaryLanguage: "Python",
        stars: 1450,
        forks: 180,
        openIssues: 19,
        readmeText:
          "Trading agent for strategy generation, backtest workflows, portfolio experiments, and market data analysis.",
        issueTitle: "Backtests look good but risk controls are unclear",
        issueBody:
          "We need scenario tests, drawdown checks, and guardrails before paper trading."
      })
    ]
  },
  {
    id: "ai_medical_documentation",
    domain: "AI medical documentation",
    constraints: ["human review required", "no diagnosis"],
    expectedTopIdeaTitle: "Clinical Documentation Evidence Auditor",
    tags: ["medical", "evidence"],
    sourceRepos: [
      benchmarkIdeaSourceRepo({
        repoId: "repo_clinical_rag",
        name: "clinical-rag-assistant",
        description:
          "Medical RAG assistant for clinical documents, citations, and healthcare summaries.",
        topics: ["ai", "medical", "rag", "healthcare"],
        stars: 1300,
        forks: 95,
        openIssues: 17,
        readmeText:
          "Clinical document retrieval, medical summaries, citation grounding, and patient note review.",
        issueTitle: "Need uncertainty and unsupported claim audit",
        issueBody:
          "Summaries need evidence traceability, uncertainty markers, and human approval before use."
      })
    ]
  },
  {
    id: "ai_education_tools",
    domain: "AI education tools",
    constraints: ["teacher remains final editor"],
    expectedTopIdeaTitle: "AI Misconception Lesson Planner",
    tags: ["education", "teacher-in-loop"],
    sourceRepos: [
      benchmarkIdeaSourceRepo({
        repoId: "repo_ai_tutor",
        name: "adaptive-ai-tutor",
        description: "AI tutor for student questions, quizzes, lessons, and feedback.",
        topics: ["ai", "education", "tutoring"],
        stars: 900,
        forks: 88,
        openIssues: 14,
        readmeText:
          "AI education tool with lesson generation, student quiz feedback, and teacher dashboards.",
        issueTitle: "Teachers want misconception clusters",
        issueBody:
          "Instead of direct answers, teachers need recurring mistake patterns and next lesson plans."
      })
    ]
  },
  {
    id: "ai_data_analysis_agents",
    domain: "AI data analysis agents",
    constraints: ["audit-friendly output", "no silent data mutation"],
    expectedTopIdeaTitle: "AI Data Quality Investigation Agent",
    tags: ["data-analysis", "audit"],
    sourceRepos: [
      benchmarkIdeaSourceRepo({
        repoId: "repo_data_agent",
        name: "ai-data-analysis-agent",
        description: "AI data analysis agent for CSV files, dashboards, and reports.",
        topics: ["ai", "data-analysis", "analytics"],
        stars: 1100,
        forks: 112,
        openIssues: 21,
        readmeText:
          "Data analytics agent that profiles CSV files, generates dashboards, and writes natural language reports.",
        issueTitle: "Need data quality investigation before charts",
        issueBody:
          "Charts are not useful when data has missing values, duplicates, or broken joins."
      })
    ]
  },
  {
    id: "document_conversion_noisy_readme",
    domain: "AI document ingestion",
    constraints: ["do not build another converter", "produce QA evidence"],
    expectedTopIdeaTitle: "Document Conversion QA Harness",
    tags: ["document-conversion", "noisy-readme"],
    sourceRepos: [
      benchmarkIdeaSourceRepo({
        repoId: "repo_markitdown_noisy",
        name: "markitdown",
        description: "Python tool for converting files and office documents to Markdown.",
        topics: ["markdown", "pdf", "microsoft-office", "document-ai"],
        primaryLanguage: "Python",
        stars: 18_000,
        forks: 1200,
        openIssues: 120,
        readmeText:
          "Converts PDF, Office, CSV, images, audio, emails, spreadsheets, HTML, Markdown, and other documents for downstream LLM and RAG workflows. The README also mentions dashboards, chat, agents, and local workspace integrations.",
        issueTitle: "CsvConverter produces broken Markdown tables",
        issueBody:
          "Pipe characters in cells break converted Markdown tables and later retrieval citations point to the wrong columns.",
        issueLabels: ["bug"]
      })
    ]
  },
  {
    id: "self_hosted_workspace_noisy_readme",
    domain: "self-hosted AI governance",
    constraints: ["do not clone workspace UI", "operator-readable policy output"],
    expectedTopIdeaTitle: "Self-Hosted AI Workspace Policy Auditor",
    tags: ["self-hosted-ai", "noisy-readme", "security"],
    sourceRepos: [
      benchmarkIdeaSourceRepo({
        repoId: "repo_self_hosted_workspace_noisy",
        name: "odysseus",
        owner: "pewdiepie-archdaemon",
        description: "Self-hosted AI workspace.",
        topics: ["ai", "workspace", "self-hosted"],
        stars: 40_000,
        forks: 4000,
        openIssues: 180,
        readmeText:
          "A self-hosted AI workspace, local-first and privacy-first, with chat, agents, memory, email, calendar, documents, Markdown editor, CSV import, and deployment settings.",
        issueTitle: "Proposal: encrypt secrets at rest via SOPS",
        issueBody:
          "Operators need better secret handling, provider key isolation, and rollout policy checks before self-hosted deployment.",
        issueLabels: ["security"]
      })
    ]
  },
  {
    id: "context_compression_quality",
    domain: "LLM context operations",
    constraints: ["measure evidence loss", "avoid building a compression proxy"],
    expectedTopIdeaTitle: "LLM Context Budget QA Monitor",
    tags: ["context-compression", "quality"],
    sourceRepos: [
      benchmarkIdeaSourceRepo({
        repoId: "repo_headroom_quality",
        name: "headroom",
        description: "Context compression for LLM and RAG workflows.",
        topics: ["context-compression", "rag", "llm"],
        primaryLanguage: "Rust",
        stars: 12_000,
        forks: 800,
        openIssues: 90,
        readmeText:
          "Compresses context windows, tool outputs, logs, files, and RAG chunks to reduce token usage.",
        issueTitle: "Need factual fidelity checks",
        issueBody:
          "Compression can lose facts, code intent, or retrieval evidence before the downstream model sees the context.",
        issueLabels: ["quality"]
      })
    ]
  },
  {
    id: "ai_cli_provider_multilingual_issue",
    domain: "AI coding tool reliability",
    constraints: ["diagnose provider failures", "do not manage provider accounts"],
    expectedTopIdeaTitle: "AI CLI Provider Compatibility Monitor",
    tags: ["provider-routing", "multilingual-issue"],
    sourceRepos: [
      benchmarkIdeaSourceRepo({
        repoId: "repo_cc_switch_multilingual",
        name: "cc-switch",
        description:
          "All-in-One assistant for Claude Code, Codex, OpenCode, Gemini CLI, and provider management.",
        topics: ["codex", "claude-code", "provider-management", "desktop-app"],
        stars: 9000,
        forks: 700,
        openIssues: 75,
        readmeText:
          "CC Switch manages Claude Code, Codex, OpenCode, Gemini CLI, provider routing, and desktop app configuration.",
        issueTitle: "Third-party provider returns 403 in Codex",
        issueBody:
          "第三方 provider 在 Codex conversation 中返回 403, but the same proxy passes health checks in Claude Code and Gemini CLI.",
        issueLabels: ["question"]
      })
    ]
  },
  {
    id: "agent_session_incidental_context_compression",
    domain: "AI agent product reliability",
    constraints: ["prioritize user-visible reliability", "avoid another agent client"],
    expectedTopIdeaTitle: "Agent Session Reliability Monitor",
    tags: ["agent-sessions", "incidental-noise"],
    sourceRepos: [
      benchmarkIdeaSourceRepo({
        repoId: "repo_hermes_session_context_noise",
        name: "hermes-agent",
        owner: "NousResearch",
        description: "AI agent desktop client.",
        topics: ["ai-agent", "desktop-app", "session-continuity"],
        stars: 7200,
        forks: 620,
        openIssues: 64,
        readmeText:
          "A self-improving AI agent with cross-platform conversation continuity, command execution, memory, tools, and desktop sessions.",
        issueTitle:
          "Desktop sessions get spurious parent_session_id, making them invisible from sidebar",
        issueBody:
          "A legitimate compression child has context-compression continuation, but this bug is a desktop session parent link failure.",
        issueLabels: ["bug"]
      })
    ]
  },
  {
    id: "multi_source_diversity",
    domain: "AI developer infrastructure",
    constraints: ["preserve source diversity", "avoid clone-shaped ideas"],
    tags: ["source-diversity", "multi-source"],
    sourceRepos: [
      benchmarkIdeaSourceRepo({
        repoId: "repo_markitdown",
        name: "markitdown",
        description: "Tool for converting documents to Markdown.",
        topics: ["markdown", "pdf", "document-ai"],
        primaryLanguage: "Python",
        stars: 18_000,
        forks: 1200,
        openIssues: 120,
        readmeText:
          "Converts PDF, Office, CSV, and other documents to Markdown for downstream LLM and RAG workflows.",
        issueTitle: "CsvConverter produces broken Markdown tables",
        issueBody: "Pipe characters in cells break converted Markdown tables.",
        issueLabels: ["bug"]
      }),
      benchmarkIdeaSourceRepo({
        repoId: "repo_headroom",
        name: "headroom",
        description: "Context compression for LLM and RAG workflows.",
        topics: ["context-compression", "rag", "llm"],
        primaryLanguage: "Rust",
        stars: 12_000,
        forks: 800,
        openIssues: 90,
        readmeText:
          "Compresses context windows and RAG chunks to reduce token usage.",
        issueTitle: "Need factual fidelity checks",
        issueBody: "Compression can lose facts, code intent, or retrieval evidence.",
        issueLabels: ["quality"]
      }),
      benchmarkIdeaSourceRepo({
        repoId: "repo_cc_switch",
        name: "cc-switch",
        description: "Switches AI CLI providers and model routing.",
        topics: ["codex", "claude-code", "provider-management"],
        stars: 9000,
        forks: 700,
        openIssues: 75,
        readmeText:
          "Configure provider routing for Codex, Claude Code, OpenCode, and Gemini CLI.",
        issueTitle: "Third-party provider returns 403 in Codex",
        issueBody: "The same provider works in one CLI but fails in another.",
        issueLabels: ["question"]
      })
    ]
  }
];
