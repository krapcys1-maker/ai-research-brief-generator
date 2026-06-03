import { DiscoveredIdeaSchema } from "@/lib/project-ideas/schemas";
import type {
  DiscoveredIdea,
  IdeaSourceRepo,
  RepoInsight
} from "@/lib/project-ideas/types";

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function repoText(repo: IdeaSourceRepo) {
  return [
    repo.description,
    repo.topics.join(" "),
    repo.readmeText,
    repo.issueSignals.map((issue) => `${issue.title} ${issue.body}`).join(" ")
  ]
    .join(" ")
    .toLowerCase();
}

function adjacentBlueprint(
  repo: IdeaSourceRepo,
  insight: RepoInsight
) {
  const text = repoText(repo);

  if (
    text.includes("code review") ||
    text.includes("pull request") ||
    text.includes("repositories") ||
    text.includes("static analysis")
  ) {
    return {
      title: "AI Technical Debt Sprint Planner",
      problem:
        "Engineering teams can detect many code issues, but they lack a prioritized refactor plan sized for real sprint capacity.",
      targetUsers: ["tech leads", "small engineering teams"],
      mvpScope: [
        "ingest README, issues, and repository metadata",
        "cluster technical debt themes",
        "produce sprint-sized refactor plan with risk and effort estimates"
      ],
      differentiation: [
        "moves from pull request comments to sprint planning",
        "targets technical debt prioritization instead of line-level code review",
        "keeps recommendations as a plan rather than automatic code edits"
      ],
      domains: ["software engineering", "technical debt", "LLM code review"],
      researchQuestions: [
        "Which repository mining signals best predict maintainability risk?",
        "How should LLM recommendations be evaluated for developer trust and usefulness?"
      ],
      aiLeverage: [
        "summarizes repo and issue evidence into refactor themes",
        "turns unstructured signals into ordered implementation plans"
      ]
    };
  }

  if (text.includes("trading") || text.includes("market") || text.includes("backtest")) {
    return {
      title: "AI Strategy Risk Simulator",
      problem:
        "Strategy builders need to test trading ideas against realistic failure modes before any live execution.",
      targetUsers: ["quant learners", "paper-trading builders"],
      mvpScope: [
        "collect strategy assumptions",
        "run backtest-quality checklist",
        "generate risk scenarios and paper-trading validation plan"
      ],
      differentiation: [
        "focuses on risk simulation instead of trade execution",
        "targets paper-trading validation rather than live brokerage automation",
        "produces evidence requirements before model deployment"
      ],
      domains: ["algorithmic trading", "risk management", "time-series validation"],
      researchQuestions: [
        "Which backtesting practices reduce overfitting in retail strategy design?",
        "How should AI-generated trading strategies be constrained before paper trading?"
      ],
      aiLeverage: [
        "converts vague strategy claims into testable assumptions",
        "generates risk and validation checklists from market evidence"
      ]
    };
  }

  if (text.includes("medical") || text.includes("clinical") || text.includes("health")) {
    return {
      title: "Clinical Documentation Evidence Auditor",
      problem:
        "Clinical teams need to verify whether medical document summaries preserve evidence boundaries and uncertainty.",
      targetUsers: ["clinicians", "medical documentation teams"],
      mvpScope: [
        "ingest clinical documents",
        "extract claims and uncertainty markers",
        "audit every summary claim against source passages"
      ],
      differentiation: [
        "audits documentation quality instead of giving diagnoses",
        "targets evidence traceability for clinical notes",
        "keeps human review as mandatory workflow step"
      ],
      domains: ["medical AI", "clinical documentation", "evidence grounding"],
      researchQuestions: [
        "How should clinical summarization systems preserve uncertainty?",
        "Which citation checks reduce unsafe medical answer generation?"
      ],
      aiLeverage: [
        "matches generated claims to supporting passages",
        "flags unsupported clinical certainty and missing caveats"
      ]
    };
  }

  if (text.includes("student") || text.includes("lesson") || text.includes("teacher")) {
    return {
      title: "AI Misconception Lesson Planner",
      problem:
        "Teachers see student mistakes, but turning those mistakes into targeted lesson plans is slow.",
      targetUsers: ["teachers", "course creators"],
      mvpScope: [
        "ingest quiz answers or lesson notes",
        "cluster recurring misconceptions",
        "generate next-lesson plan with practice tasks"
      ],
      differentiation: [
        "focuses on teacher planning rather than direct student chatbot answers",
        "uses misconception clustering as the core workflow",
        "keeps the teacher as final editor"
      ],
      domains: ["education technology", "learning analytics", "AI tutoring"],
      researchQuestions: [
        "How can misconception detection improve lesson planning?",
        "Which teacher-in-the-loop controls improve AI tutoring quality?"
      ],
      aiLeverage: [
        "clusters free-text student mistakes",
        "maps misconception patterns to lesson interventions"
      ]
    };
  }

  if (text.includes("data") || text.includes("analytics") || text.includes("dashboard")) {
    return {
      title: "AI Data Quality Investigation Agent",
      problem:
        "Data teams lose time diagnosing broken datasets before dashboards and analyses can be trusted.",
      targetUsers: ["data analysts", "operations teams"],
      mvpScope: [
        "profile CSV or warehouse extracts",
        "detect quality anomalies",
        "produce an investigation report with likely causes and next checks"
      ],
      differentiation: [
        "focuses on data quality investigation before dashboard generation",
        "targets operational analysts instead of generic BI users",
        "outputs audit-friendly diagnostics rather than only charts"
      ],
      domains: ["data quality", "analytics engineering", "AI agents"],
      researchQuestions: [
        "Which anomaly explanations are most useful for data quality triage?",
        "How should agents avoid fabricating causes for data errors?"
      ],
      aiLeverage: [
        "turns anomaly patterns into investigation hypotheses",
        "summarizes quality risks in analyst-friendly language"
      ]
    };
  }

  return {
    title: "AI Workflow Evidence Planner",
    problem: insight.problemSolved,
    targetUsers: insight.targetUsers,
    mvpScope: [
      "ingest workflow description and source artifacts",
      "extract blockers and missing evidence",
      "produce prioritized implementation plan"
    ],
    differentiation: [
      "focuses on evidence planning instead of direct automation",
      "targets decision support before execution"
    ],
    domains: ["product discovery", "evidence planning", "AI workflow automation"],
    researchQuestions: [
      "Which evidence signals make AI workflow recommendations trustworthy?",
      "How should human review gates be designed for AI-generated plans?"
    ],
    aiLeverage: [
      "summarizes messy source signals",
      "maps blockers to next research and implementation steps"
    ]
  };
}

