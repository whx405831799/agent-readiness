import { ADMIN_ACCESS_CHECK_HINT } from "./constants.js";
import type { Criterion } from "./types.js";

const lint_config: Criterion = {
  id: "lint_config",
  name: "Linter Configuration",
  description: "Project has a linter configured to catch code quality issues",
  category: "style",
  level: 1,
  scope: "application",
  instructions:
    'Linter configured – Project has a linter configured to catch code quality issues. Common examples: ESLint (.eslintrc.*, eslint.config.*) for TS/JS, ruff/flake8 (pyproject.toml, .flake8, ruff.toml) for Python, SonarQube/SonarCloud (sonar-project.properties, .sonarcloud.properties, or "sonar" in CI workflows). Other equivalent linters or static analysis tools also satisfy this criterion.',
};

const type_check: Criterion = {
  id: "type_check",
  name: "Type Checker",
  description: "Project uses static type checking",
  category: "style",
  level: 1,
  scope: "application",
  instructions:
    'Type checker – tsconfig.json with "strict": true for TS, mypy.ini or [tool.mypy] in pyproject.toml for Py.',
};

const formatter: Criterion = {
  id: "formatter",
  name: "Code Formatter",
  description: "Project uses an automated code formatter",
  category: "style",
  level: 1,
  scope: "application",
  instructions:
    "Formatter – Prettier (.prettierrc*) for TS, Black ([tool.black] in pyproject.toml) for Py.",
};

const pre_commit_hooks: Criterion = {
  id: "pre_commit_hooks",
  name: "Pre-commit Hooks",
  description: "Project uses pre-commit hooks to enforce quality checks",
  category: "style",
  level: 2,
  scope: "application",
  instructions:
    "Pre-commit hooks – Husky/lint-staged for TS, .pre-commit-config.yaml with ruff/black for Py.",
};

const strict_typing: Criterion = {
  id: "strict_typing",
  name: "Strict Typing",
  description: "TypeScript strict mode or mypy strict mode is enabled",
  category: "style",
  level: 2,
  scope: "application",
  instructions:
    'Strict typing enabled – Project uses strict type checking. Common approaches: TypeScript tsconfig.json with "strict": true, Python mypy strict mode in mypy.ini or pyproject.toml, SonarQube/SonarCloud for TypeScript (has type-related rules that complement strict mode; verify it is not explicitly disabled in sonar properties). Other type checkers or strict mode configurations also satisfy this criterion. Some languages (Rust, Go) are typed by default. Reason about each application and skip if unclear.',
  isSkippable: true,
};

const naming_consistency: Criterion = {
  id: "naming_consistency",
  name: "Naming Consistency",
  description: "Consistent naming conventions enforced across the codebase",
  category: "style",
  level: 3,
  scope: "application",
  instructions:
    'Naming consistency – Consistent naming conventions are enforced. Common approaches: ESLint @typescript-eslint/naming-convention rule, pylint naming-style rules, explicit naming conventions documented in AGENTS.md or CONTRIBUTING.md (e.g., "use camelCase for functions"), SonarQube/SonarCloud (has naming convention rules enabled by default in quality profiles; verify it is not explicitly disabled in sonar properties). Other linter rules, code quality tools, or documented conventions that enforce naming standards also satisfy this criterion.',
};

const cyclomatic_complexity: Criterion = {
  id: "cyclomatic_complexity",
  name: "Cyclomatic Complexity",
  description: "Code maintains reasonable complexity thresholds",
  category: "style",
  level: 5,
  scope: "application",
  instructions:
    "Cyclomatic complexity – Code complexity is analyzed and monitored. Common tools: ESLint complexity rule, lizard or radon for Python, gocyclo or go-critic for Go, SonarQube/SonarCloud (has built-in cognitive/cyclomatic complexity analysis enabled by default; verify it is not explicitly disabled in sonar properties). Other complexity analyzers or CI checks that enforce complexity thresholds also satisfy this criterion.",
};

const large_file_detection: Criterion = {
  id: "large_file_detection",
  name: "Large File Detection",
  description: "Tooling detects/prevents overly large files",
  category: "style",
  level: 3,
  scope: "repository",
  instructions:
    "Large file detection – Check for tooling that detects/prevents overly large files (language-agnostic). PASS if ANY ONE of the following exists: 1) Git hooks checking file size or line count (husky, pre-commit, custom scripts). 2) CI job that flags files over a threshold. 3) .gitattributes with LFS for large binary files. 4) Linter rules for file size (ESLint max-lines for JS/TS, pylint max-module-lines for Python, or equivalent). 5) Code quality platform with file size/complexity checks.",
};

const dead_code_detection: Criterion = {
  id: "dead_code_detection",
  name: "Dead Code Detection",
  description: "Dead code detection tooling configured",
  category: "style",
  level: 3,
  scope: "application",
  instructions:
    "Dead code detection – Tooling detects unused/dead code. PASS if ANY ONE of the following exists: 1) JS/TS: knip, unimported, or ESLint import/no-unused-modules. 2) Python: vulture or dead. 3) Go: deadcode or staticcheck. 4) Rust: cargo-udeps. 5) Java: SpotBugs or PMD with unused code rules. 6) SonarQube/SonarCloud (has built-in unused code detection enabled by default; verify it is not explicitly disabled in sonar properties). 7) Any other dead code detector, CI check, or pre-commit hook that flags unused code. Check for config files at both repo root and app level (e.g., knip.json, .eslintrc, pyproject.toml). For monorepos, if a tool is configured at the repo root, read its config to determine which applications it covers (e.g., workspaces or include/exclude patterns) and count covered apps as passing.",
};

const duplicate_code_detection: Criterion = {
  id: "duplicate_code_detection",
  name: "Duplicate Code Detection",
  description: "Duplicate code (DRY) detection tooling configured",
  category: "style",
  level: 3,
  scope: "application",
  instructions:
    "Duplicate code detection – Tooling detects copy-paste or duplicate code to enforce DRY (Don't Repeat Yourself) principles. Common tools: jscpd (in CI or pre-commit), PMD CPD for Java, SonarQube/SonarCloud (has built-in CPD enabled by default; verify it is not explicitly disabled in sonar properties). Other duplication detectors, CI checks, or pre-commit hooks that flag duplicate code also satisfy this criterion.",
};

const code_modularization: Criterion = {
  id: "code_modularization",
  name: "Code Modularization Enforcement",
  description: "Tooling enforces code modularization and boundaries",
  category: "style",
  level: 4,
  scope: "application",
  instructions:
    "Code modularization – Check for tooling that enforces code modularization and boundaries. Skip for small projects where module boundaries are not meaningful, or Rust codebases (compiler enforces visibility). PASS if ANY ONE of the following exists: 1) JS/TS: eslint-plugin-boundaries, eslint-plugin-import/no-restricted-paths, dependency-cruiser, Nx module boundaries. 2) Java: ArchUnit configured for architecture tests. 3) Go: `internal/` package directories used (compiler-enforced boundaries). 4) Python: import-linter configured. 5) C#: ArchUnitNET. 6) Architectural fitness functions or layer enforcement in CI.",
  isSkippable: true,
};

