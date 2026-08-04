import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseError } from "@/lib/db/errors";
import {
  TopicPlanningNotFoundError,
  TopicPlanningProvisioningIntegrityError,
  ensureTopicPlanningConversation,
  verifyTopicPlanningTarget,
} from "@/lib/db/topic-planning";
import type { DbConversation, DbNode, DbWorld } from "@/types/db";

const worldId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const nodeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const parentNodeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const conversationId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const otherWorldId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const otherNodeId = "ffffffff-ffff-4fff-8fff-ffffffffffff";

const baseWorld: DbWorld = {
  id: worldId,
  name: "Test World",
  description: "",
  status: "planning",
  owner_id: null,
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
  title: "Planning",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function makeTargetWithConversation(
  conversation: DbConversation = baseConversation,
) {
  return verifyTopicPlanningTarget({
    world: baseWorld,
    node: baseTopicNode,
    conversation,
  });
}

function makeTargetWithoutConversation() {
  return verifyTopicPlanningTarget({
    world: baseWorld,
    node: baseTopicNode,
    conversation: null,
  });
}

type InsertResult = {
  data: unknown;
  error: { message: string; code?: string } | null;
};

type SelectResult = { data: unknown; error: { message: string } | null };

function createInsertBuilder(
  result: InsertResult,
  options?: { onInsert?: (payload: unknown) => void },
) {
  const builder: Record<string, unknown> = {};

  builder.insert = vi.fn((payload: unknown) => {
    options?.onInsert?.(payload);
    return builder;
  });
  builder.select = vi.fn(() => builder);
  builder.single = vi.fn(() => Promise.resolve(result));

  return builder;
}

function createSelectBuilder(result: SelectResult) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;

  builder.select = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));

  return builder;
}

