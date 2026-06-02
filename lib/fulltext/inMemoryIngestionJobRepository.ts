import type {
  FullTextIngestionJob,
  FullTextIngestionJobRepository
} from "@/lib/fulltext/ingestionJobTypes";

const globalForFullTextIngestionJobs = globalThis as typeof globalThis & {
  __fullTextIngestionJobs?: Map<string, FullTextIngestionJob>;
};

const jobs =
  globalForFullTextIngestionJobs.__fullTextIngestionJobs ??
  new Map<string, FullTextIngestionJob>();

globalForFullTextIngestionJobs.__fullTextIngestionJobs = jobs;

function now() {
  return new Date().toISOString();
}

export const inMemoryFullTextIngestionJobRepository: FullTextIngestionJobRepository =
  {
    async create(job) {
      jobs.set(job.id, job);
      return job;
    },

    async update(id, patch) {
      const existing = jobs.get(id);

      if (!existing) {
        return null;
      }

      const updated: FullTextIngestionJob = {
        ...existing,
        ...patch,
        updatedAt: now()
      };

      if ("lockedAt" in patch) {
        updated.lockedAt = patch.lockedAt;
      }

      jobs.set(id, updated);
      return updated;
    },

    async getById(id) {
      return jobs.get(id) ?? null;
    },

    async claimNextQueued() {
      const queued = [...jobs.values()]
        .filter((job) => job.status === "queued")
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];

      if (!queued) {
        return null;
      }

      return this.update(queued.id, {
        status: "running",
        stage: "ingestion",
        stageStartedAt: now(),
        attemptCount: queued.attemptCount + 1,
        lockedAt: now(),
        error: undefined,
        result: undefined
      });
    },

    async resetStaleRunning(staleMs) {
      const cutoff = Date.now() - staleMs;
      let resetCount = 0;

      for (const job of jobs.values()) {
        if (job.status !== "running" || !job.lockedAt) {
          continue;
        }

        const lockedAtMs = Date.parse(job.lockedAt);
        if (!Number.isFinite(lockedAtMs) || lockedAtMs >= cutoff) {
          continue;
        }

        resetCount += 1;

        if (job.attemptCount >= job.maxAttempts) {
          await this.update(job.id, {
            status: "failed",
            stage: "failed",
            stageStartedAt: now(),
            lockedAt: undefined,
            error: `Full-text ingestion job exceeded ${job.maxAttempts} attempt(s).`
          });
        } else {
          await this.update(job.id, {
            status: "queued",
            stage: "queued",
            stageStartedAt: now(),
            lockedAt: undefined,
            error: "Full-text ingestion job was reset after a stale worker lease."
          });
        }
      }

      return resetCount;
    },

    async clear() {
      jobs.clear();
    }
  };
