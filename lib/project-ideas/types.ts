import type { z } from "zod";
import type {
  DiscoveredIdeaSchema,
  IdeaDiscoveryInputSchema,
  IdeaDiscoveryReportSchema,
  IdeaScoreSchema,
  IdeaSourceRepoSchema,
  RepoInsightSchema,
  RepoIssueSignalSchema
} from "@/lib/project-ideas/schemas";

export type RepoIssueSignal = z.infer<typeof RepoIssueSignalSchema>;
export type IdeaSourceRepo = z.infer<typeof IdeaSourceRepoSchema>;
export type RepoInsight = z.infer<typeof RepoInsightSchema>;
export type DiscoveredIdea = z.infer<typeof DiscoveredIdeaSchema>;
export type IdeaScore = z.infer<typeof IdeaScoreSchema>;
export type IdeaDiscoveryInput = z.infer<typeof IdeaDiscoveryInputSchema>;
export type IdeaDiscoveryReport = z.infer<typeof IdeaDiscoveryReportSchema>;

