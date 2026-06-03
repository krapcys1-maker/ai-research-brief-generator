import { buildProjectResearchPlan } from "@/lib/project-research/researchPlan";
import { ProjectResearchBriefSchema } from "@/lib/project-research/schemas";
import type {
  EvidenceCoverage,
  ProjectEvidenceStrength,
  ProjectIdeaInput,
  ProjectResearchBrief,
  ProjectResearchGap,
  ProjectResearchInsight,
  ProjectResearchRisk,
  RecommendedTechnicalDirection,
  ResearchPlan,
  ReviewedPaper
} from "@/lib/project-research/types";

type BuildProjectResearchBriefInput = {
  idea: ProjectIdeaInput;
  reviewedPapers: ReviewedPaper[];
  generatedAt?: string;
};

const strongEvidence: ProjectEvidenceStrength[] = [
  "full_text_strong",
  "full_text_partial",
  "abstract_supported"
];

function isParsed(paper: ReviewedPaper) {
  return paper.fullTextStatus === "parsed";
}

function isUsefulEvidence(paper: ReviewedPaper) {
  return paper.usefulForProject && strongEvidence.includes(paper.evidenceStrength);
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function firstUsefulPapers(reviewedPapers: ReviewedPaper[], limit = 4) {
  return reviewedPapers.filter(isUsefulEvidence).slice(0, limit);
}

function createEvidenceCoverage(
  researchPlan: ResearchPlan,
  reviewedPapers: ReviewedPaper[]
): EvidenceCoverage {
  const buckets = researchPlan.evidenceBuckets.map((bucket) => {
    const bucketPapers = reviewedPapers.filter((paper) =>
      paper.bucketIds.includes(bucket.id)
    );
    const usefulBucketPapers = bucketPapers.filter(isUsefulEvidence);
    const parsedUsefulBucketPapers = usefulBucketPapers.filter(isParsed);
    const usefulReviewedCount = usefulBucketPapers.length;
    const parsedCount = parsedUsefulBucketPapers.length;
    const hasMinimumEvidence =
      parsedCount >= bucket.minParsedPapers ||
      usefulReviewedCount >= bucket.minParsedPapers;
    const status =
      hasMinimumEvidence && bucket.required
        ? "covered"
        : usefulReviewedCount > 0
          ? "partial"
          : "missing";

    return {
      bucketId: bucket.id,
      status,
      selectedCount: bucketPapers.length,
      parsedCount,
      reviewedCount: bucketPapers.length,
      usefulReviewedCount,
      paperIds: bucketPapers.map((paper) => paper.paperId)
    };
  });

  const requiredBuckets = researchPlan.evidenceBuckets.filter(
    (bucket) => bucket.required
  );
  const requiredCoveredCount = buckets.filter((coverageBucket) => {
    const planBucket = requiredBuckets.find(
      (bucket) => bucket.id === coverageBucket.bucketId
    );
    return planBucket && coverageBucket.status === "covered";
  }).length;
  const missingRequiredBuckets = buckets
    .filter((coverageBucket) => {
      const planBucket = requiredBuckets.find(
        (bucket) => bucket.id === coverageBucket.bucketId
      );
      return planBucket && coverageBucket.status !== "covered";
    })
    .map((bucket) => bucket.bucketId);

  return {
    requiredCoveredCount,
    requiredBucketCount: requiredBuckets.length,
    canSynthesizeProject:
      requiredBuckets.length > 0 &&
      requiredCoveredCount === requiredBuckets.length,
    missingRequiredBuckets,
    buckets
  };
}

function createResearchSummary(
  ideaTitle: string,
  coverage: EvidenceCoverage,
  reviewedPapers: ReviewedPaper[]
) {
  const usefulCount = reviewedPapers.filter(isUsefulEvidence).length;
  if (coverage.canSynthesizeProject) {
    return `${ideaTitle}: research ma pelne pokrycie wymaganych bucketow (${coverage.requiredCoveredCount}/${coverage.requiredBucketCount}) i ${usefulCount} uzytecznych prac do decyzji PRD oraz architektury.`;
  }

  return `${ideaTitle}: research nie jest jeszcze gotowy do PRD ani architektury; pokryto ${coverage.requiredCoveredCount}/${coverage.requiredBucketCount} wymaganych bucketow, a brakujace obszary to ${coverage.missingRequiredBuckets.join(", ") || "unknown"}.`;
}

function createProjectInsights(
  reviewedPapers: ReviewedPaper[],
  coverage: EvidenceCoverage
): ProjectResearchInsight[] {
  const useful = firstUsefulPapers(reviewedPapers, 3);

  if (useful.length === 0) {
    return [
      {
        id: "insight_insufficient_evidence",
        claim: "Na razie nie ma wystarczajacego evidence do decyzji architektonicznej.",
        explanation:
          "Brakuje uzytecznych przeanalizowanych publikacji w wymaganych bucketach.",
        insightType: "gap",
        confidence: "low",
        evidenceStrength: "weak_ai_hypothesis",
        sourcePaperIds: [],
        evidence: [],
        usableForPrd: false,
        usableForArchitecture: false
      }
    ];
  }

  return useful.map((paper, index) => ({
    id: `insight_${index + 1}_${paper.paperId}`,
    claim:
      paper.implementationImplications[0] ??
      `Publikacja ${paper.paperId} wnosi evidence dla bucketow: ${paper.bucketIds.join(", ")}.`,
    explanation:
      paper.keyMethods.length > 0
        ? `Kluczowe metody: ${paper.keyMethods.join(", ")}.`
        : `Praca zostala oznaczona jako uzyteczna dla projektu w bucketach ${paper.bucketIds.join(", ")}.`,
    insightType: index === 0 ? "architecture" : "implementation",
    confidence:
      paper.evidenceStrength === "full_text_strong" ? "high" : "medium",
    evidenceStrength: paper.evidenceStrength,
    sourcePaperIds: [paper.paperId],
    evidence: [
      {
        paperId: paper.paperId,
        bucketId: paper.bucketIds[0],
        chunkIds: [],
        claim:
          paper.implementationImplications[0] ??
          paper.keyMethods[0] ??
          "Paper marked useful for project synthesis.",
        supportLevel: "direct",
        evidenceStrength: paper.evidenceStrength
      }
    ],
    usableForPrd: coverage.canSynthesizeProject,
    usableForArchitecture: coverage.canSynthesizeProject
  }));
}

function createRecommendedDirection(
  coverage: EvidenceCoverage,
  reviewedPapers: ReviewedPaper[]
): RecommendedTechnicalDirection {
  const useful = firstUsefulPapers(reviewedPapers, 4);
  const sourcePaperIds = useful.map((paper) => paper.paperId);

  if (!coverage.canSynthesizeProject || useful.length === 0) {
    return {
      summary: "Nie wybierac jeszcze finalnej architektury.",
      why:
        "Wymagane buckety nie sa pokryte, wiec decyzja bylaby oparta na lukach zamiast evidence.",
      approach: [
        "uzupelnic brakujace buckety",
        "przeanalizowac pelne teksty lub mocne abstrakty",
        "ponownie przeliczyc readiness"
      ],
      avoid: ["generowanie docelowej architektury przed coverage gate"],
      sourcePaperIds,
      evidenceStrength:
        sourcePaperIds.length > 0 ? useful[0].evidenceStrength : "weak_ai_hypothesis"
    };
  }

  return {
    summary: "Budowac PRD i architekture dopiero z jawnie pokrytych bucketow evidence.",
    why:
      "Wszystkie wymagane obszary researchu maja uzyteczne publikacje, wiec decyzje mozna powiazac ze zrodlami.",
    approach: unique(
      useful.flatMap((paper) => paper.implementationImplications).slice(0, 6)
    ),
    avoid: unique(
      useful.flatMap((paper) => paper.limitations).slice(0, 6)
    ),
    sourcePaperIds,
    evidenceStrength: useful[0].evidenceStrength
  };
}

function createRisks(reviewedPapers: ReviewedPaper[]): ProjectResearchRisk[] {
  return firstUsefulPapers(reviewedPapers, 4).flatMap((paper, paperIndex) =>
    paper.riskImplications.slice(0, 2).map((risk, riskIndex) => ({
      id: `risk_${paperIndex + 1}_${riskIndex + 1}_${paper.paperId}`,
      risk,
      severity: riskIndex === 0 ? "high" : "medium",
      mitigation:
        paper.limitations[0] ??
        "Zamienic ryzyko na jawna bramke walidacji w PRD i architekturze.",
      sourcePaperIds: [paper.paperId],
      evidenceStrength: paper.evidenceStrength
    }))
  );
}

function createGaps(
  coverage: EvidenceCoverage,
  reviewedPapers: ReviewedPaper[]
): ProjectResearchGap[] {
  const missingGaps = coverage.missingRequiredBuckets.map((bucketId) => ({
    id: `gap_missing_${bucketId}`,
    gap: `Brak pelnego coverage dla bucketu ${bucketId}.`,
    whyItMatters:
      "Bez tego system nie powinien tworzyc finalnego PRD ani architektury.",
    suggestedNextResearch: [`uzupelnic publikacje dla bucketu ${bucketId}`],
    sourcePaperIds: [],
    evidenceStrength: "weak_ai_hypothesis" as const
  }));

  const limitationGaps = firstUsefulPapers(reviewedPapers, 3).flatMap((paper) =>
    paper.limitations.slice(0, 1).map((limitation) => ({
      id: `gap_limitation_${paper.paperId}`,
      gap: limitation,
      whyItMatters:
        "Ograniczenie z publikacji powinno zostac przepisane na test lub ryzyko projektowe.",
      suggestedNextResearch: paper.bucketIds.map(
        (bucketId) => `sprawdzic dodatkowe prace dla bucketu ${bucketId}`
      ),
      sourcePaperIds: [paper.paperId],
      evidenceStrength: paper.evidenceStrength
    }))
  );

  return [...missingGaps, ...limitationGaps];
}

function createAudit(
  coverage: EvidenceCoverage,
  reviewedPapers: ReviewedPaper[]
) {
  const coverageRatio =
    coverage.requiredBucketCount === 0
      ? 0
      : coverage.requiredCoveredCount / coverage.requiredBucketCount;
  const usefulCount = reviewedPapers.filter(isUsefulEvidence).length;
  const score = Math.min(100, Math.round(35 + coverageRatio * 50 + usefulCount * 2));

  return {
    score,
    strengths: coverage.canSynthesizeProject
      ? [
          "wszystkie wymagane buckety maja coverage",
          "brief ma cytowalne reviewedPapers dla decyzji projektowych"
        ]
      : ["system jawnie blokuje synteze przy brakach evidence"],
    weaknesses: coverage.canSynthesizeProject
      ? ["benchmark nie zastepuje jeszcze realnego full-text retrieval"]
      : [`brakujace buckety: ${coverage.missingRequiredBuckets.join(", ")}`],
    mustFixBeforePrd: coverage.canSynthesizeProject
      ? []
      : ["uzupelnic missingRequiredBuckets"],
    mustFixBeforeArchitecture: coverage.canSynthesizeProject
      ? []
      : ["nie generowac architektury do czasu pelnego coverage"],
    verdict: coverage.canSynthesizeProject
      ? "Nadaje sie jako input do PRD i architektury, z jawnymi ryzykami."
      : "Nie nadaje sie jeszcze do PRD ani architektury; wymagane jest dalsze zbieranie evidence."
  };
}

export function buildProjectResearchBrief(
  input: BuildProjectResearchBriefInput
): ProjectResearchBrief {
  const { normalizedIdea, researchPlan } = buildProjectResearchPlan(input.idea);
  const evidenceCoverage = createEvidenceCoverage(
    researchPlan,
    input.reviewedPapers
  );
  const risks = createRisks(input.reviewedPapers);
  const gaps = createGaps(evidenceCoverage, input.reviewedPapers);
  const ready = evidenceCoverage.canSynthesizeProject;

  const brief: ProjectResearchBrief = {
    id: `project_research_${normalizedIdea.ideaId.replace(/^idea_/, "")}`,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    outputLanguage: input.idea.outputLanguage,
    idea: input.idea,
    normalizedIdea,
    researchPlan,
    evidenceCoverage,
    researchSummary: createResearchSummary(
      normalizedIdea.title,
      evidenceCoverage,
      input.reviewedPapers
    ),
    reviewedPapers: input.reviewedPapers,
    projectInsights: createProjectInsights(
      input.reviewedPapers,
      evidenceCoverage
    ),
    recommendedTechnicalDirection: createRecommendedDirection(
      evidenceCoverage,
      input.reviewedPapers
    ),
    risks,
    gaps,
    readyForPrd: ready,
    readyForArchitecture: ready,
    readiness: {
      prd: ready ? "ready" : "needs_more_research",
      architecture: ready ? "ready" : "needs_more_research",
      reason: ready
        ? "Wszystkie wymagane buckety sa pokryte uzytecznymi publikacjami."
        : `Brakuje coverage dla bucketow: ${evidenceCoverage.missingRequiredBuckets.join(", ")}.`
    },
    audit: createAudit(evidenceCoverage, input.reviewedPapers)
  };

  return ProjectResearchBriefSchema.parse(brief);
}
