import {
  BriefAnswerSchema,
  type BriefAnswer,
  type ResearchBrief
} from "@/lib/ai/schemas";
import {
  AIConfigurationError,
  AIProviderError,
  createAIProvider
} from "@/lib/ai/client";
import { validateClaimGrounding } from "@/lib/pipeline/validateGrounding";
import type { NormalizedPaper } from "@/lib/sources/types";
import type { OutputLanguage } from "@/lib/utils/language";
import { getLanguageInstruction } from "@/lib/utils/language";

export type SynthesizeAnswerInput = {
  question: string;
  outputLanguage: OutputLanguage;
  brief: ResearchBrief;
  papers: NormalizedPaper[];
};

const answerSystemPrompt = `You answer questions about one generated research brief.

You are not a general chatbot.
Answer only from the selected papers and the existing brief context provided by the user prompt.
If the selected papers do not support an answer, set notAnswerableFromSources to true and say that the selected sources are insufficient.
Every answerable response must include claims.
Every claim must include sourcePaperIds and evidence snippets.
Evidence snippets must be short text spans copied or tightly paraphrased from selected paper titles, abstracts, venues, or metadata.
Do not invent papers, authors, DOI values, URLs, venues, methods, results, or facts.
Do not cite paper IDs that are not in the selected paper list.
Keep paper titles, author names, journal names, DOI values, and URLs unchanged.
Write the answer in the detected language of the user's question.
Return only valid JSON matching the requested schema.
Do not return markdown.
Do not wrap the JSON in code fences.`;