const tech_debt_tracking: Criterion = {
  id: "tech_debt_tracking",
  name: "Technical Debt Tracking",
  description: "Tooling tracks technical debt markers",
  category: "style",
  level: 3,
  scope: "repository",
  instructions:
    "Tech debt tracking – Tooling tracks technical debt markers. Common approaches: TODO/FIXME scanner in CI, TODO comments required to link to issues (e.g., TODO(TICKET-123) enforcement), language-specific linter rules (eslint-plugin-no-unsanitized-todo, pylint fixme), SonarQube/SonarCloud (has built-in technical debt tracking via SQALE methodology enabled by default; verify it is not explicitly disabled in sonar properties). Other tech debt tracking tools, code quality platforms, or documented tracking systems also satisfy this criterion.",
};

const n_plus_one_detection: Criterion = {
  id: "n_plus_one_detection",
  name: "N+1 Query Detection",
  description: "N+1 query detection tooling configured",
  category: "style",
  level: 4,
  scope: "application",
  instructions:
    "N+1 query detection – Check for N+1 query detection tooling. Look for: 1) bullet gem for Rails. 2) nplusone for Python/Django. 3) DataLoader pattern usage (graphql-dataloader). 4) ORM query logging with analysis. 5) Database query analysis in tests. 6) APM with slow query detection configured. PASS if any N+1 detection mechanism exists. Skip for apps without database/ORM usage (e.g., frontend-only apps, libraries, static sites).",
  isSkippable: true,
};

const build_cmd_doc: Criterion = {
  id: "build_cmd_doc",
  name: "Build Command Documentation",
  description: "Project documents how to build the code",
  category: "build",
  level: 2,
  scope: "repository",
  instructions:
    'Build command documented – README/AGENTS.md lists "npm run build" (TS) or "pip install -r requirements.txt" (Py)',
};

const deps_pinned: Criterion = {
  id: "deps_pinned",
  name: "Dependencies Pinned",
  description: "Project pins dependencies to specific versions",
  category: "build",
  level: 2,
  scope: "repository",
  instructions:
    "Dependencies pinned – lockfile committed (package-lock.json, yarn.lock, pnpm-lock.yaml) for TS; requirements.txt with == pins or poetry.lock for Py",
};

const vcs_cli_tools: Criterion = {
  id: "vcs_cli_tools",
  name: "VCS CLI Tools",
  description:
    "Version control CLI tools are installed and authenticated for automated checks",
  category: "build",
  level: 2,
  scope: "repository",
  instructions:
    "VCS CLI tools available – Check if `gh` (GitHub CLI), `glab` (GitLab CLI), or equivalent version control CLI is installed and authenticated. Run `gh auth status` or `glab auth status` to verify. This is a prerequisite for many Level 3+ checks including branch protection, CI metrics, deployment frequency, security scanning, and automated reviews. Without authenticated CLI access, those checks must fall back to less reliable file-based inference.",
};

const automated_pr_review: Criterion = {
  id: "automated_pr_review",
  name: "Automated PR Review Generation",
  description:
    "System automatically generates code review comments on pull requests",
  category: "build",
  level: 2,
  scope: "repository",
  instructions:
    "Automated PR review generation – Check for automation that generates code review comments on PRs. If `gh` or `glab` CLI is available and authenticated, run `gh pr list --state all --limit 10 --json reviews,comments` to verify bots/automation are posting review comments (not just status checks). Look for danger.js, custom GitHub Actions comments, or AI-powered review bots. Key is automation that GENERATES review content, not just runs checks. Skip if `gh`/`glab` CLI is not available or not authenticated.",
  isSkippable: true,
};

const agentic_development: Criterion = {
  id: "agentic_development",
  name: "Agentic Development",
  description: "AI agents are integrated into the development workflow",
  category: "build",
  level: 3,
  scope: "repository",
  instructions:
    "Agentic development detected – Look for evidence that AI agents are part of the development workflow. Check: 1) Git history for agent co-authorship: `git log --format='%an|||%ae|||%s|||%b' -100` and search for AI coding agent identifiers in author/co-author fields. Common patterns include AI tool names (often with '[bot]' suffix) in author fields or 'Co-authored-by' headers (e.g., 'Claude Code', 'Copilot'). Note: dependency bots like dependabot or renovate do not count. Also note that these examples are non-exhaustive - look for any AI coding agent identifiers. Optional: if `gh` CLI available, use `gh pr list --json commits` for more reliable co-author detection. 2) CI/CD workflows that invoke agents for reviews, code generation, or documentation. 3) Scripts/Makefiles with agent CLI commands. 4) Agent configuration directories, skills, or hooks (e.g., .claude/skills/, .cursor/, .github/copilot/). Need at least one strong evidence point showing agents actively participate in development.",
};

const fast_ci_feedback: Criterion = {
  id: "fast_ci_feedback",
  name: "Fast CI Feedback",
  description: "CI pipeline provides feedback in under 10 minutes",
  category: "build",
  level: 4,
  scope: "repository",
  instructions:
    "Fast CI feedback – CI pipeline provides feedback in under 10 minutes. If `gh` or `glab` CLI is available and authenticated, run `gh pr list --state merged --limit 20 --json statusCheckRollup`. For each PR, find all status checks in statusCheckRollup array and calculate CI duration from earliest startedAt to latest completedAt or updatedAt (ISO8601 timestamps). Example: if checks start at 10:00:00Z and finish at 10:06:00Z, CI duration is 6 minutes. Verify average CI duration is under 10 minutes for typical PRs. IMPORTANT: Calculate CI check duration, NOT PR merge time (createdAt to mergedAt). Focus on the primary CI workflow that runs on PRs. Skip if `gh`/`glab` CLI is not available or not authenticated.",
  isSkippable: true,
};

const build_performance_tracking: Criterion = {
  id: "build_performance_tracking",
  name: "Build Performance Tracking",
  description: "Build duration is measured and optimized",
  category: "build",
  level: 4,
  scope: "repository",
  instructions:
    "Build performance tracking – Build duration is measured and optimized. If `gh` or `glab` CLI is available and authenticated, use `gh run view --log` or `gh pr view --json statusCheckRollup` to analyze build step timing. Also check for: 1) Build caching configured (turbo cache, nx cache, webpack cache, buildx cache). 2) Build metrics exported to monitoring. 3) Evidence of build optimization (parallel builds, incremental builds). Verify deliberate performance monitoring exists, not just builds that happen to run. Skip if `gh`/`glab` CLI is not available or not authenticated and no other build performance evidence exists.",
  isSkippable: true,
};

