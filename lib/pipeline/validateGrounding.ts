import type { ResearchBrief } from "@/lib/ai/schemas";
import type { NormalizedPaper } from "@/lib/sources/types";

export function validateBriefGrounding(
  brief: ResearchBrief,
  papers: NormalizedPaper[]
) {
  const paperIds = new Set(papers.map((paper) => paper.id));

  function assertValidPaperIds(ids: string[], section: string) {
    if (!ids.length) {
      throw new Error(`${section} has no sourcePaperIds`);
    }

    for (const id of ids) {
      if (!paperIds.has(id)) {
        throw new Error(`${section} cites unknown paperId: ${id}`);
      }
    }
  }

  assertValidPaperIds(
    brief.executiveSummary.sourcePaperIds,
    "executiveSummary"
  );

  for (const item of brief.keyFindings) {
    assertValidPaperIds(item.sourcePaperIds, "keyFinding");
  }

  for (const item of brief.majorThemes) {
    assertValidPaperIds(item.sourcePaperIds, "majorTheme");
  }

  for (const item of brief.researchGaps) {
    assertValidPaperIds(item.sourcePaperIds, "researchGap");
  }

  for (const item of brief.controversiesOrUncertainties) {
    assertValidPaperIds(item.sourcePaperIds, "controversyOrUncertainty");
  }

  for (const item of brief.influentialPapers) {
    if (!paperIds.has(item.paperId)) {
      throw new Error(`influentialPapers cites unknown paperId: ${item.paperId}`);
    }
  }

  for (const item of brief.bibliography) {
    if (!paperIds.has(item.paperId)) {
      throw new Error(`bibliography cites unknown paperId: ${item.paperId}`);
    }
  }
}
