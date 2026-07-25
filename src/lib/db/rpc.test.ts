import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BranchSuggestionV1 } from "@/lib/ai/branch-suggestion";
import { replacePendingBranchSuggestion } from "@/lib/db/rpc";
import { DatabaseError } from "@/lib/db/errors";
import type { DbBranchSuggestion } from "@/types/db";

const conversationId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const aiRunId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const worldId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const parentNodeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const suggestionId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const validPayload: BranchSuggestionV1 = {
  schemaVersion: 1,
  rationale: "Split the work into focused areas.",
  nodes: [
    {
      title: "Context",
      description: "Memory and context building",
      goal: "Define context strategy",
    },
  ],
};

const mockRpc = vi.fn();

vi.mock("@/lib/db/client", () => ({
  createSupabaseServerClient: () => ({
    rpc: mockRpc,
  }),
}));

describe("replacePendingBranchSuggestion RPC wrapper", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it("maps arguments to the Supabase RPC parameter names", async () => {
    const row: DbBranchSuggestion = {
      id: suggestionId,
      world_id: worldId,
      conversation_id: conversationId,
      parent_node_id: parentNodeId,
      ai_run_id: aiRunId,
      status: "pending",
      schema_version: 1,
      payload: validPayload,
      created_node_ids: null,
      created_at: "2026-01-01T00:00:00.000Z",
      decided_at: null,
    };
    mockRpc.mockResolvedValue({ data: row, error: null });

    const result = await replacePendingBranchSuggestion({
      conversationId,
      aiRunId,
      schemaVersion: 1,
      payload: validPayload,
    });

    expect(mockRpc).toHaveBeenCalledWith("replace_pending_branch_suggestion", {
      p_conversation_id: conversationId,
      p_ai_run_id: aiRunId,
      p_schema_version: 1,
      p_payload: validPayload,
    });
    expect(result).toEqual(row);
  });

  it("parses and returns the inserted row from RPC JSONB", async () => {
    const row = {
      id: suggestionId,
      world_id: worldId,
      conversation_id: conversationId,
      parent_node_id: parentNodeId,
      ai_run_id: aiRunId,
      status: "pending",
      schema_version: 1,
      payload: validPayload,
      created_node_ids: null,
      created_at: "2026-01-01T00:00:02.000Z",
      decided_at: null,
    };
    mockRpc.mockResolvedValue({ data: row, error: null });

    const result = await replacePendingBranchSuggestion({
      conversationId,
      aiRunId,
      schemaVersion: 1,
      payload: validPayload,
    });

    expect(result.created_at).toBe("2026-01-01T00:00:02.000Z");
    expect(result.status).toBe("pending");
  });

  it("rethrows Supabase RPC errors for upstream classification", async () => {
    const rpcError = {
      message: "structure_already_exists",
      code: "P0001",
    };
    mockRpc.mockResolvedValue({ data: null, error: rpcError });

    await expect(
      replacePendingBranchSuggestion({
        conversationId,
        aiRunId,
        schemaVersion: 1,
        payload: validPayload,
      }),
    ).rejects.toEqual(rpcError);
  });

  it("throws DatabaseError when RPC returns no data", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await expect(
      replacePendingBranchSuggestion({
        conversationId,
        aiRunId,
        schemaVersion: 1,
        payload: validPayload,
      }),
    ).rejects.toThrow(DatabaseError);
  });
});
