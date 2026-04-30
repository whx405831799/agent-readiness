import { z } from "zod";

import { CRITERIA } from "./criteria/index.js";

export const criterionEvaluationSchema = z.object({
  numerator: z
    .number()
    .min(0)
    .nullable()
    .describe(
      "Number of items that passed the criterion, or null if skipped",
    ),
  denominator: z
    .number()
    .min(1)
    .describe("Total number of items evaluated"),
  rationale: z
    .string()
    .min(1)
    .describe("Explanation of the evaluation result"),
});

export type CriterionEvaluation = z.infer<typeof criterionEvaluationSchema>;

const criterionReportShape: Record<
  string,
  typeof criterionEvaluationSchema
> = CRITERIA.reduce(
  (acc, c) => {
    acc[c.id] = criterionEvaluationSchema;
    return acc;
  },
  {} as Record<string, typeof criterionEvaluationSchema>,
);

export const criterionReportSchema = z
  .object(criterionReportShape)
  .strict();

export type CriterionReport = z.infer<typeof criterionReportSchema>;

export const appDescriptionSchema = z.object({
  description: z
    .string()
    .describe("Description of what the app does and its purpose"),
});

export const appsMapSchema = z
  .record(z.string().min(1), appDescriptionSchema)
  .describe(
    "Map of app paths to their descriptions for monorepo repositories",
  );

export type AppDescription = z.infer<typeof appDescriptionSchema>;
export type AppsMap = z.infer<typeof appsMapSchema>;

export const modelUsedSchema = z.object({
  id: z.string().describe("Model identifier"),
  reasoningEffort: z
    .enum(["low", "medium", "high", "off"])
    .describe("Reasoning effort level used"),
});

export type ModelUsed = z.infer<typeof modelUsedSchema>;

export const storeReadinessReportInputSchema = z.object({
  repoUrl: z
    .string()
    .url()
    .describe(
      'Repository URL (e.g., "https://github.com/owner/repo", "https://gitlab.com/owner/repo")',
    ),
  report: criterionReportSchema.describe(
    `Evaluation results for each criterion - must include all ${CRITERIA.length} required keys: ${CRITERIA.map((c) => c.id).join(", ")}`,
  ),
  reportId: z
    .string()
    .optional()
    .describe("Optional stable identifier for this audit run"),
  apps: appsMapSchema.optional(),
  commitHash: z
    .string()
    .optional()
    .describe(
      "Git commit hash at the time of report generation (from git rev-parse HEAD)",
    ),
  branch: z
    .string()
    .optional()
    .describe(
      "Git branch name at the time of report generation (from git rev-parse --abbrev-ref HEAD)",
    ),
  hasLocalChanges: z
    .boolean()
    .optional()
    .describe(
      "Whether there were uncommitted local changes (from git status --porcelain)",
    ),
  hasNonRemoteCommits: z
    .boolean()
    .optional()
    .describe(
      "Whether there were commits not pushed to remote (from git rev-list @{u}..HEAD --count)",
    ),
  modelUsed: modelUsedSchema
    .optional()
    .describe("Model and reasoning level used to generate the report"),
  cliVersion: z
    .string()
    .optional()
    .describe("Version of the CLI that generated the report"),
  createdAt: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("Unix timestamp in milliseconds when the report was created"),
});

export type StoreReadinessReportInput = z.infer<
  typeof storeReadinessReportInputSchema
>;

export const levelBreakdownSchema = z.object({
  level: z.number().int().min(1).max(5),
  checksPassed: z.number().min(0),
  checksTotal: z.number().min(0),
  percentComplete: z.number().min(0).max(100),
  isUnlocked: z.boolean(),
});

export const readinessHistoryEntrySchema = z.object({
  repoUrl: z
    .string()
    .url()
    .describe("Repository URL associated with the stored snapshot"),
  reportId: z
    .string()
    .optional()
    .describe("Optional report identifier carried over from the source report"),
  commitHash: z
    .string()
    .optional()
    .describe("Commit hash captured when the snapshot was created"),
  branch: z
    .string()
    .optional()
    .describe("Git branch captured when the snapshot was created"),
  cliVersion: z
    .string()
    .optional()
    .describe("CLI version that wrote the snapshot"),
  createdAt: z
    .number()
    .int()
    .nonnegative()
    .describe("Unix timestamp in milliseconds for this historical snapshot"),
  achievedLevel: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe("Readiness level achieved for this snapshot"),
  overallPassPercent: z
    .number()
    .min(0)
    .max(100)
    .describe("Overall readiness pass percent at the time of the snapshot"),
  checksNeededForNextLevel: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe("Remaining checks needed to reach the next level, or null at level 5"),
  levelBreakdowns: z
    .array(levelBreakdownSchema)
    .length(5)
    .describe("Per-level readiness breakdowns for this snapshot"),
});

export const readinessHistorySchema = z.array(readinessHistoryEntrySchema);

export type ReadinessHistoryEntry = z.infer<typeof readinessHistoryEntrySchema>;
export type ReadinessHistory = z.infer<typeof readinessHistorySchema>;

export const storeReadinessReportOutputSchema = z.object({
  success: z.boolean().describe("Whether the report was successfully stored"),
  reportId: z.string().describe("UUID of the created report"),
  message: z.string().describe("Success or error message"),
});

export type StoreReadinessReportOutput = z.infer<
  typeof storeReadinessReportOutputSchema
>;
