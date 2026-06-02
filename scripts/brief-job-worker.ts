import { resetStaleBriefJobs, runNextBriefJob } from "@/lib/jobs/briefJobs";
import { structuredLogger } from "@/lib/observability/structuredLogger";

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
  const staleMs = numberEnv("BRIEF_JOB_STALE_MS", 10 * 60 * 1000);
  const resetCount = await resetStaleBriefJobs(staleMs);

  if (resetCount > 0) {
    structuredLogger.warn("brief_worker.stale_jobs_reset", {
      resetCount,
      staleMs
    });
  }

  const job = await runNextBriefJob();

  if (!job) {
    return false;
  }

  structuredLogger.info("brief_worker.job_processed", {
    jobId: job.id,
    status: job.status,
    stage: job.stage,
    attemptCount: job.attemptCount,
    briefId: job.briefId,
    error: job.error
  });
  return true;
}

async function main() {
  const once = booleanEnv("BRIEF_WORKER_ONCE");
  const idleDelayMs = numberEnv("BRIEF_WORKER_IDLE_DELAY_MS", 2000);

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
  structuredLogger.error("brief_worker.failed", { error });
  process.exitCode = 1;
});
