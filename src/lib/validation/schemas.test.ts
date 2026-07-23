import { describe, expect, it } from "vitest";
import {
  approveBranchSuggestionResultSchema,
  approveSuggestionInputSchema,
  conversationIdParamSchema,
  createWorldInputSchema,
  createWorldWithRootResultSchema,
  nodeIdParamSchema,
  sendMessageInputSchema,
  worldIdParamSchema,
} from "@/lib/validation/schemas";

const suggestionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const worldId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const rootId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const conversationId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const nodeId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

describe("createWorldInputSchema", () => {
  it("accepts a trimmed world name and default description", () => {
    const result = createWorldInputSchema.parse({ name: "  My World  " });
    expect(result).toEqual({ name: "My World", description: "" });
  });

  it("rejects blank names", () => {
    expect(() => createWorldInputSchema.parse({ name: "   " })).toThrow();
  });
});

describe("approveSuggestionInputSchema", () => {
  it("accepts a suggestion id", () => {
    const result = approveSuggestionInputSchema.parse({ suggestionId });
    expect(result.suggestionId).toBe(suggestionId);
  });
});

describe("worldIdParamSchema", () => {
  it("accepts a UUID world id", () => {
    expect(worldIdParamSchema.parse(worldId)).toBe(worldId);
  });

  it("rejects non-uuid ids", () => {
    expect(() => worldIdParamSchema.parse("universe-ai")).toThrow();
  });
});

describe("conversationIdParamSchema", () => {
  it("accepts a UUID conversation id", () => {
    expect(conversationIdParamSchema.parse(conversationId)).toBe(conversationId);
  });

  it("rejects non-uuid ids", () => {
    expect(() => conversationIdParamSchema.parse("conversation-1")).toThrow();
  });
});

describe("nodeIdParamSchema", () => {
  it("accepts a UUID node id", () => {
    expect(nodeIdParamSchema.parse(nodeId)).toBe(nodeId);
  });

  it("rejects non-uuid ids", () => {
    expect(() => nodeIdParamSchema.parse("root")).toThrow();
  });
});

describe("sendMessageInputSchema", () => {
  it("accepts trimmed message content", () => {
    const result = sendMessageInputSchema.parse({ content: "  Hello world  " });
    expect(result.content).toBe("Hello world");
  });

  it("rejects empty and whitespace-only content", () => {
    expect(() => sendMessageInputSchema.parse({ content: "" })).toThrow();
    expect(() => sendMessageInputSchema.parse({ content: "   " })).toThrow();
  });

  it("rejects content over 10,000 characters", () => {
    expect(() =>
      sendMessageInputSchema.parse({ content: "a".repeat(10_001) }),
    ).toThrow();
  });
});

describe("RPC result schemas", () => {
  it("parses create_world_with_root result", () => {
    const result = createWorldWithRootResultSchema.parse({
      world_id: worldId,
      root_node_id: rootId,
      conversation_id: conversationId,
    });

    expect(result.world_id).toBe(worldId);
  });

  it("parses approve_branch_suggestion result", () => {
    const result = approveBranchSuggestionResultSchema.parse({
      suggestion_id: suggestionId,
      status: "approved",
      created_node_ids: [nodeId],
      idempotent: false,
    });

    expect(result.created_node_ids).toEqual([nodeId]);
  });
});
