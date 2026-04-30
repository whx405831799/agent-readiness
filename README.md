# agent-readiness

A portable agent-readiness audit skill: scans a git repository, evaluates 82
criteria across 9 categories via parallel subagents, and emits a JSON
report, persistent score history, and an HTML dashboard.

## Layout

- `agent-readiness/` — **the skill**; the publishable artifact
  - `SKILL.md` — the agent prompt (5-phase audit workflow)
  - `criteria/` — 9 markdown files, one per category, read by Phase-3 subagents
  - `bin/agent-readiness.mjs` — bundled, self-contained CLI used by Phases 4–5
- `cli/` — dev workspace that produces `agent-readiness/bin/agent-readiness.mjs`

## Installing the skill

Copy or symlink `agent-readiness/` into your host's skills directory:

```sh
cp -r agent-readiness ~/.claude/skills/
```

The skill is fully self-contained — the bundled `bin/agent-readiness.mjs` has
no external runtime dependencies beyond Node.js ≥ 18.17.

## Running the audit

Inside any git repository, ask the host to invoke the skill (e.g. via slash
command or by referencing `SKILL.md`). The skill drives the entire 5-phase
workflow itself and writes its artifacts to a repo-local `.agent-readiness/`
directory:

```text
.agent-readiness/
├── .gitignore
├── history/
│   ├── .gitkeep
│   └── *.json
└── latest/
    ├── agent-readiness-report.json
    ├── agent-readiness-score.json
    └── agent-readiness-dashboard.html
```

Recommended git behavior:

- Commit `.agent-readiness/history/*.json` so trend data is reviewable and durable.
- Ignore `.agent-readiness/latest/` because those files are local, disposable, and fully reproducible from the latest run plus history.
- A nested `.agent-readiness/.gitignore` works well for this and keeps the repo root `.gitignore` clean.
- The skill bootstraps `.agent-readiness/.gitignore` with `latest/` and ensures `.agent-readiness/history/.gitkeep` exists on first run.

## Working on the CLI

```sh
cd cli
npm install
npm test
npm run bundle    # → ../agent-readiness/bin/agent-readiness.mjs
```

See [`cli/README.md`](cli/README.md) for details.
