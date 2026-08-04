import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RootPlanningNotFoundError,
  type RootPlanningNotFoundReason,
  verifyRootPlanningTarget,
} from "@/lib/db/chat";
import { DatabaseError } from "@/lib/db/errors";
import {
  TopicPlanningNotFoundError,
  type TopicPlanningNotFoundReason,
  resolveTopicPlanningConversation,
  verifyTopicPlanningTarget,
} from "@/lib/db/topic-planning";
import type { DbConversation, DbNode, DbWorld } from "@/types/db";

const worldId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const nodeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const parentNodeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const conversationId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const otherWorldId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const baseWorld: DbWorld = {
  id: worldId,
  name: "Test World",
  description: "",
  status: "planning",
  owner_id: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const baseRootNode: DbNode = {
  id: parentNodeId,
  world_id: worldId,
  parent_id: null,
  kind: "root",
  title: "Root",
  description: "",
  goal: "",
  status: "planning",
  progress: 0,
  position_x: 0,
  position_y: 0,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const baseTopicNode: DbNode = {
  id: nodeId,
  world_id: worldId,
  parent_id: parentNodeId,
  kind: "topic",
  title: "Topic",
  description: "",
  goal: "",
  status: "planning",
  progress: 0,
  position_x: 0,
  position_y: 0,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const baseConversation: DbConversation = {
  id: conversationId,
  world_id: worldId,
  node_id: nodeId,
  kind: "planning",
  title: "",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function expectTopicPlanningNotFound(
  fn: () => unknown,
  reason: TopicPlanningNotFoundReason,
  options?: { notDatabaseError?: boolean },
) {
  let thrown: unknown;

  try {
    fn();
    expect.unreachable("Expected TopicPlanningNotFoundError to be thrown");
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(TopicPlanningNotFoundError);
  expect((thrown as TopicPlanningNotFoundError).reason).toBe(reason);
  if (options?.notDatabaseError) {
    expect(thrown).not.toBeInstanceOf(DatabaseError);
  }
}

function expectRootPlanningNotFound(
  fn: () => unknown,
  reason: RootPlanningNotFoundReason,
) {
  let thrown: unknown;

  try {
    fn();
    expect.unreachable("Expected RootPlanningNotFoundError to be thrown");
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(RootPlanningNotFoundError);
  expect((thrown as RootPlanningNotFoundError).reason).toBe(reason);
}

async function expectResolveDatabaseError(
  messagePattern: RegExp | string,
) {
  let thrown: unknown;

  try {
    await resolveTopicPlanningConversation(worldId, nodeId);
    expect.unreachable("Expected DatabaseError to be thrown");
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(DatabaseError);
  expect((thrown as DatabaseError).message).toMatch(messagePattern);
}

describe("verifyTopicPlanningTarget", () => {
  it("accepts a valid topic planning target with a conversation", () => {
    const result = verifyTopicPlanningTarget({
      world: baseWorld,
      node: baseTopicNode,
      conversation: baseConversation,
    });

    expect(result.world.id).toBe(worldId);
    expect(result.node.id).toBe(nodeId);
    expect(result.node.kind).toBe("topic");
    expect(result.node.parent_id).toBe(parentNodeId);
    expect(result.conversation?.id).toBe(conversationId);
    expect(result.conversation?.kind).toBe("planning");
  });

  it("accepts a valid topic planning target with a null conversation", () => {
    const result = verifyTopicPlanningTarget({
      world: baseWorld,
      node: baseTopicNode,
      conversation: null,
    });

    expect(result.world.id).toBe(worldId);
    expect(result.node.id).toBe(nodeId);
    expect(result.conversation).toBeNull();
  });

  it("rejects a missing world", () => {
    expectTopicPlanningNotFound(
      () =>
        verifyTopicPlanningTarget({
          world: null,
          node: baseTopicNode,
          conversation: baseConversation,
        }),
      "world",
      { notDatabaseError: true },
    );
  });

  it("rejects a missing node", () => {
    expectTopicPlanningNotFound(
      () =>
        verifyTopicPlanningTarget({
          world: baseWorld,
          node: null,
          conversation: baseConversation,
        }),
      "node",
      { notDatabaseError: true },
    );
  });

  it("rejects a node from another world", () => {
    expectTopicPlanningNotFound(
      () =>
        verifyTopicPlanningTarget({
          world: baseWorld,
          node: { ...baseTopicNode, world_id: otherWorldId },
          conversation: baseConversation,
        }),
      "node_world_mismatch",
    );
  });

  it("rejects a root node", () => {
    expectTopicPlanningNotFound(
      () =>
        verifyTopicPlanningTarget({
          world: baseWorld,
          node: baseRootNode,
          conversation: baseConversation,
        }),
      "not_topic",
    );
  });

  it("rejects a topic node with a null parent_id", () => {
    expectTopicPlanningNotFound(
      () =>
        verifyTopicPlanningTarget({
          world: baseWorld,
          node: { ...baseTopicNode, parent_id: null },
          conversation: baseConversation,
        }),
      "not_topic",
    );
  });

  it("rejects a non-planning conversation", () => {
    expectTopicPlanningNotFound(
      () =>
        verifyTopicPlanningTarget({
          world: baseWorld,
          node: baseTopicNode,
          conversation: { ...baseConversation, kind: "execution" },
        }),
      "conversation_mismatch",
    );
  });

  it("rejects a conversation linked to a different node", () => {
    expectTopicPlanningNotFound(
      () =>
        verifyTopicPlanningTarget({
          world: baseWorld,
          node: baseTopicNode,
          conversation: {
            ...baseConversation,
            node_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          },
        }),
      "conversation_mismatch",
    );
  });

  it("rejects a conversation linked to a different world", () => {
    expectTopicPlanningNotFound(
      () =>
        verifyTopicPlanningTarget({
          world: baseWorld,
          node: baseTopicNode,
          conversation: {
            ...baseConversation,
            world_id: otherWorldId,
          },
        }),
      "conversation_mismatch",
    );
  });
});

describe("resolver separation", () => {
  it("verifyRootPlanningTarget rejects a valid topic as not_root", () => {
    expectRootPlanningNotFound(
      () =>
        verifyRootPlanningTarget({
          world: baseWorld,
          node: baseTopicNode,
          conversation: baseConversation,
        }),
      "not_root",
    );
  });

  it("verifyTopicPlanningTarget rejects a root node as not_topic", () => {
    expectTopicPlanningNotFound(
      () =>
        verifyTopicPlanningTarget({
          world: baseWorld,
          node: baseRootNode,
          conversation: baseConversation,
        }),
      "not_topic",
    );
  });
});

type QueryResult = { data: unknown; error: { message: string } | null };

function createQueryBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;

  builder.select = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));

  return builder;
}

const mockFrom = vi.fn();

vi.mock("@/lib/db/client", () => ({
  createSupabaseServerClient: () => ({
    from: mockFrom,
  }),
}));

describe("resolveTopicPlanningConversation", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("returns a verified target when the topic has a planning conversation", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "worlds") {
        return createQueryBuilder({ data: baseWorld, error: null });
      }
      if (table === "nodes") {
        return createQueryBuilder({ data: baseTopicNode, error: null });
      }
      if (table === "conversations") {
        return createQueryBuilder({ data: baseConversation, error: null });
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await resolveTopicPlanningConversation(worldId, nodeId);

    expect(result.world.id).toBe(worldId);
    expect(result.node.id).toBe(nodeId);
    expect(result.conversation?.id).toBe(conversationId);
    expect(mockFrom).toHaveBeenCalledWith("worlds");
    expect(mockFrom).toHaveBeenCalledWith("nodes");
    expect(mockFrom).toHaveBeenCalledWith("conversations");
  });

  it("returns a verified target when no planning conversation exists yet", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "worlds") {
        return createQueryBuilder({ data: baseWorld, error: null });
      }
      if (table === "nodes") {
        return createQueryBuilder({ data: baseTopicNode, error: null });
      }
      if (table === "conversations") {
        return createQueryBuilder({ data: null, error: null });
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await resolveTopicPlanningConversation(worldId, nodeId);

    expect(result.world.id).toBe(worldId);
    expect(result.node.id).toBe(nodeId);
    expect(result.conversation).toBeNull();
  });

  it("throws TopicPlanningNotFoundError when the node is missing", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "worlds") {
        return createQueryBuilder({ data: baseWorld, error: null });
      }
      if (table === "nodes") {
        return createQueryBuilder({ data: null, error: null });
      }
      if (table === "conversations") {
        return createQueryBuilder({ data: null, error: null });
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    await expect(
      resolveTopicPlanningConversation(worldId, nodeId),
    ).rejects.toMatchObject({ reason: "node" });
  });

  it("throws DatabaseError when the world query fails", async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: "world query failed" } }),
    );

    await expectResolveDatabaseError(/world query failed/);
  });

  it("throws DatabaseError when the node query fails", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "worlds") {
        return createQueryBuilder({ data: baseWorld, error: null });
      }
      if (table === "nodes") {
        return createQueryBuilder({
          data: null,
          error: { message: "node query failed" },
        });
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    await expectResolveDatabaseError(/node query failed/);
  });

  it("throws DatabaseError when the conversation query fails", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "worlds") {
        return createQueryBuilder({ data: baseWorld, error: null });
      }
      if (table === "nodes") {
        return createQueryBuilder({ data: baseTopicNode, error: null });
      }
      if (table === "conversations") {
        return createQueryBuilder({
          data: null,
          error: { message: "conversation query failed" },
        });
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    await expectResolveDatabaseError(/conversation query failed/);
  });
});
