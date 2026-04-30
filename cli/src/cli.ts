import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { renderDashboard } from "./dashboard.js";
import {
  createHistoryEntry,
  overallPassPercent,
  summarizeRawReport,
  summarizeReport,
} from "./report/index.js";
import type { ReadinessHistoryEntry, ReadinessReport } from "./report/index.js";
import {
  readinessHistoryEntrySchema,
  storeReadinessReportInputSchema,
} from "./schema.js";

interface ParsedArgs {
  command: "validate" | "score" | "dashboard" | "help";
  input?: string;
  output?: string;
  title?: string;
  historyDir?: string;
}

const HELP = `agent-readiness — companion CLI for the agent-readiness skill

USAGE
  agent-readiness <command> [options]

COMMANDS
  validate              Validate a readiness report JSON against the strict
                        schema (exit 0 on pass, 3 on validation failure)
  score                 Compute the ReadinessSummary for a report and emit JSON
  dashboard             Render a self-contained HTML dashboard from a report
  help                  Show this message

OPTIONS
  --input FILE          Read JSON input from FILE  (default: stdin)
  --output FILE         Write output to FILE       (default: stdout)
  --title TEXT          Page <title> override (dashboard only)
  --history-dir DIR     Read/write stored trend snapshots (score/dashboard)

EXIT CODES
  0   success
  1   I/O or runtime error
  2   bad CLI arguments
  3   schema validation failure (validate command)
`;

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { command: "help" };
  if (argv.length === 0) return out;

  const first = argv[0]!;
  if (first === "-h" || first === "--help" || first === "help") return out;
  if (first !== "validate" && first !== "score" && first !== "dashboard") {
    throw new Error(`Unknown command: ${first}`);
  }
  out.command = first;

  for (let i = 1; i < argv.length; i++) {
    const a = argv[i]!;
    switch (a) {
      case "--input": {
        const v = argv[++i];
        if (v) out.input = v;
        break;
      }
      case "--output": {
        const v = argv[++i];
        if (v) out.output = v;
        break;
      }
      case "--title": {
        const v = argv[++i];
        if (v) out.title = v;
        break;
      }
      case "--history-dir": {
        const v = argv[++i];
        if (v) out.historyDir = v;
        break;
      }
      case "-h":
      case "--help":
        out.command = "help";
        return out;
      default:
        throw new Error(`Unknown flag: ${a}`);
    }
  }
  return out;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readJsonInput(
  source: string | undefined,
): Promise<{ ok: true; value: unknown } | { ok: false; code: number; err: string }> {
  let raw: string;
  try {
    raw = source && source !== "-"
      ? await readFile(source, "utf8")
      : await readStdin();
  } catch (err) {
    return {
      ok: false,
      code: 1,
      err: `Failed to read input: ${(err as Error).message}\n`,
    };
  }
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (err) {
    return {
      ok: false,
      code: 1,
      err: `Input is not valid JSON: ${(err as Error).message}\n`,
    };
  }
}

async function writeOutput(
  target: string | undefined,
  text: string,
): Promise<{ ok: true } | { ok: false; code: number; err: string }> {
  if (!target || target === "-") {
    process.stdout.write(text);
    return { ok: true };
  }
  try {
    await writeFile(target, text, "utf8");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      code: 1,
      err: `Failed to write output: ${(err as Error).message}\n`,
    };
  }
}

function historyFilename(entry: ReadinessHistoryEntry): string {
  const timestamp = new Date(entry.createdAt)
    .toISOString()
    .replace(/:/g, "-");
  const branch = sanitizeHistorySegment(entry.branch ?? "detached-head");
  const commit = sanitizeHistorySegment(
    (entry.commitHash ?? "working-tree").slice(0, 12),
  );
  return `${timestamp}-${branch}-${commit}.json`;
}

function sanitizeHistorySegment(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "snapshot";
}

async function writeHistorySnapshot(
  dir: string,
  entry: ReadinessHistoryEntry,
): Promise<{ ok: true } | { ok: false; code: number; err: string }> {
  try {
    await mkdir(dir, { recursive: true });
    const stem = historyFilename(entry).replace(/\.json$/, "");
    let attempt = 0;
    while (true) {
      const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
      const target = join(dir, `${stem}${suffix}.json`);
      try {
        await writeFile(
          target,
          `${JSON.stringify(entry, null, 2)}\n`,
          { encoding: "utf8", flag: "wx" },
        );
        return { ok: true };
      } catch (err) {
        const nodeErr = err as NodeJS.ErrnoException;
        if (nodeErr.code === "EEXIST") {
          attempt += 1;
          continue;
        }
        return {
          ok: false,
          code: 1,
          err: `Failed to write history snapshot: ${nodeErr.message}\n`,
        };
      }
    }
  } catch (err) {
    return {
      ok: false,
      code: 1,
      err: `Failed to prepare history directory: ${(err as Error).message}\n`,
    };
  }
}

async function readHistorySnapshots(
  dir: string | undefined,
): Promise<
  { ok: true; value: ReadinessHistoryEntry[] } |
  { ok: false; code: number; err: string }
