import {
  AiIdeaCandidateSchema,
  scoreAiIdeaCandidateForQuality
} from "@/lib/project-ideas/aiIdeaPrompt";
import type { AiIdeaCandidate } from "@/lib/project-ideas/aiIdeaPrompt";

export type AiIdeaBenchmarkCase = {
  id: string;
  rawCandidates: AiIdeaCandidate[];
  guardedCandidates: AiIdeaCandidate[];
};

export type ScoredAiIdeaCandidate = {
  candidate: AiIdeaCandidate;
  score: ReturnType<typeof scoreAiIdeaCandidateForQuality>;
};

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function scoreSet(candidates: AiIdeaCandidate[]) {
  return candidates.map((candidate) => ({
    candidate: AiIdeaCandidateSchema.parse(candidate),
    score: scoreAiIdeaCandidateForQuality(candidate)
  }));
}

export function evaluateAiIdeaBenchmarkCase(testCase: AiIdeaBenchmarkCase) {
  const raw = scoreSet(testCase.rawCandidates);
  const guarded = scoreSet(testCase.guardedCandidates);
  const rawRejectCount = raw.filter((item) => item.score.verdict === "reject").length;
  const guardedUsableCount = guarded.filter(
    (item) => item.score.verdict === "usable" || item.score.verdict === "strong"
  ).length;
  const guardedStrongCount = guarded.filter(
    (item) => item.score.verdict === "strong"
  ).length;
  const cloneCandidateRejectedCount = [...raw, ...guarded].filter(
    (item) =>
      item.candidate.cloneRisk === "high" && item.score.verdict === "reject"
  ).length;
  const averageRawScore = Number(
    average(raw.map((item) => item.score.score)).toFixed(1)
  );
  const averageGuardedScore = Number(
    average(guarded.map((item) => item.score.score)).toFixed(1)
  );
  const passed =
    rawRejectCount >= 1 &&
    cloneCandidateRejectedCount >= 1 &&
    guarded.length > 0 &&
    guardedUsableCount === guarded.length &&
    averageGuardedScore > averageRawScore;

  return {
    id: testCase.id,
    raw,
    guarded,
    rawRejectCount,
    guardedUsableCount,
    guardedStrongCount,
    cloneCandidateRejectedCount,
    averageRawScore,
    averageGuardedScore,
    passed
  };
}

export function summarizeAiIdeaBenchmark(
  results: ReturnType<typeof evaluateAiIdeaBenchmarkCase>[]
) {
  const caseCount = results.length;
  const passCount = results.filter((result) => result.passed).length;
  const rawRejectCount = results.reduce(
    (sum, result) => sum + result.rawRejectCount,
    0
  );
  const guardedUsableCount = results.reduce(
    (sum, result) => sum + result.guardedUsableCount,
    0
  );
  const guardedStrongCount = results.reduce(
    (sum, result) => sum + result.guardedStrongCount,
    0
  );
  const cloneCandidateRejectedCount = results.reduce(
    (sum, result) => sum + result.cloneCandidateRejectedCount,
    0
  );
  const averageRawScore = Number(
    average(results.map((result) => result.averageRawScore)).toFixed(1)
  );
  const averageGuardedScore = Number(
    average(results.map((result) => result.averageGuardedScore)).toFixed(1)
  );

  return {
    caseCount,
    passCount,
    rawRejectCount,
    guardedUsableCount,
    guardedStrongCount,
    cloneCandidateRejectedCount,
    averageRawScore,
    averageGuardedScore,
    results
  };
}
