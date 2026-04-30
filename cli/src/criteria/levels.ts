import type { LevelDefinition } from "./types.js";

export const LEVELS: readonly LevelDefinition[] = [
  {
    level: 1,
    name: "Basic",
    description: "Table stakes. Basic tooling that catches obvious mistakes.",
    thresholdPercent: 80,
  },
  {
    level: 2,
    name: "Infrastructure",
    description: "Invested in infrastructure, CI/CD, and process.",
    thresholdPercent: 80,
  },
  {
    level: 3,
    name: "Advanced",
    description: "Security, observability, and end-to-end validation.",
    thresholdPercent: 80,
  },
  {
    level: 4,
    name: "Expert",
    description: "Mastered advanced readiness criteria.",
    thresholdPercent: 80,
  },
  {
    level: 5,
    name: "Autonomous",
    description:
      "Enables agents to operate independently, discover work, and maintain quality without human intervention.",
    thresholdPercent: 80,
  },
];
