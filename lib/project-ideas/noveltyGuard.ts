import type { DiscoveredIdea, RepoInsight } from "@/lib/project-ideas/types";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function hasSameWorkflow(idea: DiscoveredIdea, insight: RepoInsight) {
  const workflow = normalize(insight.coreWorkflow);
  return idea.mvpScope.some((scope) => normalize(scope) === workflow);
}

function targetOverlap(idea: DiscoveredIdea, insight: RepoInsight) {
  const sourceUsers = new Set(insight.targetUsers.map(normalize));
  const overlapCount = idea.targetUsers.filter((user) =>
    sourceUsers.has(normalize(user))
  ).length;

  return overlapCount / Math.max(idea.targetUsers.length, 1);
}

export function evaluateNovelty(input: {
  idea: DiscoveredIdea;
  insight: RepoInsight;
}) {
  const reasons: string[] = [];
  let novelty = 1;
  let cloneRejected = false;

  if (input.idea.differentiation.length < 2) {
    novelty -= 0.35;
    reasons.push("Idea has fewer than two concrete differentiators.");
  }

  if (hasSameWorkflow(input.idea, input.insight)) {
    novelty -= 0.35;
    reasons.push("MVP repeats the source repo core workflow.");
  }

  if (
    targetOverlap(input.idea, input.insight) >= 0.8 &&
    input.idea.differentiation.length < 3
  ) {
    novelty -= 0.2;
    reasons.push("Target users are too close to the source repo.");
  }

  if (input.insight.cloneRisk === "high") {
    novelty -= 0.1;
    reasons.push("Source repo has high baseline clone risk.");
  }

  if (
    input.idea.title.toLowerCase().includes("chatbot") &&
    input.idea.mvpScope.length < 2
  ) {
    novelty -= 0.3;
    reasons.push("Generic chatbot idea without concrete workflow.");
  }

  novelty = Math.max(0, Number(novelty.toFixed(2)));
  cloneRejected = novelty < 0.55 || hasSameWorkflow(input.idea, input.insight);

  return {
    novelty,
    cloneRejected,
    reasons
  };
}
