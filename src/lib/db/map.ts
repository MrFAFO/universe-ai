import type { DbNode, DbNodeRelation } from "@/types/db";
import type { NodeKind, SecondaryRelation, WorldGraph } from "@/types/world-map";

export function findRootNodeId(nodes: DbNode[]): string | null {
  return nodes.find((node) => node.kind === "root")?.id ?? null;
}

export function deriveVisualKind(
  node: DbNode,
  rootNodeId: string | null,
): NodeKind {
  if (node.kind === "root") {
    return "root";
  }

  if (rootNodeId && node.parent_id === rootNodeId) {
    return "branch";
  }

  return "child";
}

export function mapRowsToWorldGraph(
  worldId: string,
  nodes: DbNode[],
  relations: DbNodeRelation[],
): WorldGraph {
  const rootNodeId = findRootNodeId(nodes);

  return {
    worldId,
    nodes: nodes.map((node) => ({
      id: node.id,
      type: "worldNode",
      position: { x: node.position_x, y: node.position_y },
      data: {
        label: node.title,
        kind: deriveVisualKind(node, rootNodeId),
        status: node.status,
        description: node.description,
        goal: node.goal,
        progress: node.progress,
        parentId: node.parent_id,
        decisions: [],
        openQuestions: [],
      },
    })),
    relations: relations.map(
      (relation): SecondaryRelation => ({
        id: relation.id,
        source: relation.source_node_id,
        target: relation.target_node_id,
        type: relation.type,
      }),
    ),
  };
}
