import "server-only";

import { NextResponse } from "next/server";
import {
  BRANCH_SUGGESTION_ABORTED_HTTP_STATUS,
  BRANCH_SUGGESTION_API_ERROR_MESSAGES,
  toBranchSuggestionDto,
  type BranchSuggestionApiErrorCode,
} from "@/lib/ai/branch-suggestion-api";
import {
  BranchSuggestionPayloadError,
  listPendingBranchSuggestionsForConversation,
  type PersistedBranchSuggestion,
} from "@/lib/db/branch-suggestions";
import {
  resolveRootPlanningConversation,
  RootPlanningNotFoundError,
  type RootPlanningContext,
} from "@/lib/db/chat";
import { DatabaseError } from "@/lib/db/errors";
import {
  nodeIdParamSchema,
  worldIdParamSchema,
} from "@/lib/validation/schemas";
import {
  generateAndPersistBranchSuggestion,
  type GenerateAndPersistBranchSuggestionFailureReason,
  type GenerateAndPersistBranchSuggestionResult,
} from "@/server/ai/generate-and-persist-branch-suggestion";

export interface BranchSuggestionsRouteDeps {
  generateAndPersistBranchSuggestion(params: {
    worldId: string;
    nodeId: string;
    signal?: AbortSignal;
  }): Promise<GenerateAndPersistBranchSuggestionResult>;
  resolveRootPlanningConversation(
    worldId: string,
    nodeId: string,
  ): Promise<RootPlanningContext>;
  listPendingBranchSuggestionsForConversation(
    conversationId: string,
  ): Promise<PersistedBranchSuggestion[]>;
}

export function createDefaultBranchSuggestionsRouteDeps(): BranchSuggestionsRouteDeps {
  return {
    generateAndPersistBranchSuggestion: (params) =>
      generateAndPersistBranchSuggestion(params),
    resolveRootPlanningConversation,
    listPendingBranchSuggestionsForConversation,
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

export function mapGenerateFailureToHttpResponse(
  reason: GenerateAndPersistBranchSuggestionFailureReason,
): Response {
  switch (reason) {
    case "root_planning_not_found":
      return errorResponse(
        404,
        "root_planning_not_found",
        BRANCH_SUGGESTION_API_ERROR_MESSAGES.root_planning_not_found,
      );
    case "invalid_structured_output":
      return errorResponse(
        422,
        "invalid_structured_output",
        BRANCH_SUGGESTION_API_ERROR_MESSAGES.invalid_structured_output,
      );
    case "provider_refusal":
      return errorResponse(
        422,
        "provider_refusal",
        BRANCH_SUGGESTION_API_ERROR_MESSAGES.provider_refusal,
      );
    case "incomplete_response":
      return errorResponse(
        502,
        "incomplete_response",
        BRANCH_SUGGESTION_API_ERROR_MESSAGES.incomplete_response,
      );
    case "provider_error":
      return errorResponse(
        502,
        "provider_error",
        BRANCH_SUGGESTION_API_ERROR_MESSAGES.provider_error,
      );
    case "persistence_error":
      return errorResponse(
        500,
        "persistence_error",
        BRANCH_SUGGESTION_API_ERROR_MESSAGES.persistence_error,
      );
    case "structure_already_exists":
      return NextResponse.json(
        { code: "structure_already_exists" },
        { status: 409 },
      );
    case "pending_proposal_exists":
      return NextResponse.json(
        { code: "pending_proposal_exists" },
        { status: 409 },
      );
    case "generation_in_progress":
      return NextResponse.json(
        { code: "generation_in_progress" },
        { status: 409 },
      );
    case "aborted":
      return errorResponse(
        BRANCH_SUGGESTION_ABORTED_HTTP_STATUS,
        "aborted",
        BRANCH_SUGGESTION_API_ERROR_MESSAGES.aborted,
      );
    default: {
      const exhaustive: never = reason;
      return exhaustive;
    }
  }
}

function toPendingDto(suggestion: PersistedBranchSuggestion) {
  if (suggestion.status !== "pending") {
    throw new BranchSuggestionPayloadError(suggestion.id);
  }

  return toBranchSuggestionDto({
    id: suggestion.id,
    worldId: suggestion.worldId,
    conversationId: suggestion.conversationId,
    parentNodeId: suggestion.parentNodeId,
    aiRunId: suggestion.aiRunId,
    status: "pending",
    schemaVersion: 1,
    payload: suggestion.payload,
    createdAt: suggestion.createdAt,
  });
}

export async function handlePostBranchSuggestions(
  input: {
    worldId: string;
    nodeId: string;
    signal: AbortSignal;
  },
  deps: BranchSuggestionsRouteDeps,
): Promise<Response> {
  const parsedWorldId = worldIdParamSchema.safeParse(input.worldId);
  const parsedNodeId = nodeIdParamSchema.safeParse(input.nodeId);

  if (!parsedWorldId.success || !parsedNodeId.success) {
    return invalidParametersResponse();
  }

  const result = await deps.generateAndPersistBranchSuggestion({
    worldId: parsedWorldId.data,
    nodeId: parsedNodeId.data,
    signal: input.signal,
  });

  if (!result.ok) {
    return mapGenerateFailureToHttpResponse(result.reason);
  }

  if (result.outcome === "discovery") {
    return NextResponse.json({
      outcome: "discovery",
      message: result.message,
    });
  }

  return NextResponse.json({
    outcome: "proposal",
    suggestion: toPendingDto(result.suggestion),
  });
}

export async function handleGetBranchSuggestions(
  input: {
    worldId: string;
    nodeId: string;
  },
  deps: BranchSuggestionsRouteDeps,
): Promise<Response> {
  const parsedWorldId = worldIdParamSchema.safeParse(input.worldId);
  const parsedNodeId = nodeIdParamSchema.safeParse(input.nodeId);

  if (!parsedWorldId.success || !parsedNodeId.success) {
    return invalidParametersResponse();
  }

  try {
    const context = await deps.resolveRootPlanningConversation(
      parsedWorldId.data,
      parsedNodeId.data,
    );
    const suggestions =
      await deps.listPendingBranchSuggestionsForConversation(
        context.conversation.id,
      );

    return NextResponse.json({
      suggestions: suggestions.map((suggestion) => toPendingDto(suggestion)),
    });
  } catch (error) {
    if (error instanceof RootPlanningNotFoundError) {
      return errorResponse(
        404,
        "root_planning_not_found",
        BRANCH_SUGGESTION_API_ERROR_MESSAGES.root_planning_not_found,
      );
    }

    if (
      error instanceof DatabaseError ||
      error instanceof BranchSuggestionPayloadError
    ) {
      return errorResponse(
        500,
        "load_failed",
        BRANCH_SUGGESTION_API_ERROR_MESSAGES.load_failed,
      );
    }

    throw error;
  }
}
