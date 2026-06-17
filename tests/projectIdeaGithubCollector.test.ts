import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  clearGithubIdeaCollectorCache,
  collectGithubIdeaSourceReposByFullName,
  collectGithubIdeaSourceRepos,
  GithubIdeaCollectorResultSchema
} from "@/lib/project-ideas";

function response(input: {
  ok?: boolean;
  status?: number;
  json: unknown;
  headers?: Record<string, string>;
}) {
  const headers = new Map(
    Object.entries(input.headers ?? {}).map(([key, value]) => [
      key.toLowerCase(),
      value
    ])
  );

  return {
    ok: input.ok ?? true,
    status: input.status ?? 200,
    headers: {
      get(name: string) {
        return headers.get(name.toLowerCase()) ?? null;
      }
    },
    async json() {
      return input.json;
    }
  };
}

describe("collectGithubIdeaSourceRepos", () => {
  beforeEach(() => {
    clearGithubIdeaCollectorCache();
  });

  it("maps GitHub repository search results into IdeaSourceRepo records", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        response({
          headers: {
            "x-ratelimit-limit": "30",
            "x-ratelimit-remaining": "29",
            "x-ratelimit-reset": "1780000000"
          },
          json: {
            items: [
              {
                id: 123,
                name: "ai-code-review-agent",
                full_name: "example/ai-code-review-agent",
                owner: { login: "example" },
                html_url: "https://github.com/example/ai-code-review-agent",
                description: "AI code review agent.",
                topics: ["ai", "code-review"],
                language: "TypeScript",
                stargazers_count: 1200,
                forks_count: 90,
                open_issues_count: 12,
                created_at: "2025-01-01T00:00:00.000Z",
                pushed_at: "2026-05-01T00:00:00.000Z"
              }
            ]
          }
        })
      )
      .mockResolvedValueOnce(
        response({
          json: {
            content: Buffer.from(
              "README: AI code review agent for pull request analysis."
            ).toString("base64")
          }
        })
      )
      .mockResolvedValueOnce(
        response({
          json: [
            {
              title: "Need sprint planning",
              body: "Code review is useful, but planning refactors is missing.",
              labels: [{ name: "enhancement" }]
            },
            {
              title: "PR item should be ignored",
              body: "Pull request payload.",
              labels: [],
              pull_request: {}
            }
          ]
        })
      );

    const result = await collectGithubIdeaSourceRepos({
      query: "topic:ai stars:>100",
      maxRepos: 1,
      fetchFn,
      token: "test-token"
    });

    expect(GithubIdeaCollectorResultSchema.parse(result)).toEqual(result);
    expect(result.sourceRepos).toHaveLength(1);
    expect(result.sourceRepos[0]).toMatchObject({
      repoId: "github_example_ai_code_review_agent",
      name: "ai-code-review-agent",
      owner: "example",
      readmeText: "README: AI code review agent for pull request analysis."
    });
    expect(result.sourceRepos[0]?.issueSignals).toHaveLength(1);
    expect(result.diagnostics).toMatchObject({
      cached: false,
      fetchedRepoCount: 1,
      returnedRepoCount: 1,
      readmeFetchedCount: 1,
      issuesFetchedCount: 1
    });
    expect(result.diagnostics.rateLimit?.remaining).toBe(29);
    expect(fetchFn.mock.calls[0]?.[1]?.headers?.Authorization).toBe(
      "Bearer test-token"
    );
  });

  it("serves identical requests from cache", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      response({
        json: {
          items: [
            {
              name: "ai-data-agent",
              full_name: "example/ai-data-agent",
              owner: { login: "example" },
              html_url: "https://github.com/example/ai-data-agent",
              description: "AI data analytics agent.",
              topics: ["ai", "analytics"],
              language: "TypeScript",
              stargazers_count: 500,
              forks_count: 25,
              open_issues_count: 3,
              created_at: "2025-01-01T00:00:00.000Z",
              pushed_at: "2026-05-01T00:00:00.000Z"
            }
          ]
        }
      })
    );

    const first = await collectGithubIdeaSourceRepos({
      query: "topic:ai data",
      maxRepos: 1,
      includeReadme: false,
      includeIssues: false,
      fetchFn
    });
    const second = await collectGithubIdeaSourceRepos({
      query: "topic:ai data",
      maxRepos: 1,
      includeReadme: false,
      includeIssues: false,
      fetchFn
    });

    expect(first.diagnostics.cached).toBe(false);
    expect(second.diagnostics.cached).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("returns diagnostics instead of throwing on GitHub search failure", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      response({
        ok: false,
        status: 403,
        headers: {
          "x-ratelimit-limit": "10",
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": "1780000000"
        },
        json: {
          message: "API rate limit exceeded"
        }
      })
    );

    const result = await collectGithubIdeaSourceRepos({
      query: "topic:ai",
      fetchFn
    });

    expect(result.sourceRepos).toEqual([]);
    expect(result.diagnostics.returnedRepoCount).toBe(0);
    expect(result.diagnostics.warnings).toContain("API rate limit exceeded");
    expect(result.diagnostics.rateLimit?.remaining).toBe(0);
  });

  it("normalizes empty issue bodies while enriching explicit repo names", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        response({
          json: {
            id: 456,
            name: "agent-workflow-kit",
            full_name: "example/agent-workflow-kit",
            owner: { login: "example" },
            html_url: "https://github.com/example/agent-workflow-kit",
            description: "AI agent framework for tool workflows.",
            topics: ["ai", "agents", "workflow"],
            language: "Python",
            stargazers_count: 4200,
            forks_count: 330,
            open_issues_count: 38,
            created_at: "2025-01-01T00:00:00.000Z",
            pushed_at: "2026-05-01T00:00:00.000Z"
          }
        })
      )
      .mockResolvedValueOnce(
        response({
          json: {
            content: Buffer.from(
              "README: AI agent framework for tool workflows."
            ).toString("base64")
          }
        })
      )
      .mockResolvedValueOnce(
        response({
          json: [
            {
              title: "Empty issue body from GitHub",
              body: "",
              labels: [{ name: "enhancement" }]
            }
          ]
        })
      );

    const result = await collectGithubIdeaSourceReposByFullName({
      repoFullNames: ["example/agent-workflow-kit"],
      fetchFn
    });

    expect(GithubIdeaCollectorResultSchema.parse(result)).toEqual(result);
    expect(result.sourceRepos[0]?.issueSignals[0]).toMatchObject({
      title: "Empty issue body from GitHub",
      body: "No issue body provided."
    });
  });

  it("returns partial diagnostics instead of throwing when explicit repo enrichment times out", async () => {
    const fetchFn = vi.fn(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise<ReturnType<typeof response>>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("This operation was aborted", "AbortError"));
          });
        })
    );

    const result = await collectGithubIdeaSourceReposByFullName({
      repoFullNames: ["example/slow-agent"],
      fetchFn,
      timeoutMs: 5
    });

    expect(result.sourceRepos).toEqual([]);
    expect(result.diagnostics.returnedRepoCount).toBe(0);
    expect(result.diagnostics.warnings.join("\n")).toContain(
      "GitHub enrichment stopped after timeout"
    );
  });
});