const deployment_frequency: Criterion = {
  id: "deployment_frequency",
  name: "Deployment Frequency",
  description: "System deploys multiple times per week with automation",
  category: "build",
  level: 4,
  scope: "repository",
  instructions:
    "Frequent deployments – System deploys multiple times per week with automation. If `gh` or `glab` CLI is available and authenticated, run BOTH: 1) `gh release list --limit 30` to check for release-based deploys. 2) For workflow-based deploys, first list workflows with `ls .github/workflows/ | grep -i deploy` to find deploy workflow filenames, then run `gh run list --workflow={exact-name}.yml --limit 30` for each (gh CLI does not support wildcards in --workflow). Alternatively, run `gh run list --limit 50` and filter for deploy-related workflows. Some orgs use releases, others use workflow runs - either is valid. Count successful deploys from both sources combined and verify multiple deploys per week minimum. Also verify deployment automation (auto-deploy on merge, CD pipelines). This is about culture of frequent shipping. Skip if `gh`/`glab` CLI is not available or not authenticated.",
  isSkippable: true,
};

const single_command_setup: Criterion = {
  id: "single_command_setup",
  name: "Single Command Setup",
  description: "One command gets you from clone to running dev server",
  category: "build",
  level: 3,
  scope: "repository",
  instructions:
    "Single command setup – README or AGENTS.md or SKILLS documents a single command (or short sequence) that takes you from fresh clone to running dev server. Example: 'npm install && npm run dev' or 'make dev'.",
};

const feature_flag_infrastructure: Criterion = {
  id: "feature_flag_infrastructure",
  name: "Feature Flag Infrastructure",
  description: "Feature flag system configured for safe rollouts",
  category: "build",
  level: 4,
  scope: "repository",
  instructions:
    "Feature flag infrastructure – LaunchDarkly, Statsig, Unleash, GrowthBook, or custom feature flag system is configured. Enables agents to ship changes behind toggles, reducing risk of agent-authored code affecting all users immediately.",
};

const release_notes_automation: Criterion = {
  id: "release_notes_automation",
  name: "Release Notes Automation",
  description: "Automated release notes or changelog generation",
  category: "build",
  level: 3,
  scope: "repository",
  instructions:
    "Release notes automation – Automated release notes or changelog generation exists. Does not need to run on every commit - can be periodic (weekly/release-based) via semantic-release, standard-version, changesets, GitHub releases, or custom scripts. Ensures agent contributions are documented.",
};

const progressive_rollout: Criterion = {
  id: "progressive_rollout",
  name: "Progressive Rollout",
  description: "Canary or percentage-based deployments configured",
  category: "build",
  level: 4,
  scope: "repository",
  instructions:
    "Progressive rollout – Canary deployments, percentage-based rollouts, or ring deployments are configured. Allows agent-shipped changes to reach a small percentage of users first, catching issues before full rollout. Skip if not an infra repo.",
  isSkippable: true,
};

const rollback_automation: Criterion = {
  id: "rollback_automation",
  name: "Rollback Automation",
  description: "One-click or automated rollback capability",
  category: "build",
  level: 4,
  scope: "repository",
  instructions:
    "Rollback automation – One-click or automated rollback capability exists and is documented. If an agent ships a bad change, the system can quickly revert without manual intervention or deep investigation. Skip if not an infra based repo.",
  isSkippable: true,
};

const monorepo_tooling: Criterion = {
  id: "monorepo_tooling",
  name: "Monorepo Tooling",
  description: "Monorepo build tools properly configured",
  category: "build",
  level: 2,
  scope: "repository",
  instructions:
    "Monorepo tooling – For monorepos: check for multi-package/module/workspace configuration that defines boundaries between components. Examples by ecosystem: JS/TS (npm/yarn/pnpm workspaces, Turborepo, Nx, Lerna), Python (pants, poetry multi-package), Go (go.work), Rust (Cargo workspaces), Java (Maven multi-module, Gradle multi-project), or language-agnostic tools (Bazel, Buck2, moon). Advanced build tools with caching and task orchestration are recommended for larger monorepos but not required. PASS if any monorepo tooling is configured. Skip for single-application repos.",
  isSkippable: true,
};

const heavy_dependency_detection: Criterion = {
  id: "heavy_dependency_detection",
  name: "Heavy Dependency Detection",
  description: "Bundle size analysis and heavy dependency detection",
  category: "build",
  level: 4,
  scope: "application",
  instructions:
    "Heavy dependency detection – Check for bundle size analysis and heavy dependency detection. Look for: 1) Bundle analyzer configured (webpack-bundle-analyzer, @next/bundle-analyzer, rollup-plugin-visualizer). 2) Size limit tools (size-limit, bundlesize, bundlewatch). 3) Import cost IDE extension configuration. 4) CI job that reports bundle size changes. 5) Lighthouse CI for performance budgets. PASS if any bundle/dependency size analysis is configured. Skip for non-bundled applications (e.g., backend services, CLI tools, server-side apps).",
  isSkippable: true,
};

const unused_dependencies_detection: Criterion = {
  id: "unused_dependencies_detection",
  name: "Unused Dependencies Detection",
  description: "Tooling detects unused dependencies",
  category: "build",
  level: 3,
  scope: "application",
  instructions:
    "Unused dependencies detection – Check for tooling that detects unused dependencies in any language. PASS if ANY ONE of the following exists: 1) JS/TS: depcheck, npm-check, or knip configured. 2) Python: deptry or pip-extra-reqs. 3) Go: `go mod tidy` in CI (ensures go.mod only has used deps). 4) Rust: cargo-udeps. 5) Java/Maven: `mvn dependency:analyze` in CI. 6) Java/Gradle: dependency-analysis plugin. 7) Any CI job or pre-commit hook that checks for unused dependencies.",
};

const version_drift_detection: Criterion = {
  id: "version_drift_detection",
  name: "Version Drift Detection",
  description:
    "Tooling detects dependency version drift across packages",
  category: "build",
  level: 3,
  scope: "repository",
  instructions:
    "Version drift detection – Check for tooling that detects dependency version drift across monorepo packages. Look for: 1) syncpack, manypkg for JS/TS monorepos. 2) Renovate/Dependabot with grouping rules. 3) Custom CI script comparing package versions. 4) Monorepo tooling with version enforcement (Nx, Turborepo constraints). 5) Shared dependency constraints in workspace config. PASS if version consistency tooling exists for monorepos. Skip for single-application repos.",
  isSkippable: true,
};

const release_automation: Criterion = {
  id: "release_automation",
  name: "Release Automation",
  description: "Automated release/deployment pipelines configured",
  category: "build",
  level: 3,
  scope: "repository",
  instructions:
    "Release automation – Check for automated release/deployment pipelines. Look for: 1) CD pipeline in .github/workflows (deploy on merge to main). 2) semantic-release or similar configured. 3) GitOps setup (ArgoCD, Flux manifests). 4) Automated Docker image publishing. 5) Release-please or changesets automation. PASS if releases/deployments are automated rather than manual.",
};

