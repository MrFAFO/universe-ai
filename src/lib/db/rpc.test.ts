import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BranchSuggestionV1 } from "@/lib/ai/branch-suggestion";
import { replacePendingBranchSuggestion, beginBranchSuggestionAiRun, beginPlanningChatAiRun, completePlanningChatRun, approveBranchSuggestion, rejectBranchSuggestion } from "@/lib/db/rpc";
import { DatabaseError } from "@/lib/db/errors";
import type { DbBranchSuggestion } from "@/types/db";

const conversationId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const aiRunId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const worldId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const parentNodeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const suggestionId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const messageId = "ffffffff-ffff-4fff-8fff-ffffffffffff";

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

describe("beginBranchSuggestionAiRun RPC wrapper", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it("maps arguments to the Supabase RPC parameter names", async () => {
    mockRpc.mockResolvedValue({
      data: {
        id: aiRunId,
        conversation_id: conversationId,
        model: "gpt-test",
        status: "running",
      },
      error: null,
    });

    const result = await beginBranchSuggestionAiRun({
      conversationId,
      model: "gpt-test",
      schemaVersion: 1,
    });

    expect(mockRpc).toHaveBeenCalledWith("begin_branch_suggestion_ai_run", {
      p_conversation_id: conversationId,
      p_model: "gpt-test",
      p_schema_version: 1,
    });
    expect(result).toEqual({ id: aiRunId });
  });

  it("parses a valid id from the RPC JSONB row", async () => {
    mockRpc.mockResolvedValue({
      data: {
        id: aiRunId,
        conversation_id: conversationId,
        model: "gpt-test",
        status: "running",
        metadata: { purpose: "branch_suggestion", schemaVersion: 1 },
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });

    const result = await beginBranchSuggestionAiRun({
      conversationId,
      model: "gpt-test",
      schemaVersion: 1,
    });

    expect(result.id).toBe(aiRunId);
  });

  it("rejects a non-UUID id in the RPC result", async () => {
    mockRpc.mockResolvedValue({
      data: { id: "not-a-uuid" },
      error: null,
    });

    await expect(
      beginBranchSuggestionAiRun({
        conversationId,
        model: "gpt-test",
        schemaVersion: 1,
      }),
    ).rejects.toThrow();
  });

  it("rethrows Supabase RPC errors for upstream classification", async () => {
    const rpcError = {
      message: "generation_in_progress",
      code: "P0001",
    };
    mockRpc.mockResolvedValue({ data: null, error: rpcError });

    await expect(
      beginBranchSuggestionAiRun({
        conversationId,
        model: "gpt-test",
        schemaVersion: 1,
      }),
    ).rejects.toEqual(rpcError);
  });

  it("throws DatabaseError when RPC returns no data", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await expect(
      beginBranchSuggestionAiRun({
        conversationId,
        model: "gpt-test",
        schemaVersion: 1,
      }),
    ).rejects.toThrow(DatabaseError);
  });
});

describe("beginPlanningChatAiRun RPC wrapper", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it("maps arguments to the Supabase RPC parameter names", async () => {
    mockRpc.mockResolvedValue({
      data: {
        id: aiRunId,
        conversation_id: conversationId,
        model: "gpt-test",
        status: "running",
        metadata: { purpose: "planning_chat" },
      },
      error: null,
    });

    const result = await beginPlanningChatAiRun({
      conversationId,
      model: "gpt-test",
    });

    expect(mockRpc).toHaveBeenCalledWith("begin_planning_chat_ai_run", {
      p_conversation_id: conversationId,
      p_model: "gpt-test",
    });
    expect(result).toEqual({ id: aiRunId });
  });

  it("parses a valid id from the RPC JSONB row", async () => {
    mockRpc.mockResolvedValue({
      data: {
        id: aiRunId,
        conversation_id: conversationId,
        model: "gpt-test",
        status: "running",
        metadata: { purpose: "planning_chat" },
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });

    const result = await beginPlanningChatAiRun({
      conversationId,
      model: "gpt-test",
    });

    expect(result.id).toBe(aiRunId);
  });

  it("rejects a non-UUID id in the RPC result", async () => {
    mockRpc.mockResolvedValue({
      data: { id: "not-a-uuid" },
      error: null,
    });

    await expect(
      beginPlanningChatAiRun({
        conversationId,
        model: "gpt-test",
      }),
    ).rejects.toThrow();
  });

  it("rethrows Supabase RPC errors for upstream classification", async () => {
    const rpcError = {
      message: "planning_run_in_progress",
      code: "P0001",
    };
    mockRpc.mockResolvedValue({ data: null, error: rpcError });

    await expect(
      beginPlanningChatAiRun({
        conversationId,
        model: "gpt-test",
      }),
    ).rejects.toEqual(rpcError);
  });

  it("throws DatabaseError when RPC returns no data", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await expect(
      beginPlanningChatAiRun({
        conversationId,
        model: "gpt-test",
      }),
    ).rejects.toThrow(DatabaseError);
  });
});

