import { describe, expect, it } from "vitest";
import {
  deriveVisualKind,
  findRootNodeId,
  mapRowsToWorldGraph,
} from "@/lib/db/map";
import type { DbNode, DbNodeRelation } from "@/types/db";

const worldId = "11111111-1111-4111-8111-111111111111";
const rootId = "22222222-2222-4222-8222-222222222222";
const branchId = "33333333-3333-4333-8333-333333333333";
const childId = "44444444-4444-4444-8444-444444444444";

function makeNode(overrides: Partial<DbNode> & Pick<DbNode, "id" | "kind" | "parent_id">): DbNode {
  return {
    world_id: worldId,
    title: "Node",
    description: "",
    goal: "",
    status: "planning",
    progress: 0,
    position_x: 0,
    position_y: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("mapRowsToWorldGraph", () => {
  const nodes: DbNode[] = [
    makeNode({
      id: rootId,
      kind: "root",
      parent_id: null,
      title: "Root Planning",
      position_x: 100,
      position_y: 50,
    }),
    makeNode({
      id: branchId,
      kind: "topic",
      parent_id: rootId,
      title: "Branch Topic",
      position_x: 200,
      position_y: 300,
    }),
    makeNode({
      id: childId,
      kind: "topic",
      parent_id: branchId,
      title: "Child Topic",
      position_x: 250,
      position_y: 520,
    }),
  ];

  const relations: DbNodeRelation[] = [
    {
      id: "55555555-5555-4555-8555-555555555555",
      world_id: worldId,
      source_node_id: branchId,
      target_node_id: childId,
      type: "dependency",
      created_at: "2026-01-01T00:00:00.000Z",
    },
  ];

  it("finds the root node id", () => {
    expect(findRootNodeId(nodes)).toBe(rootId);
  });

  it("derives root, branch and child visual kinds from hierarchy", () => {
    expect(deriveVisualKind(nodes[0], rootId)).toBe("root");
    expect(deriveVisualKind(nodes[1], rootId)).toBe("branch");
    expect(deriveVisualKind(nodes[2], rootId)).toBe("child");
  });

  it("maps rows into the existing WorldGraph contract", () => {
    const graph = mapRowsToWorldGraph(worldId, nodes, relations);

    expect(graph.worldId).toBe(worldId);
    expect(graph.nodes).toHaveLength(3);
    expect(graph.nodes[0].data.kind).toBe("root");
    expect(graph.nodes[1].data.kind).toBe("branch");
    expect(graph.nodes[2].data.kind).toBe("child");
    expect(graph.nodes[1].data.parentId).toBe(rootId);
    expect(graph.nodes[1].position).toEqual({ x: 200, y: 300 });
    expect(graph.relations).toEqual([
      {
        id: relations[0].id,
        source: branchId,
        target: childId,
        type: "dependency",
      },
    ]);
    expect(graph.nodes[0].data.decisions).toEqual([]);
    expect(graph.nodes[0].data.openQuestions).toEqual([]);
  });
});
