import {
  parseProjectResearchRunnerInput,
  runProjectResearch
} from "@/lib/project-research";
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
      "Usage: npm run project:research -- --input path/to/input.json --out path/to/output-dir"
    );
  }

  return { inputPath, outputDir };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const raw = await readFile(args.inputPath, "utf8");
  const input = parseProjectResearchRunnerInput(JSON.parse(raw));
  const manifest = await runProjectResearch({
    ...input,
    outputDir: args.outputDir
  });

  console.log(
    [
      "Project research run complete",
      `Run ID: ${manifest.runId}`,
      `Ready for PRD: ${manifest.readyForPrd ? "yes" : "no"}`,
      `Ready for architecture: ${manifest.readyForArchitecture ? "yes" : "no"}`,
      `Coverage: ${manifest.requiredCoveredCount}/${manifest.requiredBucketCount}`,
      `Output: ${manifest.outputDir}`
    ].join("\n")
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