async function expectProvisioningIntegrityError(
  target: ReturnType<typeof makeTargetWithoutConversation>,
) {
  let thrown: unknown;

  try {
    await ensureTopicPlanningConversation(target);
    expect.unreachable(
      "Expected TopicPlanningProvisioningIntegrityError to be thrown",
    );
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(TopicPlanningProvisioningIntegrityError);
  expect(thrown).toBeInstanceOf(DatabaseError);
  expect(thrown).not.toBeInstanceOf(TopicPlanningNotFoundError);
}

const mockFrom = vi.fn();

vi.mock("@/lib/db/client", () => ({
  createSupabaseServerClient: () => ({
    from: mockFrom,
  }),
}));

describe("ensureTopicPlanningConversation", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("returns an existing target conversation without issuing an insert", async () => {
    const target = makeTargetWithConversation();

    const result = await ensureTopicPlanningConversation(target);

    expect(result.id).toBe(conversationId);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("inserts exactly one conversation when the target has none", async () => {
    let insertCount = 0;
    const insertBuilder = createInsertBuilder(
      { data: baseConversation, error: null },
      {
        onInsert: () => {
          insertCount += 1;
        },
      },
    );
    mockFrom.mockReturnValue(insertBuilder);

    const target = makeTargetWithoutConversation();
    const result = await ensureTopicPlanningConversation(target);

    expect(result.id).toBe(conversationId);
    expect(insertCount).toBe(1);
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith("conversations");
  });

  it("derives inserted world_id from target.node.world_id", async () => {
    let insertedPayload: Record<string, unknown> | undefined;
    mockFrom.mockReturnValue(
      createInsertBuilder(
        { data: baseConversation, error: null },
        {
          onInsert: (payload) => {
            insertedPayload = payload as Record<string, unknown>;
          },
        },
      ),
    );

    await ensureTopicPlanningConversation(makeTargetWithoutConversation());

    expect(insertedPayload).toEqual({
      world_id: worldId,
      node_id: nodeId,
      kind: "planning",
      title: "Planning",
    });
  });

  it("derives inserted node_id from target.node.id", async () => {
    let insertedPayload: Record<string, unknown> | undefined;
    mockFrom.mockReturnValue(
      createInsertBuilder(
        { data: baseConversation, error: null },
        {
          onInsert: (payload) => {
            insertedPayload = payload as Record<string, unknown>;
          },
        },
      ),
    );

    await ensureTopicPlanningConversation(makeTargetWithoutConversation());

    expect(insertedPayload?.node_id).toBe(nodeId);
  });

  it("inserts kind planning", async () => {
    let insertedPayload: Record<string, unknown> | undefined;
    mockFrom.mockReturnValue(
      createInsertBuilder(
        { data: baseConversation, error: null },
        {
          onInsert: (payload) => {
            insertedPayload = payload as Record<string, unknown>;
          },
        },
      ),
    );

    await ensureTopicPlanningConversation(makeTargetWithoutConversation());

    expect(insertedPayload?.kind).toBe("planning");
  });

  it('inserts title "Planning"', async () => {
    let insertedPayload: Record<string, unknown> | undefined;
    mockFrom.mockReturnValue(
      createInsertBuilder(
        { data: baseConversation, error: null },
        {
          onInsert: (payload) => {
            insertedPayload = payload as Record<string, unknown>;
          },
        },
      ),
    );

    await ensureTopicPlanningConversation(makeTargetWithoutConversation());

    expect(insertedPayload?.title).toBe("Planning");
  });

  it("re-selects and returns the winning row after a 23505 conflict", async () => {
    const winnerConversation = {
      ...baseConversation,
      id: "11111111-1111-4111-8111-111111111111",
    };
    let conversationsCallCount = 0;

    mockFrom.mockImplementation(() => {
      conversationsCallCount += 1;

      if (conversationsCallCount === 1) {
        return createInsertBuilder({
          data: null,
          error: { code: "23505", message: "duplicate key value" },
        });
      }

      return createSelectBuilder({ data: winnerConversation, error: null });
    });

    const result = await ensureTopicPlanningConversation(
      makeTargetWithoutConversation(),
    );

    expect(result.id).toBe(winnerConversation.id);
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it("throws DatabaseError when insert fails with a non-23505 error", async () => {
    mockFrom.mockReturnValue(
      createInsertBuilder({
        data: null,
        error: { code: "08006", message: "connection failure" },
      }),
    );

    let thrown: unknown;

    try {
      await ensureTopicPlanningConversation(makeTargetWithoutConversation());
      expect.unreachable("Expected DatabaseError to be thrown");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(DatabaseError);
    expect(thrown).not.toBeInstanceOf(TopicPlanningProvisioningIntegrityError);
    expect((thrown as DatabaseError).message).toMatch(/connection failure/);
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("throws DatabaseError when a 23505 re-select returns no row", async () => {
    let conversationsCallCount = 0;

    mockFrom.mockImplementation(() => {
      conversationsCallCount += 1;

      if (conversationsCallCount === 1) {
        return createInsertBuilder({
          data: null,
          error: { code: "23505", message: "duplicate key value" },
        });
      }

      return createSelectBuilder({ data: null, error: null });
    });

    let thrown: unknown;

    try {
      await ensureTopicPlanningConversation(makeTargetWithoutConversation());
      expect.unreachable("Expected DatabaseError to be thrown");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(DatabaseError);
    expect(thrown).not.toBeInstanceOf(TopicPlanningProvisioningIntegrityError);
    expect((thrown as DatabaseError).message).toMatch(
      /Unable to provision topic planning conversation/,
    );
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it("throws TopicPlanningProvisioningIntegrityError when a fresh insert returns a mismatched node_id", async () => {
    mockFrom.mockReturnValue(
      createInsertBuilder({
        data: { ...baseConversation, node_id: otherNodeId },
        error: null,
      }),
    );

    await expectProvisioningIntegrityError(makeTargetWithoutConversation());
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("throws TopicPlanningProvisioningIntegrityError when a fresh insert returns a mismatched world_id", async () => {
    mockFrom.mockReturnValue(
      createInsertBuilder({
        data: { ...baseConversation, world_id: otherWorldId },
        error: null,
      }),
    );

    await expectProvisioningIntegrityError(makeTargetWithoutConversation());
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("throws TopicPlanningProvisioningIntegrityError when a fresh insert returns a mismatched kind", async () => {
    mockFrom.mockReturnValue(
      createInsertBuilder({
        data: { ...baseConversation, kind: "execution" },
        error: null,
      }),
    );

    await expectProvisioningIntegrityError(makeTargetWithoutConversation());
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("throws TopicPlanningProvisioningIntegrityError when a 23505 re-select returns a mismatched node_id", async () => {
    let conversationsCallCount = 0;

    mockFrom.mockImplementation(() => {
      conversationsCallCount += 1;

      if (conversationsCallCount === 1) {
        return createInsertBuilder({
          data: null,
          error: { code: "23505", message: "duplicate key value" },
        });
      }

      return createSelectBuilder({
        data: { ...baseConversation, node_id: otherNodeId },
        error: null,
      });
    });

    await expectProvisioningIntegrityError(makeTargetWithoutConversation());
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it("throws TopicPlanningProvisioningIntegrityError when a 23505 re-select returns a mismatched world_id", async () => {
    let conversationsCallCount = 0;

    mockFrom.mockImplementation(() => {
      conversationsCallCount += 1;

      if (conversationsCallCount === 1) {
        return createInsertBuilder({
          data: null,
          error: { code: "23505", message: "duplicate key value" },
        });
      }

      return createSelectBuilder({
        data: { ...baseConversation, world_id: otherWorldId },
        error: null,
      });
    });

    await expectProvisioningIntegrityError(makeTargetWithoutConversation());
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it("throws TopicPlanningProvisioningIntegrityError when a 23505 re-select returns a mismatched kind", async () => {
    let conversationsCallCount = 0;

    mockFrom.mockImplementation(() => {
      conversationsCallCount += 1;

      if (conversationsCallCount === 1) {
        return createInsertBuilder({
          data: null,
          error: { code: "23505", message: "duplicate key value" },
        });
      }

      return createSelectBuilder({
        data: { ...baseConversation, kind: "execution" },
        error: null,
      });
    });

    await expectProvisioningIntegrityError(makeTargetWithoutConversation());
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });
});