const dead_feature_flag_detection: Criterion = {
  id: "dead_feature_flag_detection",
  name: "Dead Feature Flag Detection",
  description: "Tooling detects stale/dead feature flags",
  category: "build",
  level: 3,
  scope: "repository",
  instructions:
    "Dead feature flag detection – Check for tooling that detects stale/dead feature flags. Look for: 1) Feature flag platform with stale flag detection (LaunchDarkly code references, Statsig stale detection). 2) Custom scripts that grep for flag usage and compare to flag definitions. 3) CI job that reports on flag age or usage. 4) Documentation of flag lifecycle/cleanup process. PASS if any dead flag detection mechanism exists. PREREQUISITE: feature_flag_infrastructure must pass.",
  isSkippable: true,
};

const unit_tests_exist: Criterion = {
  id: "unit_tests_exist",
  name: "Unit Tests Exist",
  description: "Project has unit tests",
  category: "testing",
  level: 1,
  scope: "application",
  instructions:
    "Unit tests present – *.test.ts / __tests__/ (TS) or tests/test_*.py (Py).",
};

const integration_tests_exist: Criterion = {
  id: "integration_tests_exist",
  name: "Integration Tests Exist",
  description: "Project has integration or end-to-end tests",
  category: "testing",
  level: 3,
  scope: "application",
  instructions:
    "Integration tests present – cypress/, playwright.config.ts (TS) or tests/integration/, Behave .feature files (Py).",
};

const unit_tests_runnable: Criterion = {
  id: "unit_tests_runnable",
  name: "Unit Tests Runnable",
  description: "Unit tests can be run locally with a simple command",
  category: "testing",
  level: 2,
  scope: "application",
  instructions:
    'Tests runnable locally – "test": "jest" (or Vitest) script in package.json (TS) or pytest runnable via tox/make test (Py). Actually run the command you find to see if the tests really are runnable (do not worry about whether they pass, just if they can be run). Use flags like --listTests (jest) or --collect-only (pytest) to verify runnability without running the full suite, which can take hours. It is very important to use these flags to avoid waiting for the entire test suite to complete.',
};

const test_performance_tracking: Criterion = {
  id: "test_performance_tracking",
  name: "Test Performance Tracking",
  description: "Test suite duration is measured and monitored",
  category: "testing",
  level: 4,
  scope: "application",
  instructions:
    "Test performance tracking – Test suite duration is measured and tracked. Check: 1) CI outputs that show test timing (e.g., jest --verbose, pytest --durations). 2) Test reports uploaded as artifacts. 3) Integration with test analytics platforms (BuildPulse, Datadog CI, GitHub Actions test reporting). 4) Config flags for test timing output in package.json scripts or CI workflows. Evidence that org monitors test performance, not just pass/fail.",
};

const flaky_test_detection: Criterion = {
  id: "flaky_test_detection",
  name: "Flaky Test Detection",
  description: "System identifies and tracks unstable tests",
  category: "testing",
  level: 4,
  scope: "application",
  instructions:
    "Flaky test detection – Check for proactive flaky test management. If `gh` or `glab` CLI is available and authenticated, run `gh pr list --state all --limit 10 --json statusCheckRollup` to detect duplicate check names (indicates retries/flakiness). Also check for: 1) Test retry configuration (jest-retry, pytest-rerunfailures). 2) Flaky test tracking tools (BuildPulse). 3) CI quarantine/skip mechanisms. 4) Test stability metrics. Skip if `gh`/`glab` CLI is not available or not authenticated and no other flaky test detection evidence exists.",
  isSkippable: true,
};

const test_coverage_thresholds: Criterion = {
  id: "test_coverage_thresholds",
  name: "Test Coverage Thresholds",
  description: "Minimum coverage enforced in CI",
  category: "testing",
  level: 2,
  scope: "application",
  instructions:
    "Test coverage thresholds – Minimum coverage percentages are enforced. Common approaches: jest.config.js coverageThreshold, pytest --cov-fail-under, Codecov/Coveralls with PR status checks blocking on coverage, SonarQube/SonarCloud quality gate with coverage threshold (sonar.coverage.* settings or sonar.qualitygate.wait=true in CI). Other CI gates or tools that enforce minimum coverage also satisfy this criterion. Agents must know they have to maintain coverage, not just that it is tracked.",
};

const test_naming_conventions: Criterion = {
  id: "test_naming_conventions",
  name: "Test File Naming Conventions",
  description: "Consistent test file naming enforcement",
  category: "testing",
  level: 3,
  scope: "application",
  instructions:
    "Test naming conventions – Check for consistent test file naming enforcement in any language. PASS if ANY ONE of the following exists: 1) JS/TS: Jest testMatch/testRegex, Vitest include patterns, or Mocha test directory config. 2) Python: pytest naming conventions in pytest.ini or pyproject.toml (test_*.py pattern). 3) Go: *_test.go convention (built-in, check tests exist following pattern). 4) Java: Maven/Gradle test source directories with naming patterns. 5) Any test framework configured with explicit naming patterns. 6) Test naming conventions documented in AGENTS.md or CONTRIBUTING.md.",
};

const test_isolation: Criterion = {
  id: "test_isolation",
  name: "Test Isolation",
  description: "Tests are configured for isolated/parallel execution",
  category: "testing",
  level: 4,
  scope: "application",
  instructions:
    "Test isolation – Check for test isolation enforcement in any language. PASS if ANY ONE of the following exists: 1) JS/TS: Jest parallelization (not --runInBand), Vitest threads, or test sharding configured. 2) Python: pytest-xdist for parallel execution. 3) Go: `go test -parallel` or `t.Parallel()` usage. 4) Java: JUnit parallel execution config, or Maven/Gradle parallel test forks. 5) Database isolation patterns (transactions, test databases, factories, testcontainers). 6) Test randomization enabled (--randomize, pytest-randomly). 7) Any test framework configured for parallel or isolated execution.",
};

const agents_md: Criterion = {
  id: "agents_md",
  name: "AGENTS.md File",
  description:
    "Repository has an AGENTS.md file with instructions for autonomous agents",
  category: "docs",
  level: 2,
  scope: "repository",
  instructions:
    "AGENTS.md exists at repo root – Check for AGENTS.md file in repository root directory. File should document essentials for autonomous agents like: npm/bun/yarn scripts (TS/JS), pip/venv/poetry setup (Python), build commands, test commands, development workflow, and project-specific conventions. Verify file exists and is not empty (>100 characters). See https://github.com/anthropics/agent-readiness for reference.",
};

const readme: Criterion = {
  id: "readme",
  name: "README File",
  description: "Repository has a README with basic information",
  category: "docs",
  level: 1,
  scope: "repository",
  instructions: "README.md exists at repo root with setup/usage instructions.",
};

const automated_doc_generation: Criterion = {
  id: "automated_doc_generation",
  name: "Automated Documentation Generation",
  description:
    "System automatically generates or updates technical documentation",
  category: "docs",
  level: 2,
  scope: "repository",
  instructions:
    "Automated documentation generation – Tools/workflows that create/update docs. Examples: API doc generators (Swagger/OpenAPI), code comment extractors (JSDoc, Sphinx), architecture diagram generators, changelog generators, or README updaters. Must show evidence of automated doc creation, not just static docs.",
};

