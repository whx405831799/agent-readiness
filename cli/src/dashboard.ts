
import {
  CATEGORIES,
  CATEGORY_BY_ID,
  CRITERIA,
  CRITERION_BY_ID,
} from "./criteria/index.js";
import type { CategoryId, Criterion } from "./criteria/index.js";
import {
  createHistoryEntry,
  evaluationStatus,
  overallPassPercent,
  relativeTimeFromNow,
  summarizeReport,
} from "./report/index.js";
import type {
  CriterionEvaluation,
  ReadinessHistoryEntry,
  ReadinessReport,
} from "./report/index.js";

const SYSTEM_REMINDER_OPEN = "<system-reminder>";
const SYSTEM_REMINDER_CLOSE = "</system-reminder>";

function readinessRepoLabel(repoUrl: string): string {
  const cleaned = repoUrl.replace(/\/+$/, "").replace(/\.git$/, "");
  const m = cleaned.match(/([^/]+)$/);
  return m ? m[1]! : repoUrl;
}

interface BuildReadinessSignalFixPromptOptions {
  repoUrl: string;
  criterion: Criterion;
  evaluation: CriterionEvaluation | null;
  target?: "computer" | "local";
}

function buildReadinessSignalFixPrompt(
  opts: BuildReadinessSignalFixPromptOptions,
): string {
  const { repoUrl, criterion, evaluation } = opts;
  const score = !evaluation
    ? "[missing]"
    : evaluation.numerator === null
      ? "[N/A]"
      : `[${evaluation.numerator}/${evaluation.denominator}]`;
  const rationale =
    evaluation?.rationale ??
    "No entry exists for this criterion in the latest readiness report.";
  const repo = readinessRepoLabel(repoUrl);

  return `[Readiness Fix] ${repo} ${criterion.name}

Fix the failing signal: ${criterion.name} (${score})

${SYSTEM_REMINDER_OPEN}
You are fixing an Agent Readiness signal. Agent Readiness evaluates how well a repository supports autonomous AI agents working on the codebase.

## Failing Signal

**Signal**: ${criterion.name}
**Score**: ${score}
**Description**: ${criterion.description}
**Why it failed**: ${rationale}

## Original Signal Evaluation Criteria

The agent readiness report evaluated this signal using these instructions:

${criterion.instructions}

## Your Task

1. Explore the repository to understand the current state related to this signal
2. Make **substantive improvements** to the codebase that genuinely address the signal
3. Verify your fix addresses the issue (e.g., run linter if fixing lint_config, run tests if adding tests)
4. Keep changes focused on this signal - don't refactor unrelated code
5. When done with code changes, open a PULL REQUEST with the changes and return the PR URL

## CRITICAL: Quality Standards

Your fix must **genuinely improve the codebase**. Do NOT use workarounds or shortcuts:

- **NO** empty placeholder files (e.g., empty test files, stub configs)
- **NO** minimal implementations that technically pass but provide no real value
- **NO** disabling checks or adding skip markers to pass validation
- **NO** trivial changes that game the metric without improving quality

Examples of BAD fixes:
- Adding an empty \`test.js\` file to satisfy "has tests" criterion
- Creating a \`.eslintrc\` that disables all rules
- Adding \`// @ts-nocheck\` to satisfy TypeScript requirements

Examples of GOOD fixes:
- Writing actual unit tests with meaningful assertions for existing code
- Configuring ESLint with appropriate rules for the project's language/framework
- Adding proper TypeScript types to improve type safety

## Completion

- IMPORTANT: When finishing work and you made code changes, open a PULL REQUEST with the changes and return the PR URL
- Provide a succinct summary of what you changed and why it genuinely improves the codebase
${SYSTEM_REMINDER_CLOSE}`;
}

export interface RenderDashboardOptions {
  title?: string;
  now?: number;
  history?: ReadinessHistoryEntry[];
}

