import {
  GithubIdeaCollectorResultSchema,
  IdeaSourceRepoSchema
} from "@/lib/project-ideas/schemas";
import type {
  GithubIdeaCollectorDiagnostics,
  GithubIdeaCollectorResult,
  IdeaSourceRepo,
  RepoIssueSignal
} from "@/lib/project-ideas/types";

export type FetchLike = (
  input: string,
  init?: {
    headers?: Record<string, string>;
    signal?: AbortSignal;
  }
) => Promise<{
  ok: boolean;
  status: number;
  headers: {
    get(name: string): string | null;
  };
  json(): Promise<unknown>;
}>;

type CollectGithubIdeaSourceReposInput = {
  query: string;
  maxRepos?: number;
  token?: string;
  timeoutMs?: number;
  includeReadme?: boolean;
  includeIssues?: boolean;
  fetchFn?: FetchLike;
  cacheTtlMs?: number;
};

type CollectGithubReposByFullNameInput = {
  repoFullNames: string[];
  token?: string;
  timeoutMs?: number;
  includeReadme?: boolean;
  includeIssues?: boolean;
  fetchFn?: FetchLike;
  cacheTtlMs?: number;
};

type GithubRepoSearchItem = {
  id?: number;
  name?: string;
  full_name?: string;
  owner?: {
    login?: string;
  };
  html_url?: string;
  description?: string | null;
  topics?: string[];
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  created_at?: string;
  pushed_at?: string;
};

type GithubIssueItem = {
  title?: string;
  body?: string | null;
  labels?: Array<string | { name?: string }>;
  pull_request?: unknown;
};

type CacheRecord = {
  createdAt: number;
  result: GithubIdeaCollectorResult;
};

const defaultTimeoutMs = 10_000;
const defaultCacheTtlMs = 10 * 60 * 1000;
const cache = new Map<string, CacheRecord>();

function sanitizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);
}

function githubHeaders(token?: string) {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ai-research-brief-generator-project-ideas",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function parseRateLimit(headers: { get(name: string): string | null }) {
  const limit = Number(headers.get("x-ratelimit-limit"));
  const remaining = Number(headers.get("x-ratelimit-remaining"));
  const reset = Number(headers.get("x-ratelimit-reset"));

  if (
    !Number.isFinite(limit) &&
    !Number.isFinite(remaining) &&
    !Number.isFinite(reset)
  ) {
    return null;
  }

  return {
    limit: Number.isFinite(limit) ? limit : null,
    remaining: Number.isFinite(remaining) ? remaining : null,
    resetAt: Number.isFinite(reset) ? new Date(reset * 1000).toISOString() : null
  };
}

function toSearchUrl(query: string, maxRepos: number) {
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", query);
  url.searchParams.set("sort", "stars");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", String(maxRepos));
  return url.toString();
}

function toRepoUrl(repoFullName: string) {
  return `https://api.github.com/repos/${repoFullName}`;
}

function base64Decode(value: string) {
  return Buffer.from(value.replace(/\n/g, ""), "base64").toString("utf8");
}

function labelName(label: string | { name?: string }) {
  return typeof label === "string" ? label : label.name ?? "";
}

function issueBody(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || "No issue body provided.";
}

