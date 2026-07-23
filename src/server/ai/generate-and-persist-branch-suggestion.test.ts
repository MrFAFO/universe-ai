import { describe, expect, it, vi } from "vitest";
import type { BranchSuggestionV1 } from "@/lib/ai/branch-suggestion";
import { RootPlanningNotFoundError, type RootPlanningContext } from "@/lib/db/chat";
import { DatabaseError } from "@/lib/db/errors";
import {
  BRANCH_SUGGESTION_RUN_METADATA,
  generateAndPersistBranchSuggestion,
  type GenerateAndPersistBranchSuggestionDeps,
} from "@/server/ai/generate-and-persist-branch-suggestion";
import type { DbBranchSuggestion, DbMessage } from "@/types/db";

const worldId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const nodeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const conversationId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const aiRunId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const suggestionId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

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

const validSuggestion: BranchSuggestionV1 = {
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

const messages: DbMessage[] = [
  {
    id: "m-1",
    conversation_id: conversationId,
    role: "system",
    content: "System",
    ai_run_id: null,
    ordinal: 1,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "m-2",
    conversation_id: conversationId,
    role: "user",
    content: "Hello",
    ai_run_id: null,
    ordinal: 2,
    created_at: "2026-01-01T00:00:01.000Z",
  },
];

function makePersistedRow(): DbBranchSuggestion {
  return {
    id: suggestionId,
    world_id: worldId,
    conversation_id: conversationId,
    parent_node_id: nodeId,
    ai_run_id: aiRunId,
    status: "pending",
    schema_version: 1,
    payload: validSuggestion,
    created_node_ids: null,
    created_at: "2026-01-01T00:00:02.000Z",
    decided_at: null,
  };
}

function createDeps(
  overrides: Partial<GenerateAndPersistBranchSuggestionDeps> = {},
): GenerateAndPersistBranchSuggestionDeps & {
  calls: {
    resolve: Array<{ worldId: string; nodeId: string }>;
    listMessages: string[];
    createAiRun: Array<{
      conversationId: string;
      model: string;
      metadata?: Record<string, unknown> | null;
    }>;
    generate: Array<{ messages: DbMessage[]; signal?: AbortSignal }>;
    insert: Array<Record<string, unknown>>;
    complete: Array<Record<string, unknown>>;
    fail: Array<{ aiRunId: string; summary: string }>;
  };
} {
  const calls = {
    resolve: [] as Array<{ worldId: string; nodeId: string }>,
    listMessages: [] as string[],
    createAiRun: [] as Array<{
      conversationId: string;
      model: string;
      metadata?: Record<string, unknown> | null;
    }>,
    generate: [] as Array<{ messages: DbMessage[]; signal?: AbortSignal }>,
    insert: [] as Array<Record<string, unknown>>,
    complete: [] as Array<Record<string, unknown>>,
    fail: [] as Array<{ aiRunId: string; summary: string }>,
  };

  return {
    calls,
    resolveRootPlanningConversation: vi.fn(async (resolvedWorldId, resolvedNodeId) => {
      calls.resolve.push({ worldId: resolvedWorldId, nodeId: resolvedNodeId });
      return context;
    }),
    listConversationMessages: vi.fn(async (resolvedConversationId) => {
      calls.listMessages.push(resolvedConversationId);
      return messages;
    }),
    getModel: vi.fn(() => "gpt-test"),
    createAiRun: vi.fn(async (resolvedConversationId, model, options) => {
      calls.createAiRun.push({
        conversationId: resolvedConversationId,
        model,
        metadata: options?.metadata,
      });
      return { id: aiRunId };
    }),
    completeAiRun: vi.fn(async (resolvedAiRunId, input) => {
      calls.complete.push({ aiRunId: resolvedAiRunId, ...input });
    }),
    failAiRun: vi.fn(async (resolvedAiRunId, summary) => {
      calls.fail.push({ aiRunId: resolvedAiRunId, summary });
    }),
    generateBranchSuggestion: vi.fn(async (loadedMessages, options) => {
      calls.generate.push({ messages: loadedMessages, signal: options?.signal });
      return {
        ok: true as const,
        suggestion: validSuggestion,
        providerResponseId: "resp_suggestion_123",
        inputTokens: 42,
        outputTokens: 17,
      };
    }),
    insertPendingBranchSuggestion: vi.fn(async (input) => {
      calls.insert.push(input);
      return makePersistedRow();
    }),
    ...overrides,
  };
}

describe("generateAndPersistBranchSuggestion", () => {
  it("verifies the Root Planning target before generation", async () => {
    const deps = createDeps({
      resolveRootPlanningConversation: vi.fn(async () => {
        throw new RootPlanningNotFoundError("not_root");
      }),
    });

    const result = await generateAndPersistBranchSuggestion(
      { worldId, nodeId },
      deps,
    );

    expect(result).toEqual({ ok: false, reason: "root_planning_not_found" });
    expect(deps.generateBranchSuggestion).not.toHaveBeenCalled();
    expect(deps.createAiRun).not.toHaveBeenCalled();
  });

  it("loads history before creating the ai_run and generating", async () => {
    const deps = createDeps();
    const order: string[] = [];

    deps.resolveRootPlanningConversation = vi.fn(async () => {
      order.push("resolve");
      return context;
    });
    deps.listConversationMessages = vi.fn(async () => {
      order.push("list");
      return messages;
    });
    deps.createAiRun = vi.fn(async () => {
      order.push("createAiRun");
      return { id: aiRunId };
    });
    deps.generateBranchSuggestion = vi.fn(async () => {
      order.push("generate");
      return {
        ok: true,
        suggestion: validSuggestion,
        providerResponseId: "resp_suggestion_123",
        inputTokens: 42,
        outputTokens: 17,
      };
    });

    await generateAndPersistBranchSuggestion({ worldId, nodeId }, deps);

    expect(order).toEqual(["resolve", "list", "createAiRun", "generate"]);
  });

  it("creates an ai_run with model and branch-suggestion metadata", async () => {
    const deps = createDeps();

    await generateAndPersistBranchSuggestion({ worldId, nodeId }, deps);

    expect(deps.createAiRun).toHaveBeenCalledWith(conversationId, "gpt-test", {
      metadata: { ...BRANCH_SUGGESTION_RUN_METADATA },
    });
  });

  it("calls generation exactly once and persists only after success", async () => {
    const deps = createDeps();
    const order: string[] = [];

    deps.generateBranchSuggestion = vi.fn(async () => {
      order.push("generate");
      return {
        ok: true,
        suggestion: validSuggestion,
        providerResponseId: "resp_suggestion_123",
        inputTokens: 42,
        outputTokens: 17,
      };
    });
    deps.insertPendingBranchSuggestion = vi.fn(async (input) => {
      order.push("insert");
      expect(input).toEqual({
        worldId,
        conversationId,
        parentNodeId: nodeId,
        aiRunId,
        suggestion: validSuggestion,
      });
      return makePersistedRow();
    });
    deps.completeAiRun = vi.fn(async () => {
      order.push("complete");
    });

    const result = await generateAndPersistBranchSuggestion(
      { worldId, nodeId },
      deps,
    );

    expect(deps.generateBranchSuggestion).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["generate", "insert", "complete"]);
    expect(result.ok).toBe(true);
  });

  it("returns the typed persisted suggestion on success", async () => {
    const deps = createDeps();

    const result = await generateAndPersistBranchSuggestion(
      { worldId, nodeId },
      deps,
    );

    expect(result).toEqual({
      ok: true,
      suggestion: {
        id: suggestionId,
        worldId,
        conversationId,
        parentNodeId: nodeId,
        aiRunId,
        status: "pending",
        schemaVersion: 1,
        payload: validSuggestion,
        createdAt: "2026-01-01T00:00:02.000Z",
      },
    });
  });

  it("completes the ai_run after suggestion persistence with provider metadata", async () => {
    const deps = createDeps();

    await generateAndPersistBranchSuggestion({ worldId, nodeId }, deps);

    expect(deps.completeAiRun).toHaveBeenCalledWith(aiRunId, {
      openaiResponseId: "resp_suggestion_123",
      inputTokens: 42,
      outputTokens: 17,
    });
  });

  it("fails the ai_run and inserts no suggestion on provider failure", async () => {
    const deps = createDeps({
      generateBranchSuggestion: vi.fn(async () => ({
        ok: false as const,
        reason: "provider_error" as const,
      })),
    });

    const result = await generateAndPersistBranchSuggestion(
      { worldId, nodeId },
      deps,
    );

    expect(result).toEqual({ ok: false, reason: "provider_error" });
    expect(deps.insertPendingBranchSuggestion).not.toHaveBeenCalled();
    expect(deps.failAiRun).toHaveBeenCalledWith(aiRunId, "provider_error");
    expect(deps.completeAiRun).not.toHaveBeenCalled();
  });

  it("fails the ai_run and inserts no suggestion on invalid structured output", async () => {
    const deps = createDeps({
      generateBranchSuggestion: vi.fn(async () => ({
        ok: false as const,
        reason: "invalid_structured_output" as const,
      })),
    });

    const result = await generateAndPersistBranchSuggestion(
      { worldId, nodeId },
      deps,
    );

    expect(result).toEqual({
      ok: false,
      reason: "invalid_structured_output",
    });
    expect(deps.insertPendingBranchSuggestion).not.toHaveBeenCalled();
    expect(deps.failAiRun).toHaveBeenCalledWith(
      aiRunId,
      "invalid_structured_output",
    );
  });

  it("returns aborted immediately when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const deps = createDeps();

    const result = await generateAndPersistBranchSuggestion(
      { worldId, nodeId, signal: controller.signal },
      deps,
    );

    expect(result).toEqual({ ok: false, reason: "aborted" });
    expect(deps.resolveRootPlanningConversation).not.toHaveBeenCalled();
    expect(deps.createAiRun).not.toHaveBeenCalled();
    expect(deps.failAiRun).not.toHaveBeenCalled();
    expect(deps.insertPendingBranchSuggestion).not.toHaveBeenCalled();
  });

  it("fails an existing ai_run and inserts no suggestion when generation aborts", async () => {
    const controller = new AbortController();
    const deps = createDeps({
      generateBranchSuggestion: vi.fn(async () => {
        controller.abort();
        return { ok: false as const, reason: "aborted" as const };
      }),
    });

    const result = await generateAndPersistBranchSuggestion(
      { worldId, nodeId, signal: controller.signal },
      deps,
    );

    expect(result).toEqual({ ok: false, reason: "aborted" });
    expect(deps.createAiRun).toHaveBeenCalledTimes(1);
    expect(deps.failAiRun).toHaveBeenCalledWith(aiRunId, "aborted");
    expect(deps.insertPendingBranchSuggestion).not.toHaveBeenCalled();
  });

  it("attempts to fail the ai_run and returns persistence_error on insert failure", async () => {
    const deps = createDeps({
      insertPendingBranchSuggestion: vi.fn(async () => {
        throw new DatabaseError("insert failed");
      }),
    });

    const result = await generateAndPersistBranchSuggestion(
      { worldId, nodeId },
      deps,
    );

    expect(result).toEqual({ ok: false, reason: "persistence_error" });
    expect(deps.failAiRun).toHaveBeenCalledWith(
      aiRunId,
      "Branch suggestion persistence failed.",
    );
    expect(deps.completeAiRun).not.toHaveBeenCalled();
  });

  it("returns persistence_error when ai_run completion fails after insert", async () => {
    const deps = createDeps({
      completeAiRun: vi.fn(async () => {
        throw new DatabaseError("completion failed");
      }),
    });

    const result = await generateAndPersistBranchSuggestion(
      { worldId, nodeId },
      deps,
    );

    expect(result).toEqual({ ok: false, reason: "persistence_error" });
    expect(deps.insertPendingBranchSuggestion).toHaveBeenCalledTimes(1);
    expect(deps.failAiRun).toHaveBeenCalledWith(
      aiRunId,
      "Branch suggestion ai_run completion failed.",
    );
  });

  it("does not retry generation or insert a duplicate suggestion", async () => {
    const deps = createDeps({
      generateBranchSuggestion: vi.fn(async () => ({
        ok: false as const,
        reason: "provider_error" as const,
      })),
    });

    await generateAndPersistBranchSuggestion({ worldId, nodeId }, deps);

    expect(deps.generateBranchSuggestion).toHaveBeenCalledTimes(1);
    expect(deps.insertPendingBranchSuggestion).not.toHaveBeenCalled();
  });

  it("does not expose raw database errors in safe failure results", async () => {
    const deps = createDeps({
      insertPendingBranchSuggestion: vi.fn(async () => {
        throw new DatabaseError("raw database secret details");
      }),
    });

    const result = await generateAndPersistBranchSuggestion(
      { worldId, nodeId },
      deps,
    );

    expect(result).toEqual({ ok: false, reason: "persistence_error" });
    expect(JSON.stringify(result)).not.toContain("raw database secret details");
  });

  it("maps database resolution failures to persistence_error", async () => {
    const deps = createDeps({
      resolveRootPlanningConversation: vi.fn(async () => {
        throw new DatabaseError("database unavailable");
      }),
    });

    const result = await generateAndPersistBranchSuggestion(
      { worldId, nodeId },
      deps,
    );

    expect(result).toEqual({ ok: false, reason: "persistence_error" });
    expect(String(result)).not.toContain("database unavailable");
  });
});
