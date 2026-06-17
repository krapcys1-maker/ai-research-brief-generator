import {
  ProjectIdeaLiveBatchSamplerInputSchema,
  runControlledLiveBatchSampling
} from "@/lib/project-ideas";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { loadEnvFile } from "node:process";

type CliArgs = {
  inputPath: string;
  outputDir: string;
};

function parseArgs(argv: string[]): CliArgs {
  const inputIndex = argv.indexOf("--input");
  const outIndex = argv.indexOf("--out");
  const inputPath = inputIndex >= 0 ? argv[inputIndex + 1] : undefined;
  const outputDir = outIndex >= 0 ? argv[outIndex + 1] : undefined;

  if (!inputPath || !outputDir) {
    throw new Error(
      "Usage: npm run project:live-batch -- --input path/to/input.json --out path/to/output-dir"
    );
  }

  return { inputPath, outputDir };
}

function findBareGithubTokenInEnvText(content: string) {
  return (
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(
        (line) =>
          !line.startsWith("#") &&
          !line.includes("=") &&
          /^(github_pat_|gh[pousr]_)[A-Za-z0-9_]+$/.test(line)
      ) ?? null
  );
}

function loadEnv() {
  try {
    loadEnvFile();
  } catch {
    // .env is optional for dry-run and tests.
  }

  if (!process.env.GITHUB_TOKEN && existsSync(".env")) {
    const token = findBareGithubTokenInEnvText(readFileSync(".env", "utf8"));
    if (token) {
      process.env.GITHUB_TOKEN = token;
    }
  }
}

async function main() {
  loadEnv();

  const args = parseArgs(process.argv.slice(2));
  const raw = await readFile(args.inputPath, "utf8");
  const input = ProjectIdeaLiveBatchSamplerInputSchema.parse(
    JSON.parse(raw.replace(/^\uFEFF/, ""))
  );
  const summary = await runControlledLiveBatchSampling({
    ...input,
    token: input.token ?? process.env.GITHUB_TOKEN,
    outputDir: args.outputDir
  });

  console.log(
    [
      "Controlled live idea batch sampling complete",
      `Domain: ${summary.domain}`,
      `Mode: ${summary.mode}`,
      `Verdict: ${summary.quality.verdict}`,
      `Passed: ${summary.quality.passed ? "yes" : "no"}`,
      `Windows: ${summary.budget.windowCount}`,
      `Trend repos: ${summary.aggregate.uniqueTrendRepoCount}`,
      `Enriched repos: ${summary.aggregate.sourceRepoCount}`,
      `Handoff-ready ideas: ${summary.aggregate.handoffReadyCount}`,
      `Average handoff quality: ${summary.aggregate.averageHandoffQualityScore}`,
      `Output: ${summary.outputDir}`
    ].join("\n")
  );

  if (!summary.quality.passed) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
