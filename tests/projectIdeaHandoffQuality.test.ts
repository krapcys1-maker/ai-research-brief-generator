import { describe, expect, it } from "vitest";
import {
  discoverProjectIdeas,
  scoreProjectIdeaHandoff
} from "@/lib/project-ideas";
import type { DiscoveredIdea } from "@/lib/project-ideas";
import type { ProjectIdeaInput } from "@/lib/project-research";
import { benchmarkIdeaSourceRepo } from "@/lib/project-ideas/benchmarkFixtures";

describe("project idea handoff quality", () => {
  it("marks generated adjacent ideas as research-ready handoffs", () => {
    const report = discoverProjectIdeas({
      domain: "AI developer tools",
      constraints: ["MVP in 2 weeks"],
      maxIdeas: 1,
      outputLanguage: "pl",
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
    });

    expect(report.projectIdeaHandoffQuality[0]?.readiness).toBe("ready");
    expect(report.metrics.handoffReadyCount).toBe(1);
    expect(report.metrics.averageHandoffQualityScore).toBeGreaterThanOrEqual(82);
  });

  it("blocks generic project inputs before research handoff", () => {
    const idea: DiscoveredIdea = {
      ideaId: "idea_generic",
      title: "AI App",
      oneSentence: "Build an AI app to help users do useful work.",
      problem: "Users need a useful AI app.",
      targetUsers: ["users"],
      mvpScope: ["build a prototype"],
      nonGoals: [],
      sourceRepos: ["repo_generic"],
      originalInspiration: "generic repo",
      differentiation: ["different UI"],
      aiLeverage: ["uses AI"],
      researchQuestions: ["Can AI help?"],
      risks: [],
      domains: ["AI"]
    };
    const projectIdeaInput: ProjectIdeaInput = {
      title: "AI App",
      description: "Build an AI app to help users.",
      constraints: ["MVP"],
      preferredDomains: ["AI"],
      outputLanguage: "pl"
    };

    const quality = scoreProjectIdeaHandoff({ idea, projectIdeaInput });

    expect(quality.readiness).toBe("blocked");
    expect(quality.score).toBeLessThan(65);
    expect(quality.requiredFixes.join(" ")).toContain("research questions");
    expect(quality.requiredFixes.join(" ")).toContain("specific");
  });

  it("surfaces advisory source review flags without blocking strong handoffs", () => {
    const idea: DiscoveredIdea = {
      ideaId: "idea_advisory",
      title: "Agent Run QA and Replay Console",
      oneSentence:
        "Build a replay console that helps solo builders inspect AI agent runs, tool calls, and failure patterns.",
      problem:
        "AI coding agents fail silently across multi-step runs, making it hard to debug whether prompts, tools, or source data caused the issue.",
      targetUsers: ["solo builders", "AI workflow maintainers"],
      mvpScope: [
        "ingest run logs",
        "score failures by root cause",
        "replay selected tool-call traces"
      ],
      nonGoals: ["no autonomous code changes", "no production observability suite"],
      sourceRepos: ["repo_agent_cli"],
      originalInspiration:
        "Agent CLI projects expose run traces but rarely provide a focused QA and replay workflow for personal project pipelines.",
      differentiation: [
        "focuses on run replay instead of generic chat history",
        "turns failure traces into benchmark cases"
      ],
      aiLeverage: [
        "summarizes failed runs",
        "clusters recurring prompt and tool-call mistakes"
      ],
      researchQuestions: [
        "Which run trace signals best predict poor architecture outputs?",
        "How should replay feedback be converted into benchmark fixtures?"
      ],
      risks: ["logs may miss enough context for root-cause analysis"],
      domains: ["AI developer tools", "agent evaluation"]
    };
    const projectIdeaInput: ProjectIdeaInput = {
      title: idea.title,
      description:
        "Problem: AI agent runs fail silently across project ideation and architecture pipelines. Create an MVP QA and replay console for solo builders that ingests run logs, highlights failure causes, and exports replayable benchmark cases.",
      constraints: [
        "MVP: ingest run logs, score failure causes, and export replay fixtures",
        "no autonomous code rewriting",
        "no production observability suite",
        "must support manual review before any generated recommendation"
      ],
      preferredDomains: ["AI developer tools", "agent evaluation"],
      outputLanguage: "pl"
    };

    const quality = scoreProjectIdeaHandoff({
      idea,
      projectIdeaInput,
      selectionRisk: {
        sourceEvidenceQuality: 0.82,
        reviewFlags: [
          "Manual review: source curation score is low for a single-source idea."
        ]
      }
    });

    expect(quality.readiness).toBe("ready");
    expect(quality.sourceEvidenceQuality).toBe(0.82);
    expect(quality.reviewFlags).toContain(
      "Manual review: source curation score is low for a single-source idea."
    );
    expect(quality.weaknesses).toContain(
      "Manual review: source curation score is low for a single-source idea."
    );
  });

  it("requires review when source evidence flags show weak issue-level proof", () => {
    const report = discoverProjectIdeas({
      domain: "AI developer tools",
      constraints: ["MVP in 2 weeks"],
      maxIdeas: 1,
      outputLanguage: "pl",
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
          issueTitle: "Unrelated dependency update",
          issueBody:
            "The package lock needs a small dependency update and there is no product workflow request here."
        })
      ]
    });

    expect(report.projectIdeaHandoffQuality[0]?.readiness).toBe("needs_review");
    expect(report.projectIdeaHandoffQuality[0]?.reviewFlags).toContain(
      "Manual review: single-source idea has weak issue-level evidence."
    );
  });
});
