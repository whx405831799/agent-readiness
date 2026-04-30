# cli — dev workspace

This directory is the **development workspace** for the
[`agent-readiness` skill](../agent-readiness/SKILL.md)'s
bundled CLI.

It is **not** an npm package and is not published. The single output of this
workspace is a self-contained ESM bundle written to:

```
../agent-readiness/bin/agent-readiness.mjs
```

That bundle is what the skill invokes during Phases 4 (validate), 5a (score),
and 5b (dashboard).

---

## Layout

```
cli/
├── src/
│   ├── cli.ts              ← entry point: validate | score | dashboard | help
│   ├── schema.ts           ← zod schema used by `validate`
│   ├── dashboard.ts        ← HTML rendering for `dashboard`
│   ├── criteria/           ← 82 criterion definitions (id, level, scope, …)
│   ├── report/             ← scoring math used by `score`
│   ├── index.ts            ← library re-exports (consumed only by tests)
│   └── *.test.ts           ← node:test suites
├── package.json            ← dev-only; private:true
├── tsconfig.json
└── README.md
```

## Workflow

```sh
cd cli
npm install
npm run typecheck
npm test
npm run bundle               # → ../agent-readiness/bin/agent-readiness.mjs
```

The `bundle` script runs esbuild to produce a single minified `.mjs` file
(roughly 155 KB, including the inlined `zod` runtime). Commit the bundle so
the skill directory remains self-contained — users do not need to clone this
workspace to run the skill.

## CLI surface

```
agent-readiness validate  --input report.json
agent-readiness score     --input report.json [--output summary.json] [--history-dir .agent-readiness/history]
agent-readiness dashboard --input report.json --output report.html [--title "…"] [--history-dir .agent-readiness/history]
```

Three commands only. Anything else (slash-command factories, prompt builders,
HTTP API client, i18n) was intentionally removed because the skill is the
prompt and the skill's host is the runtime — the CLI just provides the three
deterministic post-processing steps the LLM cannot do reliably itself.

`--history-dir` stores compact score snapshots during `score` and rehydrates
them during `dashboard` so the "Level Over Time" panel can show a repo-local
trend without any external service.

Recommended repo layout:

```text
.agent-readiness/
├── .gitignore
├── history/
│   └── *.json
└── latest/
    ├── agent-readiness-report.json
    ├── agent-readiness-score.json
    └── agent-readiness-dashboard.html
```

Keep `history/*.json` in git if you want durable trend data, and ignore
`latest/` because it is regenerated on demand.
