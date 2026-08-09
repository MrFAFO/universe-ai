import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  beginPlanningChatAiRun,
  classifyPlanningChatAcquisitionError,
  classifyPlanningChatFinalizationError,
  completePlanningChatRun,
  PlanningRunInProgressError,
  PlanningRunOwnershipLostError,
} from "@/lib/db/planning-chat-runs";
import { DatabaseError } from "@/lib/db/errors";

const conversationId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const aiRunId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const messageId = "ffffffff-ffff-4fff-8fff-ffffffffffff";

const mockBeginRpc = vi.fn();
const mockCompleteRpc = vi.fn();

vi.mock("@/lib/db/rpc", () => ({
  beginPlanningChatAiRun: (...args: unknown[]) => mockBeginRpc(...args),
  completePlanningChatRun: (...args: unknown[]) => mockCompleteRpc(...args),
}));

describe("classifyPlanningChatAcquisitionError", () => {
  it("maps explicit planning_run_in_progress RPC messages", () => {
    expect(() =>
      classifyPlanningChatAcquisitionError({
        message: "planning_run_in_progress",
      }),
    ).toThrow(PlanningRunInProgressError);
  });

  it("maps PostgreSQL 23505 for the planning-chat index in message to PlanningRunInProgressError", () => {
    expect(() =>
      classifyPlanningChatAcquisitionError({
        message:
          'duplicate key value violates unique constraint "ai_runs_one_running_planning_chat_per_conversation_idx"',
        code: "23505",
      }),
    ).toThrow(PlanningRunInProgressError);
  });

  it("maps PostgreSQL 23505 for the planning-chat index in details to PlanningRunInProgressError", () => {
    expect(() =>
      classifyPlanningChatAcquisitionError({
        message: "duplicate key value violates unique constraint",
        details:
          'Key (conversation_id)=(cccccccc-cccc-4ccc-8ccc-cccccccccccc) already exists on index "ai_runs_one_running_planning_chat_per_conversation_idx".',
        code: "23505",
      }),
    ).toThrow(PlanningRunInProgressError);
  });

  it("maps PostgreSQL 23505 for another unique constraint to DatabaseError", () => {
    expect(() =>
      classifyPlanningChatAcquisitionError({
        message:
          'duplicate key value violates unique constraint "some_other_unique_idx"',
        code: "23505",
      }),
    ).toThrow(DatabaseError);
  });

  it("maps unrelated database failures to DatabaseError", () => {
    expect(() =>
      classifyPlanningChatAcquisitionError({
        message: "connection failed",
        code: "08006",
      }),
    ).toThrow(DatabaseError);
  });

  it("does not classify PlanningRunInProgressError as DatabaseError", () => {
    const error = new PlanningRunInProgressError();
    expect(error).not.toBeInstanceOf(DatabaseError);
    expect(error.message).toBe("planning_run_in_progress");
  });
});

describe("classifyPlanningChatFinalizationError", () => {
  it("maps explicit planning_run_not_active RPC messages", () => {
    expect(() =>
      classifyPlanningChatFinalizationError({
        message: "planning_run_not_active",
      }),
    ).toThrow(PlanningRunOwnershipLostError);
  });

  it("maps unrelated database failures to DatabaseError", () => {
    expect(() =>
      classifyPlanningChatFinalizationError({
        message: "connection failed",
        code: "08006",
      }),
    ).toThrow(DatabaseError);
  });

  it("does not classify PlanningRunOwnershipLostError as DatabaseError", () => {
    const error = new PlanningRunOwnershipLostError();
    expect(error).not.toBeInstanceOf(DatabaseError);
    expect(error.message).toBe("planning_run_not_active");
  });

  it("does not leak raw SQL text through typed ownership errors", () => {
    try {
      classifyPlanningChatFinalizationError({
        message: "planning_run_not_active",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(PlanningRunOwnershipLostError);
      expect((error as Error).message).toBe("planning_run_not_active");
      expect((error as Error).message).not.toContain("SELECT");
      expect((error as Error).message).not.toContain("FOR UPDATE");
    }
  });
});

describe("beginPlanningChatAiRun", () => {
  beforeEach(() => {
    mockBeginRpc.mockReset();
  });

  it("calls the acquisition RPC with conversation id and model", async () => {
    mockBeginRpc.mockResolvedValue({ id: aiRunId });

    const result = await beginPlanningChatAiRun({
      conversationId,
      model: "gpt-test",
    });

    expect(mockBeginRpc).toHaveBeenCalledWith({
      conversationId,
      model: "gpt-test",
    });
    expect(result).toEqual({ id: aiRunId });
  });

  it("classifies planning_run_in_progress from the RPC layer", async () => {
    mockBeginRpc.mockRejectedValue({
      message: "planning_run_in_progress",
    });

    await expect(
      beginPlanningChatAiRun({
        conversationId,
        model: "gpt-test",
      }),
    ).rejects.toThrow(PlanningRunInProgressError);
  });

  it("classifies the planning-chat unique index violation from the RPC layer", async () => {
    mockBeginRpc.mockRejectedValue({
      message:
        'duplicate key value violates unique constraint "ai_runs_one_running_planning_chat_per_conversation_idx"',
      code: "23505",
    });

    await expect(
      beginPlanningChatAiRun({
        conversationId,
        model: "gpt-test",
      }),
    ).rejects.toThrow(PlanningRunInProgressError);
  });

  it("surfaces unknown database failures as DatabaseError", async () => {
    mockBeginRpc.mockRejectedValue({
      message: "connection failed",
      code: "08006",
    });

    await expect(
      beginPlanningChatAiRun({
        conversationId,
        model: "gpt-test",
      }),
    ).rejects.toThrow(DatabaseError);
  });

  it("does not leak raw RPC messages through PlanningRunInProgressError", async () => {
    mockBeginRpc.mockRejectedValue({
      message: "planning_run_in_progress",
      details: "internal advisory lock detail",
    });

    await expect(
      beginPlanningChatAiRun({
        conversationId,
        model: "gpt-test",
      }),
    ).rejects.toMatchObject({
      message: "planning_run_in_progress",
    });
  });
});

describe("completePlanningChatRun", () => {
  beforeEach(() => {
    mockCompleteRpc.mockReset();
  });

  it("calls the finalization RPC with the approved parameter mapping", async () => {
    mockCompleteRpc.mockResolvedValue({ messageId });

    const result = await completePlanningChatRun({
      aiRunId,
      conversationId,
      content: "Assistant reply",
      openaiResponseId: "resp-123",
      inputTokens: 10,
      outputTokens: 20,
    });

    expect(mockCompleteRpc).toHaveBeenCalledWith({
      aiRunId,
      conversationId,
      content: "Assistant reply",
      openaiResponseId: "resp-123",
      inputTokens: 10,
      outputTokens: 20,
    });
    expect(result).toEqual({ messageId });
  });

  it("classifies planning_run_not_active from the RPC layer", async () => {
    mockCompleteRpc.mockRejectedValue({
      message: "planning_run_not_active",
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
    ).rejects.toThrow(PlanningRunOwnershipLostError);
  });

  it("surfaces unknown database failures as DatabaseError", async () => {
    mockCompleteRpc.mockRejectedValue({
      message: "connection failed",
      code: "08006",
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
    ).rejects.toThrow(DatabaseError);
  });
});
