import type { RelationType, WorldGraph, WorldMapNode } from "@/types/world-map";

type PositionMap = Record<string, { x: number; y: number }>;

const relationLayouts: Record<string, Record<RelationType, PositionMap>> = {
  "universe-ai": {
    dependency: {
      "context-memory": { x: 280, y: 20 },
      "planning-agent": { x: 40, y: 240 },
      "execution-agent": { x: 280, y: 300 },
      frontend: { x: 520, y: 240 },
    },
    "shared-feature": {
      "context-memory": { x: 300, y: 20 },
      "memory-layer": { x: 60, y: 240 },
      "context-builder": { x: 300, y: 240 },
      "execution-agent": { x: 540, y: 240 },
    },
    "shared-contract": {
      frontend: { x: 120, y: 140 },
      visualization: { x: 400, y: 140 },
    },
    reference: {
      "context-memory": { x: 120, y: 140 },
      visualization: { x: 400, y: 140 },
    },
  },
};

export function getDefaultHierarchyPositions(
  graph: WorldGraph,
): PositionMap {
  return Object.fromEntries(
    graph.nodes.map((node) => [node.id, { ...node.position }]),
  );
}

export function getDefaultRelationPositions(
  worldId: string,
  graph: WorldGraph,
  relationType: RelationType,
): PositionMap {
  const layout = relationLayouts[worldId]?.[relationType];
  const relations = graph.relations.filter(
    (relation) => relation.type === relationType,
  );
  const nodeIds = new Set<string>();
  for (const relation of relations) {
    nodeIds.add(relation.source);
    nodeIds.add(relation.target);
  }

  const positions: PositionMap = {};
  let index = 0;
  for (const nodeId of nodeIds) {
    positions[nodeId] = layout?.[nodeId] ?? {
      x: 120 + (index % 3) * 260,
      y: 80 + Math.floor(index / 3) * 200,
    };
    index += 1;
  }
  return positions;
}

export function buildHierarchyNodes(
  graph: WorldGraph,
  positions: PositionMap,
): WorldMapNode[] {
  return graph.nodes.map((node) => ({
    ...node,
    position: positions[node.id] ?? node.position,
  }));
}

export function buildRelationNodes(
  graph: WorldGraph,
  relationType: RelationType,
  positions: PositionMap,
): WorldMapNode[] {
  const relations = graph.relations.filter(
    (relation) => relation.type === relationType,
  );
  const nodeIds = new Set<string>();
  for (const relation of relations) {
    nodeIds.add(relation.source);
    nodeIds.add(relation.target);
  }

  return graph.nodes
    .filter((node) => nodeIds.has(node.id))
    .map((node) => ({
      ...node,
      position: positions[node.id] ?? { x: 0, y: 0 },
    }));
}

export function getRelationsForView(
  graph: WorldGraph,
  viewId: "hierarchy" | RelationType,
) {
  if (viewId === "hierarchy") return [];
  return graph.relations.filter((relation) => relation.type === viewId);
}
