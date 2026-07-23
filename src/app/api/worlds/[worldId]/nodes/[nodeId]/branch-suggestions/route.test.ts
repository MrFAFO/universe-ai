import { describe, expect, it, vi } from "vitest";
import type { BranchSuggestionV1 } from "@/lib/ai/branch-suggestion";
import {
  BRANCH_SUGGESTION_ABORTED_HTTP_STATUS,
  parseBranchSuggestionApiErrorResponse,
  parseGetBranchSuggestionsResponse,
  parsePostBranchSuggestionResponse,
} from "@/lib/ai/branch-suggestion-api";
import { BranchSuggestionPayloadError } from "@/lib/db/branch-suggestions";
import {
  RootPlanningNotFoundError,
  type RootPlanningContext,
} from "@/lib/db/chat";
import { DatabaseError } from "@/lib/db/errors";
import type { PersistedBranchSuggestion } from "@/lib/db/branch-suggestions";
import type { GenerateAndPersistBranchSuggestionFailureReason } from "@/server/ai/generate-and-persist-branch-suggestion";
import {
  handleGetBranchSuggestions,
  handlePostBranchSuggestions,
  mapGenerateFailureToHttpResponse,
  type BranchSuggestionsRouteDeps,
} from "@/server/api/branch-suggestions-route-handlers";

