import { describe, expect, it } from "vitest";
import {
  appendRootPlanningMessageDeduped,
  mapDbMessagesToRootPlanningChatMessages,
} from "@/lib/chat/root-planning-messages";
import type { DbMessage } from "@/types/db";

const conversationId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function makeDbMessage(overrides: Partial<DbMessage> = {}): DbMessage {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    conversation_id: conversationId,
    role: "user",
    content: "Hello",
    ai_run_id: null,
    ordinal: 1,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("mapDbMessagesToRootPlanningChatMessages", () => {
  it("maps persisted created_at to createdAt for visible roles", () => {
    const messages = mapDbMessagesToRootPlanningChatMessages([
      makeDbMessage({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        role: "user",
        created_at: "2026-01-01T10:00:00.000Z",
      }),
      makeDbMessage({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        role: "assistant",
        created_at: "2026-01-01T10:01:00.000Z",
      }),
    ]);

    expect(messages).toEqual([
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        role: "user",
        content: "Hello",
        status: "complete",
        createdAt: "2026-01-01T10:00:00.000Z",
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        role: "assistant",
        content: "Hello",
        status: "complete",
        createdAt: "2026-01-01T10:01:00.000Z",
      },
    ]);
  });

  it("filters out non-visible message roles", () => {
    const messages = mapDbMessagesToRootPlanningChatMessages([
      makeDbMessage({ role: "system" }),
      makeDbMessage({ role: "tool" }),
      makeDbMessage({
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        role: "user",
      }),
    ]);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.role).toBe("user");
  });
});

describe("appendRootPlanningMessageDeduped", () => {
  it("appends a Discovery message once", () => {
    const existing = [
      {
        id: "msg-1",
        role: "user" as const,
        content: "hi",
        status: "complete" as const,
        createdAt: "2026-01-01T10:00:00.000Z",
      },
    ];
    const discovery = {
      id: "msg-2",
      role: "assistant" as const,
      content: "Question?",
      status: "complete" as const,
      createdAt: "2026-01-01T11:00:00.000Z",
    };

    expect(appendRootPlanningMessageDeduped(existing, discovery)).toEqual([
      ...existing,
      discovery,
    ]);
  });

  it("ignores duplicate Discovery message IDs", () => {
    const existing = [
      {
        id: "msg-2",
        role: "assistant" as const,
        content: "Question?",
        status: "complete" as const,
        createdAt: "2026-01-01T11:00:00.000Z",
      },
    ];
    const duplicate = { ...existing[0]! };

    expect(appendRootPlanningMessageDeduped(existing, duplicate)).toEqual(existing);
    expect(appendRootPlanningMessageDeduped(existing, duplicate)).not.toBe(existing);
  });
});
