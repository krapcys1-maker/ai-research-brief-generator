import { describe, expect, it } from "vitest";
import {
  auditIdeaDiscoveryReport,
  buildTrendRadar,
  discoverProjectIdeas,
  ProjectIdeaAuditSchema
} from "@/lib/project-ideas";
import type { IdeaSourceRepo } from "@/lib/project-ideas";

function sourceRepo(overrides: Partial<IdeaSourceRepo>): IdeaSourceRepo {
  return {
    repoId: "repo_markitdown",
    name: "markitdown",
    owner: "microsoft",
    url: "https://github.com/microsoft/markitdown",
    description: "Tool for converting documents to Markdown.",
    topics: ["markdown", "pdf", "document-ai"],
    primaryLanguage: "Python",
    stars: 18_000,
    forks: 1200,
    openIssues: 120,
    createdAt: "2025-01-01T00:00:00.000Z",
    pushedAt: "2026-06-03T00:00:00.000Z",
    readmeText:
      "Converts PDF, Office, CSV, and other documents to Markdown for downstream LLM and RAG workflows.",
    issueSignals: [
      {
        title: "CsvConverter produces broken Markdown tables",
        body: "Pipe characters in cells break converted Markdown tables.",
        labels: ["bug"]
      }
    ],
    ...overrides
  };
}

describe("auditIdeaDiscoveryReport", () => {
  it("promotes the system strengths on a healthy trend-backed shortlist", () => {
    const report = discoverProjectIdeas({
      domain: "AI developer tools",
      constraints: ["MVP in 2-4 weeks", "avoid cloning source repos"],
      maxIdeas: 5,
      outputLanguage: "pl",
      sourceRepos: [
        sourceRepo({}),
        sourceRepo({
          repoId: "repo_headroom",
          name: "headroom",
          owner: "chopratejas",
          description: "Context compression for LLM and RAG workflows.",
          topics: ["context-compression", "rag", "llm"],
          readmeText:
            "Compresses context windows and RAG chunks to reduce token usage.",
          issueSignals: [
            {
              title: "Need factual fidelity checks",
              body: "Compression can lose facts, code intent, or retrieval evidence.",
              labels: ["enhancement"]
            }
          ]
        }),
        sourceRepo({
          repoId: "repo_cc_switch",
          name: "cc-switch",
          owner: "farion1231",
          description: "Switches AI CLI providers and model routing.",
          topics: ["codex", "claude-code", "provider-management"],
          readmeText:
            "Configure provider routing for Codex, Claude Code, OpenCode, and Gemini CLI.",
          issueSignals: [
            {
              title: "Third-party provider returns 403 in Codex",
              body: "The same provider works in one CLI but fails in another.",
              labels: ["bug"]
            }
          ]
        })
      ]
    });
    const trendRadar = buildTrendRadar({
      sourceRepos: report.sourceRepos,
      repoInsights: report.repoInsights,
      generatedAt: report.generatedAt
    });
    const audit = auditIdeaDiscoveryReport({ report, trendRadar });

    expect(ProjectIdeaAuditSchema.parse(audit)).toEqual(audit);
    expect(audit.readiness).toBe("ready");
    expect(audit.score).toBeGreaterThanOrEqual(82);
    expect(audit.strengths.join(" ")).toContain("Anti-clone");
    expect(audit.promotionMoves.join(" ")).toContain("QA, audit, diagnostic");
  });

  it("flags weak runs before they move into research and architecture", () => {
    const report = discoverProjectIdeas({
      domain: "Generic AI apps",
      constraints: ["quick prototype"],
      maxIdeas: 3,
      outputLanguage: "pl",
      sourceRepos: [
        sourceRepo({
          repoId: "repo_tiny",
          name: "ai-tool",
          owner: "example",
          description: "Small AI tool.",
          topics: ["ai"],
          stars: 10,
          forks: 1,
          openIssues: 0,
          readmeText: "Small AI tool.",
          issueSignals: []
        })
      ]
    });
    const audit = auditIdeaDiscoveryReport({ report, trendRadar: null });

    expect(audit.weaknesses.some((item) => item.area === "source_diversity")).toBe(true);
    expect(audit.weaknesses.some((item) => item.area === "github_signal")).toBe(true);
    expect(audit.weaknesses.some((item) => item.area === "trend_radar")).toBe(true);
    expect(audit.mitigationMoves.length).toBeGreaterThanOrEqual(3);
  });
});