const worldId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const nodeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const conversationId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const aiRunId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const suggestionId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const validPayload: BranchSuggestionV1 = {
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

function makePersistedSuggestion(
  overrides: Partial<PersistedBranchSuggestion> = {},
): PersistedBranchSuggestion {
  return {
    id: suggestionId,
    worldId,
    conversationId,
    parentNodeId: nodeId,
    aiRunId,
    status: "pending",
    schemaVersion: 1,
    payload: validPayload,
    createdAt: "2026-01-01T00:00:02.000Z",
    ...overrides,
  };
}

function createDeps(
  overrides: Partial<BranchSuggestionsRouteDeps> = {},
): BranchSuggestionsRouteDeps {
  return {
    generateAndPersistBranchSuggestion: vi.fn(async () => ({
      ok: true as const,
      suggestion: makePersistedSuggestion(),
    })),
    resolveRootPlanningConversation: vi.fn(async () => context),
    listPendingBranchSuggestionsForConversation: vi.fn(async () => []),
    ...overrides,
  };
}

async function readJson(response: Response): Promise<unknown> {
  return response.json();
}

describe("handlePostBranchSuggestions", () => {
  it("returns 400 for an invalid world UUID without invoking orchestration", async () => {
    const deps = createDeps();

    const response = await handlePostBranchSuggestions(
      { worldId: "not-a-uuid", nodeId, signal: new AbortController().signal },
      deps,
    );

    expect(response.status).toBe(400);
    expect(parseBranchSuggestionApiErrorResponse(await readJson(response))).toEqual({
      error: "Invalid request parameters.",
      code: "invalid_parameters",
    });
    expect(deps.generateAndPersistBranchSuggestion).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid node UUID without invoking orchestration", async () => {
    const deps = createDeps();

    const response = await handlePostBranchSuggestions(
      { worldId, nodeId: "not-a-uuid", signal: new AbortController().signal },
      deps,
    );

    expect(response.status).toBe(400);
    expect(deps.generateAndPersistBranchSuggestion).not.toHaveBeenCalled();
  });

  it("calls orchestration exactly once with worldId, nodeId, and request.signal", async () => {
    const deps = createDeps();
    const controller = new AbortController();

    await handlePostBranchSuggestions(
      { worldId, nodeId, signal: controller.signal },
      deps,
    );

    expect(deps.generateAndPersistBranchSuggestion).toHaveBeenCalledTimes(1);
    expect(deps.generateAndPersistBranchSuggestion).toHaveBeenCalledWith({
      worldId,
      nodeId,
      signal: controller.signal,
    });
  });

  it("does not use a prompt-like request body because orchestration is called without user text", async () => {
    const deps = createDeps();

    await handlePostBranchSuggestions(
      { worldId, nodeId, signal: new AbortController().signal },
      deps,
    );

    const call = vi.mocked(deps.generateAndPersistBranchSuggestion).mock.calls[0]?.[0];
    expect(call).toEqual({
      worldId,
      nodeId,
      signal: expect.any(AbortSignal),
    });
    expect(call).not.toHaveProperty("content");
    expect(call).not.toHaveProperty("prompt");
  });

  it("returns the persisted pending suggestion DTO on success", async () => {
    const deps = createDeps();

    const response = await handlePostBranchSuggestions(
      { worldId, nodeId, signal: new AbortController().signal },
      deps,
    );

    expect(response.status).toBe(200);
    expect(parsePostBranchSuggestionResponse(await readJson(response))).toEqual({
      suggestion: {
        id: suggestionId,
        worldId,
        conversationId,
        parentNodeId: nodeId,
        aiRunId,
        status: "pending",
        schemaVersion: 1,
        payload: validPayload,
        createdAt: "2026-01-01T00:00:02.000Z",
      },
    });
  });

  it.each<[GenerateAndPersistBranchSuggestionFailureReason, number, string]>([
    ["root_planning_not_found", 404, "root_planning_not_found"],
    ["invalid_structured_output", 422, "invalid_structured_output"],
    ["provider_refusal", 422, "provider_refusal"],
    ["incomplete_response", 502, "incomplete_response"],
    ["provider_error", 502, "provider_error"],
    ["persistence_error", 500, "persistence_error"],
    ["aborted", BRANCH_SUGGESTION_ABORTED_HTTP_STATUS, "aborted"],
  ])("maps %s to HTTP %i", async (reason, status, code) => {
    const deps = createDeps({
      generateAndPersistBranchSuggestion: vi.fn(async () => ({
        ok: false as const,
        reason,
      })),
    });

    const response = await handlePostBranchSuggestions(
      { worldId, nodeId, signal: new AbortController().signal },
      deps,
    );

    expect(response.status).toBe(status);
    const body = parseBranchSuggestionApiErrorResponse(await readJson(response));
    expect(body.code).toBe(code);
    expect(body.error.length).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toContain("OpenAI");
    expect(JSON.stringify(body)).not.toContain("Supabase");
  });

  it("exposes only safe code and message fields on failure", async () => {
    const deps = createDeps({
      generateAndPersistBranchSuggestion: vi.fn(async () => ({
        ok: false as const,
        reason: "provider_error" as const,
      })),
    });

    const response = await handlePostBranchSuggestions(
      { worldId, nodeId, signal: new AbortController().signal },
      deps,
    );
    const body = await readJson(response);

    expect(body).toEqual({
      error: "Suggestion generation is temporarily unavailable.",
      code: "provider_error",
    });
  });

  it("does not retry generation", async () => {
    const deps = createDeps({
      generateAndPersistBranchSuggestion: vi.fn(async () => ({
        ok: false as const,
        reason: "provider_error" as const,
      })),
    });

    await handlePostBranchSuggestions(
      { worldId, nodeId, signal: new AbortController().signal },
      deps,
    );

    expect(deps.generateAndPersistBranchSuggestion).toHaveBeenCalledTimes(1);
  });
});

describe("mapGenerateFailureToHttpResponse", () => {
  it("documents aborted requests with HTTP 499", () => {
    const response = mapGenerateFailureToHttpResponse("aborted");
    expect(response.status).toBe(499);
  });
});

describe("handleGetBranchSuggestions", () => {
  it("returns 400 for invalid route parameters", async () => {
    const deps = createDeps();

    const response = await handleGetBranchSuggestions(
      { worldId: "bad", nodeId },
      deps,
    );

    expect(response.status).toBe(400);
    expect(deps.resolveRootPlanningConversation).not.toHaveBeenCalled();
  });

  it("verifies the Root Planning target before loading suggestions", async () => {
    const deps = createDeps();
    const order: string[] = [];

    deps.resolveRootPlanningConversation = vi.fn(async () => {
      order.push("resolve");
      return context;
    });
    deps.listPendingBranchSuggestionsForConversation = vi.fn(async () => {
      order.push("list");
      return [];
    });

    await handleGetBranchSuggestions({ worldId, nodeId }, deps);

    expect(order).toEqual(["resolve", "list"]);
  });

  it("loads pending suggestions by the resolved conversation id", async () => {
    const deps = createDeps();

    await handleGetBranchSuggestions({ worldId, nodeId }, deps);

    expect(deps.resolveRootPlanningConversation).toHaveBeenCalledWith(
      worldId,
      nodeId,
    );
    expect(deps.listPendingBranchSuggestionsForConversation).toHaveBeenCalledWith(
      conversationId,
    );
  });

  it("returns pending suggestions newest first", async () => {
    const newer = makePersistedSuggestion({
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: "2026-01-02T00:00:00.000Z",
    });
    const older = makePersistedSuggestion({
      id: "22222222-2222-4222-8222-222222222222",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const deps = createDeps({
      listPendingBranchSuggestionsForConversation: vi.fn(async () => [
        newer,
        older,
      ]),
    });

    const response = await handleGetBranchSuggestions({ worldId, nodeId }, deps);
    const body = parseGetBranchSuggestionsResponse(await readJson(response));

    expect(body.suggestions.map((item) => item.id)).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]);
  });

  it("returns an empty suggestions array when none exist", async () => {
    const deps = createDeps({
      listPendingBranchSuggestionsForConversation: vi.fn(async () => []),
    });

    const response = await handleGetBranchSuggestions({ worldId, nodeId }, deps);

    expect(response.status).toBe(200);
    expect(parseGetBranchSuggestionsResponse(await readJson(response))).toEqual({
      suggestions: [],
    });
  });

  it("maps target not found to 404", async () => {
    const deps = createDeps({
      resolveRootPlanningConversation: vi.fn(async () => {
        throw new RootPlanningNotFoundError("conversation");
      }),
    });

    const response = await handleGetBranchSuggestions({ worldId, nodeId }, deps);

    expect(response.status).toBe(404);
    expect(parseBranchSuggestionApiErrorResponse(await readJson(response))).toEqual({
      error: "Root planning conversation not found.",
      code: "root_planning_not_found",
    });
  });

  it("maps malformed persisted payloads to a safe 500 response", async () => {
    const deps = createDeps({
      listPendingBranchSuggestionsForConversation: vi.fn(async () => {
        throw new BranchSuggestionPayloadError(suggestionId);
      }),
    });

    const response = await handleGetBranchSuggestions({ worldId, nodeId }, deps);

    expect(response.status).toBe(500);
    const body = parseBranchSuggestionApiErrorResponse(await readJson(response));
    expect(body.code).toBe("load_failed");
    expect(body.error).toBe("Unable to load suggestions right now.");
    expect(JSON.stringify(body)).not.toContain(suggestionId);
  });

  it("maps database failures to a safe 500 response", async () => {
    const deps = createDeps({
      listPendingBranchSuggestionsForConversation: vi.fn(async () => {
        throw new DatabaseError("raw database failure");
      }),
    });

    const response = await handleGetBranchSuggestions({ worldId, nodeId }, deps);

    expect(response.status).toBe(500);
    const body = parseBranchSuggestionApiErrorResponse(await readJson(response));
    expect(body.code).toBe("load_failed");
    expect(JSON.stringify(body)).not.toContain("raw database failure");
  });

  it("never calls generation", async () => {
    const deps = createDeps();

    await handleGetBranchSuggestions({ worldId, nodeId }, deps);

    expect(deps.generateAndPersistBranchSuggestion).not.toHaveBeenCalled();
  });
});
