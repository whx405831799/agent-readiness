import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { CRITERIA, getCriteriaByLevel } from "../criteria/index.js";
import type { Criterion, Level } from "../criteria/types.js";

import {
  evaluationStatus,
  overallPassPercent,
  percentToLevel,
  relativeTimeFromNow,
  summarizeRawReport,
  summarizeReport,
} from "./scoring.js";
import type { CriterionEvaluation } from "./types.js";

function buildReport(
  fn: (c: Criterion) => CriterionEvaluation,
): Record<string, CriterionEvaluation> {
  const out: Record<string, CriterionEvaluation> = {};
  for (const c of CRITERIA) {
    out[c.id] = fn(c);
  }
  return out;
}

const passEvaluation: CriterionEvaluation = {
  numerator: 1,
  denominator: 1,
  rationale: "ok",
};

const failEvaluation: CriterionEvaluation = {
  numerator: 0,
  denominator: 1,
  rationale: "missing",
};

const skipEvaluation: CriterionEvaluation = {
  numerator: null,
  denominator: 1,
  rationale: "n/a",
};

describe("percentToLevel", () => {
  it("returns 1 for [0, 20)", () => {
    assert.equal(percentToLevel(0), 1);
    assert.equal(percentToLevel(19.999), 1);
  });
  it("returns 2 for [20, 40)", () => {
    assert.equal(percentToLevel(20), 2);
    assert.equal(percentToLevel(39.999), 2);
  });
  it("returns 3 for [40, 60)", () => {
    assert.equal(percentToLevel(40), 3);
    assert.equal(percentToLevel(59.999), 3);
  });
  it("returns 4 for [60, 80)", () => {
    assert.equal(percentToLevel(60), 4);
    assert.equal(percentToLevel(79.999), 4);
  });
  it("returns 5 for [80, 100]", () => {
    assert.equal(percentToLevel(80), 5);
    assert.equal(percentToLevel(100), 5);
    assert.equal(percentToLevel(150), 5);
  });
});

describe("evaluationStatus", () => {
  it("returns skipped when numerator is null", () => {
    assert.equal(
      evaluationStatus({ numerator: null, denominator: 1, rationale: "" }),
      "skipped",
    );
  });
  it("returns passed only when numerator equals positive denominator", () => {
    assert.equal(
      evaluationStatus({ numerator: 3, denominator: 3, rationale: "" }),
      "passed",
    );
  });
  it("returns failed when partially passing", () => {
    assert.equal(
      evaluationStatus({ numerator: 2, denominator: 3, rationale: "" }),
      "failed",
    );
  });
  it("returns failed when zero", () => {
    assert.equal(
      evaluationStatus({ numerator: 0, denominator: 5, rationale: "" }),
      "failed",
    );
  });
  it("returns failed when denominator is 0 (degenerate)", () => {
    assert.equal(
      evaluationStatus({ numerator: 0, denominator: 0, rationale: "" }),
      "failed",
    );
  });
});

