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

  it.each([
    {
      title: "Document Conversion QA Harness",
      description:
        "QA harness for Markdown, PDF and Office document conversion before RAG ingestion.",
      domains: ["document AI", "RAG ingestion", "conversion quality"],
      expectedBuckets: [
        "document_structure_preservation",
        "rag_ingestion_quality",
        "conversion_regression_fixtures",
        "unsafe_document_inputs"
      ]
    },
    {
      title: "LLM Context Budget QA Monitor",
      description:
        "Monitor context compression, token budget tradeoffs and fact retention for RAG chunks.",
      domains: ["LLM context engineering", "RAG evaluation", "agent reliability"],
      expectedBuckets: [
        "context_compression_fidelity",
        "token_budget_tradeoffs",
        "agent_task_success",
        "rag_evidence_loss"
      ]
    },
    {
      title: "AI CLI Provider Compatibility Monitor",
      description:
        "Diagnose provider routing, auth, proxy and model routing failures for AI coding CLIs.",
      domains: ["AI developer tools", "provider routing", "CLI reliability"],
      expectedBuckets: [
        "provider_capability_modeling",
        "auth_proxy_failure_modes",
        "cli_observability",
        "fallback_routing_governance"
      ],
      unexpectedBuckets: ["clinical_evidence", "safety_validation"]
    },
    {
      title: "Agent Session Reliability Monitor",
      description:
        "Detect broken desktop sessions, parent_session links and conversation continuity failures.",
      domains: ["AI agent UX", "session reliability", "desktop AI apps"],
      expectedBuckets: [
        "session_state_consistency",
        "agent_ux_recovery",
        "cross_platform_sync",
        "session_qa_repro_cases"
      ]
    },
    {
      title: "Self-Hosted AI Workspace Policy Auditor",
      description:
        "Audit self-hosted AI workspace policy, secrets, local-first privacy and deployment readiness.",
      domains: ["self-hosted AI", "AI security", "workspace governance"],
      expectedBuckets: [
        "self_hosted_security_controls",
        "ai_workspace_governance",
        "local_first_privacy",
        "deployment_readiness_audit"
      ]
    }
  ])("builds dedicated research buckets for $title", ({ title, description, domains, expectedBuckets, unexpectedBuckets = [] }) => {
    const { researchPlan } = buildProjectResearchPlan({
      title,
      description,
      constraints: ["MVP must be evidence-backed"],
      preferredDomains: domains,
      outputLanguage: "pl"
    });

    expect(bucketIds(researchPlan)).toEqual(expect.arrayContaining(expectedBuckets));
    if (unexpectedBuckets.length > 0) {
      expect(bucketIds(researchPlan)).not.toEqual(
        expect.arrayContaining(unexpectedBuckets)
      );
    }
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