function fallbackReadme(repo: GithubRepoSearchItem) {
  return [
    repo.description ?? repo.name ?? "GitHub repository",
    repo.topics?.length ? `Topics: ${repo.topics.join(", ")}` : "",
    repo.language ? `Primary language: ${repo.language}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeRepo(
  repo: GithubRepoSearchItem,
  readmeText: string,
  issueSignals: RepoIssueSignal[]
): IdeaSourceRepo | null {
  const fullName = repo.full_name ?? repo.name;
  const owner = repo.owner?.login ?? fullName?.split("/")[0];
  const name = repo.name ?? fullName?.split("/").at(-1);

  if (!fullName || !owner || !name || !repo.html_url) {
    return null;
  }

  return IdeaSourceRepoSchema.parse({
    repoId: `github_${sanitizeSlug(fullName)}`,
    name,
    owner,
    url: repo.html_url,
    description: repo.description ?? name,
    topics: repo.topics ?? [],
    primaryLanguage: repo.language ?? null,
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    openIssues: repo.open_issues_count ?? null,
    createdAt: repo.created_at ?? new Date(0).toISOString(),
    pushedAt: repo.pushed_at ?? new Date(0).toISOString(),
    readmeText: readmeText.trim() || fallbackReadme(repo),
    issueSignals
  });
}

async function fetchJson(input: {
  fetchFn: FetchLike;
  url: string;
  token?: string;
  signal: AbortSignal;
}) {
  const response = await input.fetchFn(input.url, {
    headers: githubHeaders(input.token),
    signal: input.signal
  });

  return {
    response,
    json: await response.json()
  };
}

async function fetchReadme(input: {
  fetchFn: FetchLike;
  repo: GithubRepoSearchItem;
  token?: string;
  signal: AbortSignal;
}) {
  const fullName = input.repo.full_name;
  if (!fullName) {
    return null;
  }

  const url = `https://api.github.com/repos/${fullName}/readme`;
  const { response, json } = await fetchJson({
    fetchFn: input.fetchFn,
    url,
    token: input.token,
    signal: input.signal
  });

  if (!response.ok || typeof json !== "object" || json === null) {
    return null;
  }

  const content = (json as { content?: unknown }).content;
  if (typeof content !== "string") {
    return null;
  }

  return base64Decode(content);
}

async function fetchIssues(input: {
  fetchFn: FetchLike;
  repo: GithubRepoSearchItem;
  token?: string;
  signal: AbortSignal;
}) {
  const fullName = input.repo.full_name;
  if (!fullName) {
    return [];
  }

  const url = new URL(`https://api.github.com/repos/${fullName}/issues`);
  url.searchParams.set("state", "open");
  url.searchParams.set("sort", "updated");
  url.searchParams.set("direction", "desc");
  url.searchParams.set("per_page", "5");

  const { response, json } = await fetchJson({
    fetchFn: input.fetchFn,
    url: url.toString(),
    token: input.token,
    signal: input.signal
  });

  if (!response.ok || !Array.isArray(json)) {
    return [];
  }

  return json
    .filter((item: GithubIssueItem) => !item.pull_request)
    .map((item: GithubIssueItem) => ({
      title: item.title ?? "Untitled issue",
      body: issueBody(item.body),
      labels: (item.labels ?? []).map(labelName).filter(Boolean)
    }))
    .slice(0, 5);
}

async function withTimeout<T>(timeoutMs: number, run: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isAbortError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" ||
      error.message.toLowerCase().includes("aborted"))
  );
}

function cacheKey(input: CollectGithubIdeaSourceReposInput, searchUrl: string) {
  return [
    searchUrl,
    input.includeReadme ?? true,
    input.includeIssues ?? true,
    input.maxRepos ?? 10
  ].join("|");
}

function repoFullNamesCacheKey(input: CollectGithubReposByFullNameInput) {
  return [
    "repoFullNames",
    [...new Set(input.repoFullNames.map((repoFullName) => repoFullName.toLowerCase()))]
      .sort()
      .join(","),
    input.includeReadme ?? true,
    input.includeIssues ?? true
  ].join("|");
}

export function clearGithubIdeaCollectorCache() {
  cache.clear();
}

