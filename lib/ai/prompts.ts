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

function truncateForPrompt(value: string | null, limit = 900) {
  if (!value) {
    return value;
  }

  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > limit ? `${trimmed.slice(0, limit - 3)}...` : trimmed;
}

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
      abstract: truncateForPrompt(paper.abstract),
      authors: paper.authors.slice(0, 8),
      year: paper.year,
      venue: paper.venue,
      doi: paper.doi,
      citationCount: paper.citationCount,
      urls: paper.sourceUrls.slice(0, 2)
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

You are given papers with IDs, titles, abstracts, years, authors, citations, DOI values, venues, and URLs.

Return one compact JSON object. Use exactly:
- 2 keyFindings
- 2 majorThemes
- 1 researchGap
- 1 controversyOrUncertainty
- 3 influentialPapers
- 3 suggestedNextQuestions
- 1 evidence snippet per claim unless a second snippet is essential

Keep the JSON short and easy to parse:
- title <= 120 characters
- tldr <= 220 characters
- executiveSummary.paragraph <= 420 characters
- finding, theme, gap, issue <= 140 characters each
- explanation, description, whyItMatters <= 260 characters each
- evidenceText <= 220 characters each
- suggestedNextQuestions <= 120 characters each
- Do not use markdown, bullet characters, newline characters inside JSON strings, or unescaped quotes inside string values.

Every executiveSummary, keyFinding, majorTheme, researchGap, and uncertainty needs sourcePaperIds and evidence.
Evidence snippets must be short spans copied or tightly paraphrased from the supplied title, abstract, venue, year, or metadata.
Keep claims narrow. Do not add quantitative, comparative, causal, or absolute wording unless that same detail is in the evidence snippet.

Required top-level keys:
id, query, outputLanguage, generatedAt, title, tldr, executiveSummary, keyFindings, majorThemes, influentialPapers, researchGaps, controversiesOrUncertainties, suggestedNextQuestions, searchSummary, bibliography.

Use only paper IDs from this list:
${JSON.stringify(paperIds)}

Use this compact shape exactly:
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
      {"paperId": "paper_id", "evidenceText": "short evidence span", "supportLevel": "direct|indirect|weak"}
    ]
  },
  "keyFindings": [
    {
      "finding": "finding in the final report language",
      "explanation": "explanation in the final report language",
      "confidence": "low|medium|high",
      "sourcePaperIds": ["paper_id"],
      "evidence": [
        {"paperId": "paper_id", "evidenceText": "short evidence span", "supportLevel": "direct|indirect|weak"}
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
        {"paperId": "paper_id", "evidenceText": "short evidence span", "supportLevel": "direct|indirect|weak"}
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
        {"paperId": "paper_id", "evidenceText": "short evidence span", "supportLevel": "direct|indirect|weak"}
      ]
    }
  ],
  "controversiesOrUncertainties": [
    {
      "issue": "issue in the final report language",
      "explanation": "explanation in the final report language",
      "sourcePaperIds": ["paper_id"],
      "evidence": [
        {"paperId": "paper_id", "evidenceText": "short evidence span", "supportLevel": "direct|indirect|weak"}
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
