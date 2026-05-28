import { describe, expect, it } from "vitest";
import { validateBriefGrounding } from "@/lib/pipeline/validateGrounding";
import { createBrief, createPaper } from "@/tests/fixtures";

const ragPaper = createPaper({
  id: "rag_med",
  title: "Retrieval-Augmented Generation for Medical Diagnosis",
  abstract:
    "Retrieval augmented generation supports clinical evaluation by grounding answers in retrieved medical evidence and reducing unsupported answers.",
  source: "openalex",
  doi: "10.1000/rag-med"
});

const metricPaper = createPaper({
  id: "rag_metric",
  title: "Measured Effects of Retrieval Grounding in Clinical Answers",
  abstract:
    "Retrieval grounding reduced unsupported clinical answers by 40% in the benchmark and the difference was statistically significant with p < 0.05.",
  source: "openalex",
  doi: "10.1000/rag-metric"
});

const comparativePaper = createPaper({
  id: "rag_compare",
  title: "Comparing Retrieval Grounding with Baseline Clinical QA",
  abstract:
    "Retrieval grounding outperformed baseline clinical question answering in answer support and was more reliable than the baseline system.",
  source: "openalex",
  doi: "10.1000/rag-compare"
});

function briefWithFinding(input: {
  finding: string;
  explanation: string;
  confidence: "low" | "medium" | "high";
  evidenceText: string;
  supportLevel: "direct" | "indirect" | "weak";
  caveats?: string[];
  paper?: typeof ragPaper;
}) {
  const paper = input.paper ?? ragPaper;
  const baselineEvidence =
    paper.id === "rag_metric"
      ? "Retrieval grounding reduced unsupported clinical answers"
      : paper.id === "rag_compare"
        ? "Retrieval grounding outperformed baseline clinical question answering"
      : "Retrieval augmented generation supports clinical evaluation";

  return createBrief({
    executiveSummary: {
      paragraph: "Retrieval augmented generation supports clinical evaluation.",
      sourcePaperIds: [paper.id],
      evidence: [
        {
          paperId: paper.id,
          evidenceText: baselineEvidence,
          supportLevel: "direct"
        }
      ]
    },
    keyFindings: [
      {
        finding: input.finding,
        explanation: input.explanation,
        confidence: input.confidence,
        sourcePaperIds: [paper.id],
        evidence: [
          {
            paperId: paper.id,
            evidenceText: input.evidenceText,
            supportLevel: input.supportLevel
          }
        ],
        caveats: input.caveats ?? []
      }
    ],
    majorThemes: [
      {
        theme: "Clinical evaluation",
        description: "Retrieved medical evidence supports evaluation.",
        sourcePaperIds: [paper.id],
        evidence: [
          {
            paperId: paper.id,
            evidenceText:
              "retrieved medical evidence and reducing unsupported answers",
            supportLevel: "direct"
          }
        ]
      }
    ],
    researchGaps: [
      {
        gap: "Clinical evaluation",
        whyItMatters: "Clinical evaluation needs medical evidence.",
        sourcePaperIds: [paper.id],
        evidence: [
          {
            paperId: paper.id,
            evidenceText: baselineEvidence,
            supportLevel: "direct"
          }
        ]
      }
    ],
    controversiesOrUncertainties: [
      {
        issue: "Unsupported answers",
        explanation: "Unsupported answers can still occur.",
        sourcePaperIds: [paper.id],
        evidence: [
          {
            paperId: paper.id,
            evidenceText: "reducing unsupported answers",
            supportLevel: "indirect"
          }
        ]
      }
    ],
    influentialPapers: [
      {
        paperId: paper.id,
        reason: "It anchors the claim/evidence benchmark."
      }
    ],
    bibliography: [
      {
        paperId: paper.id,
        title: paper.title,
        authors: paper.authors,
        year: paper.year,
        url: paper.sourceUrls[0] ?? null,
        doi: paper.doi
      }
    ]
  });
}

