import type { ResponseInput } from "openai/resources/responses/responses";
import type { ResponseStreamEvent } from "openai/resources/responses/responses";
import { describe, expect, it, vi } from "vitest";
import { AncestorChainError } from "@/lib/ai/ancestor-context";
import { PUBLIC_CHAT_STREAM_ERROR_MESSAGE } from "@/lib/ai/stream-protocol";
import { TopicBriefTooLargeError } from "@/lib/ai/topic-prompt";
import { DatabaseError } from "@/lib/db/errors";
import {
  PlanningRunInProgressError,
  PlanningRunOwnershipLostError,
} from "@/lib/db/planning-chat-runs";
import {
  createPlanningChatStream,
  type PlanningChatStreamDeps,
} from "@/server/chat/planning-chat-stream";
import type { DbMessage } from "@/types/db";

const conversationId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const aiRunId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const messageId = "ffffffff-ffff-4fff-8fff-ffffffffffff";

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
  completedPlanningRuns: Array<{
    content: string;
    aiRunId: string;
    conversationId: string;
  }>;
} {
  const calls: string[] = [];
  const completedPlanningRuns: Array<{
    content: string;
    aiRunId: string;
    conversationId: string;
  }> = [];

  const deps: PlanningChatStreamDeps & {
    calls: string[];
    completedPlanningRuns: Array<{
      content: string;
      aiRunId: string;
      conversationId: string;
    }>;
  } = {
    calls,
    completedPlanningRuns,
    beginPlanningChatAiRun: vi.fn(async () => {
      calls.push("beginPlanningChatAiRun");
      return { id: aiRunId };
    }),
    insertUserMessage: vi.fn(async (_conversationId, content) => {
      calls.push("insertUser");
      return makeMessage({
        id: "m-user",
        role: "user",
        ordinal: 1,
        content,
      });
    }),
    completePlanningChatRun: vi.fn(async (input) => {
      calls.push("completePlanningChatRun");
      completedPlanningRuns.push({
        content: input.content,
        aiRunId: input.aiRunId,
        conversationId: input.conversationId,
      });
      return { messageId };
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
  it("acquires the planning run before user-message persistence and OpenAI", async () => {
    const order: string[] = [];
    const deps = createMockDeps({
      beginPlanningChatAiRun: vi.fn(async () => {
        order.push("beginPlanningChatAiRun");
        return { id: aiRunId };
      }),
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
      completePlanningChatRun: vi.fn(async () => {
        order.push("completePlanningChatRun");
        return { messageId };
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

    expect(order).toEqual([
      "getModel",
      "beginPlanningChatAiRun",
      "insertUser",
      "prepareInput",
      "createResponseStream",
      "completePlanningChatRun",
    ]);
    expect(prepareInputAfterUserInsert).toHaveBeenCalledTimes(1);
  });

  it("propagates acquisition conflict without persisting the user message or starting OpenAI", async () => {
    const deps = createMockDeps({
      beginPlanningChatAiRun: vi.fn(async () => {
        throw new PlanningRunInProgressError();
      }),
    });
    const prepareInputAfterUserInsert = vi.fn(async () => {
      return [{ role: "user", content: "Hello" }];
    });

    await expect(
      createPlanningChatStream(
        createRequest(prepareInputAfterUserInsert),
        deps,
      ),
    ).rejects.toThrow(PlanningRunInProgressError);

    expect(deps.insertUserMessage).not.toHaveBeenCalled();
    expect(prepareInputAfterUserInsert).not.toHaveBeenCalled();
    expect(deps.createResponseStream).not.toHaveBeenCalled();
    expect(deps.failAiRun).not.toHaveBeenCalled();
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

  it("finalizes through the fenced completion wrapper on success", async () => {
    const deps = createMockDeps();
    const stream = await createPlanningChatStream(
      createRequest(async () => [{ role: "user", content: "Hello" }]),
      deps,
    );
    const events = await readNdjsonStream(stream);

    expect(events.at(-1)).toMatchObject({
      type: "done",
      messageId,
      aiRunId,
      openaiResponseId: "resp_123",
    });
    expect(deps.completePlanningChatRun).toHaveBeenCalledTimes(1);
    expect(deps.completePlanningChatRun).toHaveBeenCalledWith({
      aiRunId,
      conversationId,
      content: "Hello",
      openaiResponseId: "resp_123",
      inputTokens: 12,
      outputTokens: 8,
    });
    expect(deps.completedPlanningRuns).toEqual([
      { content: "Hello", aiRunId, conversationId },
    ]);
    expect(deps.failAiRun).not.toHaveBeenCalled();
  });

  it("does not persist a stale assistant reply when fenced completion reports ownership loss", async () => {
    const deps = createMockDeps({
      completePlanningChatRun: vi.fn(async () => {
        throw new PlanningRunOwnershipLostError();
      }),
    });
    const stream = await createPlanningChatStream(
      createRequest(async () => [{ role: "user", content: "Hello" }]),
      deps,
    );
    const events = await readNdjsonStream(stream);

    expect(events).toEqual([
      { type: "delta", text: "Hello" },
      { type: "error", message: PUBLIC_CHAT_STREAM_ERROR_MESSAGE },
    ]);
    expect(deps.completePlanningChatRun).toHaveBeenCalledTimes(1);
    expect(deps.failAiRun).toHaveBeenCalledTimes(1);
    expect(events.some((event) => event.type === "done")).toBe(false);
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
    expect(deps.beginPlanningChatAiRun).toHaveBeenCalledTimes(1);
    expect(deps.failAiRun).toHaveBeenCalledTimes(1);
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
    expect(deps.beginPlanningChatAiRun).toHaveBeenCalledTimes(1);
    expect(deps.failAiRun).toHaveBeenCalledTimes(1);
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
    expect(deps.beginPlanningChatAiRun).toHaveBeenCalledTimes(1);
    expect(deps.failAiRun).toHaveBeenCalledTimes(1);
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
    expect(deps.beginPlanningChatAiRun).toHaveBeenCalledTimes(1);
    expect(deps.failAiRun).toHaveBeenCalledTimes(1);
    expect(deps.createResponseStream).not.toHaveBeenCalled();
  });

  it("fails the acquired run and rethrows when insertUserMessage fails", async () => {
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
    expect(deps.beginPlanningChatAiRun).toHaveBeenCalledTimes(1);
    expect(deps.failAiRun).toHaveBeenCalledTimes(1);
    expect(prepareInputAfterUserInsert).not.toHaveBeenCalled();
    expect(deps.createResponseStream).not.toHaveBeenCalled();
  });

  it("fails the acquired run and does not call OpenAI when acquisition fails", async () => {
    const deps = createMockDeps({
      beginPlanningChatAiRun: vi.fn(async () => {
        throw new DatabaseError("acquire failed");
      }),
    });

    await expect(
      createPlanningChatStream(
        createRequest(async () => [{ role: "user", content: "Hello" }]),
        deps,
      ),
    ).rejects.toThrow(DatabaseError);
    expect(deps.insertUserMessage).not.toHaveBeenCalled();
    expect(deps.createResponseStream).not.toHaveBeenCalled();
  });
});
