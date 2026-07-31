import "server-only";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  BRANCH_SUGGESTION_API_ERROR_MESSAGES,
  BRANCH_SUGGESTION_DECISION_PERSISTENCE_ERROR_MESSAGE,
  type BranchSuggestionApiErrorCode,
} from "@/lib/ai/branch-suggestion-api";
import {
  assertBranchSuggestionOwnership,
  BranchSuggestionNotFoundError,
  BranchSuggestionNotPendingError,
  getBranchSuggestionById,
  approvePendingBranchSuggestion,
  rejectPendingBranchSuggestion,
  StructureAlreadyExistsError,
  type PersistedBranchSuggestion,
} from "@/lib/db/branch-suggestions";
import {
  resolveRootPlanningConversation,
  RootPlanningNotFoundError,
  type RootPlanningContext,
} from "@/lib/db/chat";
import { DatabaseError } from "@/lib/db/errors";
import type {
  ApproveBranchSuggestionResult,
  RejectBranchSuggestionResult,
} from "@/types/db";
import {
  nodeIdParamSchema,
  suggestionIdParamSchema,
  worldIdParamSchema,
} from "@/lib/validation/schemas";

export interface BranchSuggestionDecisionsRouteDeps {
  resolveRootPlanningConversation(
    worldId: string,
    nodeId: string,
  ): Promise<RootPlanningContext>;
  getBranchSuggestionById(
    suggestionId: string,
  ): Promise<PersistedBranchSuggestion | null>;
  approvePendingBranchSuggestion(
    suggestionId: string,
  ): Promise<ApproveBranchSuggestionResult>;
  rejectPendingBranchSuggestion(
    suggestionId: string,
  ): Promise<RejectBranchSuggestionResult>;
  revalidatePath(path: string): void;
}

export function createDefaultBranchSuggestionDecisionsRouteDeps(): BranchSuggestionDecisionsRouteDeps {
  return {
    resolveRootPlanningConversation,
    getBranchSuggestionById,
    approvePendingBranchSuggestion,
    rejectPendingBranchSuggestion,
    revalidatePath,
  };
}

function invalidParametersResponse(): Response {
  return NextResponse.json(
    {
      error: BRANCH_SUGGESTION_API_ERROR_MESSAGES.invalid_parameters,
      code: "invalid_parameters" satisfies BranchSuggestionApiErrorCode,
    },
    { status: 400 },
  );
}

function errorResponse(
  status: number,
  code: BranchSuggestionApiErrorCode,
  message: string,
): Response {
  return NextResponse.json({ error: message, code }, { status });
}

function suggestionNotFoundResponse(): Response {
  return errorResponse(
    404,
    "suggestion_not_found",
    BRANCH_SUGGESTION_API_ERROR_MESSAGES.suggestion_not_found,
  );
}

function suggestionNotPendingResponse(): Response {
  return errorResponse(
    409,
    "suggestion_not_pending",
    BRANCH_SUGGESTION_API_ERROR_MESSAGES.suggestion_not_pending,
  );
}

function structureAlreadyExistsResponse(): Response {
  return NextResponse.json(
    { code: "structure_already_exists" },
    { status: 409 },
  );
}

function persistenceErrorResponse(): Response {
  return errorResponse(
    500,
    "persistence_error",
    BRANCH_SUGGESTION_DECISION_PERSISTENCE_ERROR_MESSAGE,
  );
}

async function loadOwnedSuggestion(
  input: {
    worldId: string;
    nodeId: string;
    suggestionId: string;
  },
  deps: BranchSuggestionDecisionsRouteDeps,
): Promise<
  | { ok: true; context: RootPlanningContext; suggestion: PersistedBranchSuggestion }
  | { ok: false; response: Response }
