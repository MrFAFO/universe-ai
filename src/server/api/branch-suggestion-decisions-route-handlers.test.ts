import { describe, expect, it, vi } from "vitest";
import type { BranchSuggestionV1 } from "@/lib/ai/branch-suggestion";
import {
  BRANCH_SUGGESTION_API_ERROR_MESSAGES,
  BRANCH_SUGGESTION_DECISION_PERSISTENCE_ERROR_MESSAGE,
  parseApproveBranchSuggestionResponse,
  parseBranchSuggestionApiErrorResponse,
  parseBranchSuggestionConflictResponse,
  parseRejectBranchSuggestionResponse,
} from "@/lib/ai/branch-suggestion-api";
import {
  BranchSuggestionNotPendingError,
  StructureAlreadyExistsError,
  type PersistedBranchSuggestion,
} from "@/lib/db/branch-suggestions";
import {
  RootPlanningNotFoundError,
  type RootPlanningContext,
} from "@/lib/db/chat";
import { DatabaseError } from "@/lib/db/errors";
import {
  handleApproveBranchSuggestion,
  handleRejectBranchSuggestion,
  type BranchSuggestionDecisionsRouteDeps,
} from "@/server/api/branch-suggestion-decisions-route-handlers";

const worldId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const nodeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const conversationId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const aiRunId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const suggestionId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const createdNodeId = "11111111-1111-4111-8111-111111111111";

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
  overrides: Partial<BranchSuggestionDecisionsRouteDeps> = {},
): BranchSuggestionDecisionsRouteDeps {
  return {
    resolveRootPlanningConversation: vi.fn(async () => context),
    getBranchSuggestionById: vi.fn(async () => makePersistedSuggestion()),
    approvePendingBranchSuggestion: vi.fn(async () => ({
      suggestion_id: suggestionId,
      status: "approved" as const,
      created_node_ids: [createdNodeId],
      idempotent: false,
    })),
    rejectPendingBranchSuggestion: vi.fn(async () => ({
      suggestion_id: suggestionId,
      status: "rejected" as const,
      decided_at: "2026-01-02T00:00:00.000Z",
      idempotent: false,
    })),
    revalidatePath: vi.fn(),
    ...overrides,
  };
}

async function readJson(response: Response): Promise<unknown> {
  return response.json();
}