export async function collectGithubIdeaSourceRepos(
  input: CollectGithubIdeaSourceReposInput
): Promise<GithubIdeaCollectorResult> {
  const maxRepos = Math.max(1, Math.min(input.maxRepos ?? 10, 100));
  const searchUrl = toSearchUrl(input.query, maxRepos);
  const key = cacheKey(input, searchUrl);
  const ttlMs = input.cacheTtlMs ?? defaultCacheTtlMs;
  const cached = cache.get(key);

  if (cached && Date.now() - cached.createdAt <= ttlMs) {
    return GithubIdeaCollectorResultSchema.parse({
      ...cached.result,
      diagnostics: {
        ...cached.result.diagnostics,
        cached: true
      }
    });
  }

  const fetchFn = input.fetchFn ?? globalThis.fetch;
  const warnings: string[] = [];
  let readmeFetchedCount = 0;
  let issuesFetchedCount = 0;

  const result = await withTimeout(input.timeoutMs ?? defaultTimeoutMs, async (signal) => {
    const { response, json } = await fetchJson({
      fetchFn: fetchFn as FetchLike,
      url: searchUrl,
      token: input.token,
      signal
    });
    const rateLimit = parseRateLimit(response.headers);

    if (!response.ok) {
      const message =
        typeof json === "object" && json && "message" in json
          ? String((json as { message?: unknown }).message)
          : `GitHub search failed with HTTP ${response.status}`;

      const diagnostics: GithubIdeaCollectorDiagnostics = {
        source: "github",
        query: input.query,
        searchUrl,
        cached: false,
        fetchedRepoCount: 0,
        returnedRepoCount: 0,
        readmeFetchedCount: 0,
        issuesFetchedCount: 0,
        rateLimit,
        warnings: [message]
      };

      return GithubIdeaCollectorResultSchema.parse({
        sourceRepos: [],
        diagnostics
      });
    }

    const items =
      typeof json === "object" && json && Array.isArray((json as { items?: unknown }).items)
        ? ((json as { items: GithubRepoSearchItem[] }).items)
        : [];
    const sourceRepos: IdeaSourceRepo[] = [];

    for (const item of items.slice(0, maxRepos)) {
      let readmeText = fallbackReadme(item);
      let issueSignals: RepoIssueSignal[] = [];

      if (input.includeReadme ?? true) {
        try {
          const readme = await fetchReadme({
            fetchFn: fetchFn as FetchLike,
            repo: item,
            token: input.token,
            signal
          });
          if (readme) {
            readmeText = readme;
            readmeFetchedCount += 1;
          }
        } catch (error) {
          warnings.push(
            `README fetch failed for ${item.full_name ?? item.name}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      if (input.includeIssues ?? true) {
        try {
          issueSignals = await fetchIssues({
            fetchFn: fetchFn as FetchLike,
            repo: item,
            token: input.token,
            signal
          });
          if (issueSignals.length > 0) {
            issuesFetchedCount += 1;
          }
        } catch (error) {
          warnings.push(
            `Issue fetch failed for ${item.full_name ?? item.name}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      const normalized = normalizeRepo(item, readmeText, issueSignals);
      if (normalized) {
        sourceRepos.push(normalized);
      }
    }

    return GithubIdeaCollectorResultSchema.parse({
      sourceRepos,
      diagnostics: {
        source: "github",
        query: input.query,
        searchUrl,
        cached: false,
        fetchedRepoCount: items.length,
        returnedRepoCount: sourceRepos.length,
        readmeFetchedCount,
        issuesFetchedCount,
        rateLimit,
        warnings
      }
    });
  });

  cache.set(key, {
    createdAt: Date.now(),
    result
  });

  return result;
}

export async function collectGithubIdeaSourceReposByFullName(
  input: CollectGithubReposByFullNameInput
): Promise<GithubIdeaCollectorResult> {
  const repoFullNames = [...new Set(input.repoFullNames)]
    .filter((repoFullName) => /^[^/\s]+\/[^/\s]+$/.test(repoFullName))
    .slice(0, 100);
  const key = repoFullNamesCacheKey({ ...input, repoFullNames });
  const ttlMs = input.cacheTtlMs ?? defaultCacheTtlMs;
  const cached = cache.get(key);

  if (cached && Date.now() - cached.createdAt <= ttlMs) {
    return GithubIdeaCollectorResultSchema.parse({
      ...cached.result,
      diagnostics: {
        ...cached.result.diagnostics,
        cached: true
      }
    });
  }

  const fetchFn = input.fetchFn ?? globalThis.fetch;
  const warnings: string[] = [];
  let readmeFetchedCount = 0;
  let issuesFetchedCount = 0;
  let rateLimit: GithubIdeaCollectorDiagnostics["rateLimit"] = null;

  const result = await withTimeout(input.timeoutMs ?? defaultTimeoutMs, async (signal) => {
    const sourceRepos: IdeaSourceRepo[] = [];

    for (const repoFullName of repoFullNames) {
      let response: Awaited<ReturnType<FetchLike>>;
      let json: unknown;

      try {
        const fetched = await fetchJson({
          fetchFn: fetchFn as FetchLike,
          url: toRepoUrl(repoFullName),
          token: input.token,
          signal
        });
        response = fetched.response;
        json = fetched.json;
      } catch (error) {
        warnings.push(
          `Repo fetch failed for ${repoFullName}: ${errorMessage(error)}`
        );

        if (signal.aborted || isAbortError(error)) {
          warnings.push(
            `GitHub enrichment stopped after timeout; returned ${sourceRepos.length}/${repoFullNames.length} repos.`
          );
          break;
        }

        continue;
      }

      rateLimit = rateLimit ?? parseRateLimit(response.headers);

      if (!response.ok || typeof json !== "object" || json === null) {
        const message =
          typeof json === "object" && json && "message" in json
            ? String((json as { message?: unknown }).message)
            : `GitHub repo fetch failed for ${repoFullName} with HTTP ${response.status}`;
        warnings.push(message);
        continue;
      }

      const repo = json as GithubRepoSearchItem;
      let readmeText = fallbackReadme(repo);
      let issueSignals: RepoIssueSignal[] = [];
      let stopAfterRepo = false;

      if (input.includeReadme ?? true) {
        try {
          const readme = await fetchReadme({
            fetchFn: fetchFn as FetchLike,
            repo,
            token: input.token,
            signal
          });
          if (readme) {
            readmeText = readme;
            readmeFetchedCount += 1;
          }
        } catch (error) {
          warnings.push(
            `README fetch failed for ${repo.full_name ?? repo.name}: ${
              errorMessage(error)
            }`
          );
          stopAfterRepo = signal.aborted || isAbortError(error);
        }
      }

      if (!stopAfterRepo && (input.includeIssues ?? true)) {
        try {
          issueSignals = await fetchIssues({
            fetchFn: fetchFn as FetchLike,
            repo,
            token: input.token,
            signal
          });
          if (issueSignals.length > 0) {
            issuesFetchedCount += 1;
          }
        } catch (error) {
          warnings.push(
            `Issue fetch failed for ${repo.full_name ?? repo.name}: ${
              errorMessage(error)
            }`
          );
          stopAfterRepo = signal.aborted || isAbortError(error);
        }
      }

      const normalized = normalizeRepo(repo, readmeText, issueSignals);
      if (normalized) {
        sourceRepos.push(normalized);
      }

      if (stopAfterRepo) {
        warnings.push(
          `GitHub enrichment stopped after timeout; returned ${sourceRepos.length}/${repoFullNames.length} repos.`
        );
        break;
      }
    }

    const query = repoFullNames.join(", ");
    const searchUrl = repoFullNames.length
      ? toRepoUrl(repoFullNames[0])
      : "https://api.github.com/repos/empty/empty";

    return GithubIdeaCollectorResultSchema.parse({
      sourceRepos,
      diagnostics: {
        source: "github",
        query: query || "repoFullNames:empty",
        searchUrl,
        cached: false,
        fetchedRepoCount: repoFullNames.length,
        returnedRepoCount: sourceRepos.length,
        readmeFetchedCount,
        issuesFetchedCount,
        rateLimit,
        warnings
      }
    });
  });

  cache.set(key, {
    createdAt: Date.now(),
    result
  });

  return result;
}