const skills: Criterion = {
  id: "skills",
  name: "Skills Configuration",
  description:
    "Repository has skills defined following the Claude skills standard",
  category: "docs",
  level: 3,
  scope: "repository",
  instructions:
    "Skills configured – Check for skills directories (common locations: `.claude/skills/`, `.cursor/skills/`, `.skills/`, walk up to git root). Each skill should be in `{skill-name}/SKILL.md` format with either YAML frontmatter containing at minimum `name` and `description`, or table format (`| name | description |`). Verify at least one valid skill exists with non-empty prompt content. See https://code.claude.com/docs/en/skills for the open standard reference.",
};

const documentation_freshness: Criterion = {
  id: "documentation_freshness",
  name: "Documentation Freshness",
  description: "Documentation is kept up-to-date with code changes",
  category: "docs",
  level: 3,
  scope: "repository",
  instructions:
    'Documentation freshness – Run `git log --since="180 days ago" --name-only -- README.md AGENTS.md CONTRIBUTING.md | grep -E "\\.(md)$" | head -1`. PASS if at least one of README.md, AGENTS.md, or CONTRIBUTING.md was modified in the last 180 days. This is a simple binary check: key docs updated recently = pass.',
};

const api_schema_docs: Criterion = {
  id: "api_schema_docs",
  name: "API Schema Docs",
  description: "OpenAPI or GraphQL schema for APIs",
  category: "docs",
  level: 3,
  scope: "application",
  instructions:
    "API schema docs – OpenAPI/Swagger specification or GraphQL schema exists for service APIs. Search recursively for files matching patterns: **/openapi.{json,yaml,yml}, **/swagger.{json,yaml,yml}, **/*.openapi.{json,yaml}, **/*.swagger.{json,yaml}, **/schema.graphql, **/*.graphql, **/*.gql. PASS if any valid API schema file is found anywhere in the repository. Skip for non-API apps (e.g., libraries, CLI tools without HTTP APIs).",
  isSkippable: true,
};

const service_flow_documented: Criterion = {
  id: "service_flow_documented",
  name: "Service Architecture Documented",
  description:
    "Architecture diagrams and service dependencies are documented",
  category: "docs",
  level: 3,
  scope: "repository",
  instructions:
    'Service architecture documented – Check for: 1) Architecture diagram files (*.mermaid, *.puml, *.plantuml, docs/architecture*, docs/diagrams*). 2) Service dependency documentation showing external services, APIs, or databases the application calls. 3) Images in README/docs with names containing "architecture", "flow", "diagram", "sequence". PASS if any architecture diagrams OR service dependency documentation exists.',
};

const agents_md_validation: Criterion = {
  id: "agents_md_validation",
  name: "AGENTS.md Freshness Validation",
  description:
    "Automation validates AGENTS.md stays consistent with code",
  category: "docs",
  level: 4,
  scope: "repository",
  instructions:
    "AGENTS.md validation – Check for automation that validates AGENTS.md stays consistent with code. Look for: 1) CI job that checks AGENTS.md commands still work. 2) Automated AGENTS.md generation/update (agent that updates it). 3) Pre-commit hook validating AGENTS.md commands. 4) Documentation testing (running commands from docs). 5) Link checker for AGENTS.md references. PASS if any validation of AGENTS.md accuracy exists. PREREQUISITE: agents_md must pass.",
};

const devcontainer: Criterion = {
  id: "devcontainer",
  name: "Dev Container",
  description: "Project has a development container configuration",
  category: "dev_env",
  level: 2,
  scope: "repository",
  instructions:
    "Dev container configured – .devcontainer/devcontainer.json with Node.js & TS extensions (TS) or Python image with pip/poetry (Py)",
};

const env_template: Criterion = {
  id: "env_template",
  name: "Environment Template",
  description: ".env.example or documented environment variables",
  category: "dev_env",
  level: 1,
  scope: "repository",
  instructions:
    "Environment template – .env.example file exists or environment variables are documented in README/AGENTS.md. Without knowing required env vars, agents cannot run the application locally. Absolute blocker.",
};

const local_services_setup: Criterion = {
  id: "local_services_setup",
  name: "Local Services Setup",
  description: "docker-compose or docs for local dependencies",
  category: "dev_env",
  level: 2,
  scope: "repository",
  instructions:
    "Local services setup – docker-compose.yml for local dependencies (Postgres, Redis, etc.) or clear documentation on how to run them. Agents need these services to run integration tests and develop features. Skip for apps without external service dependencies.",
  isSkippable: true,
};

const database_schema: Criterion = {
  id: "database_schema",
  name: "Database Schema",
  description: "Schema definition files for databases",
  category: "dev_env",
  level: 2,
  scope: "application",
  instructions:
    "Database schema – Schema definition files exist for databases (Prisma schema, TypeORM entities, SQLAlchemy models, raw SQL schemas). Agents need to understand the data model to make correct changes. Skip for apps without databases.",
  isSkippable: true,
};

const devcontainer_runnable: Criterion = {
  id: "devcontainer_runnable",
  name: "Devcontainer Runnable",
  description: "Devcontainer builds and runs successfully",
  category: "dev_env",
  level: 3,
  scope: "repository",
  instructions:
    "Devcontainer runnable – The devcontainer can be built and run successfully using the devcontainer CLI or VS Code. Validates that the containerized development environment actually works, not just that config files exist. Skip if devcontainer CLI is not installed.",
  isSkippable: true,
};

const structured_logging: Criterion = {
  id: "structured_logging",
  name: "Structured Logging",
  description: "Project uses structured logging for better observability",
  category: "debugging",
  level: 2,
  scope: "application",
  instructions:
    "Structured logging – Check for logging library in dependencies: TS/JS (winston, pino, bunyan, log4js in package.json), Python (structlog, loguru, python-json-logger in requirements/pyproject.toml), or custom logger module (src/logger.*, lib/logging.*). PASS if any logging library is installed OR a dedicated logger module exists.",
};

const distributed_tracing: Criterion = {
  id: "distributed_tracing",
  name: "Distributed Tracing",
  description: "Application implements request tracing",
  category: "debugging",
  level: 3,
  scope: "application",
  instructions:
    "Check for trace ID or request ID propagation through the application (OpenTelemetry, X-Request-ID headers, etc.) that allows following a request through the system.",
};

const metrics_collection: Criterion = {
  id: "metrics_collection",
  name: "Metrics Collection",
  description: "Engineering telemetry for performance monitoring",
  category: "debugging",
  level: 3,
  scope: "application",
  instructions:
    "Check for metrics/telemetry instrumentation (Datadog, Axiom, Prometheus, New Relic, CloudWatch, etc.) for understanding application performance.",
};