describe("handleApproveBranchSuggestion", () => {
  it("returns 400 for invalid UUID parameters", async () => {
    const deps = createDeps();

    const response = await handleApproveBranchSuggestion(
      { worldId: "bad", nodeId, suggestionId },
      deps,
    );

    expect(response.status).toBe(400);
    expect(parseBranchSuggestionApiErrorResponse(await readJson(response))).toEqual({
      error: BRANCH_SUGGESTION_API_ERROR_MESSAGES.invalid_parameters,
      code: "invalid_parameters",
    });
    expect(deps.resolveRootPlanningConversation).not.toHaveBeenCalled();
  });

  it("returns 404 when root planning context is missing", async () => {
    const deps = createDeps({
      resolveRootPlanningConversation: vi.fn(async () => {
        throw new RootPlanningNotFoundError();
      }),
    });

    const response = await handleApproveBranchSuggestion(
      { worldId, nodeId, suggestionId },
      deps,
    );

    expect(response.status).toBe(404);
    expect(parseBranchSuggestionApiErrorResponse(await readJson(response)).code).toBe(
      "root_planning_not_found",
    );
  });

  it("returns 404 when the suggestion is missing", async () => {
    const deps = createDeps({
      getBranchSuggestionById: vi.fn(async () => null),
    });

    const response = await handleApproveBranchSuggestion(
      { worldId, nodeId, suggestionId },
      deps,
    );

    expect(response.status).toBe(404);
    expect(parseBranchSuggestionApiErrorResponse(await readJson(response))).toEqual({
      error: BRANCH_SUGGESTION_API_ERROR_MESSAGES.suggestion_not_found,
      code: "suggestion_not_found",
    });
  });

  it("returns 404 when ownership does not match", async () => {
    const deps = createDeps({
      getBranchSuggestionById: vi.fn(async () =>
        makePersistedSuggestion({
          worldId: "11111111-1111-4111-8111-111111111111",
        }),
      ),
    });

    const response = await handleApproveBranchSuggestion(
      { worldId, nodeId, suggestionId },
      deps,
    );

    expect(response.status).toBe(404);
    expect(parseBranchSuggestionApiErrorResponse(await readJson(response)).code).toBe(
      "suggestion_not_found",
    );
    expect(deps.approvePendingBranchSuggestion).not.toHaveBeenCalled();
  });

  it("returns 200 with the strict approval body and revalidates map and chat paths", async () => {
    const deps = createDeps();

    const response = await handleApproveBranchSuggestion(
      { worldId, nodeId, suggestionId },
      deps,
    );

    expect(response.status).toBe(200);
    expect(parseApproveBranchSuggestionResponse(await readJson(response))).toEqual({
      outcome: "approved",
      suggestionId,
      createdNodeIds: [createdNodeId],
      idempotent: false,
    });
    expect(deps.approvePendingBranchSuggestion).toHaveBeenCalledWith(suggestionId);
    expect(deps.revalidatePath).toHaveBeenCalledWith(`/worlds/${worldId}`);
    expect(deps.revalidatePath).toHaveBeenCalledWith(
      `/worlds/${worldId}/nodes/${nodeId}`,
    );
  });

  it("returns 200 for idempotent re-approval", async () => {
    const deps = createDeps({
      approvePendingBranchSuggestion: vi.fn(async () => ({
        suggestion_id: suggestionId,
        status: "approved",
        created_node_ids: [createdNodeId],
        idempotent: true,
      })),
    });

    const response = await handleApproveBranchSuggestion(
      { worldId, nodeId, suggestionId },
      deps,
    );

    expect(response.status).toBe(200);
    expect(parseApproveBranchSuggestionResponse(await readJson(response)).idempotent).toBe(
      true,
    );
  });

  it("returns 409 suggestion_not_pending for incompatible status", async () => {
    const deps = createDeps({
      approvePendingBranchSuggestion: vi.fn(async () => {
        throw new BranchSuggestionNotPendingError();
      }),
    });

    const response = await handleApproveBranchSuggestion(
      { worldId, nodeId, suggestionId },
      deps,
    );

    expect(response.status).toBe(409);
    expect(parseBranchSuggestionApiErrorResponse(await readJson(response))).toEqual({
      error: BRANCH_SUGGESTION_API_ERROR_MESSAGES.suggestion_not_pending,
      code: "suggestion_not_pending",
    });
  });

  it("returns 409 structure_already_exists without exposing SQL text", async () => {
    const deps = createDeps({
      approvePendingBranchSuggestion: vi.fn(async () => {
        throw new StructureAlreadyExistsError();
      }),
    });

    const response = await handleApproveBranchSuggestion(
      { worldId, nodeId, suggestionId },
      deps,
    );

    expect(response.status).toBe(409);
    expect(parseBranchSuggestionConflictResponse(await readJson(response))).toEqual({
      code: "structure_already_exists",
    });
  });

  it("returns 500 persistence_error for unexpected database failures", async () => {
    const deps = createDeps({
      approvePendingBranchSuggestion: vi.fn(async () => {
        throw new DatabaseError("connection failed");
      }),
    });

    const response = await handleApproveBranchSuggestion(
      { worldId, nodeId, suggestionId },
      deps,
    );

    expect(response.status).toBe(500);
    expect(parseBranchSuggestionApiErrorResponse(await readJson(response))).toEqual({
      error: BRANCH_SUGGESTION_DECISION_PERSISTENCE_ERROR_MESSAGE,
      code: "persistence_error",
    });
  });

  it("returns 500 persistence_error when context loading throws DatabaseError", async () => {
    const deps = createDeps({
      resolveRootPlanningConversation: vi.fn(async () => {
        throw new DatabaseError("connection failed");
      }),
    });

    const response = await handleApproveBranchSuggestion(
      { worldId, nodeId, suggestionId },
      deps,
    );

    expect(response.status).toBe(500);
    expect(parseBranchSuggestionApiErrorResponse(await readJson(response))).toEqual({
      error: BRANCH_SUGGESTION_DECISION_PERSISTENCE_ERROR_MESSAGE,
      code: "persistence_error",
    });
    expect(deps.getBranchSuggestionById).not.toHaveBeenCalled();
    expect(deps.approvePendingBranchSuggestion).not.toHaveBeenCalled();
    expect(deps.revalidatePath).not.toHaveBeenCalled();
  });

  it("returns 500 persistence_error when suggestion loading throws DatabaseError", async () => {
    const deps = createDeps({
      getBranchSuggestionById: vi.fn(async () => {
        throw new DatabaseError("connection failed");
      }),
    });

    const response = await handleApproveBranchSuggestion(
      { worldId, nodeId, suggestionId },
      deps,
    );

    expect(response.status).toBe(500);
    expect(parseBranchSuggestionApiErrorResponse(await readJson(response))).toEqual({
      error: BRANCH_SUGGESTION_DECISION_PERSISTENCE_ERROR_MESSAGE,
      code: "persistence_error",
    });
    expect(deps.approvePendingBranchSuggestion).not.toHaveBeenCalled();
    expect(deps.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("handleRejectBranchSuggestion", () => {
  it("returns 404 when the suggestion is missing", async () => {
    const deps = createDeps({
      getBranchSuggestionById: vi.fn(async () => null),
    });

    const response = await handleRejectBranchSuggestion(
      { worldId, nodeId, suggestionId },
      deps,
    );

    expect(response.status).toBe(404);
    expect(parseBranchSuggestionApiErrorResponse(await readJson(response)).code).toBe(
      "suggestion_not_found",
    );
  });

  it("returns 200 with the strict rejection body and revalidates only the chat path", async () => {
    const deps = createDeps();

    const response = await handleRejectBranchSuggestion(
      { worldId, nodeId, suggestionId },
      deps,
    );

    expect(response.status).toBe(200);
    expect(parseRejectBranchSuggestionResponse(await readJson(response))).toEqual({
      outcome: "rejected",
      suggestionId,
      decidedAt: "2026-01-02T00:00:00.000Z",
      idempotent: false,
    });
    expect(deps.rejectPendingBranchSuggestion).toHaveBeenCalledWith(suggestionId);
    expect(deps.revalidatePath).toHaveBeenCalledWith(
      `/worlds/${worldId}/nodes/${nodeId}`,
    );
    expect(deps.revalidatePath).not.toHaveBeenCalledWith(`/worlds/${worldId}`);
  });

  it("returns 200 for idempotent re-rejection", async () => {
    const deps = createDeps({
      rejectPendingBranchSuggestion: vi.fn(async () => ({
        suggestion_id: suggestionId,
        status: "rejected",
        decided_at: "2026-01-02T00:00:00.000Z",
        idempotent: true,
      })),
    });

    const response = await handleRejectBranchSuggestion(
      { worldId, nodeId, suggestionId },
      deps,
    );

    expect(response.status).toBe(200);
    expect(parseRejectBranchSuggestionResponse(await readJson(response)).idempotent).toBe(
      true,
    );
  });

  it("returns 409 suggestion_not_pending for incompatible status", async () => {
    const deps = createDeps({
      rejectPendingBranchSuggestion: vi.fn(async () => {
        throw new BranchSuggestionNotPendingError();
      }),
    });

    const response = await handleRejectBranchSuggestion(
      { worldId, nodeId, suggestionId },
      deps,
    );

    expect(response.status).toBe(409);
    expect(parseBranchSuggestionApiErrorResponse(await readJson(response)).code).toBe(
      "suggestion_not_pending",
    );
  });

  it("returns 404 for ownership mismatch instead of 409 or 500", async () => {
    const deps = createDeps({
      getBranchSuggestionById: vi.fn(async () =>
        makePersistedSuggestion({ conversationId: "11111111-1111-4111-8111-111111111111" }),
      ),
    });

    const response = await handleRejectBranchSuggestion(
      { worldId, nodeId, suggestionId },
      deps,
    );

    expect(response.status).toBe(404);
    expect(deps.rejectPendingBranchSuggestion).not.toHaveBeenCalled();
  });

  it("returns 500 persistence_error when context loading throws DatabaseError", async () => {
    const deps = createDeps({
      resolveRootPlanningConversation: vi.fn(async () => {
        throw new DatabaseError("connection failed");
      }),
    });

    const response = await handleRejectBranchSuggestion(
      { worldId, nodeId, suggestionId },
      deps,
    );

    expect(response.status).toBe(500);
    expect(parseBranchSuggestionApiErrorResponse(await readJson(response))).toEqual({
      error: BRANCH_SUGGESTION_DECISION_PERSISTENCE_ERROR_MESSAGE,
      code: "persistence_error",
    });
    expect(deps.getBranchSuggestionById).not.toHaveBeenCalled();
    expect(deps.rejectPendingBranchSuggestion).not.toHaveBeenCalled();
    expect(deps.revalidatePath).not.toHaveBeenCalled();
  });

  it("returns 500 persistence_error when suggestion loading throws DatabaseError", async () => {
    const deps = createDeps({
      getBranchSuggestionById: vi.fn(async () => {
        throw new DatabaseError("connection failed");
      }),
    });

    const response = await handleRejectBranchSuggestion(
      { worldId, nodeId, suggestionId },
      deps,
    );

    expect(response.status).toBe(500);
    expect(parseBranchSuggestionApiErrorResponse(await readJson(response))).toEqual({
      error: BRANCH_SUGGESTION_DECISION_PERSISTENCE_ERROR_MESSAGE,
      code: "persistence_error",
    });
    expect(deps.rejectPendingBranchSuggestion).not.toHaveBeenCalled();
    expect(deps.revalidatePath).not.toHaveBeenCalled();
  });
});
