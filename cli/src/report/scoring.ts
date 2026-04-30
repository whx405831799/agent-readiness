
import { CRITERIA, getCriteriaByLevel } from "../criteria/index.js";
import type { Level } from "../criteria/types.js";
import type {
  CriterionEvaluation,
  CriterionResult,
  EvaluationStatus,
  LevelBreakdown,
  ReadinessHistoryEntry,
  ReadinessReport,
  ReadinessSummary,
} from "./types.js";

export function percentToLevel(percent: number): Level {
  if (percent >= 80) return 5;
  if (percent >= 60) return 4;
  if (percent >= 40) return 3;
  if (percent >= 20) return 2;
  return 1;
}

export function evaluationStatus(
  evaluation: CriterionEvaluation,
): EvaluationStatus {
  if (evaluation.numerator === null) return "skipped";
  if (
    evaluation.denominator > 0 &&
    evaluation.numerator === evaluation.denominator
  ) {
    return "passed";
  }
  return "failed";
}

const LEVEL_THRESHOLDS_PERCENT: readonly number[] = [20, 40, 60, 80, 100];

export function summarizeRawReport(
  report: Readonly<Record<string, CriterionEvaluation>>,
): ReadinessSummary {
  const levelBreakdowns: LevelBreakdown[] = [];
  let overallSum = 0;
  let overallCount = 0;

  for (let level: Level = 1; level <= 5; level = (level + 1) as Level) {
    const levelCriteria = getCriteriaByLevel(level);
    let levelSum = 0;
    let levelCount = 0;

    for (const criterion of levelCriteria) {
      const evaluation = report[criterion.id];
      if (
        evaluation &&
        evaluation.numerator !== null &&
        evaluation.denominator > 0
      ) {
        levelSum += evaluation.numerator / evaluation.denominator;
        levelCount += 1;
      }
    }

    const percentComplete = levelCount > 0 ? (levelSum / levelCount) * 100 : 0;
    levelBreakdowns.push({
      level,
      checksPassed: Math.round(levelSum * 100),
      checksTotal: levelCount * 100,
      percentComplete,
      isUnlocked: true,
    });

    overallSum += levelSum;
    overallCount += levelCount;
  }

  const overallPercent =
    overallCount > 0 ? (overallSum / overallCount) * 100 : 0;
  const achievedLevel = percentToLevel(overallPercent);

  let checksNeededForNextLevel: number | null = null;
  if (achievedLevel < 5 && overallCount > 0) {
    const nextThreshold =
      LEVEL_THRESHOLDS_PERCENT[achievedLevel - 1] ?? 100;
    const gap = Math.max(0, nextThreshold - overallPercent);
    checksNeededForNextLevel = Math.ceil((gap / 100) * overallCount);
  }

  const criterionResults: CriterionResult[] = CRITERIA.map((criterion) => {
    const evaluation = report[criterion.id];
    const isMissing = !evaluation;
    const isSkipped = evaluation?.numerator === null;
    const passed = isMissing ? 0 : (evaluation.numerator ?? 0);
    const total = isMissing ? 1 : evaluation.denominator;
    return {
      criterionId: criterion.id,
      level: criterion.level,
      passed,
      total,
      isComplete: !isMissing && !isSkipped && passed === total,
      isSkipped,
    };
  });

  return {
    achievedLevel,
    overallProgress: {
      checksPassed: Math.round(overallSum * 100),
      checksTotal: overallCount * 100,
      percentComplete: overallPercent,
    },
    levelBreakdowns,
    checksNeededForNextLevel,
    criterionResults,
  };
}

export function summarizeReport(report: ReadinessReport): ReadinessSummary {
  return summarizeRawReport(report.report);
}

export function overallPassPercent(report: ReadinessReport): number {
  let sum = 0;
  let count = 0;
  for (const criterion of CRITERIA) {
    const evaluation = report.report[criterion.id];
    if (
      evaluation &&
      evaluation.numerator !== null &&
      evaluation.denominator > 0
    ) {
      sum += evaluation.numerator / evaluation.denominator;
      count += 1;
    }
  }
  if (count === 0) return 0;
  return (sum / count) * 100;
}

export function createHistoryEntry(
  report: ReadinessReport,
  opts: { now?: number } = {},
): ReadinessHistoryEntry {
  const summary = summarizeReport(report);
  const entry: ReadinessHistoryEntry = {
    repoUrl: report.repoUrl,
    createdAt:
      typeof report.createdAt === "number" ? report.createdAt : (opts.now ?? Date.now()),
    achievedLevel: summary.achievedLevel,
    overallPassPercent: Number(overallPassPercent(report).toFixed(2)),
    checksNeededForNextLevel: summary.checksNeededForNextLevel,
    levelBreakdowns: summary.levelBreakdowns,
  };
  if (report.reportId) entry.reportId = report.reportId;
  if (report.commitHash) entry.commitHash = report.commitHash;
  if (report.branch) entry.branch = report.branch;
  if (report.cliVersion) entry.cliVersion = report.cliVersion;
  return entry;
}

export function relativeTimeFromNow(
  pastTimestampMs: number,
  now: number = Date.now(),
): string {
  const elapsedMs = now - pastTimestampMs;
  const seconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60)
    return seconds === 1 ? "1 second ago" : `${seconds} seconds ago`;
  if (minutes < 60)
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  if (days < 7) return days === 1 ? "1 day ago" : `${days} days ago`;
  if (weeks < 4) return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  if (months < 12)
    return months === 1 ? "1 month ago" : `${months} months ago`;
  return years === 1 ? "1 year ago" : `${years} years ago`;
}
