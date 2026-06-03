import { describe, expect, it } from "vitest";
import {
  discoverProjectIdeas,
  IdeaDiscoveryReportSchema,
  scoreIdea
} from "@/lib/project-ideas";
import type { IdeaSourceRepo } from "@/lib/project-ideas";
import { buildProjectResearchPlan } from "@/lib/project-research";

function sourceRepo(overrides: Partial<IdeaSourceRepo>): IdeaSourceRepo {
  return {
    repoId: "repo_ai_code_review_agent",
    name: "ai-code-review-agent",
    owner: "example",
    url: "https://github.com/example/ai-code-review-agent",
    description: "AI agent for code review and pull request comments.",
    topics: ["ai", "code-review", "developer-tools"],
    primaryLanguage: "TypeScript",
    stars: 1800,
    forks: 140,
    openIssues: 24,
    createdAt: "2025-10-01T12:00:00.000Z",
    pushedAt: "2026-05-28T12:00:00.000Z",
    readmeText:
      "AI code review agent that reads repositories, reviews pull requests, and comments on code quality.",
    issueSignals: [
      {
        title: "Need better sprint planning for refactors",
        body: "Review comments are useful, but we need prioritization and sprint-sized plans.",
        labels: ["enhancement"]
      }
    ],
    ...overrides
  };
}