export function renderDashboard(
  report: ReadinessReport,
  opts: RenderDashboardOptions = {},
): string {
  const summary = summarizeReport(report);
  const percent = overallPassPercent(report);
  const title =
    opts.title ?? `Agent Readiness — ${report.repoUrl || "(unknown repo)"}`;

  const generated =
    typeof report.createdAt === "number"
      ? relativeTimeFromNow(report.createdAt, opts.now ?? Date.now())
      : null;

  const grouped = groupByCategory(report);
  const totals = summarizeDashboard(grouped);
  const headerMeta = renderHeaderMeta(report, generated);
  const updateLabel = generated ? `Last update: ${generated}` : "Latest snapshot";
  const fixPrompts = buildFixPromptMap(grouped, report.repoUrl);
  const history = historySeries(report, opts.history, opts.now);
  const trendRanges = buildTrendRanges(history);
  const activeTrend =
    trendRanges.find((range) => range.isActive) ?? trendRanges[trendRanges.length - 1]!;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${BASE_CSS}</style>
</head>
<body>
<header class="hdr">
  <div class="hero card">
    <div class="hero-top">
      <div class="hero-title">
        <div class="hero-badge level-${summary.achievedLevel}" aria-hidden="true">${summary.achievedLevel}</div>
        <div class="hero-copy">
          <div class="kicker">Agent Readiness</div>
          <h1>${escapeHtml(repoLabel(report.repoUrl))}</h1>
          <div class="hdr-note">${totals.totalCriteria} criteria · ${totals.categoryCount} categories · ${totals.evaluableCriteria} scored</div>
          ${headerMeta ? `<div class="hero-meta">${headerMeta}</div>` : ""}
        </div>
      </div>
      <div class="hero-actions">
        <div class="hero-update">${escapeHtml(updateLabel)}</div>
        <div class="theme-toggle">
          <button data-theme="dark" class="on">Dark</button>
          <button data-theme="light">Light</button>
        </div>
      </div>
    </div>
    <div class="hero-summary">
      <div class="summary-pill summary-level">
        <strong>Level ${summary.achievedLevel}</strong>
        <span>Current level</span>
      </div>
      <div class="summary-pill summary-percent">
        <strong>${percent.toFixed(1)}%</strong>
        <span>Total pass rate</span>
      </div>
      ${renderSummaryStat("Passed", totals.passed, "passed")}
      ${renderSummaryStat("Failed", totals.failed, "failed")}
      ${renderSummaryStat("Skipped", totals.skipped, "skipped")}
      ${totals.missing > 0 ? renderSummaryStat("Missing", totals.missing, "missing") : ""}
    </div>
    <div class="hero-rail">
      <div class="rail-head">
        <div class="section-label">Readiness by level</div>
        <div class="rail-total">${percent.toFixed(1)}% total criteria pass</div>
      </div>
      ${renderLevelRail(grouped, percent)}
      <div class="checks-needed">${renderChecksNeeded(summary.checksNeededForNextLevel)}</div>
    </div>
  </div>
</header>

<section class="overview-grid" aria-label="Dashboard overview">
  <article class="overview-card radar-card">
    <h2 class="radar-title">Pass Rate by Category</h2>
    ${renderRadar(grouped)}
  </article>
  <article class="overview-card trend-card" aria-label="Level over time">
    <div class="trend-head">
      <div class="trend-copy">
        <h2 class="radar-title">Level Over Time</h2>
        <div id="trend-summary" class="trend-summary">${escapeHtml(activeTrend.summary)}</div>
      </div>
      <div class="trend-range" role="group" aria-label="Trend range">
        ${trendRanges
          .map(
            (range) =>
              `<button type="button" class="trend-chip${range.isActive ? " is-active" : ""}" data-trend-range="${range.id}" aria-pressed="${range.isActive ? "true" : "false"}">${escapeHtml(range.label)}</button>`,
          )
          .join("")}
      </div>
    </div>
    ${trendRanges
      .map(
        (range) =>
          `<section class="trend-panel${range.isActive ? " is-active" : ""}" data-trend-range="${range.id}" data-summary="${escapeAttr(range.summary)}"${range.isActive ? "" : " hidden"}>${renderLevelHistory(range.history)}</section>`,
      )
      .join("")}
  </article>
</section>

<main>
  <section class="filters" aria-label="Filters">
    <div class="filters-heading">
      <div class="section-label">Browse criteria</div>
      <div class="filters-note">${totals.totalCriteria} checks</div>
    </div>
    <input id="search" type="search" placeholder="Filter by name, id, or rationale…" />
    <div class="chips" role="group" aria-label="Status">
      <button data-status="all"    class="chip on">All</button>
      <button data-status="passed" class="chip">Passed</button>
      <button data-status="failed" class="chip">Failed</button>
      <button data-status="skipped" class="chip">Skipped</button>
    </div>
    <div class="chips" role="group" aria-label="Category">
      <button data-cat="all" class="chip on">All categories</button>
      ${CATEGORIES.map(
        (c) => `<button data-cat="${escapeHtml(c.id)}" class="chip">${escapeHtml(c.name)}</button>`,
      ).join("")}
    </div>
  </section>
  <div id="empty-state" class="empty-state" hidden>No criteria match the current filters.</div>

  ${grouped.map(renderCategorySection).join("\n")}
</main>

${renderFixModal()}
<script id="fix-prompts-data" type="application/json">${escapeScriptJson(JSON.stringify(fixPrompts))}</script>
<script>${INLINE_JS}</script>
</body>
</html>`;
}

interface CategoryGroup {
  category: { id: CategoryId; name: string };
  rows: Row[];
}

interface CategoryMetrics {
  averageRate: number;
  evaluableCount: number;
  passedCount: number;
  totalCount: number;
}

interface DashboardTotals {
  categoryCount: number;
  evaluableCriteria: number;
  failed: number;
  missing: number;
  passed: number;
  skipped: number;
  totalCriteria: number;
}

interface FixPromptData {
  computer: string;
  criterionName: string;
  local: string;
  scoreLabel: string;
}

type TrendRangeId = "7d" | "1m" | "6m" | "all";

interface TrendRangeOption {
  id: TrendRangeId;
  label: string;
  history: ReadonlyArray<ReadinessHistoryEntry>;
  summary: string;
  isActive: boolean;
}

interface Row {
  criterion: Criterion;
  evaluation: CriterionEvaluation | null;
  status: "passed" | "failed" | "skipped" | "missing";
}

function groupByCategory(report: ReadinessReport): CategoryGroup[] {
  const out: CategoryGroup[] = [];
  for (const cat of CATEGORIES) {
    const rows: Row[] = [];
    for (const c of CRITERIA) {
      if (c.category !== cat.id) continue;
      const e = report.report[c.id];
      const status: Row["status"] = e ? evaluationStatus(e) : "missing";
      rows.push({ criterion: c, evaluation: e ?? null, status });
    }
    out.push({ category: { id: cat.id, name: cat.name }, rows });
  }
  return out;
}

function renderCategorySection(group: CategoryGroup): string {
  const metrics = summarizeCategoryMetrics(group.rows);
  const pct = formatPercent(metrics.averageRate);
  return `<section class="cat" data-cat="${escapeHtml(group.category.id)}">
  <header class="cat-hdr">
    <div class="cat-copy">
      <h2>${escapeHtml(group.category.name)}</h2>
      <span class="cat-stats">${metrics.passedCount} / ${metrics.evaluableCount} fully passed · ${pct}% average score · ${metrics.totalCount} criteria</span>
    </div>
    <div class="cat-progress">
      <div class="cat-progress-value">${pct}%</div>
      <div class="cat-progress-track"><div class="cat-progress-fill" style="width:${pct}%"></div></div>
    </div>
  </header>
  <ul class="rows">
    ${group.rows.map(renderRow).join("\n")}
  </ul>
</section>`;
}

function renderRow(row: Row): string {
  const { criterion: c, evaluation: e, status } = row;
  const score =
    e === null
      ? "—"
      : e.numerator === null
        ? "N/A"
        : `${e.numerator}/${e.denominator}`;
  const rationale = e?.rationale ?? "(no entry in report)";
  const statusLabel =
    status === "missing" ? "missing" : status;
  const statusText = labelForStatus(statusLabel);
  const canFix = canFixRow(row);
  const haystack =
    `${c.id} ${c.name} ${c.description} ${rationale}`.toLowerCase();
  return `<li class="row${canFix ? " has-fix" : ""}" data-status="${statusLabel}" data-cat="${escapeHtml(c.category)}" data-haystack="${escapeAttr(haystack)}">
  <div class="row-main">
    <div class="row-title">
      <span class="status-dot status-${statusLabel}" aria-label="${statusLabel}"></span>
      <span class="row-name">${escapeHtml(c.name)}</span>
      <code class="row-id">${escapeHtml(c.id)}</code>
    </div>
    <div class="row-meta">
      <span class="badge badge-status badge-status-${statusLabel}">${statusText}</span>
      <span class="badge badge-level">L${c.level}</span>
      <span class="badge badge-scope badge-scope-${c.scope}">${c.scope[0]!.toUpperCase()}</span>
      ${c.isSkippable ? `<span class="badge badge-skip">Skippable</span>` : ""}
      <span class="row-score">${escapeHtml(score)}</span>
      ${canFix ? `<button type="button" class="fix-btn" data-fix-id="${escapeAttr(c.id)}" aria-haspopup="dialog" aria-label="${escapeAttr(`Fix ${c.name}`)}">Fix</button>` : ""}
    </div>
  </div>
  <div class="row-rationale">${escapeHtml(rationale)}</div>
</li>`;
}

interface RadarPoint {
  label: string;
  rate: number;
  passed: number;
  evaluable: number;
}

function radarPoints(grouped: CategoryGroup[]): RadarPoint[] {
  return grouped.map((g) => {
    const metrics = summarizeCategoryMetrics(g.rows);
    return {
      label: g.category.name,
      rate: metrics.averageRate,
      passed: metrics.passedCount,
      evaluable: metrics.evaluableCount,
    };
  });
}

function renderRadar(grouped: CategoryGroup[]): string {
  const pts = radarPoints(grouped);
  const N = pts.length;
  if (N < 3) return ""; 

  const W = 680;
  const H = 660;
  const cx = W / 2;
  const cy = H / 2 - 16;
  const R = 182; 

  function ringPoints(scale: number): string {
    return pts
      .map((_, i) => {
        const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
        const x = cx + Math.cos(angle) * R * scale;
        const y = cy + Math.sin(angle) * R * scale;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  function dataPoints(): string {
    return pts
      .map((p, i) => {
        const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
        const x = cx + Math.cos(angle) * R * p.rate;
        const y = cy + Math.sin(angle) * R * p.rate;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  const rings = [0.25, 0.5, 0.75, 1.0]
    .map(
      (s) =>
        `<polygon class="radar-ring" points="${ringPoints(s)}" fill="none"/>`,
    )
    .join("");

  const axes = pts
    .map((_, i) => {
      const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
      const x = cx + Math.cos(angle) * R;
      const y = cy + Math.sin(angle) * R;
      return `<line class="radar-axis" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
    })
    .join("");

  const labels = pts
    .map((p, i) => {
      const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
      const labelRadius = R + 72;
      const rawLx = cx + Math.cos(angle) * labelRadius;
      const ly = cy + Math.sin(angle) * labelRadius;
      const anchor =
        Math.abs(rawLx - cx) < 4 ? "middle" : rawLx > cx ? "start" : "end";
      const pct = formatPercent(p.rate);
      const pctText = `${pct}% (${p.passed}/${p.evaluable})`;
      const wrappedNameLines = wrapRadarLabel(p.label);
      const widestName = wrappedNameLines.reduce(
        (max, line) => Math.max(max, estimateRadarLineWidth(line, "name")),
        0,
      );
      const widestPct = estimateRadarLineWidth(pctText, "pct");
      const widestLine = Math.max(widestName, widestPct);
      const edgePadding = 20;
      const lx =
        anchor === "start"
          ? Math.min(rawLx - 16, W - widestLine - edgePadding)
          : anchor === "end"
            ? Math.max(rawLx + 16, widestLine + edgePadding)
            : Math.min(
                Math.max(rawLx, widestLine / 2 + edgePadding),
                W - widestLine / 2 - edgePadding,
              );
      const dy = ly < cy ? "-0.25em" : "1.05em";
      const nameLines = wrappedNameLines
        .map((line, index) => {
          const nextDy = index === 0 ? dy : "1.12em";
          return `<tspan class="radar-label-name" x="${lx.toFixed(1)}" dy="${nextDy}" text-anchor="${anchor}">${escapeHtml(line)}</tspan>`;
        })
        .join("");
      return `<text class="radar-label" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}">
  ${nameLines}
  <tspan class="radar-label-pct" x="${lx.toFixed(1)}" dy="1.26em" text-anchor="${anchor}">${pctText}</tspan>
</text>`;
    })
    .join("");

  const dots = pts
    .map((p, i) => {
      const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
      const x = cx + Math.cos(angle) * R * p.rate;
      const y = cy + Math.sin(angle) * R * p.rate;
      return `<circle class="radar-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.8"/>`;
    })
    .join("");

  return `<svg class="radar" viewBox="0 0 ${W} ${H}" role="img" aria-label="Per-category pass rate radar chart">
  <g class="radar-rings">${rings}</g>
  <g class="radar-axes">${axes}</g>
  <polygon class="radar-data" points="${dataPoints()}"/>
  <g class="radar-dots">${dots}</g>
  <g class="radar-labels">${labels}</g>
</svg>`;
}

