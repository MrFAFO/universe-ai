import { z } from "zod";
import {
  branchSuggestionV1Schema,
  type BranchSuggestionV1,
} from "@/lib/ai/branch-suggestion";

export const branchSuggestionApiErrorCodeSchema = z.enum([
  "invalid_parameters",
  "root_planning_not_found",
  "invalid_structured_output",
  "provider_refusal",
  "incomplete_response",
  "provider_error",
  "persistence_error",
  "aborted",
  "load_failed",
  "suggestion_not_found",
  "suggestion_not_pending",
]);

export type BranchSuggestionApiErrorCode = z.infer<
  typeof branchSuggestionApiErrorCodeSchema
>;

export const branchSuggestionDtoSchema = z.object({
  id: z.uuid(),
  worldId: z.uuid(),
  conversationId: z.uuid(),
  parentNodeId: z.uuid(),
  aiRunId: z.uuid(),
  status: z.literal("pending"),
  schemaVersion: z.literal(1),
  payload: branchSuggestionV1Schema,
  createdAt: z.string(),
});

export type BranchSuggestionDto = z.infer<typeof branchSuggestionDtoSchema>;

export const branchSuggestionDiscoveryMessageDtoSchema = z
  .object({
    id: z.uuid(),
    role: z.literal("assistant"),
    content: z.string().trim().min(1),
    createdAt: z.string(),
  })
  .strict();

export type BranchSuggestionDiscoveryMessageDto = z.infer<
  typeof branchSuggestionDiscoveryMessageDtoSchema
>;

export const postBranchSuggestionResponseSchema = z.discriminatedUnion(
  "outcome",
  [
    z
      .object({
        outcome: z.literal("proposal"),
        suggestion: branchSuggestionDtoSchema,
      })
      .strict(),
    z
      .object({
        outcome: z.literal("discovery"),
        message: branchSuggestionDiscoveryMessageDtoSchema,
      })
      .strict(),
  ],
);

export type PostBranchSuggestionResponse = z.infer<
  typeof postBranchSuggestionResponseSchema
>;

export const getBranchSuggestionsResponseSchema = z.object({
  suggestions: z.array(branchSuggestionDtoSchema),
});

export type GetBranchSuggestionsResponse = z.infer<
  typeof getBranchSuggestionsResponseSchema
>;

export const approveBranchSuggestionResponseSchema = z
  .object({
    outcome: z.literal("approved"),
    suggestionId: z.uuid(),
    createdNodeIds: z.array(z.uuid()),
    idempotent: z.boolean(),
  })
  .strict();

export type ApproveBranchSuggestionResponse = z.infer<
  typeof approveBranchSuggestionResponseSchema
>;

export const rejectBranchSuggestionResponseSchema = z
  .object({
    outcome: z.literal("rejected"),
    suggestionId: z.uuid(),
    decidedAt: z.string(),
    idempotent: z.boolean(),
  })
  .strict();

export type RejectBranchSuggestionResponse = z.infer<
  typeof rejectBranchSuggestionResponseSchema
>;

export const branchSuggestionApiErrorResponseSchema = z.object({
  error: z.string(),
  code: branchSuggestionApiErrorCodeSchema,
});

export type BranchSuggestionApiErrorResponse = z.infer<
  typeof branchSuggestionApiErrorResponseSchema
>;

export const branchSuggestionConflictResponseSchema = z.object({
  code: z.enum([
    "structure_already_exists",
    "pending_proposal_exists",
    "generation_in_progress",
  ]),
});

export type BranchSuggestionConflictResponse = z.infer<
  typeof branchSuggestionConflictResponseSchema
>;

export const BRANCH_SUGGESTION_API_ERROR_MESSAGES = {
  invalid_parameters: "Invalid request parameters.",
  root_planning_not_found: "Root planning conversation not found.",
  invalid_structured_output:
    "Unable to generate a valid world structure suggestion.",
  provider_refusal: "The model declined to generate a suggestion.",
  incomplete_response: "Suggestion generation did not complete.",
  provider_error: "Suggestion generation is temporarily unavailable.",
  persistence_error: "Unable to save the suggestion right now.",
  aborted: "Request was cancelled.",
  load_failed: "Unable to load suggestions right now.",
  suggestion_not_found: "World structure suggestion not found.",
  suggestion_not_pending: "This world structure suggestion can no longer be decided.",
} as const satisfies Record<BranchSuggestionApiErrorCode, string>;

export const BRANCH_SUGGESTION_DECISION_PERSISTENCE_ERROR_MESSAGE =
  "Unable to complete this decision right now.";

/** Client-disconnect convention for aborted branch-suggestion generation. */
export const BRANCH_SUGGESTION_ABORTED_HTTP_STATUS = 499;

export interface BranchSuggestionDtoSource {
  id: string;
  worldId: string;
  conversationId: string;
  parentNodeId: string;
  aiRunId: string;
  status: "pending";
  schemaVersion: 1;
  payload: BranchSuggestionV1;
  createdAt: string;
}

export function toBranchSuggestionDto(
  suggestion: BranchSuggestionDtoSource,
): BranchSuggestionDto {
  return branchSuggestionDtoSchema.parse(suggestion);
}

export function parsePostBranchSuggestionResponse(
  raw: unknown,
): PostBranchSuggestionResponse {
  return postBranchSuggestionResponseSchema.parse(raw);
}

export function parseGetBranchSuggestionsResponse(
  raw: unknown,
): GetBranchSuggestionsResponse {
  return getBranchSuggestionsResponseSchema.parse(raw);
}

export function parseApproveBranchSuggestionResponse(
  raw: unknown,
): ApproveBranchSuggestionResponse {
  return approveBranchSuggestionResponseSchema.parse(raw);
}

export function parseRejectBranchSuggestionResponse(
  raw: unknown,
): RejectBranchSuggestionResponse {
  return rejectBranchSuggestionResponseSchema.parse(raw);
}

export function parseBranchSuggestionApiErrorResponse(
  raw: unknown,
): BranchSuggestionApiErrorResponse {
  return branchSuggestionApiErrorResponseSchema.parse(raw);
}

export function parseBranchSuggestionConflictResponse(
  raw: unknown,
): BranchSuggestionConflictResponse {
  return branchSuggestionConflictResponseSchema.parse(raw);
}
