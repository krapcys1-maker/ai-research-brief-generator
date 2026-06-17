import { describe, expect, it } from "vitest";
import { runControlledLiveBatchSampling } from "@/lib/project-ideas";
import type { FetchLike } from "@/lib/project-ideas";
import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const headers = {
  get(name: string) {
    const values: Record<string, string> = {
      "x-ratelimit-limit": "5000",
      "x-ratelimit-remaining": "4980",
      "x-ratelimit-reset": "1790000000"
    };

    return values[name.toLowerCase()] ?? null;
  }
};

const repoFixtures = {
  "sample/document-conversion-qa": {
    description: "Document conversion pipeline for PDF, Office documents and Markdown.",
    topics: ["document-conversion", "markdown", "pdf"],
    language: "TypeScript",
    readme:
      "Converts office documents and PDFs into Markdown for RAG ingestion with table handling.",
    issue:
      "Teams need QA fixtures for lost tables, citation drift, encoding problems and unsafe input handling."
  },
  "sample/context-budget-monitor": {
    description: "Context compression and token optimization for RAG chunks.",
    topics: ["context-compression", "rag", "token-optimization"],
    language: "Python",
    readme:
      "Compresses RAG chunks and agent context windows while tracking token budgets.",
    issue:
      "Users need evidence that compression keeps facts, code intent and citations before model calls."
  },
  "sample/provider-routing-health": {
    description: "Provider-management for Claude Code, Codex and Gemini CLI routing.",
    topics: ["provider-management", "codex", "gemini-cli"],
    language: "Go",
    readme:
      "Switches AI coding CLI providers and diagnoses capability mismatches.",
    issue:
      "Auth failures and model capability gaps need clearer fallback routes across AI coding CLIs."
  },
  "sample/agent-approval-console": {
    description: "Desktop client approval dialog for agent tool calls.",
    topics: ["agent", "approval-dialog", "tool-calls"],
    language: "TypeScript",
    readme:
      "Tracks command confirmation and security approval flows for agent desktop clients.",
    issue:
      "Users need recovery paths when command approval blocks legitimate automation or hides risk."
  },
  "sample/llm-release-radar": {
    description: "LLM inference deployment benchmark and model serving release tools.",
    topics: ["llm", "inference", "model-serving"],
    language: "Python",
    readme:
      "Model serving deployment repo with benchmark harness, rollback notes and inference release checks.",
    issue:
      "Platform teams need regression gates, cost checks and rollback planning before shipping model changes."
  }
} satisfies Record<
  string,
  {
    description: string;
    topics: string[];
    language: string;
    readme: string;
    issue: string;
  }
>;

const repoNames = Object.keys(repoFixtures);

const liveBqExecutor = (repoFullNames = repoNames) => (args: string[]) => {
  if (args.includes("--dry_run")) {
    return {
      status: 0,
      stdout:
        "Query successfully validated. Assuming the tables are not modified, running this query will process 120000000 bytes of data.",
      stderr: ""
    };
  }

  return {
    status: 0,
    stdout: JSON.stringify(
      repoFullNames.map((repoFullName, index) => ({
        repoFullName,
        stars: 600 - index * 20,
        forks: 80 - index * 5,
        pushes: 12 + index,
        issues: 4 + index,
        trendScore: 700 - index * 30
      }))
    ),
    stderr: ""
  };
};