function renderLevelRail(grouped: CategoryGroup[], percent: number): string {
  const rows = grouped
    .flatMap((group) => group.rows)
    .slice()
    .sort(
      (a, b) =>
        a.criterion.level - b.criterion.level ||
        a.criterion.name.localeCompare(b.criterion.name),
    );
  if (rows.length === 0) return "";

  const countsByLevel = new Map<number, number>();
  for (const row of rows) {
    countsByLevel.set(
      row.criterion.level,
      (countsByLevel.get(row.criterion.level) ?? 0) + 1,
    );
  }

  const labels = [1, 2, 3, 4, 5]
    .map((level) => {
      const width = ((countsByLevel.get(level) ?? 0) / rows.length) * 100;
      return `<div class="rail-label" style="width:${width}%">Level ${level}</div>`;
    })
    .join("");

  const markerPos = Math.max(4, Math.min(96, percent));
  const filledCount =
    percent <= 0
      ? 0
      : percent >= 100
        ? rows.length
        : Math.max(
            1,
            Math.min(
              rows.length - 1,
              Math.round((percent / 100) * rows.length),
            ),
          );

  const segments = rows
    .map(
      (row, index) =>
        `<span class="rail-seg ${index < filledCount ? "is-filled" : "is-pending"} level-${row.criterion.level}" title="${escapeAttr(`Level ${row.criterion.level} · ${index < filledCount ? "Reached" : "Pending"} · ${row.criterion.name}`)}"></span>`,
    )
    .join("");

  return `<div class="rail-shell">
  <div class="rail-marker" style="left:${markerPos}%">
    <span>${percent.toFixed(1)}%</span>
  </div>
  <div class="rail-track" style="grid-template-columns:repeat(${rows.length},minmax(0,1fr))">
    ${segments}
  </div>
  <div class="rail-labels">${labels}</div>
</div>`;
}

function historySeries(
  report: ReadinessReport,
  history: ReadonlyArray<ReadinessHistoryEntry> | undefined,
  now?: number,
): ReadinessHistoryEntry[] {
  const current = createHistoryEntry(report, now === undefined ? {} : { now });
  const combined = [
    ...(history ?? []).filter((entry) => entry.repoUrl === report.repoUrl),
    current,
  ];
  const deduped = new Map<string, ReadinessHistoryEntry>();
  for (const entry of combined) {
    const key = [
      entry.repoUrl,
      entry.reportId ?? "",
      entry.commitHash ?? "",
      entry.branch ?? "",
      entry.createdAt,
      entry.achievedLevel,
      entry.overallPassPercent.toFixed(2),
    ].join("|");
    deduped.set(key, entry);
  }
  return Array.from(deduped.values()).sort((a, b) => a.createdAt - b.createdAt);
}

function buildTrendRanges(
  history: ReadonlyArray<ReadinessHistoryEntry>,
): TrendRangeOption[] {
  const ranges: ReadonlyArray<{ id: TrendRangeId; label: string }> = [
    { id: "7d", label: "7d" },
    { id: "1m", label: "1m" },
    { id: "6m", label: "6m" },
    { id: "all", label: "All" },
  ];
  return ranges.map((range) => {
    const scopedHistory = historyForRange(history, range.id);
    return {
      id: range.id,
      label: range.label,
      history: scopedHistory,
      summary: trendSummaryText(scopedHistory),
      isActive: range.id === "all",
    };
  });
}

function historyForRange(
  history: ReadonlyArray<ReadinessHistoryEntry>,
  rangeId: TrendRangeId,
): ReadonlyArray<ReadinessHistoryEntry> {
  if (history.length === 0 || rangeId === "all") return history;
  const latest = history[history.length - 1]!;
  const windowMsByRange: Record<Exclude<TrendRangeId, "all">, number> = {
    "7d": 7 * 24 * 60 * 60 * 1000,
    "1m": 30 * 24 * 60 * 60 * 1000,
    "6m": 183 * 24 * 60 * 60 * 1000,
  };
  const cutoff = latest.createdAt - windowMsByRange[rangeId];
  const scoped = history.filter((entry) => entry.createdAt >= cutoff);
  return scoped.length > 0 ? scoped : [latest];
}

function trendSummaryText(history: ReadonlyArray<ReadinessHistoryEntry>): string {
  const first = history[0];
  const last = history[history.length - 1];
  if (!first || !last) {
    return "0 snapshots - Latest 0.0%";
  }
  const snapshotLabel = `${history.length} snapshot${history.length === 1 ? "" : "s"}`;
  const rangeLabel =
    history.length === 1
      ? formatHistoryDate(first.createdAt)
      : `${formatHistoryDate(first.createdAt)} → ${formatHistoryDate(last.createdAt)}`;
  return `${snapshotLabel} · ${rangeLabel} · Latest L${last.achievedLevel} · ${last.overallPassPercent.toFixed(1)}%`;
}

