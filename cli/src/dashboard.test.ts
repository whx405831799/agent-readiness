import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { CRITERIA } from "./criteria/index.js";
import { __internal, renderDashboard } from "./dashboard.js";
import type {
  ReadinessHistoryEntry,
  ReadinessReport,
} from "./report/index.js";

function fullPassReport(): ReadinessReport["report"] {
  const out: ReadinessReport["report"] = {};
  for (const c of CRITERIA) {
    out[c.id] = { numerator: 1, denominator: 1, rationale: "ok" };
  }
  return out;
}

describe("renderDashboard", () => {
  const repoUrl = "https://github.com/owner/repo";
  const baseCreatedAt = Date.UTC(2026, 4, 8, 3, 0, 0);
  const baseReport: ReadinessReport = {
    reportId: "uuid-1",
    repoUrl,
    createdAt: baseCreatedAt,
    report: fullPassReport(),
  };

  it("emits a complete, self-contained HTML document", () => {
    const html = renderDashboard(baseReport);
    assert.ok(html.startsWith("<!doctype html>"));
    assert.match(html, /<style>/);
    assert.match(html, /<\/style>/);
    assert.match(html, /<script>/);
    assert.match(html, /<\/script>/);
    assert.equal(html.includes("https://cdn"), false);
    assert.equal(html.includes("http://"), false);
  });

  it("renders the achieved level + percent", () => {
    const html = renderDashboard(baseReport);
    assert.match(html, /Level 5/);
    assert.match(html, /100\.0%/);
  });

  it("renders one row per criterion", () => {
    const html = renderDashboard(baseReport);
    const rowMatches = html.match(/<li class="row"/g);
    assert.equal(rowMatches?.length, CRITERIA.length);
  });

  it("marks failing criteria with status-failed", () => {
    const failing = { ...baseReport.report };
    failing[CRITERIA[0]!.id] = {
      numerator: 0,
      denominator: 1,
      rationale: "missing config",
    };
    const html = renderDashboard({ ...baseReport, report: failing });
    assert.match(html, /status-failed/);
    assert.match(html, /missing config/);
  });

  it("renders a fix button for failing criteria", () => {
    const failing = { ...baseReport.report };
    failing[CRITERIA[0]!.id] = {
      numerator: 0,
      denominator: 1,
      rationale: "missing config",
    };
    const html = renderDashboard({ ...baseReport, report: failing });
    assert.match(
      html,
      new RegExp(
        `class="fix-btn" data-fix-id="${CRITERIA[0]!.id}"`,
      ),
    );
  });

  it("does not render fix buttons when all criteria pass", () => {
    const html = renderDashboard(baseReport);
    assert.equal(html.includes('class="fix-btn"'), false);
  });

  it("escapes HTML in rationales (XSS guard)", () => {
    const r = { ...baseReport.report };
    r[CRITERIA[0]!.id] = {
      numerator: 0,
      denominator: 1,
      rationale: '<script>alert("x")</script>',
    };
    const html = renderDashboard({ ...baseReport, report: r });
    assert.equal(html.includes('<script>alert("x")</script>'), false);
    assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  });

  it("escapes HTML in repoUrl", () => {
    const html = renderDashboard({
      ...baseReport,
      repoUrl: "https://evil.example/<script>alert(1)</script>",
    });
    assert.equal(html.includes("<script>alert(1)</script>"), false);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  });

  it("includes header metadata when provided", () => {
    const html = renderDashboard({
      ...baseReport,
      commitHash: "abc123def456789",
      branch: "main",
      modelUsed: { id: "claude-4-7-opus", reasoningEffort: "high" },
      apps: { "apps/api": { description: "API" } },
      hasLocalChanges: true,
      hasNonRemoteCommits: true,
    });
    assert.match(html, /abc123def456/); 
    assert.match(html, /<code>main<\/code>/);
    assert.match(html, /claude-4-7-opus/);
    assert.match(html, /1 apps/);
    assert.match(html, /local changes/);
    assert.match(html, /unpushed commits/);
  });

  it("renders all five levels in the readiness rail", () => {
    const html = renderDashboard(baseReport);
    for (let lvl = 1; lvl <= 5; lvl++) {
      assert.match(html, new RegExp(`rail-seg [^\"]*level-${lvl}`));
    }
  });

  it("uses dark placeholder segments for incomplete readiness", () => {
    const partial = { ...baseReport.report };
    partial[CRITERIA[0]!.id] = {
      numerator: 0,
      denominator: 1,
      rationale: "not ready yet",
    };
    const html = renderDashboard({ ...baseReport, report: partial });
    assert.match(html, /rail-seg is-filled level-/);
    assert.match(html, /rail-seg is-pending level-/);
  });

  it("renders a level over time chart instead of the category scoreboard", () => {
    const html = renderDashboard(baseReport);
    assert.match(html, /Level Over Time/);
    assert.match(html, /class="trend-chart"/);
    assert.match(html, /id="trend-summary"/);
    assert.match(html, /data-trend-range="7d"/);
    assert.match(html, /data-trend-range="1m"/);
    assert.match(html, /data-trend-range="6m"/);
    assert.match(html, /data-trend-range="all"/);
    assert.match(html, /class="trend-chip is-active" data-trend-range="all"/);
    assert.match(html, /1 snapshot/);
    assert.match(html, /MAY 8/);
    assert.match(html, /Latest L5 · 100\.0%/);
    assert.match(html, /querySelectorAll\('\[data-trend-range\]\.trend-chip'\)/);
    assert.equal(html.includes("Category Scoreboard"), false);
  });

  it("renders stored history snapshots on the trend chart", () => {
    const html = renderDashboard(baseReport, {
      history: [
        {
          repoUrl,
          reportId: "uuid-0",
          branch: "main",
          commitHash: "111111111111",
          cliVersion: "0.0.1",
          createdAt: Date.UTC(2026, 0, 2, 0, 0, 0),
          achievedLevel: 2,
          overallPassPercent: 31.5,
          checksNeededForNextLevel: 8,
          levelBreakdowns: [
            { level: 1, checksPassed: 400, checksTotal: 500, percentComplete: 80, isUnlocked: true },
            { level: 2, checksPassed: 200, checksTotal: 500, percentComplete: 40, isUnlocked: true },
            { level: 3, checksPassed: 100, checksTotal: 500, percentComplete: 20, isUnlocked: true },
            { level: 4, checksPassed: 50, checksTotal: 500, percentComplete: 10, isUnlocked: true },
            { level: 5, checksPassed: 0, checksTotal: 500, percentComplete: 0, isUnlocked: true },
          ],
        },
        {
          repoUrl,
          reportId: "uuid-a",
          branch: "main",
          commitHash: "222222222222",
          cliVersion: "0.0.1",
          createdAt: Date.UTC(2026, 2, 12, 0, 0, 0),
          achievedLevel: 4,
          overallPassPercent: 67.8,
          checksNeededForNextLevel: 4,
          levelBreakdowns: [
            { level: 1, checksPassed: 500, checksTotal: 500, percentComplete: 100, isUnlocked: true },
            { level: 2, checksPassed: 400, checksTotal: 500, percentComplete: 80, isUnlocked: true },
            { level: 3, checksPassed: 320, checksTotal: 500, percentComplete: 64, isUnlocked: true },
            { level: 4, checksPassed: 220, checksTotal: 500, percentComplete: 44, isUnlocked: true },
            { level: 5, checksPassed: 90, checksTotal: 500, percentComplete: 18, isUnlocked: true },
          ],
        },
      ],
    });
    assert.match(html, /3 snapshots/);
    assert.match(html, /JAN 2/);
    assert.match(html, /MAY 8/);
    assert.match(html, /class="trend-line"/);
    assert.equal(html.includes("03:00"), false);
    assert.equal(html.includes("00:00"), false);
    assert.match(html, /data-summary="1 snapshot .*Latest L5 .*100\.0%"/);
    assert.match(html, /data-summary="3 snapshots .*Latest L5 .*100\.0%"/);
    assert.match(html, /class="trend-tooltip" hidden><\/div>/);
    assert.match(html, /data-tooltip="JAN 2 · Level 2 · 31\.5% · 111111111111"/);
    assert.match(html, /data-tooltip="MAY 8 · Level 5 · 100\.0%"/);
    assert.match(html, /querySelectorAll\('\.trend-point-target\[data-tooltip\]'\)/);
    assert.equal((html.match(/class="trend-panel/g) ?? []).length, 4);
  });

  it("renders 'Highest level reached' when no checks needed", () => {
    const html = renderDashboard(baseReport);
    assert.match(html, /Highest level reached/);
  });

  it("renders search/filter UI", () => {
    const html = renderDashboard(baseReport);
    assert.match(html, /id="search"/);
    assert.match(html, /data-status="passed"/);
    assert.match(html, /data-status="failed"/);
    assert.match(html, /data-status="skipped"/);
    assert.match(html, /querySelectorAll\('\[data-status\]\.chip'\)/);
  });

  it("renders the fix modal shell and prompt data container", () => {
    const failing = { ...baseReport.report };
    failing[CRITERIA[0]!.id] = {
      numerator: 0,
      denominator: 1,
      rationale: "missing config",
    };
    const html = renderDashboard({ ...baseReport, report: failing });
    assert.match(html, /id="fix-modal"/);
    assert.match(html, /id="fix-prompts-data"/);
    assert.match(html, /Fix Readiness Signal/);
    assert.match(html, /id="fix-note"/);
    assert.match(html, /id="fix-copy-btn"/);
    assert.match(html, /<pre id="fix-prompt-text" class="fix-prompt"><\/pre>/);
    assert.equal(html.includes("Droid CLI"), false);
    assert.equal(
      html.includes('<div class="section-label">Fix Readiness Signal</div>'),
      false,
    );
    assert.equal(html.includes('class="fix-tabs"'), false);
  });

  it("uses opts.title when provided", () => {
    const html = renderDashboard(baseReport, { title: "My Report" });
    assert.match(html, /<title>My Report<\/title>/);
  });

  it("falls back to '(unknown repo)' when repoUrl is empty", () => {
    const html = renderDashboard({ ...baseReport, repoUrl: "" });
    assert.match(html, /\(unknown repo\)/);
  });

  it("handles a missing report entry as 'missing' (warn)", () => {
    const partial = { ...baseReport.report };
    delete partial[CRITERIA[0]!.id];
    const html = renderDashboard({ ...baseReport, report: partial });
    assert.match(html, /status-missing/);
    assert.match(html, /\(no entry in report\)/);
  });

  it("renders skipped entries with N/A score", () => {
    const r = { ...baseReport.report };
    const skippable = CRITERIA.find((c) => c.isSkippable);
    if (!skippable) return;
    r[skippable.id] = {
      numerator: null,
      denominator: 1,
      rationale: "not applicable",
    };
    const html = renderDashboard({ ...baseReport, report: r });
    assert.match(html, /N\/A/);
    assert.match(html, /status-skipped/);
  });

  it("includes an SVG radar chart with all 9 categories", () => {
    const html = renderDashboard(baseReport);
    assert.match(html, /<svg class="radar"/);
    assert.match(html, /role="img"/);
    assert.equal((html.match(/class="radar-axis"/g) ?? []).length, 9);
    assert.equal((html.match(/class="radar-dot"/g) ?? []).length, 9);
  });

  it("radar reflects per-category pass rate", () => {
    const r = { ...baseReport.report };
    const styleIds = CRITERIA.filter((c) => c.category === "style").map((c) => c.id);
    for (const id of styleIds) {
      r[id] = { numerator: 0, denominator: 1, rationale: "no" };
    }
    const html = renderDashboard({ ...baseReport, report: r });
    assert.match(
      html,
      /Style[\s\S]*?0\.0% \(0\/\d+\)<\/tspan>/,
    );
  });
});

describe("historyForRange", () => {
  const latest = Date.UTC(2026, 4, 8, 3, 0, 0);
  const history: ReadonlyArray<ReadinessHistoryEntry> = [
    {
      repoUrl: "https://github.com/owner/repo",
      createdAt: Date.UTC(2025, 8, 1, 0, 0, 0),
      achievedLevel: 1,
      overallPassPercent: 10,
      checksNeededForNextLevel: 8,
      levelBreakdowns: [
        { level: 1, checksPassed: 100, checksTotal: 500, percentComplete: 20, isUnlocked: true },
        { level: 2, checksPassed: 50, checksTotal: 500, percentComplete: 10, isUnlocked: true },
        { level: 3, checksPassed: 0, checksTotal: 500, percentComplete: 0, isUnlocked: true },
        { level: 4, checksPassed: 0, checksTotal: 500, percentComplete: 0, isUnlocked: true },
        { level: 5, checksPassed: 0, checksTotal: 500, percentComplete: 0, isUnlocked: true },
      ],
    },
    {
      repoUrl: "https://github.com/owner/repo",
      createdAt: Date.UTC(2026, 1, 20, 0, 0, 0),
      achievedLevel: 3,
      overallPassPercent: 48,
      checksNeededForNextLevel: 5,
      levelBreakdowns: [
        { level: 1, checksPassed: 500, checksTotal: 500, percentComplete: 100, isUnlocked: true },
        { level: 2, checksPassed: 300, checksTotal: 500, percentComplete: 60, isUnlocked: true },
        { level: 3, checksPassed: 180, checksTotal: 500, percentComplete: 36, isUnlocked: true },
        { level: 4, checksPassed: 80, checksTotal: 500, percentComplete: 16, isUnlocked: true },
        { level: 5, checksPassed: 20, checksTotal: 500, percentComplete: 4, isUnlocked: true },
      ],
    },
    {
      repoUrl: "https://github.com/owner/repo",
      createdAt: Date.UTC(2026, 4, 3, 0, 0, 0),
      achievedLevel: 4,
      overallPassPercent: 72,
      checksNeededForNextLevel: 3,
      levelBreakdowns: [
        { level: 1, checksPassed: 500, checksTotal: 500, percentComplete: 100, isUnlocked: true },
        { level: 2, checksPassed: 500, checksTotal: 500, percentComplete: 100, isUnlocked: true },
        { level: 3, checksPassed: 300, checksTotal: 500, percentComplete: 60, isUnlocked: true },
        { level: 4, checksPassed: 180, checksTotal: 500, percentComplete: 36, isUnlocked: true },
        { level: 5, checksPassed: 90, checksTotal: 500, percentComplete: 18, isUnlocked: true },
      ],
    },
    {
      repoUrl: "https://github.com/owner/repo",
      createdAt: latest,
      achievedLevel: 5,
      overallPassPercent: 100,
      checksNeededForNextLevel: null,
      levelBreakdowns: [
        { level: 1, checksPassed: 500, checksTotal: 500, percentComplete: 100, isUnlocked: true },
        { level: 2, checksPassed: 500, checksTotal: 500, percentComplete: 100, isUnlocked: true },
        { level: 3, checksPassed: 500, checksTotal: 500, percentComplete: 100, isUnlocked: true },
        { level: 4, checksPassed: 500, checksTotal: 500, percentComplete: 100, isUnlocked: true },
        { level: 5, checksPassed: 500, checksTotal: 500, percentComplete: 100, isUnlocked: true },
      ],
    },
  ];

  it("filters windows relative to the latest snapshot", () => {
    assert.equal(__internal.historyForRange(history, "7d").length, 2);
    assert.equal(__internal.historyForRange(history, "1m").length, 2);
    assert.equal(__internal.historyForRange(history, "6m").length, 3);
    assert.equal(__internal.historyForRange(history, "all").length, 4);
  });
});
