import type { Category, CategoryId } from "./types.js";

export const STYLE: Category = {
  id: "style",
  name: "Style & Validation",
  description:
    "Code quality tools that catch errors early in the development process",
};

export const BUILD: Category = {
  id: "build",
  name: "Build System",
  description: "Clear and reproducible build process",
};

export const TESTING: Category = {
  id: "testing",
  name: "Testing",
  description: "Automated tests that verify code correctness",
};

export const DOCS: Category = {
  id: "docs",
  name: "Documentation",
  description: "Clear instructions for agents and developers",
};

export const DEV_ENV: Category = {
  id: "dev_env",
  name: "Development Environment",
  description: "Consistent and reproducible development environment",
};

export const DEBUGGING: Category = {
  id: "debugging",
  name: "Debugging & Observability",
  description: "Tools for understanding runtime behavior",
};

export const SECURITY: Category = {
  id: "security",
  name: "Security",
  description: "Protections against vulnerabilities and mistakes",
};

export const TASK_DISCOVERY: Category = {
  id: "task_discovery",
  name: "Task Discovery",
  description:
    "Infrastructure for agents to find and scope work autonomously",
};

export const PRODUCT: Category = {
  id: "product",
  name: "Product & Experimentation",
  description:
    "Tools for measuring impact, running experiments, and understanding user behavior",
};

export const CATEGORIES: readonly Category[] = [
  STYLE,
  BUILD,
  TESTING,
  DOCS,
  DEV_ENV,
  DEBUGGING,
  SECURITY,
  TASK_DISCOVERY,
  PRODUCT,
];

export const CATEGORY_BY_ID: Readonly<Record<CategoryId, Category>> =
  Object.freeze(
    CATEGORIES.reduce(
      (acc, cat) => {
        acc[cat.id] = cat;
        return acc;
      },
      {} as Record<CategoryId, Category>,
    ),
  );
