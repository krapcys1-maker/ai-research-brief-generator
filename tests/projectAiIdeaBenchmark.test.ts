import { describe, expect, it } from "vitest";
import {
  evaluateAiIdeaBenchmarkCase,
  summarizeAiIdeaBenchmark
} from "@/lib/project-ideas";
import type { AiIdeaCandidate } from "@/lib/project-ideas";

function candidate(overrides: Partial<AiIdeaCandidate>): AiIdeaCandidate {
  return {
    title: "Document Conversion Regression Lab for RAG",
    sourceRepos: ["microsoft/markitdown"],
    problem:
      "Document conversion bugs silently poison RAG with broken tables and malformed structure.",
    mvpScope: [
      "build fixture library for conversion edge cases",
      "diff source documents against Markdown structure",
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
    rejectionReasons: [],
    ...overrides
  };
}

describe("AI idea benchmark", () => {
  it("compares raw clone-like AI output with guarded adjacent ideas", () => {
    const result = evaluateAiIdeaBenchmarkCase({
      id: "markitdown_guardrail",
      rawCandidates: [
        candidate({
          title: "Universal Markdown Converter Pro",
          problem:
            "Teams need another converter that replaces the source repository.",
          mvpScope: [
            "fork MarkItDown and add more file converters",
            "add web dashboard for conversion jobs",
            "add team edition for bulk uploads"
          ],
          differentiation: [
            "another converter with more formats",
            "team edition of the source conversion workflow"
          ],
          cloneRisk: "high",
          estimatedMvpWeeks: 7,
          scoreOutOf10: 8
        })
      ],
      guardedCandidates: [candidate({})]
    });

    expect(result.passed).toBe(true);
    expect(result.rawRejectCount).toBe(1);
    expect(result.guardedUsableCount).toBe(1);
    expect(result.averageGuardedScore).toBeGreaterThan(result.averageRawScore);
  });

  it("summarizes multi-case AI guardrail health", () => {
    const first = evaluateAiIdeaBenchmarkCase({
      id: "case_1",
      rawCandidates: [
        candidate({
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
          cloneRisk: "high",
          estimatedMvpWeeks: 8
        })
      ],
      guardedCandidates: [candidate({ title: "Self-Hosted AI Deployment Risk Auditor" })]
    });
    const summary = summarizeAiIdeaBenchmark([first]);

    expect(summary.passCount).toBe(1);
    expect(summary.cloneCandidateRejectedCount).toBe(1);
    expect(summary.guardedUsableCount).toBe(1);
  });
});
