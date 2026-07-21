import type { Node } from "@xyflow/react";
import type { WorldStatus } from "@/types/world";

export type NodeKind = "root" | "branch" | "child";

export type RelationType =
  | "dependency"
  | "shared-feature"
  | "shared-contract"
  | "reference";

export const MIN_RELATION_OPACITY = 0;
export const MAX_RELATION_OPACITY = 100;
export const DEFAULT_RELATION_OPACITY = 70;

export type MapViewId = "hierarchy" | RelationType;

export interface Decision {
  id: string;
  label: string;
}

export interface OpenQuestion {
  id: string;
  question: string;
}

export interface WorldMapNodeData extends Record<string, unknown> {
  label: string;
  kind: NodeKind;
  status: WorldStatus;
  description: string;
  goal: string;
  progress: number;
  parentId: string | null;
  decisions: Decision[];
  openQuestions: OpenQuestion[];
}

export type WorldMapNode = Node<WorldMapNodeData>;

export interface SecondaryRelation {
  id: string;
  source: string;
  target: string;
  type: RelationType;
}

export interface WorldGraph {
  worldId: string;
  nodes: WorldMapNode[];
  relations: SecondaryRelation[];
}

export interface RelationTypeMeta {
  type: RelationType;
  label: string;
  color: string;
}

export const RELATION_TYPES: RelationTypeMeta[] = [
  { type: "dependency", label: "Dependencies", color: "#a78bfa" },
  { type: "shared-feature", label: "Shared Features", color: "#22d3ee" },
  { type: "shared-contract", label: "Shared Contracts", color: "#f472b6" },
  { type: "reference", label: "References", color: "#94a3b8" },
];
