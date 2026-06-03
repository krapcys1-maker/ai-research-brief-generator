import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GhArchiveTrendResultSchema } from "@/lib/project-ideas/schemas";
import type {
  GhArchiveTrendDiagnostics,
  GhArchiveTrendRepo,
  GhArchiveTrendResult
} from "@/lib/project-ideas/types";

type BqExecutor = (args: string[]) => {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
};

type CollectGhArchiveTrendsInput = {
  startDate: string;
  endDate?: string;
  maxRepos?: number;
  maxDays?: number;
  maxBytesBilled?: number;
  dryRun?: boolean;
  bqExecutor?: BqExecutor;
};

const defaultMaxRepos = 100;
const defaultMaxDays = 3;
const hardMaxDays = 7;
const defaultMaxBytesBilled = 500_000_000;

function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid date ${value}. Use YYYY-MM-DD.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date ${value}.`);
  }

  return date;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function tableSuffix(date: Date) {
  return formatDate(date).replace(/-/g, "");
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function daySpan(startDate: Date, endDate: Date) {
  const days: Date[] = [];
  let cursor = new Date(startDate);

  while (cursor <= endDate) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }

  return days;
}

function normalizeInput(input: CollectGhArchiveTrendsInput) {
  const startDate = parseDateOnly(input.startDate);
  const endDate = parseDateOnly(input.endDate ?? input.startDate);
  const maxDays = Math.min(input.maxDays ?? defaultMaxDays, hardMaxDays);

  if (endDate < startDate) {
    throw new Error("endDate must be after or equal to startDate.");
  }

  const days = daySpan(startDate, endDate);
  if (days.length > maxDays) {
    throw new Error(
      `GH Archive query spans ${days.length} days; maxDays is ${maxDays}.`
    );
  }

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    days,
    maxRepos: Math.max(1, Math.min(input.maxRepos ?? defaultMaxRepos, 500)),
    maxBytesBilled: input.maxBytesBilled ?? defaultMaxBytesBilled,
    dryRun: input.dryRun ?? true
  };
}

export function buildGhArchiveTrendQuery(input: CollectGhArchiveTrendsInput) {
  const normalized = normalizeInput(input);
  const unionedTables = normalized.days
    .map((date) => {
      const suffix = tableSuffix(date);
      return [
        "SELECT",
        "  repo.name AS repo,",
        "  type",
        `FROM \`githubarchive.day.${suffix}\``,
        "WHERE type IN ('WatchEvent', 'ForkEvent', 'PushEvent', 'IssuesEvent')",
        "  AND repo.name IS NOT NULL"
      ].join("\n");
    })
    .join("\nUNION ALL\n");

  const query = [
    "WITH events AS (",
    unionedTables
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n"),
    ")",
    "SELECT",
    "  repo AS repoFullName,",
    "  COUNTIF(type = 'WatchEvent') AS stars,",
    "  COUNTIF(type = 'ForkEvent') AS forks,",
    "  COUNTIF(type = 'PushEvent') AS pushes,",
    "  COUNTIF(type = 'IssuesEvent') AS issues,",
    "  (COUNTIF(type = 'WatchEvent') * 5)",
    "    + (COUNTIF(type = 'ForkEvent') * 3)",
    "    + COUNTIF(type = 'PushEvent')",
    "    + (COUNTIF(type = 'IssuesEvent') * 2) AS trendScore",
    "FROM events",
    "GROUP BY repoFullName",
    "HAVING trendScore > 0",
    "ORDER BY trendScore DESC, stars DESC",
    `LIMIT ${normalized.maxRepos}`
  ].join("\n");

  return {
    ...normalized,
    query
  };
}

