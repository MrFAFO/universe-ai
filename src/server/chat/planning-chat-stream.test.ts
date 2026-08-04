import type { ResponseInput } from "openai/resources/responses/responses";
import type { ResponseStreamEvent } from "openai/resources/responses/responses";
import { describe, expect, it, vi } from "vitest";
import { AncestorChainError } from "@/lib/ai/ancestor-context";
import { PUBLIC_CHAT_STREAM_ERROR_MESSAGE } from "@/lib/ai/stream-protocol";
import { TopicBriefTooLargeError } from "@/lib/ai/topic-prompt";
import { DatabaseError } from "@/lib/db/errors";
import {
  createPlanningChatStream,
  type PlanningChatStreamDeps,
} from "@/server/chat/planning-chat-stream";
import type { DbMessage } from "@/types/db";

const conversationId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const aiRunId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

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

async function readNdjsonStream(
  stream: ReadableStream<Uint8Array>,
): Promise<Array<Record<string, unknown>>> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const events: Array<Record<string, unknown>> = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.length > 0) {
        events.push(JSON.parse(line) as Record<string, unknown>);
      }
    }
  }

  if (buffer.length > 0) {
    events.push(JSON.parse(buffer) as Record<string, unknown>);
  }

  return events;
}

function makeCompletedEvent(outputText: string): ResponseStreamEvent {
  return {
    type: "response.completed",
    sequence_number: 2,
    response: {
      id: "resp_123",
      output_text: outputText,
      usage: {
        input_tokens: 12,
        output_tokens: 8,
      },
    },
  } as ResponseStreamEvent;
}

function createMockDeps(
  overrides: Partial<PlanningChatStreamDeps> = {},
): PlanningChatStreamDeps & {
  calls: string[];
} {
  const calls: string[] = [];

  const deps: PlanningChatStreamDeps & {
    calls: string[];
  } = {
    calls,
    insertUserMessage: vi.fn(async (_conversationId, content) => {
      calls.push("insertUser");
      return makeMessage({
        id: "m-user",
        role: "user",
        ordinal: 1,
        content,
      });
    }),
    insertAssistantMessage: vi.fn(async () => {
      calls.push("insertAssistant");
      return makeMessage({
        id: "m-assistant",
        role: "assistant",
        ordinal: 2,
        content: "Hello",
      });
    }),
    createAiRun: vi.fn(async () => {
      calls.push("createAiRun");
      return { id: aiRunId };
    }),
    completeAiRun: vi.fn(async () => {
      calls.push("completeAiRun");
    }),
    failAiRun: vi.fn(async () => {
      calls.push("failAiRun");
    }),
    getModel: vi.fn(() => {
      calls.push("getModel");
      return "gpt-test";
    }),
    createResponseStream: vi.fn(async () => {
      calls.push("createResponseStream");
      return (async function* () {
        yield {
          type: "response.output_text.delta",
          delta: "Hello",
          content_index: 0,
          item_id: "item_1",
          logprobs: [],
          output_index: 0,
          sequence_number: 1,
        } as ResponseStreamEvent;
        yield makeCompletedEvent("Hello");
      })();
    }),
    ...overrides,
  };

  return deps;
}

function createRequest(
  prepareInputAfterUserInsert: () => Promise<ResponseInput>,
): {
  conversationId: string;
  content: string;
  prepareInputAfterUserInsert: () => Promise<ResponseInput>;
} {
  return {
    conversationId,
    content: "Hello",
    prepareInputAfterUserInsert,
  };
}

