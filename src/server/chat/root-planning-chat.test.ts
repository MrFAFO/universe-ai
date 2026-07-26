import type { ResponseStreamEvent } from "openai/resources/responses/responses";
import { describe, expect, it, vi } from "vitest";
import { ROOT_PLANNING_SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { PUBLIC_CHAT_STREAM_ERROR_MESSAGE } from "@/lib/ai/stream-protocol";
import type { RootPlanningContext } from "@/lib/db/chat";
import { DatabaseError } from "@/lib/db/errors";
import {
  createRootPlanningChatStream,
  type RootPlanningChatDeps,
} from "@/server/chat/root-planning-chat";
import type { DbMessage } from "@/types/db";

const worldId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const nodeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const conversationId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const aiRunId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const context: RootPlanningContext = {
  world: {
    id: worldId,
    name: "Test World",
    description: "",
    status: "planning",
    owner_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  node: {
    id: nodeId,
    world_id: worldId,
    parent_id: null,
    kind: "root",
    title: "Root",
    description: "",
    goal: "",
    status: "planning",
    progress: 0,
    position_x: 0,
    position_y: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  conversation: {
    id: conversationId,
    world_id: worldId,
    node_id: nodeId,
    kind: "planning",
    title: "",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
};

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

function makeDeltaEvent(delta: string): ResponseStreamEvent {
  return {
    type: "response.output_text.delta",
    delta,
    content_index: 0,
    item_id: "item_1",
    logprobs: [],
    output_index: 0,
    sequence_number: 1,
  };
}

function makeCompletedEvent(
  outputText: string,
  responseId = "resp_123",
): ResponseStreamEvent {
  return {
    type: "response.completed",
    sequence_number: 2,
    response: {
      id: responseId,
      output_text: outputText,
      usage: {
        input_tokens: 12,
        output_tokens: 8,
      },
    },
  } as ResponseStreamEvent;
}

function createMockDeps(
  overrides: Partial<RootPlanningChatDeps> = {},
): RootPlanningChatDeps & {
  calls: string[];
  insertedAssistantMessages: Array<{ content: string; aiRunId: string }>;
  failSummaries: string[];
  completeCalls: number;
  createResponseStreamCalls: number;
} {
  const calls: string[] = [];
  const insertedAssistantMessages: Array<{ content: string; aiRunId: string }> =
    [];
  const failSummaries: string[] = [];
  let completeCalls = 0;
  let createResponseStreamCalls = 0;

  const baseMessages: DbMessage[] = [
    makeMessage({
      id: "m-system",
      role: "system",
      ordinal: 1,
      content: "System prompt",
    }),
  ];

  const deps: RootPlanningChatDeps & {
    calls: string[];
    insertedAssistantMessages: Array<{ content: string; aiRunId: string }>;
    failSummaries: string[];
    completeCalls: number;
    createResponseStreamCalls: number;
  } = {
    calls,
    insertedAssistantMessages,
    failSummaries,
    completeCalls,
    createResponseStreamCalls,
    resolveRootPlanningConversation: vi.fn(async () => {
      calls.push("resolve");
      return context;
    }),
    listConversationMessages: vi.fn(async () => {
      calls.push("list");
      return [
        ...baseMessages,
        makeMessage({
          id: "m-user",
          role: "user",
          ordinal: 2,
          content: "Hello",
        }),
      ];
    }),
    listWorldNodeTitles: vi.fn(async () => {
      calls.push("listWorldNodeTitles");
      return ["Context"];
    }),
    insertUserMessage: vi.fn(async (_conversationId, content) => {
      calls.push("insertUser");
      return makeMessage({
        id: "m-user",
        role: "user",
        ordinal: 2,
        content,
      });
    }),
    insertAssistantMessage: vi.fn(async (_conversationId, content, runId) => {
      calls.push("insertAssistant");
      insertedAssistantMessages.push({ content, aiRunId: runId });
      return makeMessage({
        id: "m-assistant",
        role: "assistant",
        ordinal: 3,
        content,
        ai_run_id: runId,
      });
    }),
    createAiRun: vi.fn(async () => {
      calls.push("createAiRun");
      return { id: aiRunId };
    }),
    completeAiRun: vi.fn(async () => {
      calls.push("completeAiRun");
      completeCalls += 1;
    }),
    failAiRun: vi.fn(async (_runId, summary) => {
      calls.push("failAiRun");
      failSummaries.push(summary);
    }),
    getModel: vi.fn(() => "gpt-test"),
    createResponseStream: vi.fn(async () => {
      calls.push("createResponseStream");
      createResponseStreamCalls += 1;
      return (async function* () {
        yield makeDeltaEvent("Hel");
        yield makeDeltaEvent("lo");
        yield makeCompletedEvent("Hello");
      })();
    }),
    ...overrides,
  };

  return deps;
}

describe("createRootPlanningChatStream", () => {
  it("persists the user message before OpenAI starts and reloads history", async () => {
    const deps = createMockDeps();
    const stream = await createRootPlanningChatStream(
      { worldId, nodeId, content: "Hello" },
      deps,
    );

    await readNdjsonStream(stream);

    expect(deps.calls.indexOf("insertUser")).toBeLessThan(
      deps.calls.indexOf("createResponseStream"),
    );
    expect(deps.calls.indexOf("list")).toBeGreaterThan(
      deps.calls.indexOf("insertUser"),
    );
    expect(deps.calls.indexOf("listWorldNodeTitles")).toBeGreaterThan(
      deps.calls.indexOf("insertUser"),
    );
    expect(deps.listConversationMessages).toHaveBeenCalledWith(conversationId);
    expect(deps.listWorldNodeTitles).toHaveBeenCalledWith(worldId);
    expect(deps.createResponseStream).toHaveBeenCalledTimes(1);
    expect(deps.insertUserMessage).toHaveBeenCalledTimes(1);
  });

  it("builds OpenAI input from the code-owned system prompt and World brief", async () => {
    const deps = createMockDeps();
    const stream = await createRootPlanningChatStream(
      { worldId, nodeId, content: "Hello" },
      deps,
    );

    await readNdjsonStream(stream);

    const call = vi.mocked(deps.createResponseStream).mock.calls[0]?.[0];
    expect(call?.input[0]).toMatchObject({ role: "system" });
    expect(call?.input[0]?.content).toContain(ROOT_PLANNING_SYSTEM_PROMPT);
    expect(call?.input[0]?.content).toContain('"worldName": "Test World"');
    expect(call?.input[0]?.content).toContain('"rootTitle": "Root"');
    expect(call?.input[0]?.content).toContain('"currentNodeTitles": [\n    "Context"\n  ]');
    expect(call?.input.map((item) => item.content)).not.toContain("System prompt");
    expect(call?.input.slice(1)).toEqual([
      { role: "user", content: "Hello" },
    ]);
  });

  it("does not create an ai_run when Node-title loading fails", async () => {
    const deps = createMockDeps({
      listWorldNodeTitles: vi.fn(async () => {
        throw new DatabaseError("node title query failed");
      }),
    });

    const stream = await createRootPlanningChatStream(
      { worldId, nodeId, content: "Hello" },
      deps,
    );
    const events = await readNdjsonStream(stream);

    expect(events).toEqual([
      { type: "error", message: PUBLIC_CHAT_STREAM_ERROR_MESSAGE },
    ]);
    expect(deps.createAiRun).not.toHaveBeenCalled();
    expect(deps.createResponseStream).not.toHaveBeenCalled();
  });

  it("streams ordered deltas, persists one assistant message, and completes the run once", async () => {
    const deps = createMockDeps();
    const stream = await createRootPlanningChatStream(
      { worldId, nodeId, content: "Hello" },
      deps,
    );

    const events = await readNdjsonStream(stream);

    expect(events.map((event) => event.type)).toEqual(["delta", "delta", "done"]);
    expect(events[0]).toEqual({ type: "delta", text: "Hel" });
    expect(events[1]).toEqual({ type: "delta", text: "lo" });
    expect(events[2]).toMatchObject({
      type: "done",
      messageId: "m-assistant",
      aiRunId,
      openaiResponseId: "resp_123",
    });
    expect(deps.insertedAssistantMessages).toEqual([
      { content: "Hello", aiRunId },
    ]);
    expect(deps.insertAssistantMessage).toHaveBeenCalledTimes(1);
    expect(deps.completeAiRun).toHaveBeenCalledTimes(1);
    expect(deps.failAiRun).not.toHaveBeenCalled();
  });

  it("does not persist partial assistant output when the provider fails", async () => {
    const deps = createMockDeps({
      createResponseStream: vi.fn(async () => {
        return (async function* () {
          yield makeDeltaEvent("Part");
          yield {
            type: "response.failed",
            sequence_number: 2,
            response: { id: "resp_failed" },
          } as ResponseStreamEvent;
        })();
      }),
    });

    const stream = await createRootPlanningChatStream(
      { worldId, nodeId, content: "Hello" },
      deps,
    );
    const events = await readNdjsonStream(stream);

    expect(events).toEqual([
      { type: "delta", text: "Part" },
      { type: "error", message: PUBLIC_CHAT_STREAM_ERROR_MESSAGE },
    ]);
    expect(deps.insertAssistantMessage).not.toHaveBeenCalled();
    expect(deps.completeAiRun).not.toHaveBeenCalled();
    expect(deps.failAiRun).toHaveBeenCalledTimes(1);
  });

  it("does not persist partial assistant output when aborted before completion", async () => {
    const controller = new AbortController();
    controller.abort();

    const deps = createMockDeps({
      createResponseStream: vi.fn(async () => {
        return (async function* () {
          yield makeDeltaEvent("Part");
        })();
      }),
    });

    const stream = await createRootPlanningChatStream(
      { worldId, nodeId, content: "Hello", signal: controller.signal },
      deps,
    );
    const events = await readNdjsonStream(stream);

    expect(events).toEqual([
      { type: "error", message: PUBLIC_CHAT_STREAM_ERROR_MESSAGE },
    ]);
    expect(deps.insertAssistantMessage).not.toHaveBeenCalled();
    expect(deps.failAiRun).toHaveBeenCalledTimes(1);
    expect(deps.failSummaries[0]).toBe("Request aborted.");
  });

  it("does not retry OpenAI or insert duplicate user messages", async () => {
    const deps = createMockDeps({
      createResponseStream: vi.fn(async () => {
        throw new Error("Provider unavailable");
      }),
    });

    const stream = await createRootPlanningChatStream(
      { worldId, nodeId, content: "Hello" },
      deps,
    );
    await readNdjsonStream(stream);

    expect(deps.insertUserMessage).toHaveBeenCalledTimes(1);
    expect(deps.createResponseStream).toHaveBeenCalledTimes(1);
    expect(deps.failAiRun).toHaveBeenCalledTimes(1);
  });

  it("marks the run failed exactly once on provider stream errors", async () => {
    const deps = createMockDeps({
      createResponseStream: vi.fn(async () => {
        throw new Error("Provider unavailable");
      }),
    });

    const stream = await createRootPlanningChatStream(
      { worldId, nodeId, content: "Hello" },
      deps,
    );
    const events = await readNdjsonStream(stream);

    expect(events).toEqual([
      { type: "error", message: PUBLIC_CHAT_STREAM_ERROR_MESSAGE },
    ]);
    expect(deps.failAiRun).toHaveBeenCalledTimes(1);
    expect(deps.completeAiRun).not.toHaveBeenCalled();
  });

  it("marks the run failed when the stream is cancelled", async () => {
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => {
      unhandledRejections.push(reason);
    };
    process.on("unhandledRejection", onUnhandledRejection);

    try {
      const deps = createMockDeps({
        createResponseStream: vi.fn(async (_params, options) => {
          return (async function* () {
            yield makeDeltaEvent("Part");
            await new Promise<void>((_resolve, reject) => {
              options.signal?.addEventListener(
                "abort",
                () => {
                  reject(new DOMException("Aborted", "AbortError"));
                },
                { once: true },
              );
            });
          })();
        }),
      });

      const stream = await createRootPlanningChatStream(
        { worldId, nodeId, content: "Hello" },
        deps,
      );
      const reader = stream.getReader();
      const firstChunk = await reader.read();

      expect(firstChunk.done).toBe(false);
      expect(JSON.parse(new TextDecoder().decode(firstChunk.value!))).toEqual({
        type: "delta",
        text: "Part",
      });

      await reader.cancel();

      expect(deps.insertAssistantMessage).not.toHaveBeenCalled();
      expect(deps.failAiRun).toHaveBeenCalledTimes(1);
      expect(deps.failSummaries[0]).toBe("Stream cancelled.");
      expect(unhandledRejections).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
    }
  });
});
