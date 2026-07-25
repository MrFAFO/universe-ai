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

export const postBranchSuggestionResponseSchema = z.object({
  suggestion: branchSuggestionDtoSchema,
});

export type PostBranchSuggestionResponse = z.infer<
  typeof postBranchSuggestionResponseSchema
>;

export const getBranchSuggestionsResponseSchema = z.object({
  suggestions: z.array(branchSuggestionDtoSchema),
});

export type GetBranchSuggestionsResponse = z.infer<
  typeof getBranchSuggestionsResponseSchema
>;

export const branchSuggestionApiErrorResponseSchema = z.object({
  error: z.string(),
  code: branchSuggestionApiErrorCodeSchema,
});

export type BranchSuggestionApiErrorResponse = z.infer<
  typeof branchSuggestionApiErrorResponseSchema
>;

export const branchSuggestionConflictResponseSchema = z.object({
  code: z.enum(["structure_already_exists", "pending_proposal_exists"]),
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
} as const satisfies Record<BranchSuggestionApiErrorCode, string>;

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
