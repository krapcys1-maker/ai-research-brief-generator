import { describe, expect, it } from "vitest";
import {
  ProjectResearchBriefSchema,
  validateProjectResearchBrief
} from "@/lib/project-research/schemas";
import { projectResearchBriefToMarkdown } from "@/lib/project-research/markdown";
import type { ProjectResearchBrief } from "@/lib/project-research/types";

function validBrief(
  overrides: Partial<ProjectResearchBrief> = {}
): ProjectResearchBrief {
  const brief: ProjectResearchBrief = {
    id: "project_research_repo_optimizer",
    generatedAt: "2026-06-03T10:00:00.000Z",
    outputLanguage: "pl",
    idea: {
      title: "Repo Optimizer AI",
      description:
        "Aplikacja skanujaca repozytoria i wykrywajaca bledy, optymalizacje oraz ulepszenia.",
      constraints: ["MVP generuje rekomendacje, nie zmienia kodu"],
      preferredDomains: ["software engineering", "LLM code review"],
      outputLanguage: "pl"
    },
    normalizedIdea: {
      ideaId: "idea_repo_optimizer_ai",
      title: "Repo Optimizer AI",
      oneSentence:
        "System analizujacy repozytoria i generujacy priorytetyzowane rekomendacje techniczne.",
      problem:
        "Male zespoly traca czas na reczne wykrywanie najwazniejszych problemow w repozytorium.",
      targetUsers: ["solo developer", "small engineering team"],
      domains: ["software engineering", "static analysis", "LLM code review"],
      assumptions: ["uzytkownik daje dostep do repozytorium"],
      nonGoals: ["autonomiczne modyfikowanie kodu w MVP"]
    },
    researchPlan: {
      ideaId: "idea_repo_optimizer_ai",
      researchGoals: [
        "sprawdzic metody static analysis",
        "sprawdzic uzycie LLM w code review"
      ],
      evidenceBuckets: [
        {
          id: "static_analysis",
          label: "Static analysis and bug detection",
          query: "static analysis bug detection false positives software engineering",
          keywords: ["static analysis", "bug detection", "false positives"],
          required: true,
          minParsedPapers: 1,
          targetQuestions: ["Jak ograniczyc false positives?"]
        },
        {
          id: "llm_code_review",
          label: "LLM code review",
          query: "large language models code review software engineering",
          keywords: ["large language model", "code review"],
          required: true,
          minParsedPapers: 1,
          targetQuestions: ["Do czego LLM jest uzyteczny w review?"]
        }
      ],
      queryVariants: [
        "static analysis bug detection false positives",
        "large language models code review software engineering"
      ],
      sources: ["arxiv", "semantic_scholar", "openalex"]
    },
    evidenceCoverage: {
      requiredCoveredCount: 2,
      requiredBucketCount: 2,
      canSynthesizeProject: true,
      missingRequiredBuckets: [],
      buckets: [
        {
          bucketId: "static_analysis",
          status: "covered",
          selectedCount: 8,
          parsedCount: 2,
          reviewedCount: 2,
          usefulReviewedCount: 1,
          paperIds: ["paper_static"]
        },
        {
          bucketId: "llm_code_review",
          status: "covered",
          selectedCount: 9,
          parsedCount: 2,
          reviewedCount: 2,
          usefulReviewedCount: 1,
          paperIds: ["paper_llm"]
        }
      ]
    },
    researchSummary:
      "Research wskazuje, ze najlepszy kierunek to hybryda klasycznej analizy statycznej i LLM do interpretacji wynikow.",
    reviewedPapers: [
      {
        paperId: "paper_static",
        title: "Static Analysis for Bug Detection",
        year: 2024,
        url: "https://example.com/static",
        doi: "10.1000/static",
        bucketIds: ["static_analysis"],
        fullTextStatus: "parsed",
        usefulForProject: true,
        evidenceStrength: "full_text_partial",
        keyMethods: ["static analysis", "false positive filtering"],
        limitations: ["testowane na ograniczonym zbiorze projektow"],
        implementationImplications: [
          "uzyc analizatora statycznego jako pierwszej warstwy sygnalow"
        ],
        riskImplications: ["mozliwe false positives"]
      },
      {
        paperId: "paper_llm",
        title: "Large Language Models for Code Review",
        year: 2025,
        url: "https://example.com/llm",
        doi: null,
        bucketIds: ["llm_code_review"],
        fullTextStatus: "parsed",
        usefulForProject: true,
        evidenceStrength: "full_text_partial",
        keyMethods: ["LLM explanation", "review prioritization"],
        limitations: ["halucynacje i niestabilnosc rekomendacji"],
        implementationImplications: [
          "LLM powinien wyjasniac i priorytetyzowac wyniki, nie byc jedynym detektorem"
        ],
        riskImplications: ["ryzyko halucynacji"]
      }
    ],
    projectInsights: [
      {
        id: "insight_hybrid",
        claim:
          "Najbezpieczniejszy MVP laczy statyczna analize z LLM do interpretacji.",
        explanation:
          "Klasyczny analizator daje stabilne sygnaly, a LLM pomaga je wyjasniac i priorytetyzowac.",
        insightType: "architecture",
        confidence: "medium",
        evidenceStrength: "full_text_partial",
        sourcePaperIds: ["paper_static", "paper_llm"],
        evidence: [
          {
            paperId: "paper_static",
            bucketId: "static_analysis",
            chunkIds: ["chunk_static_1"],
            claim: "Static analysis is useful but can produce false positives.",
            supportLevel: "direct",
            evidenceStrength: "full_text_partial"
          }
        ],
        usableForPrd: true,
        usableForArchitecture: true
      },
      {
        id: "insight_repo_mvp",
        claim: "MVP powinien tylko rekomendowac zmiany, a nie modyfikowac kod.",
        explanation:
          "To zalozenie produktowe ogranicza blast radius, ale wymaga dalszego researchu.",
        insightType: "product",
        confidence: "low",
        evidenceStrength: "weak_ai_hypothesis",
        sourcePaperIds: [],
        evidence: [],
        usableForPrd: true,
        usableForArchitecture: true
      }
    ],
    recommendedTechnicalDirection: {
      summary:
        "Zaczac od pipeline static analysis plus LLM explanation/prioritization.",
      why:
        "Zmniejsza to ryzyko halucynacji i daje stabilniejsza pierwsza warstwe wykrywania problemow.",
      approach: [
        "uruchomic static analyzers",
        "zgrupowac wyniki",
        "uzyc LLM do wyjasnienia i priorytetyzacji"
      ],
      avoid: ["LLM jako jedyne zrodlo prawdy"],
      sourcePaperIds: ["paper_static", "paper_llm"],
      evidenceStrength: "full_text_partial"
    },
    risks: [
      {
        id: "risk_false_positives",
        risk: "Za duzo false positives obnizy zaufanie uzytkownika.",
        severity: "high",
        mitigation: "Priorytetyzacja i grupowanie wynikow przed pokazaniem uzytkownikowi.",
        sourcePaperIds: ["paper_static"],
        evidenceStrength: "full_text_partial"
      }
    ],
    gaps: [
      {
        id: "gap_repo_scale",
        gap: "Brak evidence na skale bardzo duzych monorepo.",
        whyItMatters:
          "Bez tego nie wiadomo, czy MVP bedzie szybki na repozytoriach produkcyjnych.",
        suggestedNextResearch: ["poszukac prac o repository mining at scale"],
        sourcePaperIds: [],
        evidenceStrength: "weak_ai_hypothesis"
      }
    ],
    readyForPrd: true,
    readyForArchitecture: true,
    readiness: {
      prd: "ready",
      architecture: "ready",
      reason:
        "Coverage jest wystarczajace do pierwszego PRD i architektury MVP, z jawnymi lukami."
    },
    audit: {
      score: 78,
      strengths: ["evidence-backed hybrid direction"],
      weaknesses: ["brak researchu GitHub/konkurencji"],
      mustFixBeforePrd: [],
      mustFixBeforeArchitecture: ["doprecyzowac kontrakty danych"],
      verdict: "Nadaje sie jako input dla PRD i architektury MVP."
    }
  };

  return {
    ...brief,
    ...overrides
  };
}

