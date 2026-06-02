import {
  resetStaleFullTextIngestionJobs,
  runNextFullTextIngestionJob
} from "@/lib/fulltext/ingestionJobs";

function numberEnv(name: string, fallback: number) {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function booleanEnv(name: string) {
  return ["1", "true", "yes", "on"].includes(
    process.env[name]?.trim().toLowerCase() ?? ""
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tick() {
  const staleMs = numberEnv(
    "FULL_TEXT_INGESTION_JOB_STALE_MS",
    20 * 60 * 1000
  );
  const resetCount = await resetStaleFullTextIngestionJobs(staleMs);

  if (resetCount > 0) {
    console.log(`Reset ${resetCount} stale full-text ingestion job lease(s).`);
  }

  const job = await runNextFullTextIngestionJob();

  if (!job) {
    return false;
  }

  console.log(
    `Processed full-text ingestion job ${job.id}: ${job.status}${
      job.result ? ` (${job.result.parsedCount} parsed, ${job.result.chunkCount} chunks)` : ""
    }${job.error ? ` (${job.error})` : ""}`
  );
  return true;
}

async function main() {
  const once = booleanEnv("FULL_TEXT_INGESTION_WORKER_ONCE");
  const idleDelayMs = numberEnv("FULL_TEXT_INGESTION_WORKER_IDLE_DELAY_MS", 2000);

  do {
    const processed = await tick();

    if (once) {
      return;
    }

    if (!processed) {
      await sleep(idleDelayMs);
    }
  } while (true);
}

main().catch((error) => {
  console.error(
    `Full-text ingestion worker failed: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
  process.exitCode = 1;
});
