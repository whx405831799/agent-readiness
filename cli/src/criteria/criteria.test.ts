import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  CATEGORIES,
  CATEGORY_BY_ID,
  CRITERIA,
  CRITERION_BY_ID,
  LEVELS,
  getCriteriaByCategory,
  getCriteriaByLevel,
  getCriteriaByScope,
} from "./index.js";

describe("criteria catalog", () => {
  it("contains exactly 82 criteria", () => {
    assert.equal(CRITERIA.length, 82);
  });

  it("has unique ids across all criteria", () => {
    const ids = CRITERIA.map((c) => c.id);
    const unique = new Set(ids);
    assert.equal(unique.size, ids.length, "duplicate criterion id detected");
  });

  it("uses ids matching /^[a-z][a-z0-9_]*$/", () => {
    const re = /^[a-z][a-z0-9_]*$/;
    for (const c of CRITERIA) {
      assert.match(c.id, re, `bad id: ${c.id}`);
    }
  });

  it("every criterion's category exists in CATEGORIES", () => {
    for (const c of CRITERIA) {
      assert.ok(
        CATEGORY_BY_ID[c.category],
        `unknown category "${c.category}" on ${c.id}`,
      );
    }
  });

  it("every criterion's level is between 1 and 5", () => {
    for (const c of CRITERIA) {
      assert.ok(c.level >= 1 && c.level <= 5, `bad level on ${c.id}`);
    }
  });

  it("every criterion has either repository or application scope", () => {
    for (const c of CRITERIA) {
      assert.ok(
        c.scope === "repository" || c.scope === "application",
        `bad scope on ${c.id}: ${c.scope}`,
      );
    }
  });

  it("every criterion has non-empty name/description/instructions", () => {
    for (const c of CRITERIA) {
      assert.ok(c.name.length > 0, `empty name on ${c.id}`);
      assert.ok(c.description.length > 0, `empty description on ${c.id}`);
      assert.ok(c.instructions.length > 0, `empty instructions on ${c.id}`);
    }
  });

  it("CRITERION_BY_ID is consistent with CRITERIA", () => {
    assert.equal(CRITERION_BY_ID.size, CRITERIA.length);
    for (const c of CRITERIA) {
      assert.strictEqual(CRITERION_BY_ID.get(c.id), c);
    }
  });
});

describe("categories", () => {
  it("contains exactly 9 categories", () => {
    assert.equal(CATEGORIES.length, 9);
  });

  it("has expected ids in canonical order", () => {
    assert.deepEqual(
      CATEGORIES.map((c) => c.id),
      [
        "style",
        "build",
        "testing",
        "docs",
        "dev_env",
        "debugging",
        "security",
        "task_discovery",
        "product",
      ],
    );
  });

  it("CATEGORY_BY_ID is consistent with CATEGORIES", () => {
    for (const cat of CATEGORIES) {
      assert.strictEqual(CATEGORY_BY_ID[cat.id], cat);
    }
  });
});

describe("levels", () => {
  it("contains exactly 5 levels", () => {
    assert.equal(LEVELS.length, 5);
  });

  it("has level numbers 1..5 in order", () => {
    assert.deepEqual(
      LEVELS.map((l) => l.level),
      [1, 2, 3, 4, 5],
    );
  });

  it("uses 80% threshold across all levels", () => {
    for (const l of LEVELS) {
      assert.equal(l.thresholdPercent, 80);
    }
  });
});

describe("query helpers", () => {
  it("getCriteriaByScope splits the catalog without overlap", () => {
    const repo = getCriteriaByScope("repository");
    const app = getCriteriaByScope("application");
    assert.equal(repo.length + app.length, CRITERIA.length);
  });

  it("getCriteriaByLevel sums to the catalog total", () => {
    const total = ([1, 2, 3, 4, 5] as const)
      .map((l) => getCriteriaByLevel(l).length)
      .reduce((a, b) => a + b, 0);
    assert.equal(total, CRITERIA.length);
  });

  it("getCriteriaByCategory sums to the catalog total", () => {
    const total = CATEGORIES.map(
      (cat) => getCriteriaByCategory(cat.id).length,
    ).reduce((a, b) => a + b, 0);
    assert.equal(total, CRITERIA.length);
  });
});
