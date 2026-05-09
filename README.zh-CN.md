# agent-readiness

> English version: [README.md](README.md)

一个可移植的 agent-readiness 审计技能：扫描一个 Git 仓库，通过并行子代理评估 9 个类别下的 82 个 criteria，并输出 JSON 报告、可持续积累的分数历史，以及一个 HTML dashboard。

## 目录结构

- `agent-readiness/` — **技能本体**；可发布的最终产物
  - `SKILL.md` — agent prompt（5 阶段审计流程）
  - `criteria/` — 9 个 Markdown 文件，每个类别一个，供 Phase 3 子代理读取
  - `bin/agent-readiness.mjs` — 打包后的自包含 CLI，供 Phases 4–5 使用
- `cli/` — 开发工作区，用于产出 `agent-readiness/bin/agent-readiness.mjs`

## 安装技能

将 `agent-readiness/` 复制或软链接到宿主环境的 skills 目录：

```sh
cp -r agent-readiness ~/.claude/skills/
```

这个技能是完全自包含的：打包后的 `bin/agent-readiness.mjs` 除了 Node.js >= 18.17 之外没有额外运行时依赖。

## 运行审计

在任意 Git 仓库中，让宿主调用这个技能即可（例如通过 slash command，或直接引用 `SKILL.md`）。技能会自行驱动完整的 5 阶段流程，并将产物写入仓库本地的 `.agent-readiness/` 目录：

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

推荐的 Git 使用方式：

- 提交 `.agent-readiness/history/*.json`，这样趋势数据可审阅、可持续保留。
- 忽略 `.agent-readiness/latest/`，因为这些文件是本地产物、可丢弃，并且可以从最新一次运行结果和历史数据重新生成。
- 在 `.agent-readiness/` 下单独放一个 `.gitignore` 很合适，也能保持仓库根目录的 `.gitignore` 更干净。
- 技能在首次运行时会自动初始化 `.agent-readiness/.gitignore`（写入 `latest/`），并确保 `.agent-readiness/history/.gitkeep` 存在。

## Factory 概览补充

这个仓库与 Factory Agent Readiness 的报告流程是一一对应的：一次静态审计会产出原始报告、汇总分数，以及一个可浏览的 HTML dashboard。

- `agent-readiness-report.json`：原始 criterion 评估结果
- `agent-readiness-score.json`：计算后的分数、当前 level，以及历史快照输入
- `agent-readiness-dashboard.html`：用于浏览最新快照的可视化 dashboard

当前实现会评估 9 个类别下的 82 个 criteria：

- Style & Validation
- Build System
- Testing
- Documentation
- Development Environment
- Debugging & Observability
- Security
- Task Discovery
- Product & Experimentation

每个 criterion 不只是简单的 pass 或 fail，还会记录：

- status：`passed`、`failed`、`skipped` 或 `missing`
- score：`numerator / denominator`
- rationale：dashboard 中展示的、基于证据的解释

对于 application-scoped criteria，像 `3/4` 这样的分数表示在识别出的 4 个应用中，有 3 个通过。对于 repository-scoped criteria，最常见的是 `1/1` 或 `0/1`。

### 如何阅读总览页

![Factory overview dashboard](docs/images/factory-overview-dashboard.png)

建议按下面的顺序阅读总览页：

- 仓库上下文：仓库名、commit、branch，以及 `local changes` 这类标记
- 整体 readiness：当前 level 和 total pass rate
- 结果分布：`Passed`、`Failed`、`Skipped` 的数量
- `Readiness by level`：每个小块对应一个 criterion，marker 表示当前总体进度
- `Pass Rate by Category`：用雷达图快速看出强项和短板
- `Level Over Time`：从 `.agent-readiness/history/*.json` 读取趋势数据

实际使用时，这一页会快速回答三个问题：

- 仓库当前处于哪个 level？
- 目前最薄弱的是哪些 category？
- readiness 是在持续提升，还是已经停滞？

### 如何阅读 criteria 列表页

![Factory criteria browser](docs/images/factory-criteria-browser.png)

criteria browser 是从总体分数继续下钻到某个具体 signal 的页面。

最有用的元素包括：

- 可按 criterion name、id 或 rationale 搜索的搜索框
- 状态过滤：`All`、`Passed`、`Failed`、`Skipped`
- 9 个类别的分类过滤器
- 分类摘要行，例如 `2 / 12 fully passed · 43.8% average score · 13 criteria`

单条 criterion 可按下面方式理解：

- `L1`、`L2` 等表示该 criterion 所属的 readiness level
- `A` 表示 application scope，`R` 表示 repository scope
- `Skippable` 表示这个 criterion 在某些场景下允许合法地显示为 `N/A`
- `3/4` 表示 4 个应用中有 3 个通过
- `N/A` 表示被跳过
- `—` 表示报告中没有这个 criterion 的结果
- `rationale` 是最重要的字段，因为它解释了为什么会得到这个结果

在排优先级时，通常最值得先修的是：

- 分母较大的 failed application-scoped criteria
- 会影响日常开发体验的 Level 1 或 Level 2 criteria
- 一次修复就能同时改善所有应用的 repository-scoped criteria

### 如何使用 Fix 流程

![Factory fix modal](docs/images/factory-fix-modal.png)

当某个 criterion 是 `failed` 或 `missing` 时，dashboard 会显示一个 `Fix` 按钮。点击后会打开一个包含可复制 remediation prompt 的弹窗。

这个 prompt 会包含：

- 当前失败 signal 的名称、分数和描述
- 用于评估该 signal 的原始规则说明
- 一份聚焦的任务清单：检查仓库、做实质性修复、然后验证结果
- 质量护栏：拒绝占位文件、禁用检查项，或只为“刷指标”的改动
- 完成要求：如果有代码变更，需要创建 PR 并返回 PR URL

在这个仓库里，复制出来的 prompt 被刻意写成适用于本地 clone 的形式，因此一个失败 signal 可以直接转化成一个可执行的 remediation 任务。

## 开发 CLI

```sh
cd cli
npm install
npm test
npm run bundle    # → ../agent-readiness/bin/agent-readiness.mjs
```

更多细节请参考 [`cli/README.md`](cli/README.md)。
