import type { SearchFlowAudit } from "@/lib/project-research/searchFlowAudit";

export type AgentReflectionIntervention = {
  stage:
    | "source_search"
    | "full_text"
    | "evidence_coverage"
    | "handoff"
    | "architecture"
    | "final_gate";
  trigger: string;
  manualAgentMove: string;
  pipelineMove: string;
  appliedInPipeline: boolean;
  expectedEffect: string;
};

export type AgentReflection = {
  iteration: number;
  ideaTitle: string;
  verdict: "continue" | "ready" | "needs_human_or_external_input";
  agentQuestion: string;
  manualPlan: string[];
  findings: string[];
  interventions: AgentReflectionIntervention[];
  nextPipelineActions: string[];
};

export function buildAgentReflection(input: {
  iteration: number;
  ideaTitle: string;
  searchFlowAudit: SearchFlowAudit;
  parsedFullTextCount: number;
  minParsedPapers: number;
  requiredCoveredCount: number;
  requiredBucketCount: number;
  missingRequiredBuckets: string[];
  requiredBucketsWithoutParsedFullText: string[];
  handoffUnresolvedProposalCount: number;
  architectureJudgeScore: number;
  architectureJudgeVerdict: string;
}) {
  const interventions: AgentReflectionIntervention[] = [];
  const findings: string[] = [];
  const nextPipelineActions: string[] = [];

  if (input.searchFlowAudit.verdict !== "pass") {
    findings.push(
      `Search flow is ${input.searchFlowAudit.verdict}: ${input.searchFlowAudit.warnings.join(" | ")}`
    );
    interventions.push({
      stage: "source_search",
      trigger: input.searchFlowAudit.warnings.join(" | ") || "search flow warning",
      manualAgentMove:
        "I would not trust the research as fully healthy until source diversity, query health, and full-text availability are checked.",
      pipelineMove:
        "Keep search_flow as a hard full-pass gate and expose source diagnostics in artifacts.",
      appliedInPipeline: true,
      expectedEffect:
        "A run cannot silently pass while research depends on a fragile or single-source search."
    });
    nextPipelineActions.push(
      "Inspect 02_source_search.json and 08_search_flow_audit.md before accepting the architecture."
    );
  }

  if (input.parsedFullTextCount < input.minParsedPapers) {
    findings.push(
      `Parsed full-text is below target: ${input.parsedFullTextCount}/${input.minParsedPapers}.`
    );
    interventions.push({
      stage: "full_text",
      trigger: "parsed full-text below minimum",
      manualAgentMove:
        "I would prioritize papers with legal PDFs/arXiv IDs and reject metadata-only evidence for architecture claims.",
      pipelineMove:
        "Rank candidate papers with full-text/PDF candidates before citation-only metadata.",
      appliedInPipeline: true,
      expectedEffect:
        "The next iteration spends full-text budget on papers that can actually be parsed."
    });
    nextPipelineActions.push(
      "Increase full-text candidates only after checking why current candidates failed."
    );
  }

  if (input.requiredBucketsWithoutParsedFullText.length > 0) {
    findings.push(
      `Covered buckets without parsed full-text: ${input.requiredBucketsWithoutParsedFullText.join(", ")}.`
    );
    interventions.push({
      stage: "evidence_coverage",
      trigger: "required bucket has coverage but no parsed paper",
      manualAgentMove:
        "I would treat the bucket as not truly grounded until at least one relevant full-text paper is parsed.",
      pipelineMove:
        "Carry those buckets into focused follow-up queries for the next iteration.",
      appliedInPipeline: true,
      expectedEffect:
        "The next search iteration targets the weak evidence buckets instead of repeating broad queries."
    });
    nextPipelineActions.push(
      `Add focused query variants for: ${input.requiredBucketsWithoutParsedFullText.join(", ")}.`
    );
  }

  if (input.requiredCoveredCount < input.requiredBucketCount) {
    findings.push(
      `Required bucket coverage is incomplete: ${input.requiredCoveredCount}/${input.requiredBucketCount}.`
    );
    interventions.push({
      stage: "evidence_coverage",
      trigger: "missing required evidence buckets",
      manualAgentMove:
        "I would identify the missing concepts and search for their academic vocabulary, not only product wording.",
      pipelineMove:
        "Feed missing bucket IDs back into focused query generation.",
      appliedInPipeline: true,
      expectedEffect:
        "Missing buckets become explicit search targets in the next iteration."
    });
    nextPipelineActions.push(
      `Repair missing buckets: ${input.missingRequiredBuckets.join(", ")}.`
    );
  }

  if (input.handoffUnresolvedProposalCount > 0) {
    findings.push(
      `Handoff still has unresolved proposals: ${input.handoffUnresolvedProposalCount}.`
    );
    interventions.push({
      stage: "handoff",
      trigger: "unresolved idea handoff risk",
      manualAgentMove:
        "I would not let PRD/architecture pretend the idea is clean until the handoff risk is resolved or named as a blocker.",
      pipelineMove:
        "Keep unresolved handoff proposal count in the full-pass gate.",
      appliedInPipeline: true,
      expectedEffect:
        "Weak idea evidence cannot be washed away by later architecture prose."
    });
    nextPipelineActions.push("Resolve or explicitly block unresolved handoff risks.");
  }

  if (input.architectureJudgeVerdict !== "pass") {
    findings.push(
      `Architecture judge is ${input.architectureJudgeVerdict} with score ${input.architectureJudgeScore}.`
    );
    interventions.push({
      stage: "architecture",
      trigger: "architecture judge did not pass",
      manualAgentMove:
        "I would inspect whether the architecture is generic, missing domain terms, or detached from research papers.",
      pipelineMove:
        "Use the judge weaknesses to specialize blueprint selection and traceability.",
      appliedInPipeline: false,
      expectedEffect:
        "The next code change should target the generator branch that produced the weak architecture."
    });
    nextPipelineActions.push("Inspect project_architecture_judge.md before accepting the project pack.");
  }

  const ready =
    input.searchFlowAudit.verdict === "pass" &&
    input.parsedFullTextCount >= input.minParsedPapers &&
    input.requiredBucketsWithoutParsedFullText.length === 0 &&
    input.requiredCoveredCount === input.requiredBucketCount &&
    input.handoffUnresolvedProposalCount === 0 &&
    input.architectureJudgeVerdict === "pass";

  if (ready) {
    findings.push("All full-pass gates look ready from the agent reflection viewpoint.");
    nextPipelineActions.push("Accept the run, then compare artifacts against GPT baseline.");
  } else {
    interventions.push({
      stage: "final_gate",
      trigger: "one or more full-pass gates are not ready",
      manualAgentMove:
        "I would keep iterating or stop for external input instead of calling this done.",
      pipelineMove:
        "Final verdict remains NEEDS_REVIEW until every full-pass gate is green.",
      appliedInPipeline: true,
      expectedEffect:
        "The run remains honest when one subsystem is weak."
    });
  }

  return {
    iteration: input.iteration,
    ideaTitle: input.ideaTitle,
    verdict: ready
      ? "ready"
      : input.searchFlowAudit.warnings.some((warning) =>
          warning.includes("single contributing source")
        )
        ? "needs_human_or_external_input"
        : "continue",
    agentQuestion:
      "If I were solving this manually as an agent inside the pipeline, what would I distrust, inspect, and change next?",
    manualPlan: [
      "Check whether the idea handoff is strong enough to research.",
      "Check whether paper search is diverse, legal, and not only metadata.",
      "Check whether full-text evidence covers required buckets.",
      "Check whether architecture uses domain-specific evidence instead of generic components.",
      "Only then accept the run or compare against GPT baseline."
    ],
    findings,
    interventions,
    nextPipelineActions
  } satisfies AgentReflection;
}