describe("createPlanningChatStream", () => {
  it("follows the exact shared preparation order through createResponseStream", async () => {
    const order: string[] = [];
    const deps = createMockDeps({
      insertUserMessage: vi.fn(async () => {
        order.push("insertUser");
        return makeMessage({
          id: "m-user",
          role: "user",
          ordinal: 1,
          content: "Hello",
        });
      }),
      getModel: vi.fn(() => {
        order.push("getModel");
        return "gpt-test";
      }),
      createAiRun: vi.fn(async () => {
        order.push("createAiRun");
        return { id: aiRunId };
      }),
      createResponseStream: vi.fn(async () => {
        order.push("createResponseStream");
        return (async function* () {
          yield {
            type: "response.output_text.delta",
            delta: "Hello",
            content_index: 0,
            item_id: "item_1",
            logprobs: [],
            output_index: 0,
            sequence_number: 1,
          } as ResponseStreamEvent;
          yield makeCompletedEvent("Hello");
        })();
      }),
    });
    const prepareInputAfterUserInsert = vi.fn(async () => {
      order.push("prepareInput");
      return [{ role: "user", content: "Hello" }];
    });

    const stream = await createPlanningChatStream(
      createRequest(prepareInputAfterUserInsert),
      deps,
    );
    await readNdjsonStream(stream);

    expect(order.slice(0, 5)).toEqual([
      "insertUser",
      "prepareInput",
      "getModel",
      "createAiRun",
      "createResponseStream",
    ]);
    expect(prepareInputAfterUserInsert).toHaveBeenCalledTimes(1);
  });

  it("invokes prepareInputAfterUserInsert exactly once", async () => {
    const prepareInputAfterUserInsert = vi.fn(async () => {
      return [{ role: "user", content: "Hello" }];
    });
    const deps = createMockDeps();

    const stream = await createPlanningChatStream(
      createRequest(prepareInputAfterUserInsert),
      deps,
    );
    await readNdjsonStream(stream);

    expect(prepareInputAfterUserInsert).toHaveBeenCalledTimes(1);
  });

  it("passes user content once to insertUserMessage", async () => {
    const deps = createMockDeps();

    const stream = await createPlanningChatStream(
      createRequest(async () => [{ role: "user", content: "Hello" }]),
      deps,
    );
    await readNdjsonStream(stream);

    expect(deps.insertUserMessage).toHaveBeenCalledTimes(1);
    expect(deps.insertUserMessage).toHaveBeenCalledWith(conversationId, "Hello");
  });

  it("returns one standard error event when prepareInputAfterUserInsert throws DatabaseError", async () => {
    const deps = createMockDeps();

    const stream = await createPlanningChatStream(
      createRequest(async () => {
        throw new DatabaseError("query failed");
      }),
      deps,
    );
    const events = await readNdjsonStream(stream);

    expect(events).toEqual([
      { type: "error", message: PUBLIC_CHAT_STREAM_ERROR_MESSAGE },
    ]);
    expect(deps.createAiRun).not.toHaveBeenCalled();
    expect(deps.createResponseStream).not.toHaveBeenCalled();
  });

  it("returns one standard error event when prepareInputAfterUserInsert throws AncestorChainError", async () => {
    const deps = createMockDeps();

    const stream = await createPlanningChatStream(
      createRequest(async () => {
        throw new AncestorChainError("cycle");
      }),
      deps,
    );
    const events = await readNdjsonStream(stream);

    expect(events).toEqual([
      { type: "error", message: PUBLIC_CHAT_STREAM_ERROR_MESSAGE },
    ]);
    expect(deps.createAiRun).not.toHaveBeenCalled();
    expect(deps.createResponseStream).not.toHaveBeenCalled();
  });

  it("returns one standard error event when prepareInputAfterUserInsert throws TopicBriefTooLargeError", async () => {
    const deps = createMockDeps();

    const stream = await createPlanningChatStream(
      createRequest(async () => {
        throw new TopicBriefTooLargeError();
      }),
      deps,
    );
    const events = await readNdjsonStream(stream);

    expect(events).toEqual([
      { type: "error", message: PUBLIC_CHAT_STREAM_ERROR_MESSAGE },
    ]);
    expect(deps.createAiRun).not.toHaveBeenCalled();
    expect(deps.createResponseStream).not.toHaveBeenCalled();
  });

  it("rejects when prepareInputAfterUserInsert throws an unexpected error", async () => {
    const deps = createMockDeps();

    await expect(
      createPlanningChatStream(
        createRequest(async () => {
          throw new Error("unexpected");
        }),
        deps,
      ),
    ).rejects.toThrow("unexpected");
    expect(deps.createAiRun).not.toHaveBeenCalled();
    expect(deps.createResponseStream).not.toHaveBeenCalled();
  });

  it("rejects when insertUserMessage fails and does not invoke prepareInputAfterUserInsert", async () => {
    const prepareInputAfterUserInsert = vi.fn(async () => {
      return [{ role: "user", content: "Hello" }];
    });
    const deps = createMockDeps({
      insertUserMessage: vi.fn(async () => {
        throw new DatabaseError("insert failed");
      }),
    });

    await expect(
      createPlanningChatStream(
        createRequest(prepareInputAfterUserInsert),
        deps,
      ),
    ).rejects.toThrow(DatabaseError);
    expect(prepareInputAfterUserInsert).not.toHaveBeenCalled();
  });

  it("rejects when createAiRun fails and does not call OpenAI", async () => {
    const deps = createMockDeps({
      createAiRun: vi.fn(async () => {
        throw new DatabaseError("create ai run failed");
      }),
    });

    await expect(
      createPlanningChatStream(
        createRequest(async () => [{ role: "user", content: "Hello" }]),
        deps,
      ),
    ).rejects.toThrow(DatabaseError);
    expect(deps.createResponseStream).not.toHaveBeenCalled();
  });
});
