
export type CategoryId =
  | "style"
  | "build"
  | "testing"
  | "docs"
  | "dev_env"
  | "debugging"
  | "security"
  | "task_discovery"
  | "product";

export type Level = 1 | 2 | 3 | 4 | 5;

export type Scope = "repository" | "application";

export interface Criterion {
  id: string;
  name: string;
  description: string;
  category: CategoryId;
  level: Level;
  scope: Scope;
  instructions: string;
  isSkippable?: boolean;
}

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
}

export interface LevelDefinition {
  level: Level;
  name: string;
  description: string;
  thresholdPercent: number;
}
