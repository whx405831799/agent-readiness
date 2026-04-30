import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { CRITERIA } from "./criteria/index.js";
import {
  appsMapSchema,
  criterionEvaluationSchema,
  criterionReportSchema,
  modelUsedSchema,
  readinessHistoryEntrySchema,
  storeReadinessReportInputSchema,
  storeReadinessReportOutputSchema,
} from "./schema.js";

function fullReport(): Record<
  string,
  { numerator: number | null; denominator: number; rationale: string }
> {
  const out: Record<
    string,
    { numerator: number | null; denominator: number; rationale: string }
  > = {};
  for (const c of CRITERIA) {
    out[c.id] = { numerator: 1, denominator: 1, rationale: "ok" };
  }
  return out;
}

describe("criterionEvaluationSchema", () => {
  it("accepts a normal pass record", () => {
    const r = criterionEvaluationSchema.safeParse({
      numerator: 1,
      denominator: 1,
      rationale: "ok",
    });
    assert.equal(r.success, true);
  });

  it("accepts numerator: null (skipped)", () => {
    const r = criterionEvaluationSchema.safeParse({
      numerator: null,
      denominator: 1,
      rationale: "n/a",
    });
    assert.equal(r.success, true);
  });

  it("rejects negative numerator", () => {
    const r = criterionEvaluationSchema.safeParse({
      numerator: -1,
      denominator: 1,
      rationale: "x",
    });
    assert.equal(r.success, false);
  });

  it("rejects denominator < 1", () => {
    const r = criterionEvaluationSchema.safeParse({
      numerator: 0,
      denominator: 0,
      rationale: "x",
    });
    assert.equal(r.success, false);
  });

  it("rejects empty rationale", () => {
    const r = criterionEvaluationSchema.safeParse({
      numerator: 1,
      denominator: 1,
      rationale: "",
    });
    assert.equal(r.success, false);
  });

  it("rejects non-numeric numerator", () => {
    const r = criterionEvaluationSchema.safeParse({
      numerator: "1" as unknown as number,
      denominator: 1,
      rationale: "x",
    });
    assert.equal(r.success, false);
  });
});

describe("criterionReportSchema (strict)", () => {
  it("accepts a fully-populated report (one entry per criterion)", () => {
    const r = criterionReportSchema.safeParse(fullReport());
    assert.equal(r.success, true);
  });

  it("rejects when any criterion is missing", () => {
    const partial = fullReport();
    const firstId = CRITERIA[0]!.id;
    delete partial[firstId];
    const r = criterionReportSchema.safeParse(partial);
    assert.equal(r.success, false);
  });

  it("rejects unknown criterion ids (strict)", () => {
    const extra = fullReport();
    extra["totally_made_up"] = {
      numerator: 1,
      denominator: 1,
      rationale: "x",
    };
    const r = criterionReportSchema.safeParse(extra);
    assert.equal(r.success, false);
  });
});

describe("appsMapSchema", () => {
  it("accepts a typical monorepo apps map", () => {
    const r = appsMapSchema.safeParse({
      "apps/backend": { description: "API service" },
      "apps/web": { description: "Next.js front-end" },
    });
    assert.equal(r.success, true);
  });
  it("rejects empty-string keys", () => {
    const r = appsMapSchema.safeParse({
      "": { description: "x" },
    });
    assert.equal(r.success, false);
  });
});

describe("modelUsedSchema", () => {
  it("accepts a valid model record", () => {
    const r = modelUsedSchema.safeParse({
      id: "claude-4.5-sonnet",
      reasoningEffort: "high",
    });
    assert.equal(r.success, true);
  });
  it("rejects unknown reasoningEffort", () => {
    const r = modelUsedSchema.safeParse({
      id: "x",
      reasoningEffort: "ultra" as unknown as "high",
    });
    assert.equal(r.success, false);
  });
});

describe("storeReadinessReportInputSchema", () => {
  const baseInput = {
    repoUrl: "https://github.com/owner/repo",
    report: fullReport(),
  };

  it("accepts the minimum required input", () => {
    const r = storeReadinessReportInputSchema.safeParse(baseInput);
    assert.equal(r.success, true);
  });

  it("accepts the full input with all optional fields", () => {
    const r = storeReadinessReportInputSchema.safeParse({
      ...baseInput,
      reportId: "run-123",
      apps: { "apps/api": { description: "API" } },
      commitHash: "abc123",
      branch: "main",
      hasLocalChanges: false,
      hasNonRemoteCommits: false,
      modelUsed: { id: "m", reasoningEffort: "low" },
      cliVersion: "1.2.3",
      createdAt: 1_715_123_456_000,
    });
    assert.equal(r.success, true);
  });

  it("rejects a non-URL repoUrl", () => {
    const r = storeReadinessReportInputSchema.safeParse({
      ...baseInput,
      repoUrl: "not-a-url",
    });
    assert.equal(r.success, false);
  });

  it("rejects when report is missing keys", () => {
    const partial = fullReport();
    delete partial[CRITERIA[0]!.id];
    const r = storeReadinessReportInputSchema.safeParse({
      ...baseInput,
      report: partial,
    });
    assert.equal(r.success, false);
  });

  it("rejects when report has extra keys (strict)", () => {
    const extra = fullReport();
    extra["bogus"] = { numerator: 1, denominator: 1, rationale: "x" };
    const r = storeReadinessReportInputSchema.safeParse({
      ...baseInput,
      report: extra,
    });
    assert.equal(r.success, false);
  });
});

describe("readinessHistoryEntrySchema", () => {
  it("accepts a typical stored history snapshot", () => {
    const r = readinessHistoryEntrySchema.safeParse({
      repoUrl: "https://github.com/owner/repo",
      reportId: "run-123",
      commitHash: "abc123def456",
      branch: "main",
      cliVersion: "1.2.3",
      createdAt: 1_715_123_456_000,
      achievedLevel: 4,
      overallPassPercent: 72.5,
      checksNeededForNextLevel: 6,
      levelBreakdowns: [
        {
          level: 1,
          checksPassed: 600,
          checksTotal: 600,
          percentComplete: 100,
          isUnlocked: true,
        },
        {
          level: 2,
          checksPassed: 480,
          checksTotal: 600,
          percentComplete: 80,
          isUnlocked: true,
        },
        {
          level: 3,
          checksPassed: 360,
          checksTotal: 600,
          percentComplete: 60,
          isUnlocked: true,
        },
        {
          level: 4,
          checksPassed: 240,
          checksTotal: 600,
          percentComplete: 40,
          isUnlocked: true,
        },
        {
          level: 5,
          checksPassed: 120,
          checksTotal: 600,
          percentComplete: 20,
          isUnlocked: true,
        },
      ],
    });
    assert.equal(r.success, true);
  });

  it("rejects a snapshot with an out-of-range level", () => {
    const r = readinessHistoryEntrySchema.safeParse({
      repoUrl: "https://github.com/owner/repo",
      createdAt: 1_715_123_456_000,
      achievedLevel: 7,
      overallPassPercent: 72.5,
      checksNeededForNextLevel: 6,
      levelBreakdowns: [],
    });
    assert.equal(r.success, false);
  });
});

describe("storeReadinessReportOutputSchema", () => {
  it("accepts a typical success payload", () => {
    const r = storeReadinessReportOutputSchema.safeParse({
      success: true,
      reportId: "ab12cd34-...",
      message: "stored",
    });
    assert.equal(r.success, true);
  });
  it("rejects missing fields", () => {
    const r = storeReadinessReportOutputSchema.safeParse({
      success: true,
      message: "stored",
    });
    assert.equal(r.success, false);
  });
});