function buildAdjacentIdea(input: {
  repo: IdeaSourceRepo;
  insight: RepoInsight;
  constraints: string[];
}) {
  const blueprint = adjacentBlueprint(input.repo, input.insight);
  const idea: DiscoveredIdea = {
    ideaId: `idea_${slug(blueprint.title)}_${slug(input.repo.repoId)}`,
    title: blueprint.title,
    oneSentence: `${blueprint.title} helps ${blueprint.targetUsers[0]} solve a narrower adjacent workflow inspired by ${input.repo.name}.`,
    problem: blueprint.problem,
    targetUsers: blueprint.targetUsers,
    mvpScope: blueprint.mvpScope,
    nonGoals: [
      "do not clone the source repository",
      "do not automate irreversible actions in MVP",
      ...input.constraints.slice(0, 2)
    ],
    sourceRepos: [input.repo.repoId],
    originalInspiration: `${input.repo.owner}/${input.repo.name}: ${input.insight.coreWorkflow}`,
    differentiation: blueprint.differentiation,
    aiLeverage: blueprint.aiLeverage,
    researchQuestions: blueprint.researchQuestions,
    risks: [
      "source repo popularity may not equal buyer demand",
      "AI recommendations may be too vague without evidence gates"
    ],
    domains: blueprint.domains
  };

  return DiscoveredIdeaSchema.parse(idea);
}

function buildCloneCandidate(repo: IdeaSourceRepo, insight: RepoInsight) {
  const title = `${repo.name.replace(/[-_]+/g, " ")} AI Assistant`;
  const idea: DiscoveredIdea = {
    ideaId: `idea_clone_${slug(repo.repoId)}`,
    title,
    oneSentence: `A similar AI assistant that repeats the source repository workflow for ${insight.targetUsers[0]}.`,
    problem: insight.problemSolved,
    targetUsers: insight.targetUsers,
    mvpScope: [insight.coreWorkflow],
    nonGoals: ["none"],
    sourceRepos: [repo.repoId],
    originalInspiration: `${repo.owner}/${repo.name}: ${insight.coreWorkflow}`,
    differentiation: ["same workflow with a different name"],
    aiLeverage: insight.technicalMechanisms,
    researchQuestions: ["Can the same repository workflow be rebuilt as a product?"],
    risks: ["high clone risk"],
    domains: repo.topics.length ? repo.topics : ["AI product"]
  };

  return DiscoveredIdeaSchema.parse(idea);
}

export function generateIdeasFromRepo(input: {
  repo: IdeaSourceRepo;
  insight: RepoInsight;
  constraints?: string[];
}) {
  return [
    buildCloneCandidate(input.repo, input.insight),
    buildAdjacentIdea({
      repo: input.repo,
      insight: input.insight,
      constraints: input.constraints ?? []
    })
  ];
}

export function generateIdeasFromRepos(input: {
  repos: IdeaSourceRepo[];
  insights: RepoInsight[];
  constraints?: string[];
}) {
  const insightsByRepoId = new Map(
    input.insights.map((insight) => [insight.repoId, insight])
  );

  return input.repos.flatMap((repo) => {
    const insight = insightsByRepoId.get(repo.repoId);
    if (!insight) {
      return [];
    }

    return generateIdeasFromRepo({
      repo,
      insight,
      constraints: input.constraints
    });
  });
}