describe("claim/evidence benchmark fixtures", () => {
  it("accepts direct evidence when claim, evidence, and paper metadata align", () => {
    const brief = briefWithFinding({
      finding: "RAG supports clinical evaluation.",
      explanation:
        "Retrieval augmented generation grounds answers in retrieved medical evidence.",
      confidence: "high",
      evidenceText:
        "Retrieval augmented generation supports clinical evaluation by grounding answers in retrieved medical evidence",
      supportLevel: "direct"
    });

    expect(() => validateBriefGrounding(brief, [ragPaper])).not.toThrow();
  });

  it("accepts indirect evidence when evidence is metadata-backed and claim-related", () => {
    const brief = briefWithFinding({
      finding: "RAG can reduce unsupported medical answers.",
      explanation:
        "The paper frames retrieval grounding as a way to reduce unsupported answers.",
      confidence: "medium",
      evidenceText:
        "grounding answers in retrieved medical evidence and reducing unsupported answers",
      supportLevel: "indirect"
    });

    expect(() => validateBriefGrounding(brief, [ragPaper])).not.toThrow();
  });

  it("accepts weak evidence only when uncertainty is visible", () => {
    const brief = briefWithFinding({
      finding: "RAG may improve clinical reliability.",
      explanation:
        "Reliability is implied through clinical evaluation and grounding, but the support is weak.",
      confidence: "low",
      caveats: ["Evidence is indirect and should be checked against full text."],
      evidenceText:
        "Retrieval augmented generation supports clinical evaluation",
      supportLevel: "weak"
    });

    expect(() => validateBriefGrounding(brief, [ragPaper])).not.toThrow();
  });

  it("rejects true paper evidence attached to an unrelated claim", () => {
    const brief = briefWithFinding({
      finding: "RAG cures cancer in clinical deployments.",
      explanation:
        "This claim is unrelated to the evidence even though the paper ID is valid.",
      confidence: "high",
      evidenceText:
        "Retrieval augmented generation supports clinical evaluation by grounding answers in retrieved medical evidence",
      supportLevel: "direct"
    });

    expect(() => validateBriefGrounding(brief, [ragPaper])).toThrow(
      "claim is not supported"
    );
  });

  it("rejects overclaiming when evidence says reduce but the claim says eliminate", () => {
    const brief = briefWithFinding({
      finding: "RAG eliminates unsupported medical answers.",
      explanation:
        "This is stronger than the selected evidence, which only says reducing unsupported answers.",
      confidence: "high",
      evidenceText:
        "grounding answers in retrieved medical evidence and reducing unsupported answers",
      supportLevel: "direct"
    });

    expect(() => validateBriefGrounding(brief, [ragPaper])).toThrow(
      "claim is stronger than its evidence"
    );
  });

  it("rejects Polish absolute overclaims when evidence is weaker", () => {
    const brief = briefWithFinding({
      finding: "RAG eliminuje halucynacje w systemach medycznych.",
      explanation:
        "Evidence mentions reducing unsupported answers, not eliminating hallucinations.",
      confidence: "high",
      evidenceText:
        "grounding answers in retrieved medical evidence and reducing unsupported answers",
      supportLevel: "direct"
    });

    expect(() => validateBriefGrounding(brief, [ragPaper])).toThrow(
      "claim is stronger than its evidence"
    );
  });

  it("allows cautious Polish paraphrases without absolute language", () => {
    const brief = briefWithFinding({
      finding: "RAG moze ograniczac niepoparte odpowiedzi medyczne.",
      explanation:
        "Claim remains cautious and matches evidence about reducing unsupported answers.",
      confidence: "medium",
      evidenceText:
        "grounding answers in retrieved medical evidence and reducing unsupported answers",
      supportLevel: "indirect"
    });

    expect(() => validateBriefGrounding(brief, [ragPaper])).not.toThrow();
  });

  it("rejects numeric claims when the evidence has no matching number", () => {
    const brief = briefWithFinding({
      finding: "RAG reduced unsupported clinical answers by 40%.",
      explanation:
        "The finding includes a precise effect size that is absent from the evidence snippet.",
      confidence: "high",
      evidenceText:
        "Retrieval grounding reduced unsupported clinical answers in the benchmark",
      supportLevel: "direct"
    });

    expect(() => validateBriefGrounding(brief, [ragPaper])).toThrow(
      "quantitative/statistical detail not found in evidence"
    );
  });

  it("rejects evidence snippets that add numbers absent from paper metadata", () => {
    const brief = briefWithFinding({
      finding: "RAG reduced unsupported clinical answers by 40%.",
      explanation:
        "The evidence snippet invents a precise effect size not present in the selected paper metadata.",
      confidence: "high",
      evidenceText:
        "Retrieval grounding reduced unsupported clinical answers by 40%",
      supportLevel: "direct"
    });

    expect(() => validateBriefGrounding(brief, [ragPaper])).toThrow(
      "evidence includes quantitative/statistical detail"
    );
  });

  it("accepts numeric claims when evidence and paper metadata contain the same number", () => {
    const brief = briefWithFinding({
      finding: "Retrieval grounding reduced unsupported clinical answers by 40%.",
      explanation:
        "The selected paper reports the same benchmark effect size in its metadata.",
      confidence: "high",
      evidenceText:
        "Retrieval grounding reduced unsupported clinical answers by 40% in the benchmark",
      supportLevel: "direct",
      paper: metricPaper
    });

    expect(() => validateBriefGrounding(brief, [metricPaper])).not.toThrow();
  });

  it("rejects statistical significance claims when evidence only reports a directional result", () => {
    const brief = briefWithFinding({
      finding:
        "Retrieval grounding produced a statistically significant reduction in unsupported answers.",
      explanation:
        "The claim says statistically significant, but the evidence only reports a directional reduction.",
      confidence: "high",
      evidenceText:
        "Retrieval grounding reduced unsupported clinical answers in the benchmark",
      supportLevel: "direct"
    });

    expect(() => validateBriefGrounding(brief, [ragPaper])).toThrow(
      "quantitative/statistical detail not found in evidence"
    );
  });

  it("accepts statistical significance claims when evidence and paper metadata include the statistical signal", () => {
    const brief = briefWithFinding({
      finding:
        "Retrieval grounding produced a statistically significant reduction in unsupported answers.",
      explanation: "The evidence includes the same statistical signal and p-value.",
      confidence: "high",
      evidenceText:
        "Retrieval grounding reduced unsupported clinical answers by 40% and the difference was statistically significant with p < 0.05",
      supportLevel: "direct",
      paper: metricPaper
    });

    expect(() => validateBriefGrounding(brief, [metricPaper])).not.toThrow();
  });

  it("rejects comparative claims when evidence has no comparison", () => {
    const brief = briefWithFinding({
      finding: "RAG is more effective than baseline clinical QA.",
      explanation:
        "The finding adds a comparative claim, but the evidence only says RAG supports evaluation.",
      confidence: "high",
      evidenceText:
        "Retrieval augmented generation supports clinical evaluation by grounding answers in retrieved medical evidence",
      supportLevel: "direct"
    });

    expect(() => validateBriefGrounding(brief, [ragPaper])).toThrow(
      "comparative detail not found in evidence"
    );
  });

  it("rejects evidence snippets that add comparisons absent from paper metadata", () => {
    const brief = briefWithFinding({
      finding: "RAG outperforms baseline clinical QA.",
      explanation:
        "The evidence snippet invents a comparison not present in the selected paper metadata.",
      confidence: "high",
      evidenceText:
        "Retrieval augmented generation outperformed baseline clinical QA by grounding answers in retrieved medical evidence",
      supportLevel: "direct"
    });

    expect(() => validateBriefGrounding(brief, [ragPaper])).toThrow(
      "evidence includes comparative detail"
    );
  });

  it("accepts comparative claims when evidence and paper metadata include a comparison", () => {
    const brief = briefWithFinding({
      finding: "Retrieval grounding outperformed baseline clinical question answering.",
      explanation:
        "The evidence and selected paper metadata both include the baseline comparison.",
      confidence: "high",
      evidenceText:
        "Retrieval grounding outperformed baseline clinical question answering in answer support",
      supportLevel: "direct",
      paper: comparativePaper
    });

    expect(() => validateBriefGrounding(brief, [comparativePaper])).not.toThrow();
  });

  it("rejects Polish comparative claims when evidence has no comparison", () => {
    const brief = briefWithFinding({
      finding: "RAG jest skuteczniejszy niz standardowe QA kliniczne.",
      explanation:
        "Retrieval augmented generation supports clinical evaluation, but the comparative language is not in evidence.",
      confidence: "high",
      evidenceText:
        "Retrieval augmented generation supports clinical evaluation by grounding answers in retrieved medical evidence",
      supportLevel: "direct"
    });

    expect(() => validateBriefGrounding(brief, [ragPaper])).toThrow(
      "comparative detail not found in evidence"
    );
  });
});