export function agentReflectionToMarkdown(reflection: AgentReflection) {
  return [
    "# Agent Reflection",
    "",
    `Idea: ${reflection.ideaTitle}`,
    `Iteration: ${reflection.iteration}`,
    `Verdict: ${reflection.verdict}`,
    "",
    "## Agent Question",
    "",
    reflection.agentQuestion,
    "",
    "## Manual Plan",
    "",
    ...reflection.manualPlan.map((item) => `- ${item}`),
    "",
    "## Findings",
    "",
    ...(reflection.findings.length
      ? reflection.findings.map((item) => `- ${item}`)
      : ["- none"]),
    "",
    "## Interventions",
    "",
    ...(reflection.interventions.length
      ? reflection.interventions.flatMap((item) => [
          `### ${item.stage}`,
          "",
          `- Trigger: ${item.trigger}`,
          `- Manual agent move: ${item.manualAgentMove}`,
          `- Pipeline move: ${item.pipelineMove}`,
          `- Applied in pipeline: ${item.appliedInPipeline ? "yes" : "no"}`,
          `- Expected effect: ${item.expectedEffect}`,
          ""
        ])
      : ["- none", ""]),
    "## Next Pipeline Actions",
    "",
    ...(reflection.nextPipelineActions.length
      ? reflection.nextPipelineActions.map((item) => `- ${item}`)
      : ["- none"]),
    ""
  ].join("\n");
}