describe("ProjectResearchBrief schema", () => {
  it("validates a project research brief ready for PRD and architecture", () => {
    const parsed = validateProjectResearchBrief(validBrief());

    expect(parsed.readyForPrd).toBe(true);
    expect(parsed.readyForArchitecture).toBe(true);
    expect(parsed.projectInsights[0]?.sourcePaperIds).toContain("paper_static");
  });

  it("rejects evidence-backed insights without source papers", () => {
    const brief = validBrief({
      projectInsights: [
        {
          ...validBrief().projectInsights[0],
          sourcePaperIds: []
        }
      ]
    });

    expect(() => ProjectResearchBriefSchema.parse(brief)).toThrow(
      /Evidence-backed insights must include sourcePaperIds/
    );
  });

  it("allows explicitly weak AI hypotheses without source papers", () => {
    const brief = validBrief({
      projectInsights: [
        {
          ...validBrief().projectInsights[1],
          sourcePaperIds: [],
          evidenceStrength: "weak_ai_hypothesis"
        }
      ]
    });

    expect(ProjectResearchBriefSchema.parse(brief).projectInsights[0]?.sourcePaperIds).toEqual(
      []
    );
  });

  it("rejects unknown cited paper IDs", () => {
    const brief = validBrief({
      recommendedTechnicalDirection: {
        ...validBrief().recommendedTechnicalDirection,
        sourcePaperIds: ["paper_missing"]
      }
    });

    expect(() => ProjectResearchBriefSchema.parse(brief)).toThrow(
      /recommendedTechnicalDirection cites unknown paperId: paper_missing/
    );
  });

  it("rejects reviewed papers that reference unknown evidence buckets", () => {
    const brief = validBrief({
      reviewedPapers: [
        {
          ...validBrief().reviewedPapers[0],
          bucketIds: ["missing_bucket"]
        }
      ]
    });

    expect(() => ProjectResearchBriefSchema.parse(brief)).toThrow(
      /reviewedPaper references unknown bucketId: missing_bucket/
    );
  });

  it("requires readiness flags to match readiness statuses", () => {
    const brief = validBrief({
      readyForArchitecture: true,
      readiness: {
        ...validBrief().readiness,
        architecture: "needs_more_research"
      }
    });

    expect(() => ProjectResearchBriefSchema.parse(brief)).toThrow(
      /readyForArchitecture=true requires readiness.architecture=ready/
    );
  });
});

describe("projectResearchBriefToMarkdown", () => {
  it("exports evidence, risks, gaps, audit, and readiness without dropping key project context", () => {
    const markdown = projectResearchBriefToMarkdown(validBrief());

    expect(markdown).toContain("# Repo Optimizer AI");
    expect(markdown).toContain("## Evidence Coverage");
    expect(markdown).toContain("static_analysis: covered");
    expect(markdown).toContain("## Reviewed Papers");
    expect(markdown).toContain("[paper_static] Static Analysis for Bug Detection");
    expect(markdown).toContain("## Project Insights");
    expect(markdown).toContain(
      "Najbezpieczniejszy MVP laczy statyczna analize z LLM"
    );
    expect(markdown).toContain("[paper_static]");
    expect(markdown).toContain("## Recommended Technical Direction");
    expect(markdown).toContain("LLM jako jedyne zrodlo prawdy");
    expect(markdown).toContain("## Risks");
    expect(markdown).toContain("Za duzo false positives");
    expect(markdown).toContain("## Gaps");
    expect(markdown).toContain("Brak evidence na skale bardzo duzych monorepo");
    expect(markdown).toContain("## Audit");
    expect(markdown).toContain("Score: 78/100");
  });
});
