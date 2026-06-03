import {
  parseProjectIdeaDiscoveryRunnerInput,
  runProjectIdeaDiscovery
} from "@/lib/project-ideas";
import { readFile } from "node:fs/promises";

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
      "Usage: npm run project:ideas -- --input path/to/input.json --out path/to/output-dir"
    );
  }

  return { inputPath, outputDir };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const raw = await readFile(args.inputPath, "utf8");
  const input = parseProjectIdeaDiscoveryRunnerInput(
    JSON.parse(raw.replace(/^\uFEFF/, ""))
  );
  const manifest = await runProjectIdeaDiscovery({
    ...input,
    outputDir: args.outputDir
  });

  console.log(
    [
      "Project idea discovery run complete",
      `Run ID: ${manifest.runId}`,
      `Domain: ${manifest.domain}`,
      `Source repos: ${manifest.sourceRepoCount}`,
      `Ideas: ${manifest.ideaCount}`,
      `Promising: ${manifest.promisingCount}`,
      `Max ideas per source: ${manifest.maxIdeasPerSource}`,
      `Clone rejections: ${manifest.cloneRejectedCount}`,
      `Project idea inputs: ${manifest.projectIdeaInputCount}`,
      `GitHub mode: ${manifest.githubMode}`,
      `GH Archive mode: ${manifest.ghArchiveMode}`,
      `GH Archive trend repos: ${manifest.ghArchiveTrendRepoCount}`,
      `Trend radar categories: ${manifest.trendRadarCategoryCount}`,
      `Trend radar opportunities: ${manifest.trendRadarTopOpportunityCount}`,
      `Warnings: ${manifest.warnings.length}`,
      `Output: ${manifest.outputDir}`
    ].join("\n")
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
