import { beforeEach, describe, expect, it, vi } from "vitest";
import * as ancestorContext from "@/lib/ai/ancestor-context";
import {
  TOPIC_PLANNING_BLOCKED_MESSAGE,
  loadTopicPlanningPageData,
} from "@/lib/chat/topic-planning-page-data";
import { DatabaseError } from "@/lib/db/errors";
import { TopicPlanningNotFoundError } from "@/lib/db/topic-planning";
import type { DbConversation, DbMessage, DbNode, DbWorld } from "@/types/db";

const worldId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const nodeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const rootNodeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ancestorANodeId = "11111111-1111-4111-8111-111111111111";
const ancestorBNodeId = "22222222-2222-4222-8222-222222222222";
const conversationId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const world: DbWorld = {
  id: worldId,
  name: "Test World",
  description: "World description",
  status: "planning",
  owner_id: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const topicNode: DbNode = {
  id: nodeId,
  world_id: worldId,
  parent_id: rootNodeId,
  kind: "topic",
  title: "Current Topic",
  description: "Current description",
  goal: "Current goal",
  status: "planning",
  progress: 0,
  position_x: 0,
  position_y: 0,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const conversation: DbConversation = {
  id: conversationId,
  world_id: worldId,
  node_id: nodeId,
  kind: "planning",
  title: "Planning",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const rootWorldNode = {
  id: rootNodeId,
  parent_id: null,
  kind: "root" as const,
  title: "Root Title",
  description: "",
  goal: "Root Goal",
};

function makeMessage(
  overrides: Partial<DbMessage> & Pick<DbMessage, "id" | "role" | "ordinal">,
): DbMessage {
  return {
    conversation_id: conversationId,
    content: "Message content",
    ai_run_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const resolveTopicPlanningConversation = vi.fn();
const listWorldNodesForAncestorContext = vi.fn();
const listConversationMessages = vi.fn();

vi.mock("@/lib/db/topic-planning", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/topic-planning")>();
  return {
    ...actual,
    resolveTopicPlanningConversation: (...args: unknown[]) =>
      resolveTopicPlanningConversation(...args),
    listWorldNodesForAncestorContext: (...args: unknown[]) =>
      listWorldNodesForAncestorContext(...args),
  };
});

vi.mock("@/lib/db/chat", () => ({
  listConversationMessages: (...args: unknown[]) =>
    listConversationMessages(...args),
}));

describe("loadTopicPlanningPageData", () => {
  beforeEach(() => {
    resolveTopicPlanningConversation.mockReset();
    listWorldNodesForAncestorContext.mockReset();
    listConversationMessages.mockReset();
    vi.spyOn(ancestorContext, "resolveAncestorContext").mockRestore();
  });

  it("returns Root-only breadcrumb for a direct child of Root", async () => {
    resolveTopicPlanningConversation.mockResolvedValue({
      world,
      node: topicNode,
      conversation: null,
    });
    listWorldNodesForAncestorContext.mockResolvedValue([
      rootWorldNode,
      {
        id: nodeId,
        parent_id: rootNodeId,
        kind: "topic",
        title: "Current Topic",
        description: "Current description",
        goal: "Current goal",
      },
    ]);

    const result = await loadTopicPlanningPageData(worldId, nodeId);

    expect(result.breadcrumbTitles).toEqual(["Root Title"]);
    expect(result.planningBlocked).toBe(false);
    expect(result.blockedMessage).toBeNull();
    expect(listConversationMessages).not.toHaveBeenCalled();
  });

  it("returns breadcrumb order Root -> ancestor A -> ancestor B for deeper hierarchies", async () => {
    const deepTopicNode = {
      ...topicNode,
      parent_id: ancestorBNodeId,
    };

    resolveTopicPlanningConversation.mockResolvedValue({
      world,
      node: deepTopicNode,
      conversation: null,
    });
    listWorldNodesForAncestorContext.mockResolvedValue([
      rootWorldNode,
      {
        id: ancestorANodeId,
        parent_id: rootNodeId,
        kind: "topic",
        title: "Ancestor A",
        description: "",
        goal: "Ancestor A goal",
      },
      {
        id: ancestorBNodeId,
        parent_id: ancestorANodeId,
        kind: "topic",
        title: "Ancestor B",
        description: "",
        goal: "Ancestor B goal",
      },
      {
        id: nodeId,
        parent_id: ancestorBNodeId,
        kind: "topic",
        title: "Current Topic",
        description: "Current description",
        goal: "Current goal",
      },
    ]);

    const result = await loadTopicPlanningPageData(worldId, nodeId);

    expect(result.breadcrumbTitles).toEqual([
      "Root Title",
      "Ancestor A",
      "Ancestor B",
    ]);
  });

  it("loads persisted messages in ordinal order when a conversation exists", async () => {
    resolveTopicPlanningConversation.mockResolvedValue({
      world,
      node: topicNode,
      conversation,
    });
    listWorldNodesForAncestorContext.mockResolvedValue([
      rootWorldNode,
      {
        id: nodeId,
        parent_id: rootNodeId,
        kind: "topic",
        title: "Current Topic",
        description: "Current description",
        goal: "Current goal",
      },
    ]);
    listConversationMessages.mockResolvedValue([
      makeMessage({
        id: "m-1",
        role: "user",
        ordinal: 1,
        content: "First",
      }),
      makeMessage({
        id: "m-2",
        role: "assistant",
        ordinal: 2,
        content: "Second",
      }),
    ]);

    const result = await loadTopicPlanningPageData(worldId, nodeId);

    expect(listConversationMessages).toHaveBeenCalledTimes(1);
    expect(listConversationMessages).toHaveBeenCalledWith(conversationId);
    expect(result.initialMessages).toEqual([
      {
        id: "m-1",
        role: "user",
        content: "First",
        status: "complete",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "m-2",
        role: "assistant",
        content: "Second",
        status: "complete",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });

  it("returns empty initialMessages when no conversation exists", async () => {
    resolveTopicPlanningConversation.mockResolvedValue({
      world,
      node: topicNode,
      conversation: null,
    });
    listWorldNodesForAncestorContext.mockResolvedValue([
      rootWorldNode,
      {
        id: nodeId,
        parent_id: rootNodeId,
        kind: "topic",
        title: "Current Topic",
        description: "Current description",
        goal: "Current goal",
      },
    ]);

    const result = await loadTopicPlanningPageData(worldId, nodeId);

    expect(result.initialMessages).toEqual([]);
    expect(listConversationMessages).not.toHaveBeenCalled();
  });

  it("returns a blocked state when ancestry is corrupted but keeps persisted history", async () => {
    resolveTopicPlanningConversation.mockResolvedValue({
      world,
      node: topicNode,
      conversation,
    });
    listWorldNodesForAncestorContext.mockResolvedValue([
      {
        id: nodeId,
        parent_id: "missing-parent",
        kind: "topic",
        title: "Current Topic",
        description: "Current description",
        goal: "Current goal",
      },
    ]);
    listConversationMessages.mockResolvedValue([
      makeMessage({
        id: "m-user",
        role: "user",
        ordinal: 1,
        content: "Persisted user",
      }),
    ]);

    const result = await loadTopicPlanningPageData(worldId, nodeId);

    expect(result.planningBlocked).toBe(true);
    expect(result.blockedMessage).toBe(TOPIC_PLANNING_BLOCKED_MESSAGE);
    expect(result.breadcrumbTitles).toEqual([]);
    expect(result.initialMessages).toHaveLength(1);
    expect(result.initialMessages[0]?.content).toBe("Persisted user");
    expect(JSON.stringify(result)).not.toContain("missing_parent");
    expect(JSON.stringify(result)).not.toContain("missing-parent");
  });

  it("propagates DatabaseError from world-node loading", async () => {
    resolveTopicPlanningConversation.mockResolvedValue({
      world,
      node: topicNode,
      conversation: null,
    });
    listWorldNodesForAncestorContext.mockRejectedValue(
      new DatabaseError("nodes query failed"),
    );

    await expect(loadTopicPlanningPageData(worldId, nodeId)).rejects.toThrow(
      DatabaseError,
    );
  });

  it("propagates DatabaseError from message loading", async () => {
    resolveTopicPlanningConversation.mockResolvedValue({
      world,
      node: topicNode,
      conversation,
    });
    listWorldNodesForAncestorContext.mockResolvedValue([
      rootWorldNode,
      {
        id: nodeId,
        parent_id: rootNodeId,
        kind: "topic",
        title: "Current Topic",
        description: "Current description",
        goal: "Current goal",
      },
    ]);
    listConversationMessages.mockRejectedValue(
      new DatabaseError("messages query failed"),
    );

    await expect(loadTopicPlanningPageData(worldId, nodeId)).rejects.toThrow(
      DatabaseError,
    );
  });

  it("propagates resolver not-found errors for page-level notFound mapping", async () => {
    resolveTopicPlanningConversation.mockRejectedValue(
      new TopicPlanningNotFoundError("not_topic"),
    );

    await expect(loadTopicPlanningPageData(worldId, nodeId)).rejects.toBeInstanceOf(
      TopicPlanningNotFoundError,
    );
    expect(listWorldNodesForAncestorContext).not.toHaveBeenCalled();
  });

  it("invokes resolveAncestorContext once and does not perform a second Root lookup", async () => {
    const resolveAncestorContextSpy = vi.spyOn(
      ancestorContext,
      "resolveAncestorContext",
    );

    resolveTopicPlanningConversation.mockResolvedValue({
      world,
      node: topicNode,
      conversation: null,
    });
    listWorldNodesForAncestorContext.mockResolvedValue([
      rootWorldNode,
      {
        id: nodeId,
        parent_id: rootNodeId,
        kind: "topic",
        title: "Current Topic",
        description: "Current description",
        goal: "Current goal",
      },
    ]);

    await loadTopicPlanningPageData(worldId, nodeId);

    expect(resolveAncestorContextSpy).toHaveBeenCalledTimes(1);
    expect(resolveTopicPlanningConversation).toHaveBeenCalledTimes(1);
    expect(listWorldNodesForAncestorContext).toHaveBeenCalledTimes(1);
    expect(listWorldNodesForAncestorContext).toHaveBeenCalledWith(worldId);
  });

  it("does not mutate resolver inputs or loaded world nodes", async () => {
    const target = {
      world: { ...world },
      node: { ...topicNode },
      conversation: null,
    };
    const worldNodes = [
      { ...rootWorldNode },
      {
        id: nodeId,
        parent_id: rootNodeId,
        kind: "topic" as const,
        title: "Current Topic",
        description: "Current description",
        goal: "Current goal",
      },
    ];

    resolveTopicPlanningConversation.mockResolvedValue(target);
    listWorldNodesForAncestorContext.mockResolvedValue(worldNodes);

    await loadTopicPlanningPageData(worldId, nodeId);

    expect(target.node).toEqual(topicNode);
    expect(worldNodes[0]).toEqual(rootWorldNode);
  });
});
