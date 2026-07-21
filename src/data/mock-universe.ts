import type {
  ActivityItem,
  ModelInfo,
  UniverseOverview,
  World,
} from "@/types/world";

export const mockWorlds: World[] = [
  {
    id: "universe-ai",
    name: "Universe AI",
    description:
      "Core product architecture, World Map interactions, and context inheritance model.",
    status: "active",
    progress: 42,
    activeNodes: 8,
    decisions: 12,
    openQuestions: 3,
    updatedAt: "2026-07-20T18:30:00Z",
  },
  {
    id: "portfolio-site",
    name: "Portfolio Site",
    description:
      "Personal portfolio redesign with case studies and project timeline.",
    status: "planning",
    progress: 18,
    activeNodes: 3,
    decisions: 4,
    openQuestions: 5,
    updatedAt: "2026-07-19T14:15:00Z",
  },
  {
    id: "research-notes",
    name: "Research Notes",
    description:
      "Structured knowledge base for AI context management papers and references.",
    status: "active",
    progress: 67,
    activeNodes: 14,
    decisions: 9,
    openQuestions: 2,
    updatedAt: "2026-07-20T09:45:00Z",
  },
  {
    id: "side-project",
    name: "Automation Toolkit",
    description:
      "CLI utilities and scripts for local development workflow automation.",
    status: "paused",
    progress: 31,
    activeNodes: 2,
    decisions: 6,
    openQuestions: 1,
    updatedAt: "2026-07-12T11:00:00Z",
  },
];

export const mockActivity: ActivityItem[] = [
  {
    id: "act-1",
    worldName: "Universe AI",
    action: "Decision recorded on node inheritance rules",
    timestamp: "2h ago",
  },
  {
    id: "act-2",
    worldName: "Research Notes",
    action: "New node created: Context Window Strategies",
    timestamp: "5h ago",
  },
  {
    id: "act-3",
    worldName: "Portfolio Site",
    action: "Planning session started at root node",
    timestamp: "Yesterday",
  },
  {
    id: "act-4",
    worldName: "Universe AI",
    action: "Secondary link added: Shared Contract",
    timestamp: "Yesterday",
  },
];

export const mockOverview: UniverseOverview = {
  totalWorlds: 4,
  activeWorlds: 2,
  totalNodes: 27,
  totalDecisions: 31,
  openQuestions: 11,
};

export const mockModelInfo: ModelInfo = {
  name: "GPT-4.1",
  provider: "OpenAI",
  contextWindow: "128K tokens",
};
