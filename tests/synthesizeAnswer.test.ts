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
      question: "Dlaczego ten artykul zostal wybrany?",
      outputLanguage: "pl",
      brief: createBrief(),
      papers: [paper]
    });

    expect(answer.question).toBe("Dlaczego ten artykul zostal wybrany?");
    expect(answer.outputLanguage).toBe("pl");
    expect(answer.claims[0].sourcePaperIds).toEqual(["paper_1"]);
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

  it("rejects answers that cite unknown paper IDs", async () => {
    vi.mocked(createAIProvider).mockReturnValue({
      name: "deepseek",
      generateStructured: async () => ({
        question: "Why was this selected?",
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
        question: "Why was this selected?",
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
});
