import { describe, expect, it } from "vitest";
import { preflightBrief } from "@/lib/pipeline/preflightBrief";
import { createPaper } from "@/tests/fixtures";

describe("preflightBrief", () => {
  it("checks sources and returns quality gate details without synthesis", async () => {
    const result = await preflightBrief(
      {
        query: "AI agents in software engineering",
        maxPapers: 5,
        sources: ["openalex"]
      },
      {
        search: async ({ query }) => ({
          papers: [
            createPaper({
              id: "paper_1",
              title: "AI Agents in Software Engineering",
              abstract: "Autonomous agents support software development.",
              source: "openalex",
              openAlexId: "W1",
              relevanceScore: undefined
            }),
            createPaper({
              id: "paper_2",
              title: "AI Agents for Software Engineering Testing",
              abstract: "AI agents generate and evaluate software engineering tests.",
              source: "openalex",
              openAlexId: "W2",
              doi: "10.1000/paper-2",
              sourceUrls: ["https://example.org/paper-2"],
              relevanceScore: undefined
            })
          ],
          sourcesUsed: ["openalex"],
          warnings: [],
          sourceDiagnostics: [
            {
              source: "openalex",
              query,
              status: "success",
              resultCount: 2,
              cached: false
            }
          ]
        })
      }
    );

    expect(result.selectedPapers).toHaveLength(2);
    expect(result.qualityGate.canSynthesize).toBe(true);
    expect(result.searchSummary.totalUsedInBrief).toBe(2);
    expect(result.queryVariants[0]).toBe("AI agents in software engineering");
  });

  it("returns a poor gate when source search fails or returns no papers", async () => {
    const result = await preflightBrief(
      {
        query: "zzzxqv nonexistent topic",
        maxPapers: 5,
        sources: ["openalex"]
      },
      {
        search: async () => {
          throw new Error("All query variants failed or returned no papers.");
        }
      }
    );

    expect(result.selectedPapers).toHaveLength(0);
    expect(result.qualityGate.coverage).toBe("poor");
    expect(result.qualityGate.canSynthesize).toBe(false);
    expect(result.warnings[0]).toContain("All query variants failed");
  });

  it("adds metadata warnings to the preflight summary and quality gate", async () => {
    const result = await preflightBrief(
      {
        query: "how transformers work",
        maxPapers: 5,
        sources: ["openalex"]
      },
      {
        search: async () => ({
          papers: [
            createPaper({
              id: "openalex:W2626778328",
              title: "Attention Is All You Need",
              abstract: "Transformer architectures use self-attention.",
              source: "openalex",
              openAlexId: "W2626778328",
              doi: "10.1000/unexpected",
              sourceUrls: ["https://openalex.org/W2626778328"],
              year: 2025
            }),
            createPaper({
              id: "paper_2",
              title: "Transformer Attention Mechanisms",
              abstract: "Self-attention supports transformer language models.",
              source: "openalex",
              openAlexId: "W2"
            })
          ],
          sourcesUsed: ["openalex"],
          warnings: [],
          sourceDiagnostics: []
        })
      }
    );

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("metadata warning:"),
        expect.stringContaining("normally cited as a 2017 paper")
      ])
    );
    expect(result.searchSummary.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("metadata warning:")])
    );
    expect(result.qualityGate.warningCount).toBeGreaterThan(0);
  });

  it("uses English academic variants for Polish instruction tuning queries", async () => {
    const result = await preflightBrief(
      {
        query:
          "Wpływ fine-tuningu instrukcyjnego na jakość odpowiedzi modeli językowych",
        maxPapers: 5,
        sources: ["openalex"]
      },
      {
        search: async ({ queryVariants }) => {
          expect(queryVariants).toContain(
            "instruction tuning response quality language models"
          );
          return {
            papers: [
              createPaper({
                id: "openalex:instruction_tuning_quality",
                title:
                  "A Survey on Quality Evaluation of Instruction Fine-tuning Datasets for Large Language Models",
                abstract:
                  "Instruction fine-tuning datasets affect response quality and evaluation of large language models.",
                source: "openalex",
                openAlexId: "W_instruction_tuning_quality",
                doi: "10.1000/instruction-tuning-quality",
                sourceUrls: ["https://openalex.org/W_instruction_tuning_quality"]
              }),
              createPaper({
                id: "openalex:instruction_eval",
                title:
                  "INSTRUCTEVAL: Holistic Evaluation of Instruction-Tuned Large Language Models",
                abstract:
                  "Instruction-tuned large language models are evaluated across response quality, safety, and following behavior.",
                source: "openalex",
                openAlexId: "W_instruction_eval",
                doi: "10.1000/instructeval",
                sourceUrls: ["https://openalex.org/W_instruction_eval"]
              }),
              createPaper({
                id: "openalex:instruction_following",
                title: "Fine-Tuning Language Models for Instruction Following",
                abstract:
                  "Fine-tuning improves instruction following behavior and response quality in language models.",
                source: "openalex",
                openAlexId: "W_instruction_following",
                doi: "10.1000/instruction-following",
                sourceUrls: ["https://openalex.org/W_instruction_following"]
              })
            ],
            sourcesUsed: ["openalex"],
            warnings: [],
            sourceDiagnostics: []
          };
        }
      }
    );

    expect(result.qualityGate.canSynthesize).toBe(true);
    expect(result.qualityGate.livePaperCount).toBe(3);
    expect(result.qualityGate.mockPaperCount).toBe(0);
  });

  it("passes AI-expanded search intent variants into source search", async () => {
    const result = await preflightBrief(
      {
        query: "stworz apke do analizy sentymentu komentarzy",
        maxPapers: 5,
        sources: ["openalex"]
      },
      {
        buildSearchIntent: async () => ({
          outputLanguage: "pl",
          source: "ai",
          queryVariants: [
            "stworz apke do analizy sentymentu komentarzy",
            "sentiment analysis user comments machine learning",
            "opinion mining social media comments",
            "natural language processing sentiment classification"
          ]
        }),
        search: async ({ queryVariants }) => {
          expect(queryVariants).toContain(
            "sentiment analysis user comments machine learning"
          );
          expect(queryVariants).toContain(
            "natural language processing sentiment classification"
          );

          return {
            papers: [
              createPaper({
                id: "openalex:sentiment_analysis",
                title:
                  "Sentiment Analysis of User Comments with Machine Learning",
                abstract:
                  "Natural language processing and machine learning methods classify sentiment in user comments and social media text.",
                source: "openalex",
                openAlexId: "W_sentiment_analysis",
                relevanceScore: 0.92,
                semanticScore: 0.88
              }),
              createPaper({
                id: "openalex:comment_sentiment",
                title:
                  "Natural Language Processing for Sentiment Classification",
                abstract:
                  "Natural language processing supports sentiment classification in comments and reviews.",
                source: "openalex",
                openAlexId: "W_comment_sentiment",
                relevanceScore: 0.88,
                semanticScore: 0.82
              }),
              createPaper({
                id: "openalex:opinion_mining",
                title: "Opinion Mining in Social Media Comments",
                abstract:
                  "Opinion mining extracts sentiment from social media comments and other user generated content.",
                source: "openalex",
                openAlexId: "W_opinion_mining",
                relevanceScore: 0.84,
                semanticScore: 0.8
              })
            ],
            sourcesUsed: ["openalex"],
            warnings: [],
            sourceDiagnostics: []
          };
        }
      }
    );

    expect(result.queryVariants).toContain(
      "sentiment analysis user comments machine learning"
    );
    expect(result.outputLanguage).toBe("pl");
  });
});
