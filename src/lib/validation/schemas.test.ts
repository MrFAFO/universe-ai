import { describe, expect, it } from "vitest";
import {
  approveBranchSuggestionResultSchema,
  approveSuggestionInputSchema,
  branchSuggestionPayloadSchema,
  createWorldInputSchema,
  createWorldWithRootResultSchema,
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

describe("branchSuggestionPayloadSchema", () => {
  it("accepts a valid suggestion payload", () => {
    const result = branchSuggestionPayloadSchema.parse({
      rationale: "Split the work into focused areas.",
      nodes: [
        {
          title: "Context",
          description: "Memory and context building",
          goal: "Define context strategy",
        },
      ],
    });

    expect(result.nodes).toHaveLength(1);
  });

  it("rejects empty node lists", () => {
    expect(() =>
      branchSuggestionPayloadSchema.parse({
        nodes: [],
      }),
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
