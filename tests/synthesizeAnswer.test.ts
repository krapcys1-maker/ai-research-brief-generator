import { describe, expect, it, vi } from "vitest";
import { createAIProvider } from "@/lib/ai/client";
import { synthesizeAnswer } from "@/lib/ai/synthesizeAnswer";
import { createBrief, createPaper } from "@/tests/fixtures";

vi.mock("@/lib/ai/client", () => ({
  AIConfigurationError: class AIConfigurationError extends Error {},
  AIProviderError: class AIProviderError extends Error {},
  createAIProvider: vi.fn()
}));

describe("synthesizeAnswer", () => {
  it("returns a grounded answer with app-controlled question metadata", async () => {
    const paper = createPaper();

    vi.mocked(createAIProvider).mockReturnValue({
      name: "deepseek",
      generateStructured: async () => ({
        question: "model question",
        outputLanguage: "en",
        answer:
          "Wybrane zrodla wskazuja, ze RAG wspiera odpowiedzi kliniczne przez grounding.",
        confidence: "medium",
        notAnswerableFromSources: false,
        claims: [
          {
            claim: "Retrieval grounding supports clinical evaluation.",
            explanation:
              "Evidence links retrieval grounded generation with clinical evaluation.",
            sourcePaperIds: ["paper_1"],
            evidence: [
              {
                paperId: "paper_1",
                evidenceText:
                  "retrieval grounded generation in clinical evaluation and reliability",
                supportLevel: "direct"
              }
            ]
          }
        ],
        suggestedFollowUpQuestions: ["Jak sprawdzic cytowania?"]
      })
    });

    const answer = await synthesizeAnswer({
      question: "Jak RAG wspiera odpowiedzi kliniczne?",
      outputLanguage: "pl",
      brief: createBrief(),
      papers: [paper]
    });

    expect(answer.question).toBe("Jak RAG wspiera odpowiedzi kliniczne?");
    expect(answer.outputLanguage).toBe("pl");
    expect(answer.claims[0].sourcePaperIds).toEqual(["paper_1"]);
    expect(answer.claims[0].evidence[0].evidenceLevel).toBe("abstract_supported");
  });

  it("allows source-bounded refusal when selected papers do not answer the question", async () => {
    vi.mocked(createAIProvider).mockReturnValue({
      name: "deepseek",
      generateStructured: async () => ({
        question: "What is the trial cost?",
        outputLanguage: "en",
        answer: "The selected sources do not contain enough evidence to answer.",
        confidence: "low",
        notAnswerableFromSources: true,
        claims: [],
        suggestedFollowUpQuestions: []
      })
    });

    const answer = await synthesizeAnswer({
      question: "What is the trial cost?",
      outputLanguage: "en",
      brief: createBrief(),
      papers: [createPaper()]
    });

    expect(answer.notAnswerableFromSources).toBe(true);
    expect(answer.claims).toEqual([]);
  });

  it("accepts Polish Q&A claims when English evidence and cited paper metadata support them", async () => {
    vi.mocked(createAIProvider).mockReturnValue({
      name: "deepseek",
      generateStructured: async () => ({
        question: "Jak RAG wspiera diagnostyke medyczna?",
        outputLanguage: "pl",
        answer:
          "Wybrane artykuly dotycza RAG w diagnostyce medycznej i ocenie klinicznej.",
        confidence: "medium",
        notAnswerableFromSources: false,
        claims: [
          {
            claim:
              "Wybrane artykuly dotycza RAG w diagnostyce medycznej i ocenie klinicznej.",
            explanation:
              "Metadane paperu wskazuja na medical diagnosis oraz clinical evaluation.",
            sourcePaperIds: ["paper_1"],
            evidence: [
              {
                paperId: "paper_1",
                evidenceText:
                  "retrieval grounded generation in clinical evaluation and reliability",
                supportLevel: "direct"
              }
            ]
          }
        ],
        suggestedFollowUpQuestions: []
      })
    });

    const answer = await synthesizeAnswer({
      question: "Jak RAG wspiera diagnostyke medyczna?",
      outputLanguage: "pl",
      brief: createBrief(),
      papers: [createPaper()]
    });

    expect(answer.claims[0].claim).toContain("diagnostyce medycznej");
  });

  it("answers paper selection rationale deterministically from selected paper metadata", async () => {
    vi.mocked(createAIProvider).mockClear();

    const answer = await synthesizeAnswer({
      question: "Dlaczego te artykuly zostaly wybrane?",
      outputLanguage: "pl",
      brief: createBrief(),
      papers: [createPaper()]
    });

    expect(createAIProvider).not.toHaveBeenCalled();
    expect(answer.notAnswerableFromSources).toBe(false);
    expect(answer.claims[0].sourcePaperIds).toEqual(["paper_1"]);
    expect(answer.claims[0].evidence[0].evidenceText).toContain(
      "retrieval grounded generation"
    );
  });

  it("labels full-text evidence when full-text chunks support the answer", async () => {
    const paper = createPaper({
      id: "paper_full_text",
      title: "Transformer Attention Methods",
      abstract: "This abstract mentions transformers but not implementation details."
    });
    const chunk = {
      chunk: {
        id: "fulltext_1:chunk_0",
        paperId: "paper_full_text",
        fullTextId: "fulltext_1",
        sectionTitle: "Methods",
        chunkIndex: 0,
        text:
          "The methods section explains that transformer layers use self-attention heads to weight token relationships across the input sequence.",
        tokenEstimate: 18,
        pageStart: null,
        pageEnd: null,
        evidenceLevel: "full_text_supported" as const
      },
      score: 0.9
    };

    vi.mocked(createAIProvider).mockReturnValue({
      name: "deepseek",
      generateStructured: async () => ({
        question: "What method do the transformer layers use?",
        outputLanguage: "en",
        answer:
          "The provided full text says transformer layers use self-attention heads to weight token relationships.",
        confidence: "high",
        notAnswerableFromSources: false,
        claims: [
          {
            claim: "Transformer layers use self-attention heads.",
            explanation:
              "The cited full-text methods chunk describes self-attention heads weighting token relationships.",
            sourcePaperIds: ["paper_full_text"],
            evidence: [
              {
                paperId: "paper_full_text",
                evidenceText:
                  "transformer layers use self-attention heads to weight token relationships",
                supportLevel: "direct",
                evidenceLevel: "full_text_supported",
                chunkId: "fulltext_1:chunk_0",
                sectionTitle: "Methods"
              }
            ]
          }
        ],
        suggestedFollowUpQuestions: []
      })
    });

    const answer = await synthesizeAnswer({
      question: "What method do the transformer layers use?",
      outputLanguage: "en",
      brief: createBrief(),
      papers: [paper],
      fullTextChunks: [chunk]
    });

    expect(answer.claims[0].evidence[0].evidenceLevel).toBe(
      "full_text_supported"
    );
    expect(answer.claims[0].evidence[0].chunkId).toBe("fulltext_1:chunk_0");
  });

  it("refuses strong methodology questions when only abstract evidence is available", async () => {
    vi.mocked(createAIProvider).mockClear();

    const answer = await synthesizeAnswer({
      question: "What methods and tables prove the result?",
      outputLanguage: "en",
      brief: createBrief(),
      papers: [createPaper()]
    });

    expect(createAIProvider).not.toHaveBeenCalled();
    expect(answer.notAnswerableFromSources).toBe(true);
    expect(answer.answer).toContain("full-text support");
  });

  it("rejects answers that cite unknown paper IDs", async () => {
    vi.mocked(createAIProvider).mockReturnValue({
      name: "deepseek",
      generateStructured: async () => ({
        question: "What supports this answer?",
        outputLanguage: "en",
        answer: "The selected source supports the answer.",
        confidence: "high",
        notAnswerableFromSources: false,
        claims: [
          {
            claim: "A claim.",
            explanation: "An explanation.",
            sourcePaperIds: ["unknown_paper"],
            evidence: [
              {
                paperId: "unknown_paper",
                evidenceText: "Retrieval-Augmented Generation for Medical Diagnosis",
                supportLevel: "direct"
              }
            ]
          }
        ],
        suggestedFollowUpQuestions: []
      })
    });

    await expect(
      synthesizeAnswer({
        question: "What supports this answer?",
        outputLanguage: "en",
        brief: createBrief(),
        papers: [createPaper()]
      })
    ).rejects.toThrow("unknown paperId");
  });

  it("rejects answer claims that add unsupported numeric details", async () => {
    vi.mocked(createAIProvider).mockReturnValue({
      name: "deepseek",
      generateStructured: async () => ({
        question: "How much did grounding improve reliability?",
        outputLanguage: "en",
        answer: "Retrieval grounding improved reliability by 40%.",
        confidence: "high",
        notAnswerableFromSources: false,
        claims: [
          {
            claim: "Retrieval grounding improved reliability by 40%.",
            explanation:
              "The answer adds a precise numeric improvement absent from the selected paper.",
            sourcePaperIds: ["paper_1"],
            evidence: [
              {
                paperId: "paper_1",
                evidenceText:
                  "retrieval grounded generation in clinical evaluation and reliability",
                supportLevel: "direct"
              }
            ]
          }
        ],
        suggestedFollowUpQuestions: []
      })
    });

    await expect(
      synthesizeAnswer({
        question: "How much did grounding improve reliability?",
        outputLanguage: "en",
        brief: createBrief(),
        papers: [createPaper()]
      })
    ).rejects.toThrow("quantitative/statistical detail not found in evidence");
  });

  it("rejects answer claims that add unsupported comparative details", async () => {
    vi.mocked(createAIProvider).mockReturnValue({
      name: "deepseek",
      generateStructured: async () => ({
        question: "Is this better than baseline?",
        outputLanguage: "en",
        answer: "Retrieval grounding is more reliable than baseline.",
        confidence: "high",
        notAnswerableFromSources: false,
        claims: [
          {
            claim: "Retrieval grounding is more reliable than baseline.",
            explanation:
              "The answer adds a comparison absent from the selected paper evidence.",
            sourcePaperIds: ["paper_1"],
            evidence: [
              {
                paperId: "paper_1",
                evidenceText:
                  "retrieval grounded generation in clinical evaluation and reliability",
                supportLevel: "direct"
              }
            ]
          }
        ],
        suggestedFollowUpQuestions: []
      })
    });

    await expect(
      synthesizeAnswer({
        question: "Is this better than baseline?",
        outputLanguage: "en",
        brief: createBrief(),
        papers: [createPaper()]
      })
    ).rejects.toThrow("comparative detail not found in evidence");
  });
});