const fixtureFetch: FetchLike = async (url) => {
  const parsed = new URL(url);
  const repoMatch = parsed.pathname.match(/^\/repos\/([^/]+\/[^/]+)(?:\/(readme|issues))?$/);
  const repoFullName = repoMatch?.[1];
  const endpoint = repoMatch?.[2];
  const fixture = repoFullName ? repoFixtures[repoFullName] : undefined;

  if (!repoFullName || !fixture) {
    return {
      ok: false,
      status: 404,
      headers,
      async json() {
        return { message: `Unexpected URL ${url}` };
      }
    };
  }

  if (endpoint === "readme") {
    return {
      ok: true,
      status: 200,
      headers,
      async json() {
        return { content: Buffer.from(fixture.readme).toString("base64") };
      }
    };
  }

  if (endpoint === "issues") {
    return {
      ok: true,
      status: 200,
      headers,
      async json() {
        return [
          {
            title: "Need stronger productized quality gates",
            body: fixture.issue,
            labels: [{ name: "enhancement" }]
          }
        ];
      }
    };
  }

  const [owner, name] = repoFullName.split("/");

  return {
    ok: true,
    status: 200,
    headers,
    async json() {
      return {
        id: repoFullName.length,
        name,
        full_name: repoFullName,
        owner: { login: owner },
        html_url: `https://github.com/${repoFullName}`,
        description: fixture.description,
        topics: fixture.topics,
        language: fixture.language,
        stargazers_count: 4200,
        forks_count: 380,
        open_issues_count: 36,
        created_at: "2025-01-01T12:00:00.000Z",
        pushed_at: "2026-05-25T12:00:00.000Z"
      };
    }
  };
};

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe("controlled live idea batch sampling", () => {
  it("stores only summarized dry-run artifacts and blocks spend by default", async () => {
    const outputDir = join(tmpdir(), `live-batch-dry-${Date.now()}`);
    const summary = await runControlledLiveBatchSampling({
      domain: "AI developer tools",
      windows: [
        { id: "day_1", startDate: "2025-01-01" },
        { id: "day_2", startDate: "2025-01-02" }
      ],
      maxReposPerWindow: 10,
      maxBytesBilledPerWindow: 200_000_000,
      outputDir,
      bqExecutor: liveBqExecutor()
    });
    const files = await readdir(outputDir);

    expect(summary.mode).toBe("dry_run");
    expect(summary.quality.verdict).toBe("ready_for_live");
    expect(summary.quality.passed).toBe(true);
    expect(summary.aggregate.sourceRepoCount).toBe(0);
    expect(summary.budget.totalEstimatedBytesProcessed).toBe(240_000_000);
    expect(files.sort()).toEqual([
      "controlled_live_batch_summary.json",
      "controlled_live_batch_summary.md"
    ]);
    expect(await exists(join(outputDir, "source_repos.json"))).toBe(false);
  });

  it("passes a controlled live sample only when enough enriched ideas are ready", async () => {
    const outputDir = join(tmpdir(), `live-batch-live-${Date.now()}`);
    const summary = await runControlledLiveBatchSampling({
      domain: "AI developer tools",
      constraints: ["avoid cloning source repositories", "MVP in two weeks"],
      windows: [{ id: "live_day", startDate: "2025-01-01" }],
      mode: "live",
      allowLiveSpend: true,
      maxReposPerWindow: 10,
      maxBytesBilledPerWindow: 200_000_000,
      minSourceReposForPass: 5,
      minReadyIdeasForPass: 3,
      maxIdeas: 5,
      outputDir,
      bqExecutor: liveBqExecutor(),
      fetchFn: fixtureFetch
    });
    const saved = JSON.parse(
      await readFile(join(outputDir, "controlled_live_batch_summary.json"), "utf8")
    );

    expect(summary.quality.passed).toBe(true);
    expect(summary.quality.verdict).toBe("ready");
    expect(summary.aggregate.sourceRepoCount).toBe(5);
    expect(summary.aggregate.handoffReadyCount).toBeGreaterThanOrEqual(3);
    expect(summary.aggregate.averageHandoffQualityScore).toBeGreaterThanOrEqual(82);
    expect(summary.shortlist.length).toBeGreaterThanOrEqual(3);
    expect(summary.repoEvidence).toHaveLength(5);
    expect(summary.repoEvidence[0]?.readmeExcerpt.length).toBeGreaterThan(20);
    expect(summary.scoredCandidates.length).toBeGreaterThanOrEqual(10);
    expect(summary.scoredCandidates.some((idea) => idea.verdict === "reject")).toBe(
      true
    );
    expect(summary.shortlist.map((idea) => idea.title)).toContain(
      "LLM Release Readiness Radar"
    );
    expect(saved.aggregate.auditScore).toBeGreaterThanOrEqual(70);
    expect(saved.repoEvidence).toHaveLength(5);
  });

  it("keeps too-small live samples out of the research pipeline", async () => {
    const outputDir = join(tmpdir(), `live-batch-small-${Date.now()}`);
    const summary = await runControlledLiveBatchSampling({
      domain: "AI developer tools",
      windows: [{ id: "too_small", startDate: "2025-01-01" }],
      mode: "live",
      allowLiveSpend: true,
      maxReposPerWindow: 10,
      maxBytesBilledPerWindow: 200_000_000,
      minSourceReposForPass: 5,
      minReadyIdeasForPass: 3,
      outputDir,
      bqExecutor: liveBqExecutor(["sample/llm-release-radar"]),
      fetchFn: fixtureFetch
    });

    expect(summary.quality.passed).toBe(false);
    expect(summary.quality.verdict).toBe("needs_review");
    expect(summary.quality.blockers.join(" ")).toContain("Only 1 enriched repos");
  });

  it("refuses live sampling unless live spend is explicitly allowed", async () => {
    await expect(() =>
      runControlledLiveBatchSampling({
        domain: "AI developer tools",
        windows: [{ id: "blocked_live", startDate: "2025-01-01" }],
        mode: "live",
        maxReposPerWindow: 10,
        maxBytesBilledPerWindow: 200_000_000,
        outputDir: join(tmpdir(), `live-batch-blocked-${Date.now()}`),
        bqExecutor: liveBqExecutor(),
        fetchFn: fixtureFetch
      })
    ).rejects.toThrow("allowLiveSpend=true");
  });
});
