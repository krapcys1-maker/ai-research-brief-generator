import { beforeEach, describe, expect, it } from "vitest";
import { createBrief, createPaper } from "@/tests/fixtures";
import { inMemoryBriefRepository } from "@/lib/storage/inMemoryBriefStore";

describe("inMemoryBriefRepository", () => {
  beforeEach(async () => {
    await inMemoryBriefRepository.clear();
  });

  it("saves, loads, lists, and clears brief records through the repository contract", async () => {
    const brief = createBrief({ id: "brief_repo_test" });
    const paper = createPaper();

    const saved = await inMemoryBriefRepository.saveWithPapers({
      brief,
      papers: [paper]
    });

    expect(saved.brief.id).toBe("brief_repo_test");
    expect(await inMemoryBriefRepository.getById("brief_repo_test")).toEqual(saved);
    expect(await inMemoryBriefRepository.list()).toHaveLength(1);
    expect(await inMemoryBriefRepository.listSummaries()).toEqual([
      {
        id: brief.id,
        title: brief.title,
        query: brief.query,
        generatedAt: brief.generatedAt,
        outputLanguage: brief.outputLanguage,
        createdAt: saved.createdAt
      }
    ]);

    await inMemoryBriefRepository.clear();
    expect(await inMemoryBriefRepository.getById("brief_repo_test")).toBeNull();
  });
});
