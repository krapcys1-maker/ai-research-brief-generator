import { describe, expect, it } from "vitest";
import {
  AiIdeaResponseSchema,
  buildAiIdeaGenerationPrompt,
  scoreAiIdeaCandidateForQuality
} from "@/lib/project-ideas";
import type { IdeaSourceRepo } from "@/lib/project-ideas";

function repo(overrides: Partial<IdeaSourceRepo>): IdeaSourceRepo {
  return {
    repoId: "github_example_repo",
    name: "markitdown",
    owner: "microsoft",
    url: "https://github.com/microsoft/markitdown",
    description: "Tool for converting documents to Markdown.",
    topics: ["markdown", "pdf", "document-ai"],
    primaryLanguage: "Python",
    stars: 100_000,
    forks: 9000,
    openIssues: 100,
    createdAt: "2025-01-01T00:00:00Z",
    pushedAt: "2026-06-03T00:00:00Z",
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

describe("AI idea generation prompt", () => {
  it("forces DeepSeek-style generation toward adjacent non-clone products", () => {
    const prompt = buildAiIdeaGenerationPrompt({
      sourceRepos: [
        repo({}),
        repo({
          repoId: "github_odysseus",
          name: "odysseus",
          owner: "pewdiepie-archdaemon",
          description: "Self-hosted AI workspace.",
          readmeText:
            "Self-hosted AI workspace with chat, agents, local data, tools, memory, email, calendar and deployment settings.",
          issueSignals: []
        })
      ],
      maxIdeas: 4,
      constraints: ["MVP in 2-4 weeks"],
      outputLanguage: "pl"
    });

    expect(prompt).toContain("Do not create a fork");
    expect(prompt).toContain("Do not build another converter");
    expect(prompt).toContain("Do not build another self-hosted workspace");
    expect(prompt).toContain("prefer conversion QA");
    expect(prompt).toContain("estimatedMvpWeeks");
  });

  it("rejects clone-like AI candidates even when they claim good scores", () => {
    const cloneCandidate = AiIdeaResponseSchema.parse({
      ideas: [
        {
          title: "Team Odysseus Workspace",
          sourceRepos: ["pewdiepie-archdaemon/odysseus"],
          problem:
            "Teams need a collaborative workspace fork of the source repository.",
          mvpScope: [
            "fork Odysseus and add multi-user authentication",
            "add shared agent sessions",
            "add collaborative document editing"
          ],
          differentiation: [
            "team edition of the source workspace",
            "collaborative workspace clone for enterprise users"
          ],
          evidenceSignals: [
            "Odysseus is a self-hosted AI workspace",
            "README lists chat, agents, documents and tools"
          ],
          cloneRisk: "high",
          estimatedMvpWeeks: 8,
          scoreOutOf10: 9,
          rejectionReasons: []
        }
      ]
    }).ideas[0];
    const scored = scoreAiIdeaCandidateForQuality(cloneCandidate);

    expect(scored.verdict).toBe("reject");
    expect(scored.issues.join(" ")).toContain("clone");
    expect(scored.issues.join(" ")).toContain("2-4 week");
  });

  it("keeps strong diagnostic candidates", () => {
    const qaCandidate = AiIdeaResponseSchema.parse({
      ideas: [
        {
          title: "Document Conversion Regression Lab for RAG",
          sourceRepos: ["microsoft/markitdown"],
          problem:
            "Document-to-Markdown conversion bugs silently poison RAG with broken tables, lost citations and malformed structure.",
          mvpScope: [
            "build fixture library for PDF CSV and Office edge cases",
            "diff source documents against converted Markdown structure",
            "score retrieval and grounding impact"
          ],
          differentiation: [
            "tests conversion quality instead of doing conversion",
            "turns issue patterns into regression fixtures"
          ],
          evidenceSignals: [
            "MarkItDown converts PDF CSV and Office files to Markdown",
            "CsvConverter issue reports broken Markdown tables"
          ],
          cloneRisk: "low",
          estimatedMvpWeeks: 3,
          scoreOutOf10: 9,
          rejectionReasons: []
        }
      ]
    }).ideas[0];
    const scored = scoreAiIdeaCandidateForQuality(qaCandidate);

    expect(scored.verdict).toBe("strong");
    expect(scored.score).toBeGreaterThanOrEqual(80);
  });
});