describe("discoverProjectIdeas", () => {
  it("turns GitHub repo signals into non-clone project ideas", () => {
    const report = discoverProjectIdeas({
      domain: "AI developer tools",
      constraints: ["MVP in 2 weeks", "no automatic code edits"],
      maxIdeas: 3,
      outputLanguage: "pl",
      sourceRepos: [sourceRepo({})]
    });

    expect(IdeaDiscoveryReportSchema.parse(report)).toEqual(report);
    expect(report.discoveredIdeas.length).toBeGreaterThanOrEqual(2);
    expect(report.metrics.cloneRejectedCount).toBeGreaterThanOrEqual(1);
    expect(report.shortlist.length).toBeGreaterThanOrEqual(1);
    expect(report.shortlist[0]?.title).toBe("AI Technical Debt Sprint Planner");
    expect(report.shortlist[0]?.differentiation.length).toBeGreaterThanOrEqual(2);
    expect(report.projectIdeaInputs.length).toBe(report.shortlist.length);
  });

  it("exports shortlisted ideas as valid research pipeline inputs", () => {
    const report = discoverProjectIdeas({
      domain: "AI developer tools",
      constraints: ["MVP only recommends a plan"],
      maxIdeas: 1,
      sourceRepos: [sourceRepo({})]
    });
    const projectIdea = report.projectIdeaInputs[0];

    expect(projectIdea).toBeDefined();
    const { researchPlan } = buildProjectResearchPlan(projectIdea);

    expect(researchPlan.evidenceBuckets.length).toBeGreaterThanOrEqual(4);
    expect(researchPlan.queryVariants.length).toBeGreaterThan(
      researchPlan.evidenceBuckets.length
    );
  });

  it("generates specific LLM operations ideas for model deployment trends", () => {
    const report = discoverProjectIdeas({
      domain: "AI model operations",
      constraints: ["avoid cloning model repositories"],
      maxIdeas: 2,
      outputLanguage: "pl",
      sourceRepos: [
        sourceRepo({
          repoId: "repo_llm_inference",
          name: "llm-inference-runtime",
          owner: "example",
          url: "https://github.com/example/llm-inference-runtime",
          description:
            "LLM inference runtime with benchmark harness and deployment examples.",
          topics: ["ai", "llm", "inference", "benchmark"],
          primaryLanguage: "Python",
          stars: 4800,
          forks: 360,
          openIssues: 42,
          readmeText:
            "LLM inference project with model serving, benchmark harness, evaluations, and deployment examples.",
          issueSignals: [
            {
              title: "Need safer deployment checks before inference release",
              body: "Teams need regression gates, cost checks, and rollback planning before shipping model changes.",
              labels: ["enhancement"]
            }
          ]
        })
      ]
    });

    expect(report.shortlist[0]?.title).toBe("LLM Release Readiness Radar");
    expect(report.shortlist[0]?.differentiation.join(" ")).toContain(
      "release readiness"
    );
    expect(report.shortlist[0]?.researchQuestions.join(" ")).toContain(
      "LLM releases"
    );
  });

  it("generates specific agent QA ideas for agent framework trends", () => {
    const report = discoverProjectIdeas({
      domain: "AI agent operations",
      constraints: ["avoid building another agent framework"],
      maxIdeas: 2,
      outputLanguage: "pl",
      sourceRepos: [
        sourceRepo({
          repoId: "repo_agent_framework",
          name: "agent-workflow-kit",
          owner: "example",
          url: "https://github.com/example/agent-workflow-kit",
          description:
            "AI agent framework for tool use, workflow orchestration, and repeatable automation.",
          topics: ["ai", "agents", "workflow", "tools"],
          primaryLanguage: "Python",
          stars: 4200,
          forks: 330,
          openIssues: 38,
          readmeText:
            "AI agent framework that coordinates tools, code execution, and repeatable workflows.",
          issueSignals: [
            {
              title: "Need workflow evaluation before production runs",
              body: "Agent runs need repeatable scoring, failure review, and safe rollout plans.",
              labels: ["enhancement"]
            }
          ]
        })
      ]
    });

    expect(report.shortlist[0]?.title).toBe("AI Agent Run QA Console");
    expect(report.shortlist[0]?.differentiation.join(" ")).toContain(
      "another agent framework"
    );
    expect(report.shortlist[0]?.mvpScope.join(" ")).toContain("tool calls");
  });

  it.each([
    {
      name: "self-hosted AI workspace",
      expectedTitle: "Self-Hosted AI Workspace Policy Auditor",
      repo: sourceRepo({
        repoId: "repo_self_hosted_workspace",
        name: "odysseus",
        description: "Self-hosted AI workspace.",
        topics: ["ai", "workspace", "self-hosted"],
        readmeText:
          "A self-hosted AI workspace, local-first and privacy-first, with chat, agents, memory, email, documents, and deployment settings.",
        issueSignals: [
          {
            title: "Proposal: encrypt secrets at rest via SOPS",
            body: "Operators need better secret handling before self-hosted rollout.",
            labels: ["security"]
          }
        ]
      })
    },
    {
      name: "document conversion",
      expectedTitle: "Document Conversion QA Harness",
      repo: sourceRepo({
        repoId: "repo_markitdown",
        name: "markitdown",
        description: "Python tool for converting files and office documents to Markdown.",
        topics: ["markdown", "pdf", "microsoft-office", "document-ai"],
        readmeText:
          "MarkItDown converts PDF, CSV, Office documents, and files to Markdown for downstream LLM and RAG workflows.",
        issueSignals: [
          {
            title: "CsvConverter produces broken Markdown tables",
            body: "Pipe characters in cells break converted Markdown tables.",
            labels: ["bug"]
          }
        ]
      })
    },
    {
      name: "context compression",
      expectedTitle: "LLM Context Budget QA Monitor",
      repo: sourceRepo({
        repoId: "repo_headroom",
        name: "headroom",
        description:
          "Compress tool outputs, logs, files, and RAG chunks before they reach the LLM.",
        topics: ["llm", "rag", "context-window", "token-optimization"],
        readmeText:
          "The context compression layer for AI agents. Compress tool outputs, logs, files, and RAG chunks.",
        issueSignals: [
          {
            title: "panic with code-aware enabled",
            body: "Code-aware compression can fail and needs QA before production.",
            labels: ["bug"]
          }
        ]
      })
    },
    {
      name: "provider switching",
      expectedTitle: "AI CLI Provider Compatibility Monitor",
      repo: sourceRepo({
        repoId: "repo_cc_switch",
        name: "cc-switch",
        description:
          "All-in-One assistant for Claude Code, Codex, OpenCode, Gemini CLI, and provider management.",
        topics: ["codex", "claude-code", "provider-management", "desktop-app"],
        readmeText:
          "CC Switch manages Claude Code, Codex, OpenCode, Gemini CLI, provider routing, and desktop app configuration.",
        issueSignals: [
          {
            title: "Third-party GPT relay cannot use codex app conversation",
            body: "A proxy provider passes health checks but fails during Codex conversation.",
            labels: ["question"]
          }
        ]
      })
    },
    {
      name: "agent approval UX",
      expectedTitle: "Agent Action Approval UX Console",
      repo: sourceRepo({
        repoId: "repo_hermes_agent",
        name: "hermes-agent",
        description: "The agent that grows with you.",
        topics: ["ai-agent", "codex", "tool-calls", "openai"],
        readmeText:
          "A self-improving AI agent with tools, scheduled automations, memory, and command execution.",
        issueSignals: [
          {
            title: "Desktop client needs approval dialog for command confirmation",
            body: "Blocked terminal calls need a security approval popup instead of hanging.",
            labels: ["feature"]
          }
        ]
      })
    },
    {
      name: "agent session reliability",
      expectedTitle: "Agent Session Reliability Monitor",
      repo: sourceRepo({
        repoId: "repo_agent_sessions",
        name: "hermes-agent",
        description: "The agent that grows with you.",
        topics: ["ai-agent", "desktop-app", "session-continuity"],
        readmeText:
          "A self-improving AI agent with cross-platform conversation continuity and desktop sessions.",
        issueSignals: [
          {
            title: "Desktop sessions get spurious parent_session_id and disappear from sidebar",
            body: "Session metadata can attach to the wrong parent context and become invisible.",
            labels: ["bug"]
          }
        ]
      })
    }
  ])("generates a specific idea for $name repo trends", ({ expectedTitle, repo }) => {
    const report = discoverProjectIdeas({
      domain: "AI apps and developer tools",
      constraints: ["avoid cloning the source repo"],
      maxIdeas: 2,
      outputLanguage: "pl",
      sourceRepos: [repo]
    });

    expect(report.shortlist[0]?.title).toBe(expectedTitle);
    expect(report.shortlist[0]?.differentiation.join(" ")).not.toContain(
      "same workflow"
    );
  });

  it("deduplicates repeated shortlist ideas across similar source repos", () => {
    const report = discoverProjectIdeas({
      domain: "AI developer tools",
      constraints: ["avoid repeated ideas"],
      maxIdeas: 5,
      outputLanguage: "pl",
      sourceRepos: [
        sourceRepo({
          repoId: "repo_code_review_agent_one",
          name: "code-review-agent-one"
        }),
        sourceRepo({
          repoId: "repo_code_review_agent_two",
          name: "code-review-agent-two",
          stars: 2200,
          forks: 160
        })
      ]
    });
    const titles = report.shortlist.map((idea) => idea.title);

    expect(titles).toEqual([...new Set(titles)]);
    expect(titles.filter((title) => title === "AI Technical Debt Sprint Planner")).toHaveLength(1);
  });

  it("keeps strong adjacent ideas from popular repos in the promising shortlist", () => {
    const report = discoverProjectIdeas({
      domain: "self-hosted AI security",
      constraints: ["do not clone workspace UI"],
      maxIdeas: 2,
      outputLanguage: "pl",
      sourceRepos: [
        sourceRepo({
          repoId: "repo_popular_workspace",
          name: "odysseus",
          description: "Self-hosted AI workspace.",
          topics: ["ai", "agent", "workspace"],
          stars: 40_000,
          forks: 4000,
          issueSignals: [],
          readmeText:
            "A self-hosted AI workspace, local-first and privacy-first, with deployment settings and model providers."
        })
      ]
    });

    expect(report.shortlist[0]?.title).toBe(
      "Self-Hosted AI Workspace Policy Auditor"
    );
    expect(report.ideaScores.find((score) => score.ideaId === report.shortlist[0]?.ideaId)?.verdict).toBe(
      "promising"
    );
  });

  it("penalizes direct clones of source repository workflow", () => {
    const report = discoverProjectIdeas({
      domain: "AI developer tools",
      sourceRepos: [sourceRepo({})]
    });
    const clone = report.discoveredIdeas.find((idea) =>
      idea.ideaId.startsWith("idea_clone_")
    );
    const repo = report.sourceRepos[0];
    const insight = report.repoInsights[0];

    expect(clone).toBeDefined();
    expect(repo).toBeDefined();
    expect(insight).toBeDefined();

    const score = scoreIdea({
      idea: clone!,
      repo: repo!,
      insight: insight!
    });

    expect(score.verdict).toBe("reject");
    expect(score.novelty).toBeLessThan(0.55);
    expect(score.reasons.join(" ")).toContain("core workflow");
  });
});