describe("completePlanningChatRun RPC wrapper", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it("maps arguments to the Supabase RPC parameter names", async () => {
    mockRpc.mockResolvedValue({
      data: {
        id: messageId,
        conversation_id: conversationId,
        role: "assistant",
        content: "Assistant reply",
        ai_run_id: aiRunId,
        ordinal: 1,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });

    const result = await completePlanningChatRun({
      aiRunId,
      conversationId,
      content: "Assistant reply",
      openaiResponseId: "resp-123",
      inputTokens: 10,
      outputTokens: 20,
    });

    expect(mockRpc).toHaveBeenCalledWith("complete_planning_chat_ai_run", {
      p_ai_run_id: aiRunId,
      p_conversation_id: conversationId,
      p_content: "Assistant reply",
      p_openai_response_id: "resp-123",
      p_input_tokens: 10,
      p_output_tokens: 20,
    });
    expect(result).toEqual({ messageId });
  });

  it("parses a valid message id from the RPC JSONB row", async () => {
    mockRpc.mockResolvedValue({
      data: {
        id: messageId,
        conversation_id: conversationId,
        role: "assistant",
        content: "Assistant reply",
        ai_run_id: aiRunId,
        ordinal: 2,
        created_at: "2026-01-01T00:00:01.000Z",
      },
      error: null,
    });

    const result = await completePlanningChatRun({
      aiRunId,
      conversationId,
      content: "Assistant reply",
      openaiResponseId: null,
      inputTokens: null,
      outputTokens: null,
    });

    expect(result.messageId).toBe(messageId);
  });

  it("rejects a non-UUID message id in the RPC result", async () => {
    mockRpc.mockResolvedValue({
      data: { id: "not-a-uuid" },
      error: null,
    });

    await expect(
      completePlanningChatRun({
        aiRunId,
        conversationId,
        content: "Assistant reply",
        openaiResponseId: null,
        inputTokens: null,
        outputTokens: null,
      }),
    ).rejects.toThrow();
  });

  it("rethrows Supabase RPC errors for upstream classification", async () => {
    const rpcError = {
      message: "planning_run_not_active",
      code: "P0001",
    };
    mockRpc.mockResolvedValue({ data: null, error: rpcError });

    await expect(
      completePlanningChatRun({
        aiRunId,
        conversationId,
        content: "Assistant reply",
        openaiResponseId: null,
        inputTokens: null,
        outputTokens: null,
      }),
    ).rejects.toEqual(rpcError);
  });

  it("throws DatabaseError when RPC returns no data", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await expect(
      completePlanningChatRun({
        aiRunId,
        conversationId,
        content: "Assistant reply",
        openaiResponseId: null,
        inputTokens: null,
        outputTokens: null,
      }),
    ).rejects.toThrow(DatabaseError);
  });
});

describe("approveBranchSuggestion RPC wrapper", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it("maps arguments to the Supabase RPC parameter names", async () => {
    mockRpc.mockResolvedValue({
      data: {
        suggestion_id: suggestionId,
        status: "approved",
        created_node_ids: [parentNodeId],
        idempotent: false,
      },
      error: null,
    });

    await approveBranchSuggestion({ suggestionId });

    expect(mockRpc).toHaveBeenCalledWith("approve_branch_suggestion", {
      p_suggestion_id: suggestionId,
    });
  });

  it("parses a valid approval result from RPC JSONB", async () => {
    mockRpc.mockResolvedValue({
      data: {
        suggestion_id: suggestionId,
        status: "approved",
        created_node_ids: [parentNodeId],
        idempotent: true,
      },
      error: null,
    });

    const result = await approveBranchSuggestion({ suggestionId });

    expect(result).toEqual({
      suggestion_id: suggestionId,
      status: "approved",
      created_node_ids: [parentNodeId],
      idempotent: true,
    });
  });

  it("rejects malformed approval RPC data", async () => {
    mockRpc.mockResolvedValue({
      data: { suggestion_id: suggestionId, status: "approved" },
      error: null,
    });

    await expect(approveBranchSuggestion({ suggestionId })).rejects.toThrow();
  });

  it("rethrows Supabase RPC errors for upstream classification", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "Suggestion is not pending", code: "P0001" },
    });

    await expect(approveBranchSuggestion({ suggestionId })).rejects.toThrow(
      "Suggestion is not pending",
    );
  });
});

describe("rejectBranchSuggestion RPC wrapper", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it("maps arguments to the Supabase RPC parameter names", async () => {
    mockRpc.mockResolvedValue({
      data: {
        suggestion_id: suggestionId,
        status: "rejected",
        decided_at: "2026-01-02T00:00:00.000Z",
        idempotent: false,
      },
      error: null,
    });

    await rejectBranchSuggestion({ suggestionId });

    expect(mockRpc).toHaveBeenCalledWith("reject_branch_suggestion", {
      p_suggestion_id: suggestionId,
    });
  });

  it("parses a valid rejection result from RPC JSONB", async () => {
    mockRpc.mockResolvedValue({
      data: {
        suggestion_id: suggestionId,
        status: "rejected",
        decided_at: "2026-01-02T00:00:00.000Z",
        idempotent: false,
      },
      error: null,
    });

    const result = await rejectBranchSuggestion({ suggestionId });

    expect(result.decided_at).toBe("2026-01-02T00:00:00.000Z");
  });

  it("rejects malformed rejection RPC data", async () => {
    mockRpc.mockResolvedValue({
      data: { suggestion_id: suggestionId, status: "rejected" },
      error: null,
    });

    await expect(rejectBranchSuggestion({ suggestionId })).rejects.toThrow();
  });

  it("rethrows Supabase RPC errors for upstream classification", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "Suggestion not found", code: "P0001" },
    });

    await expect(rejectBranchSuggestion({ suggestionId })).rejects.toThrow(
      "Suggestion not found",
    );
  });
});
