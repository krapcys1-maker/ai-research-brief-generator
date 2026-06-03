import { ProjectIdeaInputSchema } from "@/lib/project-research/schemas";
import { ProjectIdeaHandoffQualitySchema } from "@/lib/project-ideas/schemas";
import type {
  DiscoveredIdea,
  ProjectIdeaHandoffQuality
} from "@/lib/project-ideas/types";
import type { ProjectIdeaInput } from "@/lib/project-research";

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function rounded(value: number, decimals = 3) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function constraintQuality(constraints: string[]) {
  const text = constraints.join(" ").toLowerCase();
  const hasMvpScope = constraints.some((constraint) =>
    constraint.toLowerCase().startsWith("mvp:")
  );
  const hasEnoughConstraints = constraints.length >= 3;
  const hasSafetyBoundary = includesAny(text, [
    "do not",
    "avoid",
    "no ",
    "human",
    "paper",
    "review",
    "irreversible"
  ]);

  return clamp01(
    (hasMvpScope ? 0.45 : 0) +
      (hasEnoughConstraints ? 0.3 : constraints.length * 0.1) +
      (hasSafetyBoundary ? 0.25 : 0)
  );
}

function domainSpecificity(domains: string[]) {
  const uniqueDomains = unique(domains);
  const genericDomains = new Set([
    "ai",
    "software",
    "product",
    "automation",
    "developer tools"
  ]);
  const specificCount = uniqueDomains.filter(
    (domain) => !genericDomains.has(domain.toLowerCase())
  ).length;

  return clamp01(Math.min(uniqueDomains.length, 3) / 3 * 0.45 + Math.min(specificCount, 2) / 2 * 0.55);
}

function researchQuestionCoverage(idea: DiscoveredIdea) {
  const questions = idea.researchQuestions.filter((question) => {
    const normalized = question.toLowerCase();
    return (
      normalized.length >= 35 &&
      includesAny(normalized, [
        "which",
        "how",
        "what",
        "jak",
        "które",
        "reduce",
        "score",
        "evaluate"
      ])
    );
  });

  return clamp01(questions.length / 2);
}

function nonGoalClarity(constraints: string[]) {
  const nonGoalCount = constraints.filter((constraint) => {
    const normalized = constraint.toLowerCase();
    return includesAny(normalized, [
      "do not",
      "avoid",
      "no ",
      "not ",
      "human review",
      "paper trading"
    ]);
  }).length;

  return clamp01(nonGoalCount / 2);
}

function descriptionSpecificity(input: ProjectIdeaInput) {
  const text = `${input.title} ${input.description}`.toLowerCase();
  const genericOnly = includesAny(text, [
    "build an ai app",
    "use ai to help users",
    "ai platform for everyone",
    "generic assistant"
  ]);
  const hasProblem = text.includes("problem:");
  const hasSpecificJob = includesAny(text, [
    "qa",
    "audit",
    "auditor",
    "monitor",
    "risk",
    "reliability",
    "compatibility",
    "readiness",
    "quality",
    "policy",
    "investigation",
    "evidence",
    "sprint",
    "refactor",
    "technical debt",
    "misconception",
    "lesson"
  ]);
  const hasTargetedNoun = input.title.split(/\s+/).length >= 4;

  return clamp01(
    (hasProblem ? 0.35 : 0) +
      (hasSpecificJob ? 0.45 : 0) +
      (hasTargetedNoun ? 0.2 : 0) -
      (genericOnly ? 0.5 : 0)
  );
}

export function scoreProjectIdeaHandoff(input: {
  idea: DiscoveredIdea;
  projectIdeaInput: ProjectIdeaInput;
}): ProjectIdeaHandoffQuality {
  const parsedInput = ProjectIdeaInputSchema.safeParse(input.projectIdeaInput);
  const constraintsScore = constraintQuality(input.projectIdeaInput.constraints);
  const domainScore = domainSpecificity(input.projectIdeaInput.preferredDomains);
  const researchScore = researchQuestionCoverage(input.idea);
  const nonGoalScore = nonGoalClarity(input.projectIdeaInput.constraints);
  const descriptionScore = descriptionSpecificity(input.projectIdeaInput);
  const score = Math.round(
    constraintsScore * 24 +
      domainScore * 18 +
      researchScore * 24 +
      nonGoalScore * 16 +
      descriptionScore * 18
  );
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const requiredFixes: string[] = [];

  if (parsedInput.success) {
    strengths.push("ProjectIdeaInput schema is valid.");
  } else {
    requiredFixes.push("Fix ProjectIdeaInput schema errors before research.");
  }

  if (constraintsScore >= 0.75) {
    strengths.push("Constraints include MVP scope and safety boundaries.");
  } else {
    weaknesses.push("Constraints are too weak for research handoff.");
    if (constraintsScore < 0.5) {
      requiredFixes.push("Add concrete MVP constraints and explicit non-goals.");
    }
  }

  if (domainScore >= 0.7) {
    strengths.push("Preferred domains are specific enough for source search.");
  } else {
    weaknesses.push("Preferred domains are too generic.");
    if (domainScore < 0.5) {
      requiredFixes.push("Add at least two specific technical/product domains.");
    }
  }

  if (researchScore >= 1) {
    strengths.push("Idea carries at least two usable research questions.");
  } else {
    weaknesses.push("Research question coverage is incomplete.");
    if (researchScore < 0.5) {
      requiredFixes.push("Add two specific research questions before running research.");
    }
  }

  if (nonGoalScore >= 0.5) {
    strengths.push("Non-goals make clone and unsafe-action boundaries visible.");
  } else {
    weaknesses.push("Non-goals are not clear enough.");
    requiredFixes.push("State what the MVP must not do.");
  }

  if (descriptionScore >= 0.7) {
    strengths.push("Description names a concrete job-to-be-done and problem.");
  } else {
    weaknesses.push("Description is too generic for downstream PRD and architecture.");
    if (descriptionScore < 0.5) {
      requiredFixes.push("Rewrite description around a concrete user pain and workflow.");
    }
  }

  const uniqueRequiredFixes = unique(requiredFixes);
  const readiness =
    uniqueRequiredFixes.length > 0 || score < 65
      ? "blocked"
      : score >= 82
        ? "ready"
        : "needs_review";

  return ProjectIdeaHandoffQualitySchema.parse({
    ideaId: input.idea.ideaId,
    title: input.idea.title,
    score,
    readiness,
    inputValid: parsedInput.success,
    constraintsQuality: rounded(constraintsScore),
    domainSpecificity: rounded(domainScore),
    researchQuestionCoverage: rounded(researchScore),
    nonGoalClarity: rounded(nonGoalScore),
    descriptionSpecificity: rounded(descriptionScore),
    strengths,
    weaknesses,
    requiredFixes: uniqueRequiredFixes
  });
}

export function scoreProjectIdeaHandoffs(input: {
  ideas: DiscoveredIdea[];
  projectIdeaInputs: ProjectIdeaInput[];
}) {
  return input.projectIdeaInputs.flatMap((projectIdeaInput, index) => {
    const idea = input.ideas[index];
    if (!idea) {
      return [];
    }

    return scoreProjectIdeaHandoff({ idea, projectIdeaInput });
  });
}