const code_quality_metrics: Criterion = {
  id: "code_quality_metrics",
  name: "Code Quality Metrics Dashboard",
  description:
    "Coverage, complexity, and maintainability metrics are monitored",
  category: "debugging",
  level: 4,
  scope: "application",
  instructions: `Code quality metrics tracked – Coverage, complexity, and maintainability metrics are monitored. If \`gh\` or \`glab\` CLI is available and authenticated, first check admin access: ${ADMIN_ACCESS_CHECK_HINT}. If no admin/maintainer access, skip the code-scanning API check but still check for other approaches. Code scanning check: run \`gh api /repos/{owner}/{repo}/code-scanning/analyses\`; 403 "Code Security must be enabled" = FAIL, 200 with array = PASS. Also check: coverage bots in PR comments (run \`gh pr list --state merged --limit 10 --json comments\` and search for "coverage", "codecov", "coveralls"), coverage configuration (grep for "--coverage" in package.json test scripts, or check jest.config/vitest.config coverage settings), SonarQube/SonarCloud (provides coverage, maintainability, reliability metrics with quality gates; strong evidence if sonar.qualitygate.wait=true in CI). Other code quality platforms or CI checks that track these metrics also satisfy this criterion. PASS if ANY method found. Skip if no evidence found and \`gh\`/\`glab\` CLI is not available, not authenticated, or lacks admin/maintainer access.`,
  isSkippable: true,
};

const error_tracking_contextualized: Criterion = {
  id: "error_tracking_contextualized",
  name: "Error Tracking Contextualized",
  description: "Sentry/Bugsnag with source maps and breadcrumbs",
  category: "debugging",
  level: 2,
  scope: "application",
  instructions:
    "Error tracking contextualized – Sentry, Bugsnag, or Rollbar is configured with source maps, breadcrumbs, and user context. Agents can trace production errors back to specific code paths with full stack traces.",
};

const alerting_configured: Criterion = {
  id: "alerting_configured",
  name: "Alerting Configured",
  description: "PagerDuty/OpsGenie or alert rules defined",
  category: "debugging",
  level: 3,
  scope: "application",
  instructions:
    "Alerting configured – PagerDuty, OpsGenie, or custom alerting rules are defined. The system actively notifies when things go wrong rather than waiting for someone to notice. Prerequisite for incident response.",
};

const runbooks_documented: Criterion = {
  id: "runbooks_documented",
  name: "Runbooks Documented",
  description: "Incident response playbooks exist",
  category: "debugging",
  level: 2,
  scope: "repository",
  instructions:
    "Runbooks documented – Look for external pointers to runbooks/playbooks (links to Notion, Confluence, internal wiki, or dedicated runbooks/ directory). Check README, AGENTS.md, or docs/ for references to incident response procedures. PASS if any documentation points to runbooks, even if hosted externally.",
};

const deployment_observability: Criterion = {
  id: "deployment_observability",
  name: "Deployment Observability",
  description: "Can see deploy impact in real-time",
  category: "debugging",
  level: 4,
  scope: "application",
  instructions:
    "Deployment observability – Look for pointers to monitoring dashboards (Datadog, Grafana, New Relic links in docs or code comments). Check for deploy notification integrations (Slack webhooks, deployment annotations in monitoring). PASS if documentation references where to check deploy impact, even if dashboards are hosted externally.",
};

const health_checks: Criterion = {
  id: "health_checks",
  name: "Health Checks",
  description:
    "Health check endpoints and liveness probes configured",
  category: "debugging",
  level: 3,
  scope: "application",
  instructions:
    "Health checks – Check for health check endpoints and liveness/readiness probes. Look for: 1) `/health`, `/healthz`, `/ready`, `/live` endpoints in routes. 2) Kubernetes liveness/readiness probes in deployment manifests. 3) Health check libraries (terminus, lightship for Node.js, django-health-check). 4) Docker HEALTHCHECK instruction. 5) Load balancer health check configuration. PASS if any health check mechanism is implemented. Skip for non-deployed services (e.g., libraries, CLI tools, scripts, batch jobs).",
  isSkippable: true,
};

const circuit_breakers: Criterion = {
  id: "circuit_breakers",
  name: "Circuit Breakers",
  description: "Circuit breaker pattern implemented for resilience",
  category: "debugging",
  level: 4,
  scope: "application",
  instructions:
    "Circuit breakers – Check for circuit breaker pattern implementation. Look for: 1) Circuit breaker libraries (opossum, cockatiel for Node.js, resilience4j for Java, polly for .NET, tenacity for Python). 2) Service mesh with circuit breaking (Istio, Linkerd configuration). 3) Custom circuit breaker implementation (grep for 'circuit', 'breaker', 'fallback' patterns). 4) Retry with exponential backoff configuration. PASS if circuit breaker or resilience pattern is implemented for external calls. Skip for apps without external service dependencies (e.g., standalone tools, libraries).",
  isSkippable: true,
};

const profiling_instrumentation: Criterion = {
  id: "profiling_instrumentation",
  name: "Profiling Instrumentation",
  description: "Performance profiling infrastructure configured",
  category: "debugging",
  level: 4,
  scope: "application",
  instructions:
    "Profiling instrumentation – Check for performance profiling infrastructure. Look for: 1) APM tools (Datadog APM, New Relic, Dynatrace) in dependencies or config. 2) Continuous profiling (Pyroscope, Parca, Google Cloud Profiler). 3) Node.js profiling (clinic.js, 0x configured). 4) Memory profiling setup. 5) Flame graph generation capability. PASS if any profiling tooling is configured for production or development use. Skip for apps where performance profiling is not meaningful (e.g., libraries, simple scripts).",
  isSkippable: true,
};

const branch_protection: Criterion = {
  id: "branch_protection",
  name: "Branch Protection",
  description: "Repository has branch protection rules",
  category: "security",
  level: 2,
  scope: "repository",
  instructions: `Branch protection rules enforced – If \`gh\` or \`glab\` CLI is available and authenticated, first check admin access: ${ADMIN_ACCESS_CHECK_HINT}. If no admin/maintainer access, skip this criterion. If access confirmed, check in order: 1) Modern rulesets: run \`gh api repos/{owner}/{repo}/rulesets\` and look for active rulesets targeting main/dev branches. If found, inspect ruleset details with \`gh api repos/{owner}/{repo}/rulesets/{id}\` to verify PR review requirements and direct push prevention. 2) Legacy branch protection (only if rulesets returns empty []): run \`gh api repos/{owner}/{repo}/branches/main/protection\` and \`gh api repos/{owner}/{repo}/branches/dev/protection\`. If both methods return 404/empty, branch protection is not configured. Skip if \`gh\`/\`glab\` CLI is not available, not authenticated, or lacks admin/maintainer access.`,
  isSkippable: true,
};

