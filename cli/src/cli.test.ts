import { strict as assert } from "node:assert";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { CRITERIA } from "./criteria/index.js";
import { main } from "./cli.js";

interface Captured {
  out: string;
  err: string;
  code: number;
}

async function run(args: string[]): Promise<Captured> {
  const out: string[] = [];
  const err: string[] = [];
  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  process.stdout.write = ((chunk: unknown) => {
    out.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: unknown) => {
    err.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;
  try {
    const code = await main(args);
    return { out: out.join(""), err: err.join(""), code };
  } finally {
    process.stdout.write = origOut;
    process.stderr.write = origErr;
  }
}

describe("CLI: help", () => {
  it("with no args prints help", async () => {
    const r = await run([]);
    assert.equal(r.code, 0);
    assert.match(r.out, /USAGE/);
    assert.match(r.out, /validate\s+/);
    assert.match(r.out, /score\s+/);
    assert.match(r.out, /dashboard\s+/);
  });

  it("--help prints help and exits 0", async () => {
    const r = await run(["--help"]);
    assert.equal(r.code, 0);
    assert.match(r.out, /USAGE/);
  });

  it("unknown command exits 2 with message + help", async () => {
    const r = await run(["foo"]);
    assert.equal(r.code, 2);
    assert.match(r.err, /Unknown command: foo/);
    assert.match(r.err, /USAGE/);
  });

  it("unknown flag exits 2", async () => {
    const r = await run(["validate", "--bogus"]);
    assert.equal(r.code, 2);
    assert.match(r.err, /Unknown flag: --bogus/);
  });
});

describe("CLI: dashboard", () => {
  function fullPassReportJson(): string {
    const report: Record<string, unknown> = {};
    for (const c of CRITERIA) {
      report[c.id] = { numerator: 1, denominator: 1, rationale: "ok" };
    }
    return JSON.stringify({
      reportId: "uuid-1",
      repoUrl: "https://github.com/owner/repo",
      createdAt: Date.now() - 60_000,
      report,
    });
  }

  function historySnapshot(
    createdAt: number,
    achievedLevel: number,
    overallPassPercent: number,
  ) {
    return {
      repoUrl: "https://github.com/owner/repo",
      reportId: `run-${createdAt}`,
      branch: "main",
      commitHash: `${createdAt}`.padEnd(12, "0"),
      cliVersion: "0.0.1",
      createdAt,
      achievedLevel,
      overallPassPercent,
      checksNeededForNextLevel: achievedLevel >= 5 ? null : 3,
      levelBreakdowns: [
        {
          level: 1,
          checksPassed: 500,
          checksTotal: 500,
          percentComplete: 100,
          isUnlocked: true,
        },
        {
          level: 2,
          checksPassed: 400,
          checksTotal: 500,
          percentComplete: 80,
          isUnlocked: true,
        },
        {
          level: 3,
          checksPassed: 300,
          checksTotal: 500,
          percentComplete: 60,
          isUnlocked: true,
        },
        {
          level: 4,
          checksPassed: 200,
          checksTotal: 500,
          percentComplete: 40,
          isUnlocked: true,
        },
        {
          level: 5,
          checksPassed: 100,
          checksTotal: 500,
          percentComplete: 20,
          isUnlocked: true,
        },
      ],
    };
  }

  it("reads --input file and writes HTML to --output", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ar-cli-"));
    const inFile = join(dir, "report.json");
    const outFile = join(dir, "report.html");
    await writeFile(inFile, fullPassReportJson(), "utf8");

    const r = await run([
      "dashboard",
      "--input",
      inFile,
      "--output",
      outFile,
      "--title",
      "Test Dashboard",
    ]);
    assert.equal(r.code, 0);
    const html = await readFile(outFile, "utf8");
    assert.ok(html.startsWith("<!doctype html>"));
    assert.match(html, /<title>Test Dashboard<\/title>/);
    assert.match(html, /Level 5/);
  });

  it("writes HTML to stdout when --output is omitted", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ar-cli-"));
    const inFile = join(dir, "report.json");
    await writeFile(inFile, fullPassReportJson(), "utf8");
    const r = await run(["dashboard", "--input", inFile]);
    assert.equal(r.code, 0);
    assert.ok(r.out.startsWith("<!doctype html>"));
  });

  it("reads stored history snapshots when --history-dir is provided", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ar-cli-"));
    const inFile = join(dir, "report.json");
    const outFile = join(dir, "report.html");
    const historyDir = join(dir, "history");
    await writeFile(inFile, fullPassReportJson(), "utf8");
    await mkdir(historyDir, { recursive: true });
    await writeFile(
      join(historyDir, "2026-01-01T00-00-00.000Z-main-111111111111.json"),
      `${JSON.stringify(historySnapshot(Date.UTC(2026, 0, 1, 0, 0, 0), 2, 34.5), null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      join(historyDir, "2026-03-01T00-00-00.000Z-main-222222222222.json"),
      `${JSON.stringify(historySnapshot(Date.UTC(2026, 2, 1, 0, 0, 0), 4, 68.2), null, 2)}\n`,
      "utf8",
    );

    const r = await run([
      "dashboard",
      "--input",
      inFile,
      "--output",
      outFile,
      "--history-dir",
      historyDir,
    ]);
    assert.equal(r.code, 0);
    const html = await readFile(outFile, "utf8");
    assert.match(html, /3 snapshots/);
    assert.match(html, /class="trend-line"/);
  });

  it("exits 1 with a clear error on invalid JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ar-cli-"));
    const inFile = join(dir, "report.json");
    await writeFile(inFile, "not json", "utf8");
    const r = await run(["dashboard", "--input", inFile]);
    assert.equal(r.code, 1);
    assert.match(r.err, /Input is not valid JSON/);
  });

  it("exits 1 when --input file is missing", async () => {
    const r = await run(["dashboard", "--input", "/nonexistent/path"]);
    assert.equal(r.code, 1);
    assert.match(r.err, /Failed to read input/);
  });
});

describe("CLI: validate", () => {
  function fullPassPayload() {
    const report: Record<string, unknown> = {};
    for (const c of CRITERIA) {
      report[c.id] = { numerator: 1, denominator: 1, rationale: "ok" };
    }
    return { repoUrl: "https://github.com/owner/repo", report };
  }

  it("returns ok:true for a valid payload (exit 0)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ar-cli-"));
    const f = join(dir, "in.json");
    await writeFile(f, JSON.stringify(fullPassPayload()), "utf8");
    const r = await run(["validate", "--input", f]);
    assert.equal(r.code, 0);
    const parsed = JSON.parse(r.out) as { ok: boolean };
    assert.equal(parsed.ok, true);
  });

  it("returns ok:false + issues for an invalid payload (exit 3)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ar-cli-"));
    const f = join(dir, "in.json");
    const bad = fullPassPayload();
    delete bad.report[CRITERIA[0]!.id];
    await writeFile(f, JSON.stringify(bad), "utf8");
    const r = await run(["validate", "--input", f]);
    assert.equal(r.code, 3);
    const parsed = JSON.parse(r.out) as { ok: boolean; issues: unknown[] };
    assert.equal(parsed.ok, false);
    assert.ok(Array.isArray(parsed.issues) && parsed.issues.length > 0);
  });

  it("returns exit 3 when repoUrl is missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ar-cli-"));
    const f = join(dir, "in.json");
    const bad = fullPassPayload() as Record<string, unknown>;
    delete bad.repoUrl;
    await writeFile(f, JSON.stringify(bad), "utf8");
    const r = await run(["validate", "--input", f]);
    assert.equal(r.code, 3);
  });

  it("returns exit 1 on invalid JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ar-cli-"));
    const f = join(dir, "in.json");
    await writeFile(f, "garbage", "utf8");
    const r = await run(["validate", "--input", f]);
    assert.equal(r.code, 1);
    assert.match(r.err, /Input is not valid JSON/);
  });
});

describe("CLI: score", () => {
  function fullPassReportWrapped() {
    const report: Record<string, unknown> = {};
    for (const c of CRITERIA) {
      report[c.id] = { numerator: 1, denominator: 1, rationale: "ok" };
    }
    return {
      reportId: "uuid-1",
      repoUrl: "https://github.com/owner/repo",
      createdAt: Date.now() - 60_000,
      report,
    };
  }

  function bareReport() {
    const report: Record<string, unknown> = {};
    for (const c of CRITERIA) {
      report[c.id] = { numerator: 1, denominator: 1, rationale: "ok" };
    }
    return report;
  }

  it("emits a JSON ReadinessSummary for a wrapped report (level 5)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ar-cli-"));
    const f = join(dir, "in.json");
    await writeFile(f, JSON.stringify(fullPassReportWrapped()), "utf8");
    const r = await run(["score", "--input", f]);
    assert.equal(r.code, 0);
    const parsed = JSON.parse(r.out) as {
      achievedLevel: number;
      overallPassPercent: number;
      checksNeededForNextLevel: number | null;
      levelBreakdowns: unknown[];
      criterionResults: unknown[];
    };
    assert.equal(parsed.achievedLevel, 5);
    assert.equal(parsed.overallPassPercent, 100);
    assert.equal(parsed.checksNeededForNextLevel, null);
    assert.equal(parsed.levelBreakdowns.length, 5);
    assert.equal(parsed.criterionResults.length, CRITERIA.length);
  });

  it("accepts a bare {[id]: evaluation} map", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ar-cli-"));
    const f = join(dir, "in.json");
    await writeFile(f, JSON.stringify(bareReport()), "utf8");
    const r = await run(["score", "--input", f]);
    assert.equal(r.code, 0);
    const parsed = JSON.parse(r.out) as { achievedLevel: number };
    assert.equal(parsed.achievedLevel, 5);
  });

  it("can write to --output", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ar-cli-"));
    const f = join(dir, "in.json");
    const out = join(dir, "summary.json");
    await writeFile(f, JSON.stringify(fullPassReportWrapped()), "utf8");
    const r = await run(["score", "--input", f, "--output", out]);
    assert.equal(r.code, 0);
    const written = await readFile(out, "utf8");
    const parsed = JSON.parse(written) as { achievedLevel: number };
    assert.equal(parsed.achievedLevel, 5);
  });

  it("stores a history snapshot when --history-dir is provided", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ar-cli-"));
    const f = join(dir, "in.json");
    const historyDir = join(dir, "history");
    await writeFile(f, JSON.stringify(fullPassReportWrapped()), "utf8");
    const r = await run(["score", "--input", f, "--history-dir", historyDir]);
    assert.equal(r.code, 0);
    const files = await readdir(historyDir);
    assert.equal(files.length, 1);
    const written = await readFile(join(historyDir, files[0]!), "utf8");
    const parsed = JSON.parse(written) as {
      repoUrl: string;
      achievedLevel: number;
      overallPassPercent: number;
    };
    assert.equal(parsed.repoUrl, "https://github.com/owner/repo");
    assert.equal(parsed.achievedLevel, 5);
    assert.equal(parsed.overallPassPercent, 100);
  });

  it("rejects --history-dir when score input is a bare report map", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ar-cli-"));
    const f = join(dir, "in.json");
    const historyDir = join(dir, "history");
    await writeFile(f, JSON.stringify(bareReport()), "utf8");
    const r = await run(["score", "--input", f, "--history-dir", historyDir]);
    assert.equal(r.code, 2);
    assert.match(r.err, /--history-dir requires wrapped report input/);
  });

  it("exits 1 on invalid JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ar-cli-"));
    const f = join(dir, "in.json");
    await writeFile(f, "{", "utf8");
    const r = await run(["score", "--input", f]);
    assert.equal(r.code, 1);
  });
});
