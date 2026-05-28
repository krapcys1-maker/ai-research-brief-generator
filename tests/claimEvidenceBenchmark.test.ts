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

function briefWithFinding(input: {
  finding: string;
  explanation: string;
  confidence: "low" | "medium" | "high";
  evidenceText: string;
  supportLevel: "direct" | "indirect" | "weak";
  caveats?: string[];
}) {
  return createBrief({
    executiveSummary: {
      paragraph: "Retrieval augmented generation supports clinical evaluation.",
      sourcePaperIds: ["rag_med"],
      evidence: [
        {
          paperId: "rag_med",
          evidenceText:
            "Retrieval augmented generation supports clinical evaluation",
          supportLevel: "direct"
        }
      ]
    },
    keyFindings: [
      {
        finding: input.finding,
        explanation: input.explanation,
        confidence: input.confidence,
        sourcePaperIds: ["rag_med"],
        evidence: [
          {
            paperId: "rag_med",
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
        sourcePaperIds: ["rag_med"],
        evidence: [
          {
            paperId: "rag_med",
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
        sourcePaperIds: ["rag_med"],
        evidence: [
          {
            paperId: "rag_med",
            evidenceText:
              "Retrieval augmented generation supports clinical evaluation",
            supportLevel: "direct"
          }
        ]
      }
    ],
    controversiesOrUncertainties: [
      {
        issue: "Unsupported answers",
        explanation: "Unsupported answers can still occur.",
        sourcePaperIds: ["rag_med"],
        evidence: [
          {
            paperId: "rag_med",
            evidenceText: "reducing unsupported answers",
            supportLevel: "indirect"
          }
        ]
      }
    ],
    influentialPapers: [
      {
        paperId: "rag_med",
        reason: "It anchors the claim/evidence benchmark."
      }
    ],
    bibliography: [
      {
        paperId: "rag_med",
        title: ragPaper.title,
        authors: ragPaper.authors,
        year: ragPaper.year,
        url: ragPaper.sourceUrls[0] ?? null,
        doi: ragPaper.doi
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
      finding: "RAG może ograniczać niepoparte odpowiedzi medyczne.",
      explanation:
        "Claim remains cautious and matches evidence about reducing unsupported answers.",
      confidence: "medium",
      evidenceText:
        "grounding answers in retrieved medical evidence and reducing unsupported answers",
      supportLevel: "indirect"
    });

    expect(() => validateBriefGrounding(brief, [ragPaper])).not.toThrow();
  });
});
