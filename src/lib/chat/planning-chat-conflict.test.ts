import { describe, expect, it } from "vitest";
import {
  extractPlanningChatConflictMessage,
  isPlanningChatConflictPayload,
  parsePlanningChatConflictResponse,
  PLANNING_CHAT_CONFLICT_CODE,
  PLANNING_CHAT_CONFLICT_MESSAGES,
  readPlanningChatConflictMessage,
} from "@/lib/chat/planning-chat-conflict";

describe("planning chat conflict contract", () => {
  const validPayload = {
    error: PLANNING_CHAT_CONFLICT_MESSAGES.planning_run_in_progress,
    code: PLANNING_CHAT_CONFLICT_CODE,
  };

  it("recognizes a valid planning conflict payload", () => {
    expect(parsePlanningChatConflictResponse(validPayload)).toEqual(validPayload);
    expect(isPlanningChatConflictPayload(validPayload)).toBe(true);
    expect(extractPlanningChatConflictMessage(validPayload)).toBe(
      PLANNING_CHAT_CONFLICT_MESSAGES.planning_run_in_progress,
    );
  });

  it("rejects payloads with the wrong conflict code", () => {
    expect(
      parsePlanningChatConflictResponse({
        error: "Some other conflict",
        code: "generation_in_progress",
      }),
    ).toBeNull();
    expect(
      isPlanningChatConflictPayload({
        error: "Some other conflict",
        code: "generation_in_progress",
      }),
    ).toBe(false);
    expect(
      extractPlanningChatConflictMessage({
        error: "Some other conflict",
        code: "generation_in_progress",
      }),
    ).toBeNull();
  });

  it("rejects malformed or unknown payloads", () => {
    expect(parsePlanningChatConflictResponse(null)).toBeNull();
    expect(parsePlanningChatConflictResponse({ code: PLANNING_CHAT_CONFLICT_CODE })).toBeNull();
    expect(parsePlanningChatConflictResponse("planning_run_in_progress")).toBeNull();
    expect(
      extractPlanningChatConflictMessage({
        error: "raw provider secret",
        code: "provider_error",
      }),
    ).toBeNull();
  });

  it("reads a stable conflict message from a 409 response body", async () => {
    const response = new Response(JSON.stringify(validPayload), {
      status: 409,
    });

    await expect(
      readPlanningChatConflictMessage(response, "fallback"),
    ).resolves.toBe(PLANNING_CHAT_CONFLICT_MESSAGES.planning_run_in_progress);
  });

  it("falls back when the response body is not a planning conflict payload", async () => {
    const response = new Response(
      JSON.stringify({ error: "database unavailable", code: "persistence_error" }),
      { status: 409 },
    );

    await expect(
      readPlanningChatConflictMessage(response, "fallback"),
    ).resolves.toBe("fallback");
  });
});