function defaultBqExecutor(args: string[]) {
  const query = args.at(-1) ?? "";
  const bqArgs = args.slice(0, -1);
  const tempDir = mkdtempSync(join(tmpdir(), "gh-archive-bq-"));
  const queryPath = join(tempDir, "query.sql");

  writeFileSync(queryPath, query, "utf8");

  try {
    const result =
      process.platform === "win32"
        ? spawnSync(
            "powershell.exe",
            [
              "-NoProfile",
              "-NonInteractive",
              "-ExecutionPolicy",
              "Bypass",
              "-Command",
              `Get-Content -Raw -LiteralPath ${quotePowerShellArg(
                queryPath
              )} | bq ${bqArgs.map(quotePowerShellArg).join(" ")}`
            ],
            { encoding: "utf8" }
          )
        : spawnSync("bq", bqArgs, {
            encoding: "utf8",
            input: query
          });

    return {
      status: result.status,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      error: result.error
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function quotePowerShellArg(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function parseDryRunBytes(output: string) {
  const match = output.match(/process\s+(\d+)\s+bytes/i);
  return match ? Number(match[1]) : null;
}

function parseRows(output: string): GhArchiveTrendRepo[] {
  const parsed = JSON.parse(output) as unknown;
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.map((row) => {
    const record = row as Record<string, unknown>;
    return {
      repoFullName: String(record.repoFullName),
      stars: Number(record.stars ?? 0),
      forks: Number(record.forks ?? 0),
      pushes: Number(record.pushes ?? 0),
      issues: Number(record.issues ?? 0),
      trendScore: Number(record.trendScore ?? 0)
    };
  });
}

function runBq(input: {
  query: string;
  dryRun: boolean;
  maxBytesBilled: number;
  bqExecutor: BqExecutor;
}) {
  const args = [
    "query",
    "--nouse_legacy_sql",
    "--quiet",
    `--maximum_bytes_billed=${input.maxBytesBilled}`,
    ...(input.dryRun ? ["--dry_run"] : ["--format=json"]),
    input.query
  ];

  return input.bqExecutor(args);
}

export async function collectGhArchiveTrends(
  input: CollectGhArchiveTrendsInput
): Promise<GhArchiveTrendResult> {
  const built = buildGhArchiveTrendQuery(input);
  const bqExecutor = input.bqExecutor ?? defaultBqExecutor;
  const warnings: string[] = [];
  const dryRunResult = runBq({
    query: built.query,
    dryRun: true,
    maxBytesBilled: built.maxBytesBilled,
    bqExecutor
  });

  if (dryRunResult.error) {
    warnings.push(dryRunResult.error.message);
  }

  const dryRunOutput = `${dryRunResult.stdout}\n${dryRunResult.stderr}`;
  const estimatedBytesProcessed = parseDryRunBytes(dryRunOutput);

  if (dryRunResult.status !== 0) {
    warnings.push(dryRunOutput.trim() || "BigQuery dry run failed.");
    return GhArchiveTrendResultSchema.parse({
      repos: [],
      diagnostics: {
        source: "gh_archive_bigquery",
        startDate: built.startDate,
        endDate: built.endDate,
        dayCount: built.days.length,
        maxRepos: built.maxRepos,
        maxBytesBilled: built.maxBytesBilled,
        dryRun: true,
        estimatedBytesProcessed,
        query: built.query,
        warnings
      } satisfies GhArchiveTrendDiagnostics
    });
  }

  if (
    estimatedBytesProcessed !== null &&
    estimatedBytesProcessed > built.maxBytesBilled
  ) {
    warnings.push(
      `Dry run estimated ${estimatedBytesProcessed} bytes, above maxBytesBilled ${built.maxBytesBilled}.`
    );
    return GhArchiveTrendResultSchema.parse({
      repos: [],
      diagnostics: {
        source: "gh_archive_bigquery",
        startDate: built.startDate,
        endDate: built.endDate,
        dayCount: built.days.length,
        maxRepos: built.maxRepos,
        maxBytesBilled: built.maxBytesBilled,
        dryRun: true,
        estimatedBytesProcessed,
        query: built.query,
        warnings
      } satisfies GhArchiveTrendDiagnostics
    });
  }

  if (built.dryRun) {
    return GhArchiveTrendResultSchema.parse({
      repos: [],
      diagnostics: {
        source: "gh_archive_bigquery",
        startDate: built.startDate,
        endDate: built.endDate,
        dayCount: built.days.length,
        maxRepos: built.maxRepos,
        maxBytesBilled: built.maxBytesBilled,
        dryRun: true,
        estimatedBytesProcessed,
        query: built.query,
        warnings
      } satisfies GhArchiveTrendDiagnostics
    });
  }

  const runResult = runBq({
    query: built.query,
    dryRun: false,
    maxBytesBilled: built.maxBytesBilled,
    bqExecutor
  });

  if (runResult.error) {
    warnings.push(runResult.error.message);
  }

  if (runResult.status !== 0) {
    warnings.push(
      `${runResult.stdout}\n${runResult.stderr}`.trim() ||
        "BigQuery query failed."
    );
    return GhArchiveTrendResultSchema.parse({
      repos: [],
      diagnostics: {
        source: "gh_archive_bigquery",
        startDate: built.startDate,
        endDate: built.endDate,
        dayCount: built.days.length,
        maxRepos: built.maxRepos,
        maxBytesBilled: built.maxBytesBilled,
        dryRun: false,
        estimatedBytesProcessed,
        query: built.query,
        warnings
      } satisfies GhArchiveTrendDiagnostics
    });
  }

  return GhArchiveTrendResultSchema.parse({
    repos: parseRows(runResult.stdout),
    diagnostics: {
      source: "gh_archive_bigquery",
      startDate: built.startDate,
      endDate: built.endDate,
      dayCount: built.days.length,
      maxRepos: built.maxRepos,
      maxBytesBilled: built.maxBytesBilled,
      dryRun: false,
      estimatedBytesProcessed,
      query: built.query,
      warnings
    } satisfies GhArchiveTrendDiagnostics
  });
}
