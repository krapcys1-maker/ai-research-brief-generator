import { randomUUID } from "node:crypto";
import type {
  ResearchProjectFilter,
  ResearchProjectRepository,
  SaveResearchProjectInput,
  StoredResearchProject
} from "@/lib/workspace/projectTypes";

const globalForResearchProjects = globalThis as typeof globalThis & {
  __researchProjects?: Map<string, StoredResearchProject>;
};

const projects =
  globalForResearchProjects.__researchProjects ??
  new Map<string, StoredResearchProject>();

globalForResearchProjects.__researchProjects = projects;

function matchesFilter(
  project: StoredResearchProject,
  filter?: ResearchProjectFilter
) {
  if (!filter) {
    return true;
  }

  if ("ownerSessionId" in filter) {
    return (project.ownerSessionId ?? null) === (filter.ownerSessionId ?? null);
  }

  if ("ownerId" in filter && project.ownerId !== (filter.ownerId ?? null)) {
    return false;
  }

  if (
    "workspaceId" in filter &&
    project.workspaceId !== (filter.workspaceId ?? null)
  ) {
    return false;
  }

  if (
    "createdByUserId" in filter &&
    project.createdByUserId !== (filter.createdByUserId ?? null)
  ) {
    return false;
  }

  if ("visibility" in filter && project.visibility !== filter.visibility) {
    return false;
  }

  return true;
}

export const inMemoryResearchProjectRepository: ResearchProjectRepository = {
  async save(input: SaveResearchProjectInput) {
    const now = new Date().toISOString();
    const project: StoredResearchProject = {
      id: `research_project_${randomUUID()}`,
      title: input.title,
      query: input.query,
      description: input.description ?? null,
      sources: input.sources ?? [],
      ownerSessionId: input.ownerSessionId ?? null,
      ownerId: input.ownerId ?? null,
      workspaceId: input.workspaceId ?? null,
      createdByUserId: input.createdByUserId ?? null,
      visibility: input.visibility ?? "private",
      createdAt: now,
      updatedAt: now
    };

    projects.set(project.id, project);
    return project;
  },

  async list(filter) {
    return [...projects.values()]
      .filter((project) => matchesFilter(project, filter))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async clear() {
    projects.clear();
  }
};