function renderLevelHistory(history: ReadonlyArray<ReadinessHistoryEntry>): string {
  const axisLabels = trendAxisLabels(history);
  const W = 720;
  const H = 300;
  const padLeft = 18;
  const padRight = 18;
  const padTop = 14;
  const padBottom = 26;
  const innerW = W - padLeft - padRight;
  const innerH = H - padTop - padBottom;
  const baseY = H - padBottom;
  const points = history.map((entry, index) => {
    const x =
      history.length === 1
        ? W / 2
        : padLeft + (index / (history.length - 1)) * innerW;
    const y = padTop + ((5 - entry.achievedLevel) / 4) * innerH;
    return { entry, x, y };
  });

  const linePath = points
    .map((point, index) => {
      const prefix = index === 0 ? "M" : "L";
      return `${prefix}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    })
    .join(" ");
  const areaPath =
    points.length >= 2
      ? `${linePath} L${points[points.length - 1]!.x.toFixed(1)} ${baseY.toFixed(1)} L${points[0]!.x.toFixed(1)} ${baseY.toFixed(1)} Z`
      : "";

  return `<div class="trend-shell">
  <div class="trend-y" aria-hidden="true">
    <span>5</span>
    <span>4</span>
    <span>3</span>
    <span>2</span>
    <span>1</span>
  </div>
  <div class="trend-stage">
    <div class="trend-grid" aria-hidden="true"></div>
    <svg class="trend-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Readiness level trend over time">
      ${areaPath ? `<path class="trend-area" d="${areaPath}"></path>` : ""}
      ${points.length >= 2 ? `<path class="trend-line" d="${linePath}"></path>` : ""}
      ${points
        .map((point, index) => {
          const isLatest = index === points.length - 1;
          const title = buildTrendPointTitle(point.entry);
          return `<g class="trend-point-target${isLatest ? " is-latest" : ""}" tabindex="0" aria-label="${escapeAttr(title)}" data-tooltip="${escapeAttr(title)}">
        <circle class="trend-point-hit" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${isLatest ? "14" : "12"}"></circle>
        <circle class="trend-point${isLatest ? " is-latest" : ""}" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${isLatest ? "5.5" : "4.2"}"><title>${escapeHtml(title)}</title></circle>
      </g>`;
        })
        .join("")}
    </svg>
    <div class="trend-tooltip" hidden></div>
    <div class="trend-x" aria-hidden="true">
      <span>${escapeHtml(axisLabels[0]!)}</span>
      <span>${escapeHtml(axisLabels[1]!)}</span>
      <span>${escapeHtml(axisLabels[2]!)}</span>
    </div>
  </div>
</div>`;
}

function trendAxisLabels(
  history: ReadonlyArray<ReadinessHistoryEntry>,
): [string, string, string] {
  if (history.length === 0) return ["Start", "Mid", "Latest"];
  const first = history[0]!;
  const middle = history[Math.floor((history.length - 1) / 2)]!;
  const last = history[history.length - 1]!;
  return [
    formatHistoryDate(first.createdAt),
    formatHistoryDate(middle.createdAt),
    formatHistoryDate(last.createdAt),
  ];
}

function buildTrendPointTitle(entry: ReadinessHistoryEntry): string {
  const commit = entry.commitHash ? ` · ${entry.commitHash.slice(0, 12)}` : "";
  return `${formatHistoryDate(entry.createdAt)} · Level ${entry.achievedLevel} · ${entry.overallPassPercent.toFixed(1)}%${commit}`;
}

function formatHistoryDate(timestamp: number): string {
  const date = new Date(timestamp);
  const month = MONTH_LABELS[date.getUTCMonth()] ?? "UNK";
  const day = date.getUTCDate();
  return `${month} ${day}`;
}

function renderFixModal(): string {
  return `<div id="fix-modal" class="fix-modal" hidden>
  <div class="fix-backdrop" data-fix-close></div>
  <section class="fix-panel" role="dialog" aria-modal="true" aria-labelledby="fix-modal-title">
    <header class="fix-head">
      <div class="fix-head-copy">
        <h2 id="fix-modal-title">Fix Readiness Signal</h2>
        <div class="fix-subhead">
          <span id="fix-signal-name">Signal</span>
          <span id="fix-signal-score">[0/0]</span>
        </div>
      </div>
      <button type="button" class="fix-close" data-fix-close aria-label="Close">×</button>
    </header>
    <div class="fix-body">
      <p id="fix-note" class="fix-note">Copy the prompt below and use it in a local clone of this repository.</p>
      <pre id="fix-prompt-text" class="fix-prompt"></pre>
    </div>
    <footer class="fix-footer">
      <button type="button" class="fix-action fix-back" data-fix-close>Back</button>
      <button type="button" class="fix-action fix-copy" id="fix-copy-btn">Copy</button>
    </footer>
  </section>
</div>`;
}

function canFixRow(row: Row): boolean {
  return row.status === "failed" || row.status === "missing";
}

function scoreLabelForPrompt(evaluation: CriterionEvaluation | null): string {
  if (!evaluation) return "[missing]";
  if (evaluation.numerator === null) return "[N/A]";
  return `[${evaluation.numerator}/${evaluation.denominator}]`;
}

function buildFixPromptMap(
  grouped: CategoryGroup[],
  repoUrl: string,
): Record<string, FixPromptData> {
  const out: Record<string, FixPromptData> = {};
  for (const group of grouped) {
    for (const row of group.rows) {
      if (!canFixRow(row)) continue;
      out[row.criterion.id] = {
        criterionName: row.criterion.name,
        scoreLabel: scoreLabelForPrompt(row.evaluation),
        local: buildReadinessSignalFixPrompt({
          repoUrl,
          criterion: row.criterion,
          evaluation: row.evaluation,
          target: "local",
        }),
        computer: buildReadinessSignalFixPrompt({
          repoUrl,
          criterion: row.criterion,
          evaluation: row.evaluation,
          target: "computer",
        }),
      };
    }
  }
  return out;
}

function renderHeaderMeta(
  report: ReadinessReport,
  _generated: string | null,
): string {
  const bits: string[] = [];
  if (report.commitHash)
    bits.push(`Commit <code>${escapeHtml(report.commitHash.slice(0, 12))}</code>`);
  if (report.branch) bits.push(`Branch <code>${escapeHtml(report.branch)}</code>`);
  if (report.modelUsed)
    bits.push(
      `Model <code>${escapeHtml(report.modelUsed.id)}</code> (${escapeHtml(report.modelUsed.reasoningEffort)})`,
    );
  if (report.apps) bits.push(`${Object.keys(report.apps).length} apps`);
  if (report.hasLocalChanges) bits.push(`<span class="warn">local changes</span>`);
  if (report.hasNonRemoteCommits)
    bits.push(`<span class="warn">unpushed commits</span>`);
  return bits.join(" · ");
}

function renderChecksNeeded(n: number | null): string {
  if (n === null) return "Highest level reached";
  return `${n} more check${n === 1 ? "" : "s"} to next level`;
}

function renderSummaryStat(
  label: string,
  value: number,
  tone: "failed" | "missing" | "passed" | "skipped",
): string {
  return `<div class="summary-pill summary-${tone}">
  <strong>${value}</strong>
  <span>${escapeHtml(label)}</span>
</div>`;
}

function repoLabel(url: string | undefined): string {
  if (!url) return "(unknown repo)";
  const m = url.match(/[/:]([^/]+\/[^/]+?)(?:\.git)?\/?$/);
  return m ? m[1]! : url;
}

function summarizeCategoryMetrics(rows: Row[]): CategoryMetrics {
  let evaluableCount = 0;
  let passedCount = 0;
  let scoreTotal = 0;

  for (const row of rows) {
    if (row.status === "passed") passedCount += 1;
    if (!row.evaluation || row.status === "skipped") continue;
    const { numerator, denominator } = row.evaluation;
    if (numerator === null || denominator <= 0) continue;
    evaluableCount += 1;
    scoreTotal += numerator / denominator;
  }

  return {
    averageRate: evaluableCount > 0 ? scoreTotal / evaluableCount : 0,
    evaluableCount,
    passedCount,
    totalCount: rows.length,
  };
}

function summarizeDashboard(grouped: CategoryGroup[]): DashboardTotals {
  const totals: DashboardTotals = {
    categoryCount: grouped.length,
    evaluableCriteria: 0,
    failed: 0,
    missing: 0,
    passed: 0,
    skipped: 0,
    totalCriteria: 0,
  };

  for (const group of grouped) {
    for (const row of group.rows) {
      totals.totalCriteria += 1;
      if (row.status === "passed") totals.passed += 1;
      if (row.status === "failed") totals.failed += 1;
      if (row.status === "skipped") totals.skipped += 1;
      if (row.status === "missing") totals.missing += 1;
      if (
        row.evaluation &&
        row.status !== "skipped" &&
        row.evaluation.numerator !== null &&
        row.evaluation.denominator > 0
      ) {
        totals.evaluableCriteria += 1;
      }
    }
  }

  return totals;
}

function formatPercent(rate: number): string {
  return (rate * 100).toFixed(1);
}

function labelForStatus(status: Row["status"]): string {
  if (status === "passed") return "Passed";
  if (status === "failed") return "Failed";
  if (status === "skipped") return "Skipped";
  return "Missing";
}

function wrapRadarLabel(label: string): string[] {
  if (label.length <= 14) return [label];

  const words = label.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= 14 || lines.length >= 1) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  if (lines.length <= 2) return lines;
  return [lines[0]!, lines.slice(1).join(" ")];
}

function estimateRadarLineWidth(
  text: string,
  kind: "name" | "pct",
): number {
  const perChar = kind === "name" ? 9.2 : 7.6;
  return text.length * perChar;
}

const MONTH_LABELS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]!);
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

function escapeScriptJson(s: string): string {
  return s
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

const BASE_CSS = `
:root{--bg:#161616;--bg2:#1f1f1f;--bg3:#272727;--panel:#202020;--panel2:#292929;--panel-strong:#242424;--text:#f0ece4;--mut:#b4ab9a;--mut-strong:#d9d0be;--bd:#3a342d;--ok:#6fcf7b;--ok-soft:rgba(111,207,123,.18);--bad:#f27668;--bad-soft:rgba(242,118,104,.18);--warn:#f5b85c;--warn-soft:rgba(245,184,92,.18);--skip:#9b8f80;--skip-soft:rgba(155,143,128,.18);--accent:#6db8a7;--accent-2:#d4e26a;--accent-soft:rgba(109,184,167,.14);--code-color:#ffcabf;--code-bg:#2c2622;--radar-data-fill:rgba(109,184,167,.18);--badge-repo-bg:#163d43;--badge-repo-color:#8ed1dc;--badge-app-bg:#203a1f;--badge-app-color:#b8e3a4;--badge-skip-bg:#413222;--badge-skip-color:#ffd8a0;--lv1-bg:#42231f;--lv1-color:#ffbab0;--lv2-bg:#47331b;--lv2-color:#ffd59b;--lv3-bg:#45461e;--lv3-color:#f2f4aa;--lv4-bg:#1d3f31;--lv4-color:#a4e0c8;--lv5-bg:#16393b;--lv5-color:#9adcd4;--row-hover:0 14px 32px rgba(0,0,0,.22);--shadow-soft:0 20px 50px rgba(0,0,0,.14);--chip-on-bg:#6db8a7;--chip-on-color:#101010}
[data-theme="light"]{--bg:#f5efe3;--bg2:#fff8eb;--bg3:#efe6d6;--panel:#fffaf0;--panel2:#f6edde;--panel-strong:#fffdf8;--text:#2e251d;--mut:#7d7062;--mut-strong:#5e5144;--bd:#dfd1bc;--ok:#2f8f4a;--ok-soft:rgba(47,143,74,.12);--bad:#c74f42;--bad-soft:rgba(199,79,66,.12);--warn:#b77312;--warn-soft:rgba(183,115,18,.14);--skip:#8d8171;--skip-soft:rgba(141,129,113,.14);--accent:#137a6d;--accent-2:#a6b618;--accent-soft:rgba(19,122,109,.1);--code-color:#b53f32;--code-bg:#f7eee3;--radar-data-fill:rgba(19,122,109,.12);--badge-repo-bg:#dff4f4;--badge-repo-color:#0c6c72;--badge-app-bg:#e6f4df;--badge-app-color:#2d6b29;--badge-skip-bg:#fff0d9;--badge-skip-color:#a25c00;--lv1-bg:#fde8e2;--lv1-color:#9e2f23;--lv2-bg:#fff0d9;--lv2-color:#8e5600;--lv3-bg:#fbf8d7;--lv3-color:#747700;--lv4-bg:#e4f5ea;--lv4-color:#23663a;--lv5-bg:#dbf2ef;--lv5-color:#0b6d63;--row-hover:0 12px 24px rgba(67,47,25,.08);--shadow-soft:0 18px 44px rgba(67,47,25,.08);--chip-on-bg:#137a6d;--chip-on-color:#fff}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:repeating-linear-gradient(-45deg,rgba(255,255,255,.018) 0 1px,transparent 1px 12px),radial-gradient(circle at top,rgba(212,226,106,.08),transparent 30%),var(--bg);color:var(--text);font:16px/1.7 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}
code{font:13px/1.5 ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace;color:var(--code-color);background:var(--code-bg);padding:2px 6px;border-radius:4px}
.card{background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.01)),var(--panel);border:1px solid color-mix(in srgb,var(--bd) 85%,rgba(255,255,255,.08));box-shadow:none}
.theme-toggle{display:inline-flex;border:1px solid var(--bd);border-radius:999px;overflow:hidden;font-size:13px}
.theme-toggle button{background:transparent;color:var(--mut);border:none;padding:6px 14px;cursor:pointer;font:inherit;transition:all .2s}
.theme-toggle button.on{background:var(--chip-on-bg);color:var(--chip-on-color)}
.theme-toggle button:hover:not(.on){background:var(--bg2)}
.hdr{padding:20px 0 0}
.hero{max-width:1200px;margin:0 auto;padding:18px 16px 14px;border-radius:0;background:repeating-linear-gradient(-45deg,rgba(255,255,255,.018) 0 1px,transparent 1px 12px),linear-gradient(180deg,rgba(255,255,255,.02),rgba(255,255,255,.01)),var(--panel)}
.hero-top{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}
.hero-title{display:flex;align-items:flex-start;gap:14px;min-width:0}
.hero-badge{width:36px;height:40px;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);display:grid;place-items:center;font-weight:700;line-height:1;color:var(--text);flex:none}
.hero-badge.level-1{background:var(--lv1-bg);color:var(--lv1-color)}
.hero-badge.level-2{background:var(--lv2-bg);color:var(--lv2-color)}
.hero-badge.level-3{background:var(--lv3-bg);color:var(--lv3-color)}
.hero-badge.level-4{background:var(--lv4-bg);color:var(--lv4-color)}
.hero-badge.level-5{background:var(--lv5-bg);color:var(--lv5-color)}
.hero-copy{min-width:0}
.hero-copy h1{margin:4px 0 0;font-size:30px;font-weight:650;color:var(--text);letter-spacing:-.03em;line-height:1.15}
.kicker{color:var(--mut);font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:500}
.hdr-note{margin-top:8px;color:var(--mut-strong);font-size:14px}
.hero-meta{margin-top:6px;color:var(--mut);font-size:13px;line-height:1.6}
.hero-meta .warn{color:var(--warn);font-weight:500}
.hero-actions{display:flex;flex-direction:column;align-items:flex-end;gap:12px;flex:none}
.hero-update{font-size:13px;color:var(--mut-strong);white-space:nowrap}
.hero-summary{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
.summary-pill{display:inline-flex;align-items:center;gap:10px;padding:9px 12px;border-radius:999px;background:rgba(255,255,255,.025);border:1px solid var(--bd)}
.summary-pill strong{font-size:16px;line-height:1;font-weight:760;color:var(--text)}
.summary-pill span{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut-strong)}
.summary-level,.summary-percent{background:rgba(255,255,255,.04)}
.summary-passed{background:linear-gradient(90deg,var(--ok-soft),transparent 75%),rgba(255,255,255,.02)}
.summary-failed{background:linear-gradient(90deg,var(--bad-soft),transparent 75%),rgba(255,255,255,.02)}
.summary-skipped{background:linear-gradient(90deg,var(--skip-soft),transparent 75%),rgba(255,255,255,.02)}
.summary-missing{background:linear-gradient(90deg,var(--warn-soft),transparent 75%),rgba(255,255,255,.02)}
.hero-rail{margin-top:18px}
.section-label{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)}
.rail-head{display:flex;justify-content:space-between;align-items:center;gap:16px}
.rail-total{font-size:13px;color:var(--mut-strong)}
.rail-shell{position:relative;margin-top:12px;padding-top:28px}
.rail-track{display:grid;gap:4px;align-items:end}
.rail-seg{display:block;height:28px;border-radius:1px;background:var(--bd)}
.rail-seg.is-filled.level-1{background:#df5757}
.rail-seg.is-filled.level-2{background:#e58a36}
.rail-seg.is-filled.level-3{background:#e2b43f}
.rail-seg.is-filled.level-4{background:#88ab7a}
.rail-seg.is-filled.level-5{background:#5c7260}
.rail-seg.is-pending{background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.01)),var(--bg3)}
.rail-marker{position:absolute;top:0;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;pointer-events:none}
.rail-marker::after{content:"";width:4px;height:18px;border-radius:999px;background:var(--lv4-color);box-shadow:0 0 14px rgba(164,224,200,.28)}
.rail-marker span{display:inline-flex;align-items:center;justify-content:center;padding:2px 9px;border-radius:999px;background:var(--panel-strong);border:1px solid var(--bd);font-size:12px;color:var(--mut-strong);white-space:nowrap}
.rail-labels{display:flex;margin-top:10px}
.rail-label{font-size:12px;color:var(--mut);text-align:center}
.checks-needed{margin-top:12px;color:var(--mut-strong);font-size:14px}
.overview-grid{padding:28px 16px 0;max-width:1200px;margin:0 auto;display:grid;grid-template-columns:440px minmax(0,1fr);gap:24px}
.overview-card{padding:20px 22px;border-radius:0;background:repeating-linear-gradient(-45deg,rgba(255,255,255,.018) 0 1px,transparent 1px 12px),linear-gradient(180deg,rgba(255,255,255,.018),rgba(255,255,255,.008)),var(--panel);border:1px solid color-mix(in srgb,var(--bd) 85%,rgba(255,255,255,.08));box-shadow:none}
.radar-title{margin:0;font-size:14px;color:var(--text);font-weight:500;letter-spacing:.08em;text-transform:uppercase}
.radar-card{display:flex;flex-direction:column}
svg.radar{width:100%;max-width:400px;height:auto;display:block;margin:24px auto 6px}
.radar-ring{stroke:var(--bd);stroke-width:.8}
.radar-axis{stroke:var(--bd);stroke-width:.8}
.radar-data{fill:rgba(229,138,54,.12);stroke:#ef7d1a;stroke-width:1.4;stroke-linejoin:round}
.radar-dot{fill:#ef7d1a}
.radar-label{font:16.5px/1.32 system-ui,-apple-system,sans-serif}
.radar-label-name{fill:var(--text);font-weight:600}
.radar-label-pct{fill:var(--mut-strong);font-size:14px}
.trend-card{display:flex;flex-direction:column;min-height:438px}
.trend-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.trend-copy{display:flex;flex-direction:column;gap:10px;min-width:0}
.trend-summary{font-size:13px;color:var(--mut-strong);line-height:1.5}
.trend-range{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap}
.trend-chip{appearance:none;background:var(--panel);color:var(--mut);border:1px solid var(--bd);border-radius:999px;padding:6px 12px;font:12px/1.1 inherit;cursor:pointer;transition:all .2s}
.trend-chip.is-active{background:var(--chip-on-bg);color:var(--chip-on-color);border-color:var(--chip-on-bg)}
.trend-chip:hover:not(.is-active){border-color:var(--mut)}
.trend-panel[hidden]{display:none}
.trend-shell{display:grid;grid-template-columns:24px minmax(0,1fr);gap:18px;flex:1;min-height:340px;margin-top:18px}
.trend-y{display:flex;flex-direction:column;justify-content:space-between;padding:14px 0 30px;font-size:13px;color:var(--mut-strong)}
.trend-stage{position:relative;min-height:340px}
.trend-stage::before{content:"";position:absolute;left:0;top:10px;bottom:30px;width:1px;background:rgba(255,255,255,.08)}
.trend-stage::after{content:"";position:absolute;left:0;right:0;bottom:30px;height:1px;background:rgba(255,255,255,.08)}
.trend-grid{position:absolute;inset:10px 0 30px 0;background-image:linear-gradient(to bottom,rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(to right,rgba(255,255,255,.04) 1px,transparent 1px);background-size:100% calc(100% / 4),calc(100% / 6) 100%;opacity:.35}
.trend-chart{position:absolute;inset:0 0 0 0;width:100%;height:calc(100% - 30px);overflow:visible}
.trend-area{fill:rgba(239,125,26,.12)}
.trend-line{fill:none;stroke:#ef7d1a;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.trend-point-target{cursor:pointer;outline:none}
.trend-point-hit{fill:transparent}
.trend-point{fill:var(--panel-strong);stroke:#ef7d1a;stroke-width:2;transition:filter .18s,stroke-width .18s}
.trend-point.is-latest{fill:#ef7d1a;stroke:var(--panel-strong);stroke-width:2.5}
.trend-point-target:hover .trend-point,.trend-point-target:focus .trend-point,.trend-point-target:focus-visible .trend-point{stroke-width:3;filter:drop-shadow(0 0 12px rgba(239,125,26,.28))}
.trend-tooltip{position:absolute;left:0;top:0;z-index:3;max-width:min(240px,calc(100% - 16px));padding:8px 10px;border-radius:10px;background:color-mix(in srgb,var(--panel-strong) 94%,black 6%);border:1px solid color-mix(in srgb,#ef7d1a 44%,var(--bd));box-shadow:0 18px 42px rgba(0,0,0,.22);font-size:12px;line-height:1.4;color:var(--text);pointer-events:none;white-space:normal}
.trend-tooltip[hidden]{display:none}
.trend-x{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-between;gap:12px;font-size:12px;color:var(--mut-strong);text-transform:uppercase;letter-spacing:.06em}
main{padding:28px 16px 72px;max-width:1200px;margin:0 auto}
.filters{position:sticky;top:0;background:color-mix(in srgb,var(--bg) 82%,transparent);backdrop-filter:blur(14px);padding:16px 0;display:flex;flex-wrap:wrap;gap:12px;align-items:center;z-index:5;border-bottom:1px solid var(--bd);margin-bottom:24px}
.filters-heading{display:flex;align-items:baseline;gap:10px;flex:1 1 100%}
.filters-note{font-size:13px;color:var(--mut)}
.filters input{flex:1 1 280px;background:var(--panel);color:var(--text);border:1px solid var(--bd);border-radius:8px;padding:10px 14px;font:inherit;outline:none;transition:border-color .2s}
.filters input:focus{border-color:var(--accent)}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chip{background:var(--panel);color:var(--mut);border:1px solid var(--bd);border-radius:6px;padding:6px 14px;font:13px/1.2 inherit;cursor:pointer;transition:all .2s}
.chip.on{background:var(--chip-on-bg);color:var(--chip-on-color);border-color:var(--chip-on-bg)}
.chip:hover:not(.on){border-color:var(--mut)}
.empty-state{margin-bottom:28px;padding:18px 20px;border-radius:16px;background:var(--accent-soft);border:1px dashed var(--bd);color:var(--mut-strong)}
.cat{margin-bottom:40px}
.cat-hdr{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--bd)}
.cat-hdr h2{margin:0;font-size:18px;font-weight:600}
.cat-copy{min-width:0}
.cat-stats{display:block;margin-top:6px;color:var(--mut);font-size:13px}
.cat-progress{min-width:180px}
.cat-progress-value{text-align:right;font-size:22px;line-height:1;font-weight:700;letter-spacing:-.03em;color:var(--mut-strong)}
.cat-progress-track{height:8px;border-radius:999px;background:var(--bg3);overflow:hidden;margin-top:10px}
.cat-progress-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--accent),var(--accent-2))}
.rows{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px}
.row{background:var(--panel);border:1px solid var(--bd);border-radius:18px;padding:16px 18px;transition:box-shadow .2s,border-color .2s,transform .2s}
.row:hover{box-shadow:var(--row-hover);border-color:color-mix(in srgb,var(--accent) 30%,var(--bd));transform:translateY(-1px)}
.row.hidden{display:none}
.row-main{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:16px}
.row-title,.row-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.row-name{font-weight:500;font-size:15px;color:var(--text)}
.row-id{margin-left:0}
.row-score{display:inline-flex;align-items:center;justify-content:center;min-width:64px;padding:6px 10px;border-radius:999px;background:var(--bg2);font:13px/1.2 ui-monospace,Menlo,Consolas,monospace;color:var(--mut-strong);border:1px solid var(--bd)}
.fix-btn{appearance:none;border:1px solid color-mix(in srgb,#ef7d1a 42%,var(--bd));background:rgba(239,125,26,.08);color:#f4c28e;padding:6px 12px;border-radius:999px;font:12px/1.1 inherit;cursor:pointer;opacity:0;pointer-events:none;transform:translateY(4px);transition:opacity .18s,transform .18s,background .18s,border-color .18s,color .18s}
.row.has-fix:hover .fix-btn,.row.has-fix:focus-within .fix-btn{opacity:1;pointer-events:auto;transform:translateY(0)}
.fix-btn:hover{background:rgba(239,125,26,.16);border-color:#ef7d1a;color:#ffe1bb}
.row-rationale{margin-top:6px;color:var(--mut);font-size:14px;line-height:1.6}
.status-dot{width:10px;height:10px;border-radius:50%;flex:none}
.status-dot.status-passed{background:var(--ok)}
.status-dot.status-failed{background:var(--bad)}
.status-dot.status-skipped{background:var(--skip)}
.status-dot.status-missing{background:var(--warn)}
.badge{display:inline-block;font-size:12px;padding:2px 8px;border-radius:4px;color:var(--mut);background:var(--bg2)}
.badge-status-passed{background:var(--ok-soft);color:var(--ok)}
.badge-status-failed{background:var(--bad-soft);color:var(--bad)}
.badge-status-skipped{background:var(--skip-soft);color:var(--skip)}
.badge-status-missing{background:var(--warn-soft);color:var(--warn)}
.badge-level{color:var(--accent)}
.badge-scope-repository{background:var(--badge-repo-bg);color:var(--badge-repo-color)}
.badge-scope-application{background:var(--badge-app-bg);color:var(--badge-app-color)}
.badge-skip{color:var(--badge-skip-color);background:var(--badge-skip-bg)}
body.modal-open{overflow:hidden}
.fix-modal{position:fixed;inset:0;z-index:40;display:grid;place-items:center;padding:24px}
.fix-modal[hidden]{display:none}
.fix-backdrop{position:absolute;inset:0;background:rgba(10,10,10,.72);backdrop-filter:blur(6px)}
.fix-panel{position:relative;display:flex;flex-direction:column;width:min(860px,calc(100vw - 112px));max-height:min(660px,calc(100vh - 112px));background:linear-gradient(180deg,rgba(255,255,255,.02),rgba(255,255,255,.01)),var(--panel-strong);border:1px solid var(--bd);box-shadow:0 30px 90px rgba(0,0,0,.42)}
.fix-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:14px 16px;border-bottom:1px solid var(--bd)}
.fix-head-copy h2{margin:0;font-size:22px;line-height:1.05;letter-spacing:-.03em}
.fix-subhead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px;color:var(--mut-strong);font-size:13px}
.fix-subhead span:last-child{padding:4px 10px;border-radius:999px;background:var(--bg2);border:1px solid var(--bd);font:13px/1.1 ui-monospace,Menlo,Consolas,monospace}
.fix-close{appearance:none;background:transparent;border:none;color:var(--mut-strong);font:36px/1 inherit;cursor:pointer;padding:0 2px}
.fix-close:hover{color:var(--text)}
.fix-body{padding:14px 16px 0;overflow:auto}
.fix-note{margin:0 0 10px;color:var(--mut-strong);font-size:14px;line-height:1.55}
.fix-prompt{margin:0;max-height:34vh;background:transparent;border:1px solid var(--bd);padding:14px 16px;color:var(--text);font:13px/1.6 ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace;white-space:pre-wrap;overflow:auto}
.fix-footer{display:grid;grid-template-columns:1fr 1fr;margin-top:12px;border-top:1px solid var(--bd)}
.fix-action{appearance:none;background:transparent;border:none;padding:14px 12px;color:var(--text);font:inherit;letter-spacing:.03em;text-transform:uppercase;cursor:pointer}
.fix-action + .fix-action{border-left:1px solid var(--bd)}
.fix-action:hover{background:rgba(255,255,255,.03)}
.fix-copy.is-done{color:#efc48d}
@media (max-width:720px){
  .hdr,main{padding-left:20px;padding-right:20px}
  .hero{padding:16px 14px}
  .hero-top,.hero-actions{align-items:flex-start}
  .hero-top{flex-direction:column}
  .hero-actions{width:100%;flex-direction:row;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .hero-summary{gap:8px}
  .overview-grid{padding-left:20px;padding-right:20px;grid-template-columns:1fr}
  .overview-card{padding:18px}
  .rail-head{flex-direction:column;align-items:flex-start}
  .rail-track{gap:3px}
  .trend-card{min-height:360px}
  .trend-head{flex-direction:column;align-items:flex-start}
  .trend-range{gap:8px;flex-wrap:wrap}
  .trend-shell{grid-template-columns:20px minmax(0,1fr);min-height:280px}
  .trend-stage{min-height:280px}
  .fix-btn{opacity:1;pointer-events:auto;transform:none}
  .fix-modal{padding:14px}
  .fix-panel{width:calc(100vw - 20px);max-height:calc(100vh - 20px)}
  .fix-head{padding:16px}
  .fix-head-copy h2{font-size:22px}
  .fix-body{padding:16px 16px 0}
  .fix-prompt{padding:14px;font-size:12.5px}
  .row-main{grid-template-columns:1fr}
  .row-score{min-width:0}
  .cat-hdr{align-items:flex-start;flex-direction:column}
  .cat-progress{width:100%}
  .cat-progress-value{text-align:left}
}
@media (max-width:560px){
  .hero-copy h1{font-size:24px}
  .hero-summary{display:grid;grid-template-columns:1fr 1fr}
  .summary-pill{min-width:0}
  .theme-toggle{width:100%}
  .theme-toggle button{flex:1}
  .rail-marker span{font-size:11px}
  svg.radar{max-width:100%;margin-top:18px}
  .radar-title{font-size:13px}
  .radar-label{font-size:13px}
  .radar-label-pct{font-size:11.5px}
  .fix-subhead{font-size:13px}
  .fix-footer{grid-template-columns:1fr}
  .fix-action + .fix-action{border-left:none;border-top:1px solid var(--bd)}
  .trend-summary{font-size:12px}
  .trend-range{gap:8px}
  .trend-chip{padding:6px 10px;font-size:11.5px}
  .trend-x{font-size:11px}
}
`;

const INLINE_JS = `
(function(){
  function setTheme(t) {
    if (t === 'light') document.documentElement.setAttribute('data-theme','light');
    else document.documentElement.removeAttribute('data-theme');
    document.querySelectorAll('.theme-toggle button').forEach(function(b) {
      b.classList.toggle('on', b.getAttribute('data-theme') === t);
    });
    try { localStorage.setItem('ar-theme', t); } catch(e) {}
  }
  document.querySelectorAll('.theme-toggle button').forEach(function(b) {
    b.addEventListener('click', function() { setTheme(b.getAttribute('data-theme')); });
  });
  try { var s = localStorage.getItem('ar-theme'); if (s) setTheme(s); } catch(e) {}

  var trendSummary = document.getElementById('trend-summary');
  var trendBtns = Array.from(document.querySelectorAll('[data-trend-range].trend-chip'));
  var trendPanels = Array.from(document.querySelectorAll('.trend-panel'));

  function hideTrendTooltip(stage){
    if (!stage) return;
    var tooltip = stage.querySelector('.trend-tooltip');
    if (!tooltip) return;
    tooltip.hidden = true;
    tooltip.textContent = '';
  }

  function hideAllTrendTooltips(){
    document.querySelectorAll('.trend-stage').forEach(function(stage){
      hideTrendTooltip(stage);
    });
  }

  function positionTrendTooltip(stage, target, tooltip){
    var stageRect = stage.getBoundingClientRect();
    var targetRect = target.getBoundingClientRect();
    var minInset = 8;

    tooltip.style.left = '0px';
    tooltip.style.top = '0px';
    tooltip.hidden = false;

    var tooltipRect = tooltip.getBoundingClientRect();
    var centerX = targetRect.left - stageRect.left + (targetRect.width / 2);
    var left = centerX - (tooltipRect.width / 2);
    var maxLeft = Math.max(minInset, stageRect.width - tooltipRect.width - minInset);
    if (left < minInset) left = minInset;
    if (left > maxLeft) left = maxLeft;

    var top = targetRect.top - stageRect.top - tooltipRect.height - 12;
    var fallbackTop = targetRect.bottom - stageRect.top + 12;
    var maxTop = Math.max(minInset, stageRect.height - tooltipRect.height - minInset);
    if (top < minInset) top = Math.min(fallbackTop, maxTop);

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }

  function showTrendTooltip(target){
    var stage = target.closest('.trend-stage');
    if (!stage) return;
    var tooltip = stage.querySelector('.trend-tooltip');
    if (!tooltip) return;
    tooltip.textContent = target.getAttribute('data-tooltip') || '';
    positionTrendTooltip(stage, target, tooltip);
  }

  function setTrendRange(value){
    hideAllTrendTooltips();
    trendBtns.forEach(function(btn){
      var isActive = btn.getAttribute('data-trend-range') === value;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    trendPanels.forEach(function(panel){
      var isActive = panel.getAttribute('data-trend-range') === value;
      panel.hidden = !isActive;
      panel.classList.toggle('is-active', isActive);
      if (isActive && trendSummary) {
        trendSummary.textContent = panel.getAttribute('data-summary') || '';
      }
    });
  }

  trendBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      var value = btn.getAttribute('data-trend-range') || 'all';
      setTrendRange(value);
    });
  });
  if (trendBtns.length > 0 && trendPanels.length > 0) {
    setTrendRange('all');
  }

  document.querySelectorAll('.trend-point-target[data-tooltip]').forEach(function(target){
    target.addEventListener('mouseenter', function(){
      showTrendTooltip(target);
    });
    target.addEventListener('mouseleave', function(){
      hideTrendTooltip(target.closest('.trend-stage'));
    });
    target.addEventListener('focus', function(){
      showTrendTooltip(target);
    });
    target.addEventListener('blur', function(){
      hideTrendTooltip(target.closest('.trend-stage'));
    });
  });

  window.addEventListener('resize', hideAllTrendTooltips);

  var search = document.getElementById('search');
  var rows = Array.from(document.querySelectorAll('.row'));
  var statusBtns = Array.from(document.querySelectorAll('[data-status].chip'));
  var catBtns = Array.from(document.querySelectorAll('[data-cat].chip'));
  var emptyState = document.getElementById('empty-state');
  var state = { status: 'all', cat: 'all', q: '' };

  function setActive(group, value){
    group.forEach(function(b){
      var v = b.getAttribute('data-status') || b.getAttribute('data-cat');
      if(v === value){ b.classList.add('on'); } else { b.classList.remove('on'); }
    });
  }
  function apply(){
    var q = state.q.trim().toLowerCase();
    var visibleRows = 0;
    rows.forEach(function(row){
      var s = row.getAttribute('data-status');
      var c = row.getAttribute('data-cat');
      var hay = row.getAttribute('data-haystack') || '';
      var show = true;
      if(state.status !== 'all' && s !== state.status) show = false;
      if(state.cat !== 'all' && c !== state.cat) show = false;
      if(q && hay.indexOf(q) === -1) show = false;
      row.classList.toggle('hidden', !show);
      if(show) visibleRows += 1;
    });
    document.querySelectorAll('.cat').forEach(function(sec){
      var visible = sec.querySelectorAll('.row:not(.hidden)').length;
      sec.style.display = visible === 0 ? 'none' : '';
    });
    if(emptyState) emptyState.hidden = visibleRows !== 0;
  }
  statusBtns.forEach(function(b){
    b.addEventListener('click', function(){
      state.status = b.getAttribute('data-status');
      setActive(statusBtns, state.status);
      apply();
    });
  });
  catBtns.forEach(function(b){
    b.addEventListener('click', function(){
      state.cat = b.getAttribute('data-cat');
      setActive(catBtns, state.cat);
      apply();
    });
  });
  if(search){
    search.addEventListener('input', function(){
      state.q = search.value;
      apply();
    });
  }

  var fixPrompts = {};
  var fixPromptNode = document.getElementById('fix-prompts-data');
  if (fixPromptNode) {
    try {
      fixPrompts = JSON.parse(fixPromptNode.textContent || '{}');
    } catch (e) {
      fixPrompts = {};
    }
  }

  var fixModal = document.getElementById('fix-modal');
  var fixSignalName = document.getElementById('fix-signal-name');
  var fixSignalScore = document.getElementById('fix-signal-score');
  var fixNote = document.getElementById('fix-note');
  var fixPromptText = document.getElementById('fix-prompt-text');
  var fixCopyBtn = document.getElementById('fix-copy-btn');
  var fixCloseBtn = document.querySelector('.fix-close');
  var fixButtons = Array.from(document.querySelectorAll('.fix-btn'));
  var activeFixId = null;
  var copyResetTimer = null;
  var lastFocused = null;

  function syncCopyState(label, isDone){
    if (!fixCopyBtn) return;
    fixCopyBtn.textContent = label;
    fixCopyBtn.classList.toggle('is-done', !!isDone);
  }

  function scheduleCopyReset(){
    if (copyResetTimer) clearTimeout(copyResetTimer);
    copyResetTimer = setTimeout(function(){
      syncCopyState('Copy', false);
      copyResetTimer = null;
    }, 1600);
  }

  function renderFixPrompt(){
    if (!fixModal || !fixPromptText || !fixSignalName || !fixSignalScore || !fixNote) return;
    if (!activeFixId) return;
    var entry = fixPrompts[activeFixId];
    if (!entry) return;
    fixSignalName.textContent = entry.criterionName || 'Signal';
    fixSignalScore.textContent = entry.scoreLabel || '[missing]';
    fixNote.textContent = 'Copy the prompt below and use it in a local clone of this repository.';
    fixPromptText.textContent = entry.local || '';
    syncCopyState('Copy', false);
  }

  function openFixModal(id){
    if (!fixModal || !fixPrompts[id]) return;
    activeFixId = id;
    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    renderFixPrompt();
    fixModal.hidden = false;
    document.body.classList.add('modal-open');
    if (fixCloseBtn && typeof fixCloseBtn.focus === 'function') fixCloseBtn.focus();
  }

  function closeFixModal(){
    if (!fixModal || fixModal.hidden) return;
    fixModal.hidden = true;
    document.body.classList.remove('modal-open');
    activeFixId = null;
    syncCopyState('Copy', false);
    if (copyResetTimer) {
      clearTimeout(copyResetTimer);
      copyResetTimer = null;
    }
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
    lastFocused = null;
  }

  function fallbackCopy(text){
    var el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.focus();
    el.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e) {}
    document.body.removeChild(el);
    return ok;
  }

  function currentFixPrompt(){
    if (!activeFixId) return '';
    var entry = fixPrompts[activeFixId];
    if (!entry) return '';
    return entry.local || '';
  }

  fixButtons.forEach(function(btn){
    btn.addEventListener('click', function(){
      var id = btn.getAttribute('data-fix-id');
      if (id) openFixModal(id);
    });
  });

  document.querySelectorAll('[data-fix-close]').forEach(function(node){
    node.addEventListener('click', function(){
      closeFixModal();
    });
  });

  if (fixCopyBtn) {
    fixCopyBtn.addEventListener('click', function(){
      var prompt = currentFixPrompt();
      if (!prompt) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(prompt).then(function(){
          syncCopyState('Copied', true);
          scheduleCopyReset();
        }).catch(function(){
          if (fallbackCopy(prompt)) {
            syncCopyState('Copied', true);
          } else {
            syncCopyState('Copy failed', false);
          }
          scheduleCopyReset();
        });
        return;
      }
      if (fallbackCopy(prompt)) {
        syncCopyState('Copied', true);
      } else {
        syncCopyState('Copy failed', false);
      }
      scheduleCopyReset();
    });
  }

  document.addEventListener('keydown', function(event){
    if (event.key === 'Escape') closeFixModal();
  });

  apply();
})();
`;

export const __internal = {
  groupByCategory,
  historyForRange,
  repoLabel,
  escapeHtml,
  CATEGORY_BY_ID,
  CRITERION_BY_ID,
};