const secret_scanning: Criterion = {
  id: "secret_scanning",
  name: "Secret Scanning",
  description: "Repository scans for accidentally committed secrets",
  category: "security",
  level: 3,
  scope: "repository",
  instructions: `Secret scanning configured – Repository scans for committed secrets. If \`gh\` or \`glab\` CLI is available and authenticated, first check admin access: ${ADMIN_ACCESS_CHECK_HINT}. If no admin/maintainer access, skip the native secret scanning API check but still check for other approaches. Native check: run \`gh api /repos/{owner}/{repo}/secret-scanning/alerts\`; 404 with "disabled" message = FAIL (feature not enabled), 200 with array = PASS. Also check: GitHub Actions running gitleaks, trufflehog, or detect-secrets, pre-commit hooks with secret scanning, SonarQube/SonarCloud with security hotspots enabled (verify it is not explicitly disabled in sonar properties). Other secret detection tools or CI checks also satisfy this criterion. Skip if no evidence found and \`gh\`/\`glab\` CLI is not available, not authenticated, or lacks admin/maintainer access.`,
  isSkippable: true,
};

const codeowners: Criterion = {
  id: "codeowners",
  name: "CODEOWNERS File",
  description: "Repository has a CODEOWNERS file to assign ownership",
  category: "security",
  level: 2,
  scope: "repository",
  instructions:
    "CODEOWNERS file exists – in root or .github/ directory with valid team assignments",
};

const automated_security_review: Criterion = {
  id: "automated_security_review",
  name: "Automated Security Review Generation",
  description:
    "System automatically generates security review reports or assessments",
  category: "security",
  level: 2,
  scope: "repository",
  instructions: `Automated security review generation – System automatically generates security review reports or assessments. If \`gh\` or \`glab\` CLI is available and authenticated, first check admin access: ${ADMIN_ACCESS_CHECK_HINT}. If no admin/maintainer access, skip the code-scanning API check but still check for other approaches. Code scanning check: run \`gh api /repos/{owner}/{repo}/code-scanning/alerts\` for SAST tools (Semgrep, CodeQL, Snyk); 403 "Code Security must be enabled" = FAIL, 200 with results = PASS. Also look for: dependency audit reports in PR comments (Snyk, Dependabot), container scan summaries, or AI-powered security assessments. Must generate readable reports, not just pass/fail status. Skip if no evidence found and \`gh\`/\`glab\` CLI is not available, not authenticated, or lacks admin/maintainer access.`,
  isSkippable: true,
};

const dependency_update_automation: Criterion = {
  id: "dependency_update_automation",
  name: "Dependency Update Automation",
  description: "Dependabot or Renovate configured",
  category: "security",
  level: 2,
  scope: "repository",
  instructions:
    "Dependency update automation – Dependabot, Renovate, or similar is configured and creating PRs for dependency updates. Keeps dependencies current automatically, reducing security vulnerability window.",
};

const gitignore_comprehensive: Criterion = {
  id: "gitignore_comprehensive",
  name: "Gitignore Comprehensive",
  description: ".gitignore excludes secrets and build artifacts",
  category: "security",
  level: 1,
  scope: "repository",
  instructions:
    "Gitignore comprehensive – .gitignore properly excludes .env files (not .env.example), node_modules, build artifacts, IDE configs (.idea, .vscode), and OS files (.DS_Store). Prevents agents from accidentally committing secrets or generated files.",
};

const dast_scanning: Criterion = {
  id: "dast_scanning",
  name: "DAST Scanning",
  description:
    "Dynamic Application Security Testing runs against the application",
  category: "security",
  level: 4,
  scope: "application",
  instructions:
    "DAST scanning – Check for Dynamic Application Security Testing (DAST) in CI/CD. Look for: 1) OWASP ZAP configured in CI workflows (zap-scan action, zap-baseline). 2) Burp Suite Enterprise or Burp CI integration. 3) Nuclei scanner configured. 4) Other DAST tools (Acunetix, Netsparker, StackHawk). 5) Custom security test suites that hit running endpoints. PASS if any DAST tool runs against a staging/test environment in CI. This is distinct from SAST (static analysis) - DAST tests the running application. Skip for apps that are not deployed as web services (e.g., libraries, CLI tools, scripts).",
  isSkippable: true,
};

const pii_handling: Criterion = {
  id: "pii_handling",
  name: "PII Handling",
  description: "PII detection and handling tooling configured",
  category: "security",
  level: 3,
  scope: "application",
  instructions:
    "PII handling – Check for PII detection and handling tooling. Look for: 1) Data classification tools (Microsoft Presidio, AWS Macie integration, Google DLP). 2) PII detection in CI (detect-secrets with PII patterns, custom regex scanners). 3) Data masking libraries in dependencies (faker for test data, masking utilities). 4) Documentation of PII handling in AGENTS.md, privacy policy references, or data-handling docs. PASS if any PII-aware tooling or documented handling procedures exist. Skip for apps that do not process personal/user data (e.g., internal tools, infrastructure, developer utilities).",
  isSkippable: true,
};

const privacy_compliance: Criterion = {
  id: "privacy_compliance",
  name: "Privacy Compliance",
  description: "GDPR/CCPA compliance infrastructure configured",
  category: "security",
  level: 4,
  scope: "repository",
  instructions:
    "Privacy compliance – Check for privacy compliance infrastructure. Look for: 1) Consent management SDK/library (OneTrust, Cookiebot, custom consent banner). 2) Data retention policies documented. 3) GDPR/CCPA request handling code or documentation (data export, deletion endpoints). 4) Privacy-by-design patterns (data minimization configs, anonymization utilities). 5) Cookie/tracking consent implementation. PASS if evidence of privacy compliance infrastructure exists. Skip for apps without end-user data collection (e.g., internal tools, libraries, infrastructure).",
  isSkippable: true,
};

const secrets_management: Criterion = {
  id: "secrets_management",
  name: "Secrets Management",
  description: "Secure secrets management infrastructure configured",
  category: "security",
  level: 2,
  scope: "repository",
  instructions:
    "Secrets management – Check for secure secrets management infrastructure. Look for: 1) Cloud secrets manager integration (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, HashiCorp Vault) in code or config. 2) Environment variable documentation pointing to secrets manager. 3) GitHub Actions secrets usage (secrets.* references without hardcoded values). 4) SOPS, age, or similar encrypted secrets in repo. 5) .env files properly gitignored with .env.example template. FAIL if secrets appear hardcoded or no secrets management pattern is evident.",
};

const log_scrubbing: Criterion = {
  id: "log_scrubbing",
  name: "Sensitive Data Log Scrubbing",
  description: "Log sanitization/scrubbing mechanisms configured",
  category: "security",
  level: 3,
  scope: "application",
  instructions:
    "Log scrubbing – Check for log sanitization/scrubbing mechanisms. Look for: 1) Logging library with redaction support configured (pino redact, winston format with filtering, structlog processors). 2) Custom log sanitization middleware or utilities (grep for 'redact', 'sanitize', 'mask' in logging code). 3) Log scrubbing documentation in AGENTS.md or logging guidelines. 4) PII filtering patterns in log configuration. PASS if any log sanitization mechanism is configured or documented.",
};

