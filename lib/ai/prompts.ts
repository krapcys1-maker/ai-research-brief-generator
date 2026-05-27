import type { OutputLanguage } from "@/lib/utils/language";
import { getLanguageInstruction } from "@/lib/utils/language";
import type { NormalizedPaper } from "@/lib/sources/types";

export const researchSynthesisSystemPrompt = `You are a research synthesis assistant.

You must only make claims supported by the provided papers.
Every key finding, major theme, research gap, and uncertainty must include sourcePaperIds.
Do not invent authors, papers, citations, DOI values, URLs, venues, or facts.
Detect the language of the original query and write the brief in that same language.
Search query variants may be in English, but the final report language must still match the original query language.
Keep paper titles, author names, journal names, venue names, and DOI values unchanged.
If the query is Polish, write all summaries, explanations, findings, gaps, uncertainties, and recommendations in Polish.
If evidence is weak, mark confidence as low.
If papers disagree or evidence is indirect, include caveats.
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
    "sourcePaperIds": ["paper_id"]
  },
  "keyFindings": [
    {
      "finding": "finding in the final report language",
      "explanation": "explanation in the final report language",
      "confidence": "low|medium|high",
      "sourcePaperIds": ["paper_id"],
      "caveats": ["optional caveat in the final report language"]
    }
  ],
  "majorThemes": [
    {
      "theme": "theme in the final report language",
      "description": "description in the final report language",
      "sourcePaperIds": ["paper_id"]
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
      "sourcePaperIds": ["paper_id"]
    }
  ],
  "controversiesOrUncertainties": [
    {
      "issue": "issue in the final report language",
      "explanation": "explanation in the final report language",
      "sourcePaperIds": ["paper_id"]
    }
  ],
  "suggestedNextQuestions": ["question in the final report language"],
  "searchSummary": {
    "sourcesUsed": ["mock"],
    "totalFound": ${input.papers.length},
    "totalAfterDeduplication": ${input.papers.length},
    "totalUsedInBrief": ${input.papers.length},
    "queryVariants": ${JSON.stringify(input.queryVariants)},
    "warnings": []
  },
  "bibliography": ${JSON.stringify(bibliography)}
}

The bibliography must use exactly these bibliography objects and must keep titles, authors, URLs, DOI values, and venues unchanged.

Papers:
${papersJson}`;
}