> {
  if (!dir) {
    return { ok: true, value: [] };
  }

  let items: import("node:fs").Dirent[];
  try {
    items = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === "ENOENT") {
      return { ok: true, value: [] };
    }
    return {
      ok: false,
      code: 1,
      err: `Failed to read history directory: ${nodeErr.message}\n`,
    };
  }

  const files = items
    .filter((item) => item.isFile() && item.name.endsWith(".json"))
    .map((item) => item.name)
    .sort((a, b) => a.localeCompare(b));

  const snapshots: ReadinessHistoryEntry[] = [];
  for (const file of files) {
    const path = join(dir, file);
    let raw: string;
    try {
      raw = await readFile(path, "utf8");
    } catch (err) {
      return {
        ok: false,
        code: 1,
        err: `Failed to read history snapshot ${file}: ${(err as Error).message}\n`,
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      return {
        ok: false,
        code: 1,
        err: `History snapshot ${file} is not valid JSON: ${(err as Error).message}\n`,
      };
    }

    const validated = readinessHistoryEntrySchema.safeParse(parsed);
    if (!validated.success) {
      const issue = validated.error.issues[0];
      return {
        ok: false,
        code: 1,
        err: `History snapshot ${file} is invalid: ${issue?.path.join(".") || "(root)"} ${issue?.message || "schema error"}\n`,
      };
    }

    snapshots.push(validated.data as ReadinessHistoryEntry);
  }

  return { ok: true, value: snapshots };
}

export async function main(argv: string[]): Promise<number> {
  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n\n${HELP}`);
    return 2;
  }

  if (parsed.command === "help") {
    process.stdout.write(HELP);
    return 0;
  }

  if (parsed.command === "validate") {
    const r = await readJsonInput(parsed.input);
    if (!r.ok) {
      process.stderr.write(r.err);
      return r.code;
    }
    const parsedSchema = storeReadinessReportInputSchema.safeParse(r.value);
    if (!parsedSchema.success) {
      const payload = {
        ok: false,
        issues: parsedSchema.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
          code: i.code,
        })),
      };
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
      return 3;
    }
    process.stdout.write(`${JSON.stringify({ ok: true }, null, 2)}\n`);
    return 0;
  }

  if (parsed.command === "score") {
    const r = await readJsonInput(parsed.input);
    if (!r.ok) {
      process.stderr.write(r.err);
      return r.code;
    }
    const value = r.value as { report?: unknown } | Record<string, unknown>;
    const isWrapped =
      value !== null &&
      typeof value === "object" &&
      "report" in value &&
      typeof (value as { report: unknown }).report === "object";
    let summary;
    let percent: number;
    if (isWrapped) {
      const wrapped = value as ReadinessReport;
      summary = summarizeReport(wrapped);
      percent = overallPassPercent(wrapped);
    } else {
      const bare = value as ReadinessReport["report"];
      summary = summarizeRawReport(bare);
      percent = summary.overallProgress.percentComplete;
    }
    const payload = {
      achievedLevel: summary.achievedLevel,
      overallPassPercent: Number(percent.toFixed(2)),
      checksNeededForNextLevel: summary.checksNeededForNextLevel,
      levelBreakdowns: summary.levelBreakdowns,
      criterionResults: summary.criterionResults,
    };
    const out = `${JSON.stringify(payload, null, 2)}\n`;
    const w = await writeOutput(parsed.output, out);
    if (!w.ok) {
      process.stderr.write(w.err);
      return w.code;
    }
    if (parsed.historyDir) {
      if (!isWrapped) {
        process.stderr.write(
          "--history-dir requires wrapped report input with repoUrl metadata\n",
        );
        return 2;
      }
      const snapshot = createHistoryEntry(value as ReadinessReport);
      const hw = await writeHistorySnapshot(parsed.historyDir, snapshot);
      if (!hw.ok) {
        process.stderr.write(hw.err);
        return hw.code;
      }
    }
    return 0;
  }

  // dashboard
  const r = await readJsonInput(parsed.input);
  if (!r.ok) {
    process.stderr.write(r.err);
    return r.code;
  }
  const report = r.value as ReadinessReport;
  const history = await readHistorySnapshots(parsed.historyDir);
  if (!history.ok) {
    process.stderr.write(history.err);
    return history.code;
  }
  const html = renderDashboard(
    report,
    {
      ...(parsed.title ? { title: parsed.title } : {}),
      history: history.value,
    },
  );
  const w = await writeOutput(parsed.output, html);
  if (!w.ok) {
    process.stderr.write(w.err);
    return w.code;
  }
  return 0;
}

const invokedDirectly =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("/cli.ts") === true ||
  process.argv[1]?.endsWith("/cli.js") === true ||
  process.argv[1]?.endsWith("/agent-readiness.mjs") === true;

if (invokedDirectly) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      process.stderr.write(`Unexpected error: ${(err as Error).stack ?? err}\n`);
      process.exit(1);
    },
  );
}