> {
  const parsedWorldId = worldIdParamSchema.safeParse(input.worldId);
  const parsedNodeId = nodeIdParamSchema.safeParse(input.nodeId);
  const parsedSuggestionId = suggestionIdParamSchema.safeParse(
    input.suggestionId,
  );

  if (
    !parsedWorldId.success ||
    !parsedNodeId.success ||
    !parsedSuggestionId.success
  ) {
    return { ok: false, response: invalidParametersResponse() };
  }

  let context: RootPlanningContext;
  try {
    context = await deps.resolveRootPlanningConversation(
      parsedWorldId.data,
      parsedNodeId.data,
    );
  } catch (error) {
    if (error instanceof RootPlanningNotFoundError) {
      return {
        ok: false,
        response: errorResponse(
          404,
          "root_planning_not_found",
          BRANCH_SUGGESTION_API_ERROR_MESSAGES.root_planning_not_found,
        ),
      };
    }

    if (error instanceof DatabaseError) {
      return { ok: false, response: persistenceErrorResponse() };
    }

    throw error;
  }

  let suggestion: PersistedBranchSuggestion | null;
  try {
    suggestion = await deps.getBranchSuggestionById(parsedSuggestionId.data);
  } catch (error) {
    if (error instanceof DatabaseError) {
      return { ok: false, response: persistenceErrorResponse() };
    }

    throw error;
  }

  if (!suggestion) {
    return { ok: false, response: suggestionNotFoundResponse() };
  }

  try {
    assertBranchSuggestionOwnership(context, suggestion);
  } catch (error) {
    if (error instanceof BranchSuggestionNotFoundError) {
      return { ok: false, response: suggestionNotFoundResponse() };
    }

    throw error;
  }

  return { ok: true, context, suggestion };
}

function mapDecisionErrorToResponse(error: unknown): Response | null {
  if (error instanceof BranchSuggestionNotFoundError) {
    return suggestionNotFoundResponse();
  }

  if (error instanceof BranchSuggestionNotPendingError) {
    return suggestionNotPendingResponse();
  }

  if (error instanceof StructureAlreadyExistsError) {
    return structureAlreadyExistsResponse();
  }

  if (error instanceof DatabaseError) {
    return persistenceErrorResponse();
  }

  return null;
}

export async function handleApproveBranchSuggestion(
  input: {
    worldId: string;
    nodeId: string;
    suggestionId: string;
  },
  deps: BranchSuggestionDecisionsRouteDeps,
): Promise<Response> {
  const loaded = await loadOwnedSuggestion(input, deps);
  if (!loaded.ok) {
    return loaded.response;
  }

  try {
    const result = await deps.approvePendingBranchSuggestion(loaded.suggestion.id);

    deps.revalidatePath(`/worlds/${loaded.context.world.id}`);
    deps.revalidatePath(
      `/worlds/${loaded.context.world.id}/nodes/${loaded.context.node.id}`,
    );

    return NextResponse.json({
      outcome: "approved",
      suggestionId: result.suggestion_id,
      createdNodeIds: result.created_node_ids,
      idempotent: result.idempotent,
    });
  } catch (error) {
    const mapped = mapDecisionErrorToResponse(error);
    if (mapped) {
      return mapped;
    }

    throw error;
  }
}

export async function handleRejectBranchSuggestion(
  input: {
    worldId: string;
    nodeId: string;
    suggestionId: string;
  },
  deps: BranchSuggestionDecisionsRouteDeps,
): Promise<Response> {
  const loaded = await loadOwnedSuggestion(input, deps);
  if (!loaded.ok) {
    return loaded.response;
  }

  try {
    const result = await deps.rejectPendingBranchSuggestion(loaded.suggestion.id);

    deps.revalidatePath(
      `/worlds/${loaded.context.world.id}/nodes/${loaded.context.node.id}`,
    );

    return NextResponse.json({
      outcome: "rejected",
      suggestionId: result.suggestion_id,
      decidedAt: result.decided_at,
      idempotent: result.idempotent,
    });
  } catch (error) {
    const mapped = mapDecisionErrorToResponse(error);
    if (mapped) {
      return mapped;
    }

    throw error;
  }
}