describe("summarizeRawReport", () => {
  it("all-pass report yields level 5 and 100% overall", () => {
    const summary = summarizeRawReport(buildReport(() => passEvaluation));

    assert.equal(summary.achievedLevel, 5);
    assert.equal(summary.overallProgress.percentComplete, 100);
    assert.equal(summary.overallProgress.checksPassed, 82 * 100);
    assert.equal(summary.overallProgress.checksTotal, 82 * 100);
    assert.equal(summary.checksNeededForNextLevel, null);

    for (const lb of summary.levelBreakdowns) {
      assert.equal(lb.percentComplete, 100);
      assert.equal(lb.checksPassed, lb.checksTotal);
      assert.equal(lb.isUnlocked, true);
    }

    for (const cr of summary.criterionResults) {
      assert.equal(cr.isComplete, true);
      assert.equal(cr.isSkipped, false);
      assert.equal(cr.passed, 1);
      assert.equal(cr.total, 1);
    }
  });

  it("all-fail report yields level 1 and 0% overall", () => {
    const summary = summarizeRawReport(buildReport(() => failEvaluation));

    assert.equal(summary.achievedLevel, 1);
    assert.equal(summary.overallProgress.percentComplete, 0);
    assert.equal(summary.overallProgress.checksPassed, 0);
    assert.equal(summary.overallProgress.checksTotal, 82 * 100);
    assert.equal(summary.checksNeededForNextLevel, 17);
  });

  it("all-skipped report yields level 1, 0 totals, no next-level requirement", () => {
    const summary = summarizeRawReport(buildReport(() => skipEvaluation));

    assert.equal(summary.achievedLevel, 1);
    assert.equal(summary.overallProgress.percentComplete, 0);
    assert.equal(summary.overallProgress.checksPassed, 0);
    assert.equal(summary.overallProgress.checksTotal, 0);
    assert.equal(summary.checksNeededForNextLevel, null);

    for (const cr of summary.criterionResults) {
      assert.equal(cr.isComplete, false);
      assert.equal(cr.isSkipped, true);
      assert.equal(cr.passed, 0);
      assert.equal(cr.total, 1);
    }
  });

  it("missing entries are treated as failing (passed=0,total=1)", () => {
    const partial: Record<string, CriterionEvaluation> = {};
    const firstId = CRITERIA[0]!.id;
    partial[firstId] = passEvaluation;

    const summary = summarizeRawReport(partial);

    assert.equal(summary.overallProgress.checksPassed, 100);
    assert.equal(summary.overallProgress.checksTotal, 100);
    assert.equal(summary.overallProgress.percentComplete, 100);

    const missing = summary.criterionResults.find(
      (cr) => cr.criterionId !== firstId,
    )!;
    assert.equal(missing.passed, 0);
    assert.equal(missing.total, 1);
    assert.equal(missing.isComplete, false);
    assert.equal(missing.isSkipped, false);
  });

  it("levelBreakdowns covers every level even when empty", () => {
    const summary = summarizeRawReport({});
    assert.equal(summary.levelBreakdowns.length, 5);
    assert.deepEqual(
      summary.levelBreakdowns.map((b) => b.level),
      [1, 2, 3, 4, 5],
    );
    for (const lb of summary.levelBreakdowns) {
      assert.equal(lb.checksPassed, 0);
      assert.equal(lb.checksTotal, 0);
      assert.equal(lb.percentComplete, 0);
    }
  });

  it("checksNeededForNextLevel reflects gap to next 20% boundary", () => {
    const level1Ids = new Set(getCriteriaByLevel(1).map((c) => c.id));
    const report = buildReport((c) =>
      level1Ids.has(c.id) ? passEvaluation : failEvaluation,
    );

    const summary = summarizeRawReport(report);
    const passedCount = level1Ids.size;
    const expectedPercent = (passedCount / 82) * 100;

    assert.equal(summary.overallProgress.percentComplete, expectedPercent);
    assert.equal(summary.achievedLevel, percentToLevel(expectedPercent));

    if (summary.achievedLevel < 5) {
      const nextThreshold = [20, 40, 60, 80, 100][
        summary.achievedLevel - 1
      ]!;
      const gap = Math.max(0, nextThreshold - expectedPercent);
      const expected = Math.ceil((gap / 100) * 82);
      assert.equal(summary.checksNeededForNextLevel, expected);
    }
  });

  it("handles fractional (per-application) numerators", () => {
    const report = buildReport(() => ({
      numerator: 1,
      denominator: 2,
      rationale: "half",
    }));
    const summary = summarizeRawReport(report);
    assert.equal(summary.overallProgress.percentComplete, 50);
    assert.equal(summary.overallProgress.checksPassed, 4100);
    assert.equal(summary.overallProgress.checksTotal, 8200);
    assert.equal(summary.achievedLevel, 3);
  });
});

describe("summarizeReport", () => {
  it("delegates to summarizeRawReport on the embedded report", () => {
    const wrapper = {
      repoUrl: "https://example.com/o/r",
      report: buildReport(() => passEvaluation),
    };
    const summary = summarizeReport(wrapper);
    assert.equal(summary.achievedLevel, 5);
    assert.equal(summary.overallProgress.percentComplete, 100);
  });
});

