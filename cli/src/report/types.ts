import type { Level } from "../criteria/types.js";

export interface CriterionEvaluation {
  numerator: number | null;

  denominator: number;

  rationale: string;
}

export interface AppDescription {
  description: string;
  sourceType?: "source" | "distribution";
}

export type AppsMap = Record<string, AppDescription>;

export interface ModelUsed {
  id: string;
  reasoningEffort: "low" | "medium" | "high" | "off";
}

export interface ReadinessReport {
  reportId?: string;
  repoUrl: string;
  report: Record<string, CriterionEvaluation>;
  apps?: AppsMap;
  commitHash?: string;
  branch?: string;
  hasLocalChanges?: boolean;
  hasNonRemoteCommits?: boolean;
  modelUsed?: ModelUsed;
  cliVersion?: string;
  createdAt?: number;
}

export type EvaluationStatus = "passed" | "failed" | "skipped";

export interface LevelBreakdown {
  level: Level;
  checksPassed: number;
  checksTotal: number;
  percentComplete: number;
  isUnlocked: boolean;
}

export interface CriterionResult {
  criterionId: string;
  level: Level;
  passed: number;
  total: number;
  isComplete: boolean;
  isSkipped: boolean;
}

export interface ReadinessSummary {
  achievedLevel: Level;
  overallProgress: {
    checksPassed: number;
    checksTotal: number;
    percentComplete: number;
  };
  levelBreakdowns: LevelBreakdown[];
  checksNeededForNextLevel: number | null;
  criterionResults: CriterionResult[];
}

export interface ReadinessHistoryEntry {
  repoUrl: string;
  reportId?: string;
  commitHash?: string;
  branch?: string;
  cliVersion?: string;
  createdAt: number;
  achievedLevel: Level;
  overallPassPercent: number;
  checksNeededForNextLevel: number | null;
  levelBreakdowns: LevelBreakdown[];
}
