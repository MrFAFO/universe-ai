import { describe, expect, it } from "vitest";
import {
  RootPlanningNotFoundError,
  verifyRootPlanningTarget,
} from "@/lib/db/chat";
import type { DbConversation, DbNode, DbWorld } from "@/types/db";

const worldId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const nodeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const conversationId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const otherWorldId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

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
  id: nodeId,
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

const baseConversation: DbConversation = {
  id: conversationId,
  world_id: worldId,
  node_id: nodeId,
  kind: "planning",
  title: "",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("verifyRootPlanningTarget", () => {
  it("accepts a valid root planning target", () => {
    const result = verifyRootPlanningTarget({
      world: baseWorld,
      node: baseRootNode,
      conversation: baseConversation,
    });

    expect(result.world.id).toBe(worldId);
    expect(result.node.id).toBe(nodeId);
    expect(result.conversation.id).toBe(conversationId);
  });

  it("rejects a missing world", () => {
    expect(() =>
      verifyRootPlanningTarget({
        world: null,
        node: baseRootNode,
        conversation: baseConversation,
      }),
    ).toThrow(RootPlanningNotFoundError);

    try {
      verifyRootPlanningTarget({
        world: null,
        node: baseRootNode,
        conversation: baseConversation,
      });
    } catch (error) {
      expect(error).toMatchObject({ reason: "world" });
    }
  });

  it("rejects a missing node", () => {
    try {
      verifyRootPlanningTarget({
        world: baseWorld,
        node: null,
        conversation: baseConversation,
      });
    } catch (error) {
      expect(error).toMatchObject({ reason: "node" });
    }
  });

  it("rejects a node from another world", () => {
    try {
      verifyRootPlanningTarget({
        world: baseWorld,
        node: { ...baseRootNode, world_id: otherWorldId },
        conversation: baseConversation,
      });
    } catch (error) {
      expect(error).toMatchObject({ reason: "node_world_mismatch" });
    }
  });

  it("rejects a non-root node", () => {
    try {
      verifyRootPlanningTarget({
        world: baseWorld,
        node: {
          ...baseRootNode,
          kind: "topic",
          parent_id: nodeId,
        },
        conversation: baseConversation,
      });
    } catch (error) {
      expect(error).toMatchObject({ reason: "not_root" });
    }
  });

  it("rejects a non-planning conversation", () => {
    try {
      verifyRootPlanningTarget({
        world: baseWorld,
        node: baseRootNode,
        conversation: { ...baseConversation, kind: "execution" },
      });
    } catch (error) {
      expect(error).toMatchObject({ reason: "conversation" });
    }
  });

  it("rejects a conversation linked to a different node", () => {
    try {
      verifyRootPlanningTarget({
        world: baseWorld,
        node: baseRootNode,
        conversation: {
          ...baseConversation,
          node_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        },
      });
    } catch (error) {
      expect(error).toMatchObject({ reason: "conversation" });
    }
  });
});