describe("overallPassPercent", () => {
  it("returns 0 for an empty report", () => {
    assert.equal(
      overallPassPercent({ repoUrl: "x", report: {} }),
      0,
    );
  });
  it("returns 100 when everything passes", () => {
    assert.equal(
      overallPassPercent({
        repoUrl: "x",
        report: buildReport(() => passEvaluation),
      }),
      100,
    );
  });
  it("matches summarizeReport's overall percent for fractional reports", () => {
    const wrapper = {
      repoUrl: "x",
      report: buildReport(() => ({
        numerator: 3,
        denominator: 4,
        rationale: "75%",
      })),
    };
    assert.equal(
      overallPassPercent(wrapper),
      summarizeReport(wrapper).overallProgress.percentComplete,
    );
    assert.equal(overallPassPercent(wrapper), 75);
  });
  it("ignores skipped entries entirely", () => {
    let toggle = false;
    const report = buildReport(() => {
      toggle = !toggle;
      return toggle ? passEvaluation : skipEvaluation;
    });
    assert.equal(overallPassPercent({ repoUrl: "x", report }), 100);
  });
});

describe("relativeTimeFromNow", () => {
  const NOW = 1_000_000_000_000; 

  it("renders seconds (singular and plural)", () => {
    assert.equal(relativeTimeFromNow(NOW - 1_000, NOW), "1 second ago");
    assert.equal(relativeTimeFromNow(NOW - 30_000, NOW), "30 seconds ago");
  });
  it("renders minutes", () => {
    assert.equal(relativeTimeFromNow(NOW - 60_000, NOW), "1 minute ago");
    assert.equal(
      relativeTimeFromNow(NOW - 5 * 60_000, NOW),
      "5 minutes ago",
    );
  });
  it("renders hours", () => {
    assert.equal(
      relativeTimeFromNow(NOW - 60 * 60_000, NOW),
      "1 hour ago",
    );
    assert.equal(
      relativeTimeFromNow(NOW - 3 * 60 * 60_000, NOW),
      "3 hours ago",
    );
  });
  it("renders days", () => {
    assert.equal(
      relativeTimeFromNow(NOW - 24 * 60 * 60_000, NOW),
      "1 day ago",
    );
  });
  it("renders weeks", () => {
    assert.equal(
      relativeTimeFromNow(NOW - 7 * 24 * 60 * 60_000, NOW),
      "1 week ago",
    );
    assert.equal(
      relativeTimeFromNow(NOW - 21 * 24 * 60 * 60_000, NOW),
      "3 weeks ago",
    );
  });
  it("renders months", () => {
    assert.equal(
      relativeTimeFromNow(NOW - 30 * 24 * 60 * 60_000, NOW),
      "1 month ago",
    );
    assert.equal(
      relativeTimeFromNow(NOW - 90 * 24 * 60 * 60_000, NOW),
      "3 months ago",
    );
  });
  it("renders years", () => {
    assert.equal(
      relativeTimeFromNow(NOW - 365 * 24 * 60 * 60_000, NOW),
      "1 year ago",
    );
    assert.equal(
      relativeTimeFromNow(NOW - 2 * 365 * 24 * 60 * 60_000, NOW),
      "2 years ago",
    );
  });
});

describe("criterionResults invariants", () => {
  it("always returns 82 entries (one per criterion, in canonical order)", () => {
    const summary = summarizeRawReport({});
    assert.equal(summary.criterionResults.length, 82);
    assert.deepEqual(
      summary.criterionResults.map((r) => r.criterionId),
      CRITERIA.map((c) => c.id),
    );
  });

  it("level field of each result matches the criterion definition", () => {
    const summary = summarizeRawReport({});
    const byId = new Map<string, Level>(
      CRITERIA.map((c) => [c.id, c.level]),
    );
    for (const r of summary.criterionResults) {
      assert.equal(r.level, byId.get(r.criterionId));
    }
  });
});
