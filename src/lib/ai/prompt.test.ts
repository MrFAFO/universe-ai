import { describe, expect, it } from "vitest";
import {
  MAX_NON_SYSTEM_MESSAGES,
  SystemMessageCountError,
  ToolMessageNotSupportedError,
  buildResponsesInput,
} from "@/lib/ai/prompt";
import type { DbMessage } from "@/types/db";

const conversationId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

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

describe("buildResponsesInput", () => {
  it("sorts messages chronologically by ordinal", () => {
    const input = buildResponsesInput([
      makeMessage({ id: "m-3", role: "assistant", ordinal: 3, content: "Third" }),
      makeMessage({ id: "m-1", role: "system", ordinal: 1, content: "System" }),
      makeMessage({ id: "m-2", role: "user", ordinal: 2, content: "Second" }),
    ]);

    expect(input).toEqual([
      { role: "system", content: "System" },
      { role: "user", content: "Second" },
      { role: "assistant", content: "Third" },
    ]);
  });

  it("includes the persisted system message exactly once", () => {
    const input = buildResponsesInput([
      makeMessage({ id: "m-1", role: "system", ordinal: 1, content: "Root system" }),
      makeMessage({ id: "m-2", role: "user", ordinal: 2, content: "Hello" }),
    ]);

    const systemMessages = input.filter((item) => item.role === "system");
    expect(systemMessages).toHaveLength(1);
    expect(systemMessages[0]).toEqual({
      role: "system",
      content: "Root system",
    });
  });

  it("throws when no system message exists", () => {
    expect(() =>
      buildResponsesInput([
        makeMessage({ id: "m-1", role: "user", ordinal: 1, content: "Hello" }),
      ]),
    ).toThrow(SystemMessageCountError);

    expect(() =>
      buildResponsesInput([
        makeMessage({ id: "m-1", role: "user", ordinal: 1, content: "Hello" }),
      ]),
    ).toThrow(/Exactly one persisted system message is required, but none was found/);
  });

  it("throws when more than one system message exists", () => {
    expect(() =>
      buildResponsesInput([
        makeMessage({ id: "m-1", role: "system", ordinal: 1, content: "First" }),
        makeMessage({ id: "m-2", role: "system", ordinal: 2, content: "Second" }),
      ]),
    ).toThrow(SystemMessageCountError);

    expect(() =>
      buildResponsesInput([
        makeMessage({ id: "m-1", role: "system", ordinal: 1, content: "First" }),
        makeMessage({ id: "m-2", role: "system", ordinal: 2, content: "Second" }),
      ]),
    ).toThrow(/Exactly one persisted system message is required, but 2 were found/);
  });

  it("retains only the latest non-system messages when history exceeds the limit", () => {
    const messages: DbMessage[] = [
      makeMessage({ id: "m-system", role: "system", ordinal: 1, content: "System" }),
    ];

    for (let index = 0; index < MAX_NON_SYSTEM_MESSAGES + 5; index += 1) {
      messages.push(
        makeMessage({
          id: `m-${index}`,
          role: index % 2 === 0 ? "user" : "assistant",
          ordinal: index + 2,
          content: `Message ${index}`,
        }),
      );
    }

    const input = buildResponsesInput(messages);
    const nonSystem = input.filter((item) => item.role !== "system");

    expect(nonSystem).toHaveLength(MAX_NON_SYSTEM_MESSAGES);
    expect(nonSystem[0]).toEqual({ role: "assistant", content: "Message 5" });
    expect(nonSystem.at(-1)).toEqual({
      role: "user",
      content: `Message ${MAX_NON_SYSTEM_MESSAGES + 4}`,
    });
  });

  it("preserves chronological order after limiting non-system messages", () => {
    const messages: DbMessage[] = [
      makeMessage({ id: "m-system", role: "system", ordinal: 1, content: "System" }),
    ];

    for (let index = 0; index < MAX_NON_SYSTEM_MESSAGES + 3; index += 1) {
      messages.push(
        makeMessage({
          id: `m-${index}`,
          role: index % 2 === 0 ? "user" : "assistant",
          ordinal: index + 2,
          content: `Message ${index}`,
        }),
      );
    }

    const input = buildResponsesInput(messages);
    const roles = input.map((item) => item.role);

    expect(roles[0]).toBe("system");
    expect(roles.slice(1)).toEqual(
      Array.from({ length: MAX_NON_SYSTEM_MESSAGES }, (_, offset) => {
        const index = offset + 3;
        return index % 2 === 0 ? "user" : "assistant";
      }),
    );
  });

  it("rejects persisted tool messages with a clear error", () => {
    expect(() =>
      buildResponsesInput([
        makeMessage({ id: "m-tool", role: "tool", ordinal: 1, content: "tool output" }),
      ]),
    ).toThrow(ToolMessageNotSupportedError);

    expect(() =>
      buildResponsesInput([
        makeMessage({ id: "m-tool", role: "tool", ordinal: 1, content: "tool output" }),
      ]),
    ).toThrow(/Tool messages are not supported in Stage C chat/);
  });
});
