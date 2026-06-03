import { describe, expect, it } from "vitest";
import {
  buildProjectResearchPlan,
  createResearchPlanForIdea,
  normalizeProjectIdea
} from "@/lib/project-research";
import { ResearchPlanSchema } from "@/lib/project-research/schemas";

function bucketIds(plan: ReturnType<typeof buildProjectResearchPlan>["researchPlan"]) {
  return plan.evidenceBuckets.map((bucket) => bucket.id);
}

function expectPlanIsNotSingleGenericQuery(
  plan: ReturnType<typeof buildProjectResearchPlan>["researchPlan"]
) {
  expect(plan.evidenceBuckets.length).toBeGreaterThanOrEqual(4);
  expect(plan.queryVariants.length).toBeGreaterThan(plan.evidenceBuckets.length);
  expect(new Set(plan.queryVariants).size).toBe(plan.queryVariants.length);
  expect(plan.evidenceBuckets.every((bucket) => bucket.required)).toBe(true);
}

describe("normalizeProjectIdea", () => {
  it("creates stable idea IDs and domain context from raw project ideas", () => {
    const normalized = normalizeProjectIdea({
      title: "AI Trading Bot",
      description:
        "Bot tradingowy na gieldzie uzywajacy AI do decyzji i kontroli ryzyka.",
      constraints: ["bez live tradingu w MVP"],
      preferredDomains: [],
      outputLanguage: "pl"
    });

    expect(normalized.ideaId).toBe("idea_ai_trading_bot");
    expect(normalized.domains).toContain("algorithmic trading");
    expect(normalized.targetUsers).toContain("quant researcher");
    expect(normalized.assumptions.join(" ")).toContain("bez live tradingu w MVP");
    expect(normalized.nonGoals.join(" ")).toContain("live trading");
  });
});

describe("buildProjectResearchPlan", () => {
  it("builds required bucketed research for an AI trading bot", () => {
    const { researchPlan } = buildProjectResearchPlan({
      title: "AI Trading Bot",
      description:
        "Bot tradingowy na gieldzie uzywajacy AI, backtestow i kontroli ryzyka.",
      constraints: ["najpierw paper trading"],
      preferredDomains: ["algorithmic trading"],
      outputLanguage: "pl"
    });

    expect(ResearchPlanSchema.parse(researchPlan)).toEqual(researchPlan);
    expect(bucketIds(researchPlan)).toEqual(
      expect.arrayContaining([
        "model_experiments",
        "backtest_validation",
        "data_correctness",
        "execution_market_impact",
        "risk_governance"
      ])
    );
    expectPlanIsNotSingleGenericQuery(researchPlan);
  });

  it("builds required bucketed research for repo optimizer/code review", () => {
    const { researchPlan } = buildProjectResearchPlan({
      title: "Repo Optimizer AI",
      description:
        "Aplikacja skanujaca repozytoria, robiaca code review, wykrywajaca bugi i priorytetyzujaca refactor.",
      constraints: ["MVP tylko rekomenduje zmiany"],
      preferredDomains: ["software engineering", "LLM code review"],
      outputLanguage: "pl"
    });

    expect(bucketIds(researchPlan)).toEqual(
      expect.arrayContaining([
        "static_analysis",
        "llm_code_review",
        "program_repair",
        "repository_mining",
        "developer_workflow"
      ])
    );
    expectPlanIsNotSingleGenericQuery(researchPlan);
  });

  it("builds required bucketed research for medical AI decision support", () => {
    const { researchPlan } = buildProjectResearchPlan({
      title: "Medical RAG Assistant",
      description:
        "Healthcare AI assistant that retrieves clinical documents and supports diagnostic review.",
      constraints: ["nie stawia samodzielnej diagnozy"],
      preferredDomains: [],
      outputLanguage: "pl"
    });

    expect(bucketIds(researchPlan)).toEqual(
      expect.arrayContaining([
        "clinical_evidence",
        "safety_validation",
        "privacy_compliance",
        "workflow_integration"
      ])
    );
    expectPlanIsNotSingleGenericQuery(researchPlan);
  });

  it("builds a fallback plan for generic ideas instead of one generic query", () => {
    const { normalizedIdea, researchPlan } = buildProjectResearchPlan({
      title: "Smart Team Planner",
      description:
        "Narzędzie pomagajace malemu zespolowi planowac prace i ryzyka projektu.",
      constraints: [],
      preferredDomains: [],
      outputLanguage: "pl"
    });

    expect(normalizedIdea.domains).toContain("evidence planning");
    expect(bucketIds(researchPlan)).toEqual(
      expect.arrayContaining([
        "domain_methods",
        "data_requirements",
        "evaluation_validation",
        "risk_safety",
        "implementation_operations"
      ])
    );
    expectPlanIsNotSingleGenericQuery(researchPlan);
  });

  it("creates a plan from an already normalized idea", () => {
    const normalizedIdea = normalizeProjectIdea({
      title: "Contract Compliance Reviewer",
      description:
        "Legal AI system for contract analysis, compliance review and grounded citations.",
      constraints: ["czlowiek zatwierdza decyzje"],
      preferredDomains: [],
      outputLanguage: "pl"
    });

    const researchPlan = createResearchPlanForIdea(normalizedIdea);

    expect(bucketIds(researchPlan)).toEqual(
      expect.arrayContaining([
        "legal_retrieval",
        "contract_analysis",
        "compliance_risk",
        "human_review"
      ])
    );
    expectPlanIsNotSingleGenericQuery(researchPlan);
  });
});
