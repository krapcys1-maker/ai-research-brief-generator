import { beforeEach, describe, expect, it } from "vitest";
import {
  clearSourceApiMemoryCacheForTests,
  getCachedSourcePapers,
  setCachedSourcePapers
} from "@/lib/storage/sourceApiCache";

describe("source API cache", () => {
  beforeEach(() => {
    clearSourceApiMemoryCacheForTests();
  });

  it("does not cache empty source responses", async () => {
    const input = {
      source: "openalex" as const,
      query: "stem cells burn treatment",
      maxResults: 10
    };

    await setCachedSourcePapers(input, []);

    expect(await getCachedSourcePapers(input)).toBeNull();
  });
});