function normalizeQuestion(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isSelectionRationaleQuestion(question: string) {
  const normalized = normalizeQuestion(question);

  return (
    /\bwhy\b.*\b(select|selected|choose|chosen|include|included)\b/.test(
      normalized
    ) ||
    /\bdlaczego\b.*\b(wybran|wybrano|dobran|uwzglednion|artykul|paper|zrod)\w*\b/.test(
      normalized
    )
  );
}

function evidenceTextForPaper(paper: NormalizedPaper) {
  const candidate = paper.abstract?.trim() || paper.title;
  return candidate.length > 280 ? `${candidate.slice(0, 277).trim()}...` : candidate;
}

function synthesizeSelectionRationale(input: SynthesizeAnswerInput): BriefAnswer {
  const citedPapers = input.papers.slice(0, 3);
  const isPolish = input.outputLanguage === "pl";
  const answer = isPolish
    ? "Te artykuly zostaly wybrane, bo sa wsrod najwyzej ocenionych zrodel uzytych w briefie i ich tytuly lub abstrakty bezposrednio lacza sie z tematem zapytania. Ponizej pokazuje konkretne dowody z metadanych wybranych paperow."
    : "These papers were selected because they are among the highest-ranked sources used in the brief and their titles or abstracts directly connect to the research query. The concrete evidence from selected paper metadata is listed below.";

  const claims = citedPapers.map((paper) => {
    const evidenceText = evidenceTextForPaper(paper);
    const claim = isPolish
      ? `"${paper.title}" zostal wybrany, bo jego metadane wspieraja temat briefu: ${input.brief.query}.`
      : `"${paper.title}" was selected because its metadata supports the brief topic: ${input.brief.query}.`;
    const explanation = isPolish
      ? `Dowod pochodzi z tytulu lub abstraktu paperu; aplikacja nie dopowiada tu informacji spoza wybranych zrodel.`
      : "The evidence comes from the paper title or abstract; the app does not add information outside the selected sources here.";

    return {
      claim,
      explanation,
      sourcePaperIds: [paper.id],
      evidence: [
        {
          paperId: paper.id,
          evidenceText,
          supportLevel: "direct" as const
        }
      ]
    };
  });

  const groundedAnswer = BriefAnswerSchema.parse({
    question: input.question,
    outputLanguage: input.outputLanguage,
    answer,
    confidence: "medium",
    notAnswerableFromSources: false,
    claims,
    suggestedFollowUpQuestions: isPolish
      ? [
          "Ktory z wybranych paperow jest najmocniej dopasowany do pytania?",
          "Ktore wnioski maja tylko posrednie wsparcie w zrodlach?"
        ]
      : [
          "Which selected paper is the strongest match for the question?",
          "Which findings have only indirect source support?"
        ]
  });

  validateBriefAnswerGrounding(groundedAnswer, input.papers);
  return groundedAnswer;
}

function buildAnswerPrompt(input: SynthesizeAnswerInput) {
  const papersJson = JSON.stringify(
    input.papers.map((paper) => ({
      id: paper.id,
      title: paper.title,
      abstract: paper.abstract,
      authors: paper.authors,
      year: paper.year,
      venue: paper.venue,
      doi: paper.doi,
      citationCount: paper.citationCount,
      urls: paper.sourceUrls
    })),
    null,
    2
  );

  const briefContext = {
    title: input.brief.title,
    query: input.brief.query,
    tldr: input.brief.tldr,
    executiveSummary: input.brief.executiveSummary.paragraph,
    keyFindings: input.brief.keyFindings.map((item) => ({
      finding: item.finding,
      explanation: item.explanation,
      confidence: item.confidence,
      sourcePaperIds: item.sourcePaperIds
    })),
    majorThemes: input.brief.majorThemes.map((item) => ({
      theme: item.theme,
      description: item.description,
      sourcePaperIds: item.sourcePaperIds
    })),
    researchGaps: input.brief.researchGaps.map((item) => ({
      gap: item.gap,
      whyItMatters: item.whyItMatters,
      sourcePaperIds: item.sourcePaperIds
    })),
    controversiesOrUncertainties: input.brief.controversiesOrUncertainties.map(
      (item) => ({
        issue: item.issue,
        explanation: item.explanation,
        sourcePaperIds: item.sourcePaperIds
      })
    )
  };

  return `User question:
${input.question}

Detected answer language:
${input.outputLanguage}

Language instruction:
${getLanguageInstruction(input.outputLanguage)}

Brief context:
${JSON.stringify(briefContext, null, 2)}

Selected paper IDs:
${JSON.stringify(input.papers.map((paper) => paper.id))}

Return exactly one JSON object with this shape:
{
  "question": "${input.question}",
  "outputLanguage": "${input.outputLanguage}",
  "answer": "answer in the detected answer language, or a clear explanation that the selected sources are insufficient",
  "confidence": "low|medium|high",
  "notAnswerableFromSources": false,
  "claims": [
    {
      "claim": "one supported claim in the detected answer language",
      "explanation": "short explanation in the detected answer language",
      "sourcePaperIds": ["paper_id"],
      "evidence": [
        {
          "paperId": "paper_id",
          "evidenceText": "short evidence span from the paper title, abstract, venue, or metadata",
          "supportLevel": "direct|indirect|weak"
        }
      ]
    }
  ],
  "suggestedFollowUpQuestions": ["optional follow-up question in the detected answer language"]
}

If the answer is not supported by selected papers, return:
{
  "question": "${input.question}",
  "outputLanguage": "${input.outputLanguage}",
  "answer": "state that the selected sources do not contain enough evidence",
  "confidence": "low",
  "notAnswerableFromSources": true,
  "claims": [],
  "suggestedFollowUpQuestions": []
}

Selected papers:
${papersJson}`;
}

export function validateBriefAnswerGrounding(
  answer: BriefAnswer,
  papers: NormalizedPaper[]
) {
  const paperIds = new Set(papers.map((paper) => paper.id));
  const papersById = new Map(papers.map((paper) => [paper.id, paper]));

  if (answer.notAnswerableFromSources) {
    if (answer.claims.length > 0) {
      throw new Error("Not-answerable responses must not include sourced claims.");
    }

    return;
  }

  for (const claim of answer.claims) {
    for (const id of claim.sourcePaperIds) {
      if (!paperIds.has(id)) {
        throw new Error(`answer claim cites unknown paperId: ${id}`);
      }
    }

    const additionalSupportText = claim.sourcePaperIds
      .map((id) => {
        const paper = papersById.get(id);

        if (!paper) {
          return "";
        }

        return [
          paper.title,
          paper.abstract,
          paper.venue,
          paper.authors.join(" "),
          paper.year?.toString()
        ]
          .filter(Boolean)
          .join(" ");
      })
      .join(" ");

    validateClaimGrounding({
      evidence: claim.evidence,
      sourcePaperIds: claim.sourcePaperIds,
      section: "answer claim",
      claimText: `${claim.claim} ${claim.explanation}`,
      papers,
      allowsWeakSupport: answer.confidence === "low",
      additionalSupportText
    });
  }
}

export async function synthesizeAnswer(input: SynthesizeAnswerInput) {
  if (isSelectionRationaleQuestion(input.question)) {
    return synthesizeSelectionRationale(input);
  }

  const provider = createAIProvider();
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await provider.generateStructured({
        schemaName: "BriefAnswer",
        systemPrompt: answerSystemPrompt,
        userPrompt: buildAnswerPrompt(input)
      });
      const rawObject =
        raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};

      const parsed = BriefAnswerSchema.parse({
        ...rawObject,
        question: input.question,
        outputLanguage: input.outputLanguage
      });

      validateBriefAnswerGrounding(parsed, input.papers);
      return parsed;
    } catch (error) {
      if (error instanceof AIConfigurationError || error instanceof AIProviderError) {
        throw error;
      }

      lastError = error;
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : "AI answer validation failed.";

  throw new Error(`Could not generate a valid grounded answer: ${message}`);
}
