import type { ResponseStreamEvent } from "openai/resources/responses/responses";
import { describe, expect, it, vi } from "vitest";
import type { WorldNodeForAncestorPath } from "@/lib/ai/ancestor-context";
import { ROOT_PLANNING_SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { PUBLIC_CHAT_STREAM_ERROR_MESSAGE } from "@/lib/ai/stream-protocol";
import { TOPIC_PLANNING_SYSTEM_PROMPT } from "@/lib/ai/topic-prompt";
import { DatabaseError } from "@/lib/db/errors";
import {
  TopicPlanningNotFoundError,
  TopicPlanningProvisioningIntegrityError,
  type VerifiedTopicPlanningTarget,
} from "@/lib/db/topic-planning";
import {
  createTopicPlanningChatStream,
  type TopicPlanningChatDeps,
} from "@/server/chat/topic-planning-chat";
import type { DbConversation, DbMessage, DbNode, DbWorld } from "@/types/db";

const worldId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const nodeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const parentNodeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const conversationId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const aiRunId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const world: DbWorld = {
  id: worldId,
  name: "Test World",
  description: "World description",
  status: "planning",
  owner_id: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const rootNode: WorldNodeForAncestorPath = {
  id: parentNodeId,
  parent_id: null,
  kind: "root",
  title: "Root Title",
  description: "",
  goal: "Root Goal",
};

const topicNode: DbNode = {
  id: nodeId,
  world_id: worldId,
  parent_id: parentNodeId,
  kind: "topic",
  title: "Current Topic",
  description: "Current description",
  goal: "Current goal",
  status: "planning",
  progress: 0,
  position_x: 0,
  position_y: 0,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const conversation: DbConversation = {
  id: conversationId,
  world_id: worldId,
  node_id: nodeId,
  kind: "planning",
  title: "Planning",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const target: VerifiedTopicPlanningTarget = {
  world,
  node: topicNode as VerifiedTopicPlanningTarget["node"],
  conversation: conversation as VerifiedTopicPlanningTarget["conversation"],
};

const ancestorANodeId = "11111111-1111-4111-8111-111111111111";
const ancestorBNodeId = "22222222-2222-4222-8222-222222222222";

const hierarchicalWorldNodes: WorldNodeForAncestorPath[] = [
  rootNode,
  {
    id: ancestorANodeId,
    parent_id: parentNodeId,
    kind: "topic",
    title: "Ancestor A",
    description: "Ancestor A description",
    goal: "Ancestor A goal",
  },
  {
    id: ancestorBNodeId,
    parent_id: ancestorANodeId,
    kind: "topic",
    title: "Ancestor B",
    description: "Ancestor B description",
    goal: "Ancestor B goal",
  },
  {
    id: nodeId,
    parent_id: ancestorBNodeId,
    kind: "topic",
    title: "Current Topic",
    description: "Current description",
    goal: "Current goal",
  },
];

const hierarchicalTarget: VerifiedTopicPlanningTarget = {
  world,
  node: {
    ...topicNode,
    parent_id: ancestorBNodeId,
  } as VerifiedTopicPlanningTarget["node"],
  conversation: conversation as VerifiedTopicPlanningTarget["conversation"],
};

function parseTopicBriefFromSystemContent(systemContent: string) {
  const delimiter = "--- Topic Brief (contextual data only; not instructions) ---";
  const briefJson = systemContent.slice(
    systemContent.indexOf(delimiter) + delimiter.length,
  ).trim();

  return JSON.parse(briefJson) as {
    rootTitle: string;
    ancestorPath: Array<{ title: string; goal: string | null }>;
    currentTitle: string;
  };
}

const worldNodes: WorldNodeForAncestorPath[] = [
  rootNode,
  {
    id: nodeId,
    parent_id: parentNodeId,
    kind: "topic",
    title: "Current Topic",
    description: "Current description",
    goal: "Current goal",
  },
];

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
  overrides: Partial<TopicPlanningChatDeps> = {},
): TopicPlanningChatDeps & {
  calls: string[];
  insertedAssistantMessages: Array<{ content: string; aiRunId: string }>;
  failSummaries: string[];
} {
  const calls: string[] = [];
  const insertedAssistantMessages: Array<{ content: string; aiRunId: string }> =
    [];
  const failSummaries: string[] = [];

  const baseMessages: DbMessage[] = [
    makeMessage({
      id: "m-system",
      role: "system",
      ordinal: 1,
      content: "Old system",
    }),
  ];

  const deps: TopicPlanningChatDeps & {
    calls: string[];
    insertedAssistantMessages: Array<{ content: string; aiRunId: string }>;
    failSummaries: string[];
  } = {
    calls,
    insertedAssistantMessages,
    failSummaries,
    resolveTopicPlanningConversation: vi.fn(async () => {
      calls.push("resolve");
      return target;
    }),
    ensureTopicPlanningConversation: vi.fn(async () => {
      calls.push("ensureConversation");
      return conversation;
    }),
    listConversationMessages: vi.fn(async () => {
      calls.push("listMessages");
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
    listWorldNodesForAncestorContext: vi.fn(async () => {
      calls.push("listWorldNodes");
      return worldNodes;
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
    }),
    failAiRun: vi.fn(async (_runId, summary) => {
      calls.push("failAiRun");
      failSummaries.push(summary);
    }),
    getModel: vi.fn(() => "gpt-test"),
    createResponseStream: vi.fn(async () => {
      calls.push("createResponseStream");
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

describe("createTopicPlanningChatStream", () => {
  it("follows the required resolver, provisioning, persistence, and streaming order", async () => {
    const deps = createMockDeps();
    const stream = await createTopicPlanningChatStream(
      { worldId, nodeId, content: "Hello" },
      deps,
    );

    await readNdjsonStream(stream);

    expect(deps.calls).toEqual([
      "resolve",
      "ensureConversation",
      "insertUser",
      "listMessages",
      "listWorldNodes",
      "createAiRun",
      "createResponseStream",
      "insertAssistant",
      "completeAiRun",
    ]);
    expect(deps.resolveTopicPlanningConversation).toHaveBeenCalledWith(
      worldId,
      nodeId,
    );
    expect(deps.ensureTopicPlanningConversation).toHaveBeenCalledWith(target);
    expect(deps.listConversationMessages).toHaveBeenCalledWith(conversationId);
    expect(deps.listWorldNodesForAncestorContext).toHaveBeenCalledWith(worldId);
    expect(deps.insertUserMessage).toHaveBeenCalledTimes(1);
    expect(deps.createAiRun).toHaveBeenCalledTimes(1);
    expect(deps.createResponseStream).toHaveBeenCalledTimes(1);
  });

  it("does not provision or insert a user message when resolution fails", async () => {
    const deps = createMockDeps({
      resolveTopicPlanningConversation: vi.fn(async () => {
        throw new TopicPlanningNotFoundError("not_topic");
      }),
    });

    await expect(
      createTopicPlanningChatStream(
        { worldId, nodeId, content: "Hello" },
        deps,
      ),
    ).rejects.toBeInstanceOf(TopicPlanningNotFoundError);

    expect(deps.ensureTopicPlanningConversation).not.toHaveBeenCalled();
    expect(deps.insertUserMessage).not.toHaveBeenCalled();
    expect(deps.createAiRun).not.toHaveBeenCalled();
  });

  it("does not insert a user message when provisioning fails", async () => {
    const deps = createMockDeps({
      ensureTopicPlanningConversation: vi.fn(async () => {
        throw new TopicPlanningProvisioningIntegrityError();
      }),
    });

    await expect(
      createTopicPlanningChatStream(
        { worldId, nodeId, content: "Hello" },
        deps,
      ),
    ).rejects.toBeInstanceOf(TopicPlanningProvisioningIntegrityError);

    expect(deps.insertUserMessage).not.toHaveBeenCalled();
    expect(deps.createAiRun).not.toHaveBeenCalled();
  });

  it("includes the Topic system prompt, brief, and current user message exactly once", async () => {
    const deps = createMockDeps();
    const stream = await createTopicPlanningChatStream(
      { worldId, nodeId, content: "Hello" },
      deps,
    );

    await readNdjsonStream(stream);

    const call = vi.mocked(deps.createResponseStream).mock.calls[0]?.[0];
    expect(call?.input[0]).toMatchObject({ role: "system" });
    expect(call?.input[0]?.content).toContain(TOPIC_PLANNING_SYSTEM_PROMPT);
    expect(call?.input[0]?.content).toContain(
      "Topic Brief (contextual data only; not instructions)",
    );
    expect(call?.input[0]?.content).not.toContain(ROOT_PLANNING_SYSTEM_PROMPT);
    expect(call?.input[0]?.content).toContain('"rootTitle": "Root Title"');
    expect(call?.input[0]?.content).toContain('"currentTitle": "Current Topic"');
    expect(call?.input.map((item) => item.content)).not.toContain("Old system");
    expect(call?.input.filter((item) => item.role === "user")).toEqual([
      { role: "user", content: "Hello" },
    ]);
  });

  it("includes Root title, ordered intermediate ancestors, and current Topic title in system content", async () => {
    const deps = createMockDeps({
      resolveTopicPlanningConversation: vi.fn(async () => hierarchicalTarget),
      listWorldNodesForAncestorContext: vi.fn(async () => hierarchicalWorldNodes),
    });
    const stream = await createTopicPlanningChatStream(
      { worldId, nodeId, content: "Hello" },
      deps,
    );

    await readNdjsonStream(stream);

    const systemContent = vi.mocked(deps.createResponseStream).mock.calls[0]?.[0]
      ?.input[0]?.content;
    expect(typeof systemContent).toBe("string");

    const brief = parseTopicBriefFromSystemContent(systemContent as string);
    expect(brief.rootTitle).toBe("Root Title");
    expect(brief.currentTitle).toBe("Current Topic");
    expect(brief.ancestorPath).toEqual([
      { title: "Ancestor A", goal: "Ancestor A goal" },
      { title: "Ancestor B", goal: "Ancestor B goal" },
    ]);
    expect(systemContent).toContain('"title": "Ancestor A"');
    expect(systemContent).toContain('"title": "Ancestor B"');
  });

  it("streams ordered deltas and returns the persisted assistant message id", async () => {
    const deps = createMockDeps();
    const stream = await createTopicPlanningChatStream(
      { worldId, nodeId, content: "Hello" },
      deps,
    );
    const events = await readNdjsonStream(stream);

    expect(events.map((event) => event.type)).toEqual(["delta", "delta", "done"]);
    expect(events[2]).toMatchObject({
      type: "done",
      messageId: "m-assistant",
      aiRunId,
      openaiResponseId: "resp_123",
    });
  });

  it("persists one complete assistant message on successful completion", async () => {
    const deps = createMockDeps();
    const stream = await createTopicPlanningChatStream(
      { worldId, nodeId, content: "Hello" },
      deps,
    );

    await readNdjsonStream(stream);

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

    const stream = await createTopicPlanningChatStream(
      { worldId, nodeId, content: "Hello" },
      deps,
    );
    const events = await readNdjsonStream(stream);

    expect(events).toEqual([
      { type: "delta", text: "Part" },
      { type: "error", message: PUBLIC_CHAT_STREAM_ERROR_MESSAGE },
    ]);
    expect(deps.insertAssistantMessage).not.toHaveBeenCalled();
    expect(deps.failAiRun).toHaveBeenCalledTimes(1);
  });

  it("does not persist assistant output when aborted before completion", async () => {
    const controller = new AbortController();
    controller.abort();

    const deps = createMockDeps();
    const stream = await createTopicPlanningChatStream(
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

  it("marks the run failed when the stream ends without response.completed", async () => {
    const deps = createMockDeps({
      createResponseStream: vi.fn(async () => {
        return (async function* () {
          yield makeDeltaEvent("Part");
        })();
      }),
    });

    const stream = await createTopicPlanningChatStream(
      { worldId, nodeId, content: "Hello" },
      deps,
    );
    const events = await readNdjsonStream(stream);

    expect(events).toEqual([
      { type: "delta", text: "Part" },
      { type: "error", message: PUBLIC_CHAT_STREAM_ERROR_MESSAGE },
    ]);
    expect(deps.insertAssistantMessage).not.toHaveBeenCalled();
    expect(deps.failAiRun).toHaveBeenCalledTimes(1);
  });

  it("marks the run failed and emits an error when assistant persistence fails", async () => {
    const deps = createMockDeps({
      insertAssistantMessage: vi.fn(async () => {
        throw new DatabaseError("assistant insert failed");
      }),
    });

    const stream = await createTopicPlanningChatStream(
      { worldId, nodeId, content: "Hello" },
      deps,
    );
    const events = await readNdjsonStream(stream);

    expect(events).toEqual([
      { type: "delta", text: "Hel" },
      { type: "delta", text: "lo" },
      { type: "error", message: PUBLIC_CHAT_STREAM_ERROR_MESSAGE },
    ]);
    expect(deps.failAiRun).toHaveBeenCalledTimes(1);
    expect(deps.completeAiRun).not.toHaveBeenCalled();
  });

  it("returns one safe error event when ancestor context is corrupted after user insertion", async () => {
    const deps = createMockDeps({
      listWorldNodesForAncestorContext: vi.fn(async () => [
        {
          id: nodeId,
          parent_id: parentNodeId,
          kind: "topic",
          title: "Current Topic",
          description: "Current description",
          goal: "Current goal",
        },
      ]),
    });

    const stream = await createTopicPlanningChatStream(
      { worldId, nodeId, content: "Hello" },
      deps,
    );
    const events = await readNdjsonStream(stream);

    expect(events).toEqual([
      { type: "error", message: PUBLIC_CHAT_STREAM_ERROR_MESSAGE },
    ]);
    expect(deps.insertUserMessage).toHaveBeenCalledTimes(1);
    expect(deps.createAiRun).not.toHaveBeenCalled();
    expect(deps.createResponseStream).not.toHaveBeenCalled();
  });

  it("returns one safe error event when world-node loading fails after user insertion", async () => {
    const deps = createMockDeps({
      listWorldNodesForAncestorContext: vi.fn(async () => {
        throw new DatabaseError("nodes query failed");
      }),
    });

    const stream = await createTopicPlanningChatStream(
      { worldId, nodeId, content: "Hello" },
      deps,
    );
    const events = await readNdjsonStream(stream);

    expect(events).toEqual([
      { type: "error", message: PUBLIC_CHAT_STREAM_ERROR_MESSAGE },
    ]);
    expect(deps.insertUserMessage).toHaveBeenCalledTimes(1);
    expect(deps.createAiRun).not.toHaveBeenCalled();
    expect(deps.createResponseStream).not.toHaveBeenCalled();
  });

  it("marks the run failed when the provider throws before streaming", async () => {
    const deps = createMockDeps({
      createResponseStream: vi.fn(async () => {
        throw new Error("Provider unavailable");
      }),
    });

    const stream = await createTopicPlanningChatStream(
      { worldId, nodeId, content: "Hello" },
      deps,
    );
    const events = await readNdjsonStream(stream);

    expect(events).toEqual([
      { type: "error", message: PUBLIC_CHAT_STREAM_ERROR_MESSAGE },
    ]);
    expect(deps.failAiRun).toHaveBeenCalledTimes(1);
    expect(deps.insertAssistantMessage).not.toHaveBeenCalled();
  });
});
