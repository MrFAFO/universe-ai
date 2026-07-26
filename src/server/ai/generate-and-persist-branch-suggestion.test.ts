import { describe, expect, it, vi } from "vitest";
import type { BranchSuggestionV1 } from "@/lib/ai/branch-suggestion";
import type { RootPlanningPromptContext } from "@/lib/ai/prompt";
import { RootPlanningNotFoundError, type RootPlanningContext } from "@/lib/db/chat";
import {
  GenerationInProgressError,
  PendingProposalExistsError,
  StructureAlreadyExistsError,
} from "@/lib/db/branch-suggestions";
import { DatabaseError } from "@/lib/db/errors";
import {
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
    listNodeTitles: string[];
    begin: Array<{
      conversationId: string;
      model: string;
      schemaVersion: 1;
    }>;
    generate: Array<{
      messages: DbMessage[];
      promptContext: RootPlanningPromptContext;
      signal?: AbortSignal;
    }>;
    replace: Array<Record<string, unknown>>;
    complete: Array<Record<string, unknown>>;
    fail: Array<{ aiRunId: string; summary: string }>;
    insertAssistant: Array<{
      conversationId: string;
      content: string;
      runId: string;
    }>;
  };
} {
  const calls = {
    resolve: [] as Array<{ worldId: string; nodeId: string }>,
    listMessages: [] as string[],
    listNodeTitles: [] as string[],
    begin: [] as Array<{
      conversationId: string;
      model: string;
      schemaVersion: 1;
    }>,
    generate: [] as Array<{
      messages: DbMessage[];
      promptContext: RootPlanningPromptContext;
      signal?: AbortSignal;
    }>,
    replace: [] as Array<Record<string, unknown>>,
    complete: [] as Array<Record<string, unknown>>,
    fail: [] as Array<{ aiRunId: string; summary: string }>,
    insertAssistant: [] as Array<{
      conversationId: string;
      content: string;
      runId: string;
    }>,
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
    listWorldNodeTitles: vi.fn(async (resolvedWorldId) => {
      calls.listNodeTitles.push(resolvedWorldId);
      return ["Context"];
    }),
    getModel: vi.fn(() => "gpt-test"),
    beginBranchSuggestionAiRun: vi.fn(async (input) => {
      calls.begin.push(input);
      return { id: aiRunId };
    }),
    completeAiRun: vi.fn(async (resolvedAiRunId, input) => {
      calls.complete.push({ aiRunId: resolvedAiRunId, ...input });
    }),
    failAiRun: vi.fn(async (resolvedAiRunId, summary) => {
      calls.fail.push({ aiRunId: resolvedAiRunId, summary });
    }),
    insertAssistantMessage: vi.fn(async (resolvedConversationId, content, runId) => {
      calls.insertAssistant.push({
        conversationId: resolvedConversationId,
        content,
        runId,
      });
      return {
        id: "m-discovery",
        conversation_id: resolvedConversationId,
        role: "assistant",
        content,
        ai_run_id: runId,
        ordinal: 3,
        created_at: "2026-01-01T00:00:03.000Z",
      };
    }),
    generateStructureAssessment: vi.fn(async (loadedMessages, promptContext, options) => {
      calls.generate.push({
        messages: loadedMessages,
        promptContext,
        signal: options?.signal,
      });
      return {
        ok: true as const,
        assessment: {
          schemaVersion: 1 as const,
          readiness: "ready" as const,
          missingInformation: null,
          questions: null,
          proposal: validSuggestion,
        },
        providerResponseId: "resp_suggestion_123",
        inputTokens: 42,
        outputTokens: 17,
      };
    }),
    replacePendingBranchSuggestion: vi.fn(async (input) => {
      calls.replace.push(input);
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
    expect(deps.generateStructureAssessment).not.toHaveBeenCalled();
    expect(deps.beginBranchSuggestionAiRun).not.toHaveBeenCalled();
  });

  it("loads messages and Node titles before acquiring the ai_run and generating", async () => {
    const deps = createDeps();
    const order: string[] = [];

    deps.resolveRootPlanningConversation = vi.fn(async () => {
      order.push("resolve");
      return context;
    });
    deps.listConversationMessages = vi.fn(async () => {
      order.push("listMessages");
      return messages;
    });
    deps.listWorldNodeTitles = vi.fn(async () => {
      order.push("listNodeTitles");
      return ["Context"];
    });
    deps.beginBranchSuggestionAiRun = vi.fn(async () => {
      order.push("begin");
      return { id: aiRunId };
    });
    deps.generateStructureAssessment = vi.fn(async () => {
      order.push("generate");
      return {
        ok: true as const,
        assessment: {
          schemaVersion: 1 as const,
          readiness: "ready" as const,
          missingInformation: null,
          questions: null,
          proposal: validSuggestion,
        },
        providerResponseId: "resp_suggestion_123",
        inputTokens: 42,
        outputTokens: 17,
      };
    });

    await generateAndPersistBranchSuggestion({ worldId, nodeId }, deps);

    expect(order).toEqual([
      "resolve",
      "listMessages",
      "listNodeTitles",
      "begin",
      "generate",
    ]);
  });

  it("passes World, Root, and Node-title prompt context into generation", async () => {
    const deps = createDeps();

    await generateAndPersistBranchSuggestion({ worldId, nodeId }, deps);

    expect(deps.calls.generate[0]?.promptContext).toEqual({
      worldName: "Test World",
      worldDescription: "",
      rootTitle: "Root",
      rootGoal: "",
      currentNodeTitles: ["Context"],
    });
  });

  it("returns persistence_error when Node-title loading fails before acquisition", async () => {
    const deps = createDeps({
      listWorldNodeTitles: vi.fn(async () => {
        throw new DatabaseError("node title query failed");
      }),
    });

    const result = await generateAndPersistBranchSuggestion(
      { worldId, nodeId },
      deps,
    );

    expect(result).toEqual({ ok: false, reason: "persistence_error" });
    expect(deps.beginBranchSuggestionAiRun).not.toHaveBeenCalled();
    expect(deps.generateStructureAssessment).not.toHaveBeenCalled();
    expect(deps.failAiRun).not.toHaveBeenCalled();
    expect(String(result)).not.toContain("node title query failed");
  });

  it("acquires an ai_run with conversation id, model, and schema version 1", async () => {
    const deps = createDeps();

    await generateAndPersistBranchSuggestion({ worldId, nodeId }, deps);

    expect(deps.beginBranchSuggestionAiRun).toHaveBeenCalledWith({
      conversationId,
      model: "gpt-test",
      schemaVersion: 1,
    });
  });

  it("calls generation exactly once and persists via the replacement RPC after success", async () => {
    const deps = createDeps();
    const order: string[] = [];

    deps.beginBranchSuggestionAiRun = vi.fn(async () => {
      order.push("begin");
      return { id: aiRunId };
    });
    deps.generateStructureAssessment = vi.fn(async () => {
      order.push("generate");
      return {
        ok: true as const,
        assessment: {
          schemaVersion: 1 as const,
          readiness: "ready" as const,
          missingInformation: null,
          questions: null,
          proposal: validSuggestion,
        },
        providerResponseId: "resp_suggestion_123",
        inputTokens: 42,
        outputTokens: 17,
      };
    });
    deps.replacePendingBranchSuggestion = vi.fn(async (input) => {
      order.push("replace");
      expect(input).toEqual({
        conversationId,
        aiRunId,
        schemaVersion: 1,
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

    expect(deps.generateStructureAssessment).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["begin", "generate", "replace", "complete"]);
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
      outcome: "proposal",
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

  it("returns generation_in_progress without calling OpenAI, replacement, completion, or failAiRun", async () => {
    const deps = createDeps({
      beginBranchSuggestionAiRun: vi.fn(async () => {
        throw new GenerationInProgressError();
      }),
    });

    const result = await generateAndPersistBranchSuggestion(
      { worldId, nodeId },
      deps,
    );

    expect(result).toEqual({ ok: false, reason: "generation_in_progress" });
    expect(deps.generateStructureAssessment).not.toHaveBeenCalled();
    expect(deps.replacePendingBranchSuggestion).not.toHaveBeenCalled();
    expect(deps.completeAiRun).not.toHaveBeenCalled();
    expect(deps.failAiRun).not.toHaveBeenCalled();
  });

  it("returns structure_already_exists on acquisition without calling OpenAI or failAiRun", async () => {
    const deps = createDeps({
      beginBranchSuggestionAiRun: vi.fn(async () => {
        throw new StructureAlreadyExistsError();
      }),
    });

    const result = await generateAndPersistBranchSuggestion(
      { worldId, nodeId },
      deps,
    );

    expect(result).toEqual({ ok: false, reason: "structure_already_exists" });
    expect(deps.generateStructureAssessment).not.toHaveBeenCalled();
    expect(deps.failAiRun).not.toHaveBeenCalled();
  });

  it("returns persistence_error on other acquisition failures without calling OpenAI or failAiRun", async () => {
    const deps = createDeps({
      beginBranchSuggestionAiRun: vi.fn(async () => {
        throw new DatabaseError("acquisition failed");
      }),
    });

    const result = await generateAndPersistBranchSuggestion(
      { worldId, nodeId },
      deps,
    );

    expect(result).toEqual({ ok: false, reason: "persistence_error" });
    expect(deps.generateStructureAssessment).not.toHaveBeenCalled();
    expect(deps.failAiRun).not.toHaveBeenCalled();
    expect(String(result)).not.toContain("acquisition failed");
  });

  it("fails the ai_run and does not call the replacement RPC on provider failure", async () => {
    const deps = createDeps({
      generateStructureAssessment: vi.fn(async () => ({
        ok: false as const,
        reason: "provider_error" as const,
      })),
    });

    const result = await generateAndPersistBranchSuggestion(
      { worldId, nodeId },
      deps,
    );

    expect(result).toEqual({ ok: false, reason: "provider_error" });
    expect(deps.replacePendingBranchSuggestion).not.toHaveBeenCalled();
    expect(deps.failAiRun).toHaveBeenCalledWith(aiRunId, "provider_error");
    expect(deps.completeAiRun).not.toHaveBeenCalled();
  });

  it("fails the ai_run and does not call the replacement RPC on invalid structured output", async () => {
    const deps = createDeps({
      generateStructureAssessment: vi.fn(async () => ({
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
    expect(deps.replacePendingBranchSuggestion).not.toHaveBeenCalled();
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
    expect(deps.beginBranchSuggestionAiRun).not.toHaveBeenCalled();
    expect(deps.failAiRun).not.toHaveBeenCalled();
    expect(deps.replacePendingBranchSuggestion).not.toHaveBeenCalled();
  });

  it("fails an acquired ai_run and does not call the replacement RPC when generation aborts", async () => {
    const controller = new AbortController();
    const deps = createDeps({
      generateStructureAssessment: vi.fn(async () => {
        controller.abort();
        return { ok: false as const, reason: "aborted" as const };
      }),
    });

    const result = await generateAndPersistBranchSuggestion(
      { worldId, nodeId, signal: controller.signal },
      deps,
    );

    expect(result).toEqual({ ok: false, reason: "aborted" });
    expect(deps.beginBranchSuggestionAiRun).toHaveBeenCalledTimes(1);
    expect(deps.failAiRun).toHaveBeenCalledWith(aiRunId, "aborted");
    expect(deps.replacePendingBranchSuggestion).not.toHaveBeenCalled();
  });

  it("returns structure_already_exists when the replacement RPC rejects with that conflict", async () => {
    const deps = createDeps({
      replacePendingBranchSuggestion: vi.fn(async () => {
        throw new StructureAlreadyExistsError();
      }),
    });

    const result = await generateAndPersistBranchSuggestion(
      { worldId, nodeId },
      deps,
    );

    expect(result).toEqual({ ok: false, reason: "structure_already_exists" });
    expect(deps.failAiRun).toHaveBeenCalledWith(
      aiRunId,
      "Initial world structure already exists.",
    );
    expect(deps.completeAiRun).not.toHaveBeenCalled();
  });

  it("returns pending_proposal_exists when the replacement RPC hits a 23505 conflict", async () => {
    const deps = createDeps({
      replacePendingBranchSuggestion: vi.fn(async () => {
        throw new PendingProposalExistsError();
      }),
    });

    const result = await generateAndPersistBranchSuggestion(
      { worldId, nodeId },
      deps,
    );

    expect(result).toEqual({ ok: false, reason: "pending_proposal_exists" });
    expect(deps.failAiRun).toHaveBeenCalledWith(
      aiRunId,
      "A pending branch suggestion already exists.",
    );
    expect(deps.completeAiRun).not.toHaveBeenCalled();
  });

  it("attempts to fail the ai_run and returns persistence_error on unknown replace failure", async () => {
    const deps = createDeps({
      replacePendingBranchSuggestion: vi.fn(async () => {
        throw new DatabaseError("replace failed");
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

  it("returns persistence_error when ai_run completion fails after replace", async () => {
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
    expect(deps.replacePendingBranchSuggestion).toHaveBeenCalledTimes(1);
    expect(deps.failAiRun).toHaveBeenCalledWith(
      aiRunId,
      "Branch suggestion ai_run completion failed.",
    );
  });

  it("does not retry generation or call the replacement RPC twice", async () => {
    const deps = createDeps({
      generateStructureAssessment: vi.fn(async () => ({
        ok: false as const,
        reason: "provider_error" as const,
      })),
    });

    await generateAndPersistBranchSuggestion({ worldId, nodeId }, deps);

    expect(deps.generateStructureAssessment).toHaveBeenCalledTimes(1);
    expect(deps.replacePendingBranchSuggestion).not.toHaveBeenCalled();
  });

  it("does not expose raw database errors in safe failure results", async () => {
    const deps = createDeps({
      replacePendingBranchSuggestion: vi.fn(async () => {
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

  it("persists one suggestion and no assistant message on the ready path", async () => {
    const deps = createDeps();

    const result = await generateAndPersistBranchSuggestion(
      { worldId, nodeId },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok || result.outcome !== "proposal") {
      throw new Error("Expected proposal outcome");
    }
    expect(deps.replacePendingBranchSuggestion).toHaveBeenCalledTimes(1);
    expect(deps.insertAssistantMessage).not.toHaveBeenCalled();
  });

  it("persists one assistant Discovery message and no suggestion on the insufficient path", async () => {
    const deps = createDeps({
      generateStructureAssessment: vi.fn(async () => ({
        ok: true as const,
        assessment: {
          schemaVersion: 1 as const,
          readiness: "insufficient" as const,
          missingInformation: ["Primary audience"],
          questions: ["Who is the primary audience?"],
          proposal: null,
        },
        providerResponseId: "resp_discovery_123",
        inputTokens: 30,
        outputTokens: 12,
      })),
    });

    const result = await generateAndPersistBranchSuggestion(
      { worldId, nodeId },
      deps,
    );

    expect(result).toEqual({
      ok: true,
      outcome: "discovery",
      message: {
        id: "m-discovery",
        role: "assistant",
        content:
          "I need a little more context before I can propose a useful initial structure:\n\n1. Who is the primary audience?",
        createdAt: "2026-01-01T00:00:03.000Z",
      },
    });
    expect(deps.insertAssistantMessage).toHaveBeenCalledWith(
      conversationId,
      "I need a little more context before I can propose a useful initial structure:\n\n1. Who is the primary audience?",
      aiRunId,
    );
    expect(deps.replacePendingBranchSuggestion).not.toHaveBeenCalled();
    expect(deps.completeAiRun).toHaveBeenCalledWith(aiRunId, {
      openaiResponseId: "resp_discovery_123",
      inputTokens: 30,
      outputTokens: 12,
    });
    expect(deps.failAiRun).not.toHaveBeenCalled();
  });

  it("does not replace an existing pending proposal on insufficient Regenerate", async () => {
    const deps = createDeps({
      generateStructureAssessment: vi.fn(async () => ({
        ok: true as const,
        assessment: {
          schemaVersion: 1 as const,
          readiness: "insufficient" as const,
          missingInformation: null,
          questions: ["What is the primary goal?"],
          proposal: null,
        },
        providerResponseId: "resp_discovery_123",
        inputTokens: 30,
        outputTokens: 12,
      })),
    });

    await generateAndPersistBranchSuggestion({ worldId, nodeId }, deps);

    expect(deps.replacePendingBranchSuggestion).not.toHaveBeenCalled();
  });

  it("returns persistence_error when Discovery message insertion fails", async () => {
    const deps = createDeps({
      generateStructureAssessment: vi.fn(async () => ({
        ok: true as const,
        assessment: {
          schemaVersion: 1 as const,
          readiness: "insufficient" as const,
          missingInformation: null,
          questions: ["What is the primary goal?"],
          proposal: null,
        },
        providerResponseId: "resp_discovery_123",
        inputTokens: 30,
        outputTokens: 12,
      })),
      insertAssistantMessage: vi.fn(async () => {
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
      "Discovery message persistence failed.",
    );
    expect(deps.replacePendingBranchSuggestion).not.toHaveBeenCalled();
  });
});
