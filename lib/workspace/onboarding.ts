export type WorkspaceOnboardingTotals = {
  briefs: number;
  documents: number;
  researchProjects: number;
  briefCollections: number;
  documentCollections: number;
  paperNotes: number;
  shareLinks: number;
  exportHistory: number;
};

export type WorkspaceOnboardingStep = {
  id:
    | "create_brief"
    | "upload_document"
    | "save_project"
    | "create_collection"
    | "add_paper_note"
    | "share_brief"
    | "export_brief";
  title: string;
  description: string;
  href: string;
  completed: boolean;
};

export type WorkspaceOnboarding = {
  completed: number;
  total: number;
  percent: number;
  nextStepId: WorkspaceOnboardingStep["id"] | null;
  steps: WorkspaceOnboardingStep[];
};

export function getWorkspaceOnboarding(
  totals: WorkspaceOnboardingTotals
): WorkspaceOnboarding {
  const steps: WorkspaceOnboardingStep[] = [
    {
      id: "create_brief",
      title: "Generate first brief",
      description: "Start with one grounded research brief.",
      href: "/",
      completed: totals.briefs > 0
    },
    {
      id: "upload_document",
      title: "Upload a private document",
      description: "Add your own PDF, TXT, or Markdown notes.",
      href: "/documents",
      completed: totals.documents > 0
    },
    {
      id: "save_project",
      title: "Save a research project",
      description: "Keep a standing topic for future work.",
      href: "/workspace",
      completed: totals.researchProjects > 0
    },
    {
      id: "create_collection",
      title: "Create a collection",
      description: "Group related briefs or documents.",
      href: "/workspace",
      completed: totals.briefCollections + totals.documentCollections > 0
    },
    {
      id: "add_paper_note",
      title: "Add a paper note",
      description: "Capture why a selected paper matters.",
      href: "/workspace",
      completed: totals.paperNotes > 0
    },
    {
      id: "share_brief",
      title: "Create a share link",
      description: "Prepare controlled visibility for a brief.",
      href: "/workspace",
      completed: totals.shareLinks > 0
    },
    {
      id: "export_brief",
      title: "Export a brief",
      description: "Download Markdown and record the export.",
      href: "/workspace",
      completed: totals.exportHistory > 0
    }
  ];
  const completed = steps.filter((step) => step.completed).length;
  const nextStep = steps.find((step) => !step.completed);

  return {
    completed,
    total: steps.length,
    percent: Math.round((completed / steps.length) * 100),
    nextStepId: nextStep?.id ?? null,
    steps
  };
}