const min_release_age: Criterion = {
  id: "min_release_age",
  name: "Minimum Dependency Release Age",
  description:
    "Dependencies are not adopted immediately after release, mitigating supply chain attacks",
  category: "security",
  level: 3,
  scope: "repository",
  instructions:
    "Minimum dependency release age – Check for policies or tooling that enforce a minimum waiting period before adopting new dependency releases. Look for: 1) Renovate configured with `minimumReleaseAge` or `stabilityDays` (or an equivalent delay gate). 2) A documented dependency-update policy that explicitly requires waiting N days before merging version bumps. 3) Custom CI checks that verify the target release date is at least N days old. PASS only if there is an explicit delay (not just centralized updates or signature/provenance verification).",
};

const issue_templates: Criterion = {
  id: "issue_templates",
  name: "Issue Templates",
  description: "Structured issue templates exist",
  category: "task_discovery",
  level: 2,
  scope: "repository",
  instructions:
    "Issue templates – .github/ISSUE_TEMPLATE/ (GitHub) or .gitlab/issue_templates/ (GitLab) directory exists with structured templates for bugs, features, etc. Teaches agents what information to provide when creating issues.",
};

const issue_labeling_system: Criterion = {
  id: "issue_labeling_system",
  name: "Issue Labeling System",
  description: "Consistent priority/type/area labels",
  category: "task_discovery",
  level: 2,
  scope: "repository",
  instructions:
    "Issue labeling system – Consistent labels exist for priority (P0-P3 or critical/high/medium/low), type (bug, feature, chore), and area (frontend, backend, infra). Enables agents to filter and prioritize work programmatically.",
};

const backlog_health: Criterion = {
  id: "backlog_health",
  name: "Backlog Health",
  description: "Issues have clear titles and recent activity",
  category: "task_discovery",
  level: 4,
  scope: "repository",
  instructions:
    "Backlog health – Issues have clear titles and recent activity. If `gh` or `glab` CLI is available and authenticated, run `gh issue list --state open --limit 50 --json title,createdAt,labels`. Count issues with: 1) titles > 10 characters, 2) at least one label. PASS if >70% of open issues have both a descriptive title (>10 chars) AND at least one label. Also check `gh issue list --state open --json createdAt` - FAIL if >50% of issues are older than 365 days with no recent comments. Skip if `gh`/`glab` CLI is not available or not authenticated.",
  isSkippable: true,
};

const pr_templates: Criterion = {
  id: "pr_templates",
  name: "PR Templates",
  description: "Pull request templates exist",
  category: "task_discovery",
  level: 2,
  scope: "repository",
  instructions:
    "PR templates – .github/pull_request_template.md (GitHub) or merge request templates (GitLab) exist with sections for description, testing done, and relevant context. Ensures agent PRs include necessary information for reviewers.",
};

const product_analytics_instrumentation: Criterion = {
  id: "product_analytics_instrumentation",
  name: "Product Analytics Instrumentation",
  description: "Mixpanel/Amplitude/PostHog instrumented",
  category: "product",
  level: 3,
  scope: "application",
  instructions:
    "Product analytics instrumentation – Mixpanel, Amplitude, PostHog, Heap, or GA4 is instrumented in the application. Agents can see whether features are actually used and measure the impact of their changes on user behavior.",
};

const error_to_insight_pipeline: Criterion = {
  id: "error_to_insight_pipeline",
  name: "Error to Insight Pipeline",
  description: "Errors flow from tracking to actionable issues",
  category: "product",
  level: 5,
  scope: "application",
  instructions:
    "Error to insight pipeline – Check for Sentry-GitHub/GitLab integration: search for sentry.io webhook in .github/workflows or repo settings, OR Sentry issue linking config (SENTRY_ORG, SENTRY_PROJECT in env). Also check for error-to-issue automation: GitHub Actions that create issues from errors, or PagerDuty/OpsGenie integrations with issue creation. PASS if any error tracking tool has issue creation integration configured.",
};

export const CRITERIA: readonly Criterion[] = [
  lint_config, // Fe8
  type_check, // Pe8
  formatter, // Me8
  pre_commit_hooks, // Ze8
  strict_typing, // THD
  naming_consistency, // RHD
  cyclomatic_complexity, // AHD
  large_file_detection, // gHD
  dead_code_detection, // mHD
  duplicate_code_detection, // bHD
  code_modularization, // iHD
  tech_debt_tracking, // pHD
  n_plus_one_detection, // nHD
  build_cmd_doc, // ke8
  deps_pinned, // ye8
  vcs_cli_tools, // Ye8
  automated_pr_review, // ne8
  agentic_development, // de8
  fast_ci_feedback, // oe8
  build_performance_tracking, // re8
  deployment_frequency, // te8
  single_command_setup, // BHD
  feature_flag_infrastructure, // LHD
  release_notes_automation, // qHD
  progressive_rollout, // DHD
  rollback_automation, // CHD
  monorepo_tooling, // hHD
  heavy_dependency_detection, // uHD
  unused_dependencies_detection, // cHD
  version_drift_detection, // lHD
  release_automation, // tHD
  dead_feature_flag_detection, // jHD
  unit_tests_exist, // fe8
  integration_tests_exist, // Ve8
  unit_tests_runnable, // ze8
  test_performance_tracking, // Se8
  flaky_test_detection, // je8
  test_coverage_thresholds, // _HD
  test_naming_conventions, // dHD
  test_isolation, // oHD
  agents_md, // ve8
  readme, // xe8
  automated_doc_generation, // ae8
  skills, // ee8
  documentation_freshness, // HHD
  api_schema_docs, // IHD
  service_flow_documented, // $HD
  agents_md_validation, // rHD
  devcontainer, // ge8
  env_template, // OHD
  local_services_setup, // WHD
  database_schema, // JHD
  devcontainer_runnable, // QHD
  structured_logging, // ue8
  distributed_tracing, // ce8
  metrics_collection, // pe8
  code_quality_metrics, // me8
  error_tracking_contextualized, // EHD
  alerting_configured, // KHD
  runbooks_documented, // GHD
  deployment_observability, // UHD
  health_checks, // SHD
  circuit_breakers, // vHD
  profiling_instrumentation, // xHD
  branch_protection, // le8
  secret_scanning, // ie8
  codeowners, // be8
  automated_security_review, // se8
  dependency_update_automation, // NHD
  gitignore_comprehensive, // wHD
  dast_scanning, // yHD
  pii_handling, // YHD
  privacy_compliance, // fHD
  secrets_management, // VHD
  log_scrubbing, // zHD
  min_release_age, // sHD
  issue_templates, // XHD
  issue_labeling_system, // FHD
  backlog_health, // PHD
  pr_templates, // MHD
  product_analytics_instrumentation, // ZHD
  error_to_insight_pipeline, // kHD
];

export const CRITERION_BY_ID: ReadonlyMap<string, Criterion> = new Map(
  CRITERIA.map((c) => [c.id, c]),
);
