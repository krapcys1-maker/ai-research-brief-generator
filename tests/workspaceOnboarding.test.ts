import { describe, expect, it } from "vitest";
import { getWorkspaceOnboarding } from "@/lib/workspace/onboarding";

const emptyTotals = {
  briefs: 0,
  documents: 0,
  researchProjects: 0,
  briefCollections: 0,
  documentCollections: 0,
  paperNotes: 0,
  shareLinks: 0,
  exportHistory: 0
};

describe("getWorkspaceOnboarding", () => {
  it("builds a zero-progress onboarding checklist for a new workspace", () => {
    const onboarding = getWorkspaceOnboarding(emptyTotals);

    expect(onboarding.completed).toBe(0);
    expect(onboarding.total).toBe(7);
    expect(onboarding.percent).toBe(0);
    expect(onboarding.nextStepId).toBe("create_brief");
    expect(onboarding.steps.map((step) => step.completed)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false
    ]);
  });

  it("marks completed product milestones from workspace totals", () => {
    const onboarding = getWorkspaceOnboarding({
      ...emptyTotals,
      briefs: 2,
      documents: 1,
      researchProjects: 1,
      documentCollections: 1,
      paperNotes: 1,
      shareLinks: 1,
      exportHistory: 1
    });

    expect(onboarding.completed).toBe(7);
    expect(onboarding.percent).toBe(100);
    expect(onboarding.nextStepId).toBeNull();
    expect(onboarding.steps.every((step) => step.completed)).toBe(true);
  });

  it("uses either brief or document collections for the collection step", () => {
    const onboarding = getWorkspaceOnboarding({
      ...emptyTotals,
      briefCollections: 1
    });

    expect(
      onboarding.steps.find((step) => step.id === "create_collection")
        ?.completed
    ).toBe(true);
    expect(onboarding.nextStepId).toBe("create_brief");
  });
});
