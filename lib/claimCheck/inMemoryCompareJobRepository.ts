import type { CompareJob, CompareJobRepository } from "@/lib/claimCheck/jobTypes";

const globalForCompareJobs = globalThis as typeof globalThis & {
  __compareJobs?: Map<string, CompareJob>;
};

const jobs = globalForCompareJobs.__compareJobs ?? new Map<string, CompareJob>();

globalForCompareJobs.__compareJobs = jobs;

function now() {
  return new Date().toISOString();
}

export const inMemoryCompareJobRepository: CompareJobRepository = {
  async create(job) {
    jobs.set(job.id, job);
    return job;
  },

  async update(id, patch) {
    const existing = jobs.get(id);

    if (!existing) {
      return null;
    }

    const updated: CompareJob = {
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

  async clear() {
    jobs.clear();
  }
};
