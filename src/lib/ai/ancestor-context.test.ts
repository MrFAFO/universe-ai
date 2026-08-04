import { describe, expect, it } from "vitest";
import {
  AncestorChainError,
  type ResolvedAncestorContext,
  type WorldNodeForAncestorPath,
  resolveAncestorContext,
} from "@/lib/ai/ancestor-context";

function makeNode(
  overrides: Partial<WorldNodeForAncestorPath> &
    Pick<WorldNodeForAncestorPath, "id" | "kind" | "parent_id" | "title">,
): WorldNodeForAncestorPath {
  return {
    description: null,
    goal: null,
    ...overrides,
  };
}

function expectAncestorChainError(
  fn: () => unknown,
  reason: "missing_parent" | "cycle" | "no_root" | "multiple_roots",
) {
  let thrown: unknown;

  try {
    fn();
    expect.unreachable("Expected AncestorChainError to be thrown");
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(AncestorChainError);
  expect((thrown as AncestorChainError).reason).toBe(reason);
}

describe("resolveAncestorContext", () => {
  const root = makeNode({
    id: "root",
    kind: "root",
    parent_id: null,
    title: "Root",
    goal: "Root goal",
  });

  it("returns the actual Root and no ancestors for a valid direct child of Root", () => {
    const current = makeNode({
      id: "topic-1",
      kind: "topic",
      parent_id: "root",
      title: "Topic 1",
    });

    const result = resolveAncestorContext([root, current], current);

    expect(result.root).toBe(root);
    expect(result.ancestors).toEqual([]);
  });

  it("returns the Root separately and ancestors ordered Root-to-parent", () => {
    const topicA = makeNode({
      id: "topic-a",
      kind: "topic",
      parent_id: "topic-b",
      title: "Topic A",
    });
    const topicB = makeNode({
      id: "topic-b",
      kind: "topic",
      parent_id: "root",
      title: "Topic B",
    });
    const current = makeNode({
      id: "topic-c",
      kind: "topic",
      parent_id: "topic-a",
      title: "Topic C",
    });

    const result = resolveAncestorContext([root, topicB, topicA, current], current);

    expect(result.root).toBe(root);
    expect(result.ancestors.map((node) => node.id)).toEqual(["topic-b", "topic-a"]);
  });

  it("includes a Root on every successful result", () => {
    const current = makeNode({
      id: "topic-1",
      kind: "topic",
      parent_id: "root",
      title: "Topic 1",
    });

    const result = resolveAncestorContext([root, current], current);

    expect(result.root.kind).toBe("root");
    expect(result.root.parent_id).toBeNull();
  });

  it("returns a chain deeper than 10 ancestors without truncation", () => {
    const nodes: WorldNodeForAncestorPath[] = [root];
    let parentId = "root";

    for (let index = 1; index <= 15; index += 1) {
      const id = `topic-${index}`;
      nodes.push(
        makeNode({
          id,
          kind: "topic",
          parent_id: parentId,
          title: `Topic ${index}`,
        }),
      );
      parentId = id;
    }

    const current = makeNode({
      id: "current",
      kind: "topic",
      parent_id: parentId,
      title: "Current Topic",
    });
    nodes.push(current);

    const result = resolveAncestorContext(nodes, current);

    expect(result.ancestors).toHaveLength(15);
    expect(result.ancestors[0]?.id).toBe("topic-1");
    expect(result.ancestors.at(-1)?.id).toBe("topic-15");
  });

  it("throws cycle when parent_id forms a loop", () => {
    const topicA = makeNode({
      id: "topic-a",
      kind: "topic",
      parent_id: "topic-b",
      title: "Topic A",
    });
    const topicB = makeNode({
      id: "topic-b",
      kind: "topic",
      parent_id: "topic-a",
      title: "Topic B",
    });
    const current = makeNode({
      id: "topic-c",
      kind: "topic",
      parent_id: "topic-a",
      title: "Topic C",
    });

    expectAncestorChainError(
      () => resolveAncestorContext([root, topicA, topicB, current], current),
      "cycle",
    );
  });

  it("throws missing_parent when a parent id is absent from the world collection", () => {
    const current = makeNode({
      id: "topic-1",
      kind: "topic",
      parent_id: "missing",
      title: "Topic 1",
    });

    expectAncestorChainError(
      () => resolveAncestorContext([root, current], current),
      "missing_parent",
    );
  });

  it("throws missing_parent when a parent belongs to another world and is absent locally", () => {
    const foreignParent = makeNode({
      id: "foreign",
      kind: "topic",
      parent_id: "root",
      title: "Foreign",
    });
    const current = makeNode({
      id: "topic-1",
      kind: "topic",
      parent_id: "foreign",
      title: "Topic 1",
    });

    expectAncestorChainError(
      () => resolveAncestorContext([root, current], current),
      "missing_parent",
    );

    expect(foreignParent.id).toBe("foreign");
  });

  it("throws no_root when the chain never reaches a Root", () => {
    const topicA = makeNode({
      id: "topic-a",
      kind: "topic",
      parent_id: null,
      title: "Topic A",
    });
    const current = makeNode({
      id: "topic-b",
      kind: "topic",
      parent_id: "topic-a",
      title: "Topic B",
    });

    expectAncestorChainError(
      () => resolveAncestorContext([topicA, current], current),
      "no_root",
    );
  });

  it("throws no_root when the reached Root has a non-null parent_id", () => {
    const invalidRoot = makeNode({
      id: "root-a",
      kind: "root",
      parent_id: "topic-a",
      title: "Invalid Root",
    });
    const topicA = makeNode({
      id: "topic-a",
      kind: "topic",
      parent_id: "root-a",
      title: "Topic A",
    });
    const current = makeNode({
      id: "topic-b",
      kind: "topic",
      parent_id: "topic-a",
      title: "Topic B",
    });

    expectAncestorChainError(
      () => resolveAncestorContext([invalidRoot, topicA, current], current),
      "no_root",
    );
  });

  it("throws multiple_roots when a Root points to another Root", () => {
    const rootB = makeNode({
      id: "root-b",
      kind: "root",
      parent_id: null,
      title: "Root B",
    });
    const rootA = makeNode({
      id: "root-a",
      kind: "root",
      parent_id: "root-b",
      title: "Root A",
    });
    const current = makeNode({
      id: "topic-1",
      kind: "topic",
      parent_id: "root-a",
      title: "Topic 1",
    });

    expectAncestorChainError(
      () => resolveAncestorContext([rootA, rootB, current], current),
      "multiple_roots",
    );
  });

  it("detects deep corruption before any truncation can hide it", () => {
    const nodes: WorldNodeForAncestorPath[] = [root];
    let parentId = "root";

    for (let index = 1; index <= 12; index += 1) {
      const id = `topic-${index}`;
      nodes.push(
        makeNode({
          id,
          kind: "topic",
          parent_id: parentId,
          title: `Topic ${index}`,
        }),
      );
      parentId = id;
    }

    const current = makeNode({
      id: "current",
      kind: "topic",
      parent_id: parentId,
      title: "Current Topic",
    });
    nodes.push(current);
    nodes[nodes.length - 2]!.parent_id = "missing";

    expectAncestorChainError(
      () => resolveAncestorContext(nodes, current),
      "missing_parent",
    );
  });

  it("does not mutate the supplied node collection", () => {
    const nodes: WorldNodeForAncestorPath[] = [
      root,
      makeNode({
        id: "topic-1",
        kind: "topic",
        parent_id: "root",
        title: "Topic 1",
      }),
    ];
    const snapshot = nodes.map((node) => ({ ...node }));
    const current = nodes[1]!;

    resolveAncestorContext(nodes, current);

    expect(nodes).toEqual(snapshot);
  });

  it("does not mutate the current node", () => {
    const current = makeNode({
      id: "topic-1",
      kind: "topic",
      parent_id: "root",
      title: "Topic 1",
    });
    const snapshot = { ...current };

    resolveAncestorContext([root, current], current);

    expect(current).toEqual(snapshot);
  });
});

describe("ResolvedAncestorContext", () => {
  it("keeps the Root out of ancestors", () => {
    const root = makeNode({
      id: "root",
      kind: "root",
      parent_id: null,
      title: "Root",
    });
    const current = makeNode({
      id: "topic-1",
      kind: "topic",
      parent_id: "root",
      title: "Topic 1",
    });

    const result: ResolvedAncestorContext = resolveAncestorContext(
      [root, current],
      current,
    );

    expect(result.ancestors.some((node) => node.id === "root")).toBe(false);
    expect(result.ancestors.some((node) => node.id === "topic-1")).toBe(false);
  });
});
