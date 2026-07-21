export type WorldStatus = "active" | "planning" | "paused";

export interface World {
  id: string;
  name: string;
  description: string;
  status: WorldStatus;
  progress: number;
  activeNodes: number;
  decisions: number;
  openQuestions: number;
  updatedAt: string;
}

export interface ActivityItem {
  id: string;
  worldName: string;
  action: string;
  timestamp: string;
}

export interface UniverseOverview {
  totalWorlds: number;
  activeWorlds: number;
  totalNodes: number;
  totalDecisions: number;
  openQuestions: number;
}

export interface ModelInfo {
  name: string;
  provider: string;
  contextWindow: string;
}
