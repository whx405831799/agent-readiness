import { CRITERIA } from "./definitions.js";
import type { CategoryId, Criterion, Level, Scope } from "./types.js";

export type {
  Category,
  CategoryId,
  Criterion,
  Level,
  LevelDefinition,
  Scope,
} from "./types.js";

export {
  CATEGORIES,
  CATEGORY_BY_ID,
  STYLE,
  BUILD,
  TESTING,
  DOCS,
  DEV_ENV,
  DEBUGGING,
  SECURITY,
  TASK_DISCOVERY,
  PRODUCT,
} from "./categories.js";

export { LEVELS } from "./levels.js";

export { ADMIN_ACCESS_CHECK_HINT } from "./constants.js";

export { CRITERIA, CRITERION_BY_ID } from "./definitions.js";

export function getCriteriaByScope(scope: Scope): Criterion[] {
  return CRITERIA.filter((c) => c.scope === scope);
}

export function getCriteriaByLevel(level: Level): Criterion[] {
  return CRITERIA.filter((c) => c.level === level);
}

export function getCriteriaByCategory(category: CategoryId): Criterion[] {
  return CRITERIA.filter((c) => c.category === category);
}
