import type { OutputLanguage } from "@/lib/utils/language";
import { getLanguageInstruction } from "@/lib/utils/language";
import type { NormalizedPaper } from "@/lib/sources/types";

export const researchSynthesisSystemPrompt = `You are a research synthesis assistant.

You must only make claims supported by the provided papers.
Every key finding, major theme, research gap, and uncertainty must include sourcePaperIds.
Every executive summary, key finding, major theme, research gap, and uncertainty must include evidence snippets.
Do not invent authors, papers, citations, DOI values, URLs, venues, or facts.
Detect the language of the original query and write the brief in that same language.
Search query variants may be in English, but the final report language must still match the original query language.
Keep paper titles, author names, journal names, venue names, and DOI values unchanged.
If the query is Polish, write all summaries, explanations, findings, gaps, uncertainties, and recommendations in Polish.
If evidence is weak, mark confidence as low.
If papers disagree or evidence is indirect, include caveats.
Evidence snippets must be short text spans copied or tightly paraphrased from the selected paper title, abstract, venue, or metadata.
Each evidence snippet must cite a paperId that is also present in the item's sourcePaperIds.
Do not use comparative, superlative, quantitative, statistical, causal, or absolute wording unless the same detail appears in the evidence snippets.
Avoid phrases such as "more than", "better than", "reduced", "increased", "eliminates", "significant", "outperforms", "leading", or exact percentages unless the evidence snippets contain that detail.
Do not put raw paper IDs inside prose fields. Put citations only in sourcePaperIds arrays and influentialPapers.paperId.
Return only valid JSON matching the schema.
Use the exact property names requested by the user prompt.
Do not rename properties.
Do not return markdown.
Do not wrap the JSON in code fences.`;

export function buildResearchSynthesisPrompt(input: {
  query: string;
  outputLanguage: OutputLanguage;
  papers: NormalizedPaper[];
  queryVariants: string[];
  validationFeedback?: string;
}) {
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

  const paperIds = input.papers.map((paper) => paper.id);
  const bibliography = input.papers.map((paper) => ({
    paperId: paper.id,
    title: paper.title,
    authors: paper.authors,
    year: paper.year,
    url: paper.sourceUrls[0] ?? null,
    doi: paper.doi
  }));

  return `Original query:
${input.query}

Detected output language:
${input.outputLanguage}

Language instruction:
${getLanguageInstruction(input.outputLanguage)}

Query variants used:
${JSON.stringify(input.queryVariants)}

You are given a list of papers with IDs, titles, abstracts, years, authors, citation counts, DOI values, venues, and URLs.

Your task:
1. Summarize the current research landscape.
2. Identify major themes.
3. Extract key findings.
4. Identify research gaps.
5. Identify controversies or uncertainties.
6. Suggest next research questions.
7. Cite paper IDs for every important claim.
8. Add evidence snippets for every important claim using the evidence array.
9. Prefer concrete claims over generic summaries: include mechanisms, measured effects, evaluation settings, populations, materials, or implementation constraints when the papers support them.
10. When evidence is thin or selected papers are few, say so plainly instead of over-generalizing.
11. Keep the output compact enough for reliable JSON generation: use at most 3 keyFindings, 3 majorThemes, 3 researchGaps, 2 controversiesOrUncertainties, 4 influentialPapers, and 5 suggestedNextQuestions.
12. Keep each evidence array to 1 or 2 short evidence snippets.

Return exactly one JSON object with these keys:
id, query, outputLanguage, generatedAt, title, tldr, executiveSummary, keyFindings, majorThemes, influentialPapers, researchGaps, controversiesOrUncertainties, suggestedNextQuestions, searchSummary, bibliography.

Use only paper IDs from this list:
${JSON.stringify(paperIds)}

The JSON object must match this shape exactly:
{
  "id": "will_be_overwritten_by_server",
  "query": "original query",
  "outputLanguage": "${input.outputLanguage}",
  "generatedAt": "ISO timestamp",
  "title": "brief title in the final report language",
  "tldr": "short TL;DR in the final report language",
  "executiveSummary": {
    "paragraph": "summary paragraph in the final report language",
    "sourcePaperIds": ["paper_id"],
    "evidence": [
      {
        "paperId": "paper_id",
        "evidenceText": "short evidence span from the paper title, abstract, venue, or metadata",
        "supportLevel": "direct|indirect|weak"
      }
    ]
  },
  "keyFindings": [
    {
      "finding": "finding in the final report language",
      "explanation": "explanation in the final report language",
      "confidence": "low|medium|high",
      "sourcePaperIds": ["paper_id"],
      "evidence": [
        {
          "paperId": "paper_id",
          "evidenceText": "short evidence span from the paper title, abstract, venue, or metadata",
          "supportLevel": "direct|indirect|weak"
        }
      ],
      "caveats": ["optional caveat in the final report language"]
    }
  ],
  "majorThemes": [
    {
      "theme": "theme in the final report language",
      "description": "description in the final report language",
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
  "influentialPapers": [
    {
      "paperId": "paper_id",
      "reason": "reason in the final report language"
    }
  ],
  "researchGaps": [
    {
      "gap": "gap in the final report language",
      "whyItMatters": "why it matters in the final report language",
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
  "controversiesOrUncertainties": [
    {
      "issue": "issue in the final report language",
      "explanation": "explanation in the final report language",
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
  "suggestedNextQuestions": ["question in the final report language"],
  "searchSummary": {
    "requestedSources": ["mock"],
    "sourcesUsed": ["mock"],
    "totalFound": ${input.papers.length},
    "totalAfterDeduplication": ${input.papers.length},
    "totalUsedInBrief": ${input.papers.length},
    "queryVariants": ${JSON.stringify(input.queryVariants)},
    "sourceDiagnostics": [],
    "warnings": []
  },
  "bibliography": ${JSON.stringify(bibliography)}
}

The bibliography must use exactly these bibliography objects and must keep titles, authors, URLs, DOI values, and venues unchanged.

${
  input.validationFeedback
    ? `Previous output failed server-side grounding validation:
${input.validationFeedback}

Repair instruction:
Regenerate the entire JSON object. Make every claim narrower and ensure every comparative, quantitative, causal, or absolute detail appears directly in the cited evidence snippets. If the selected evidence is too weak, lower confidence and state uncertainty instead of strengthening the claim.`
    : ""
}

Papers:
${papersJson}`;
}
