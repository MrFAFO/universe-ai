import type { BranchSuggestionV1 } from "@/lib/ai/branch-suggestion";
import type {
  ApproveBranchSuggestionResult,
  CreateWorldWithRootResult,
  DbBranchSuggestion,
} from "@/types/db";
import {
  approveBranchSuggestionResultSchema,
  createWorldWithRootResultSchema,
  dbBranchSuggestionRowSchema,
  type ApproveSuggestionInput,
  type CreateWorldInput,
} from "@/lib/validation/schemas";
import { DatabaseError } from "./errors";
import { createSupabaseServerClient } from "./client";

export interface ReplacePendingBranchSuggestionRpcInput {
  conversationId: string;
  aiRunId: string;
  schemaVersion: 1;
  payload: BranchSuggestionV1;
}

export async function createWorldWithRoot(
  input: CreateWorldInput,
): Promise<CreateWorldWithRootResult> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_world_with_root", {
    p_name: input.name,
    p_description: input.description ?? "",
  });

  if (error) {
    throw new Error(error.message);
  }

  return createWorldWithRootResultSchema.parse(data);
}

export async function approveBranchSuggestion(
  input: ApproveSuggestionInput,
): Promise<ApproveBranchSuggestionResult> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("approve_branch_suggestion", {
    p_suggestion_id: input.suggestionId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return approveBranchSuggestionResultSchema.parse(data);
}

export async function replacePendingBranchSuggestion(
  input: ReplacePendingBranchSuggestionRpcInput,
): Promise<DbBranchSuggestion> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("replace_pending_branch_suggestion", {
    p_conversation_id: input.conversationId,
    p_ai_run_id: input.aiRunId,
    p_schema_version: input.schemaVersion,
    p_payload: input.payload,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new DatabaseError("Unable to persist branch suggestion.");
  }

  return dbBranchSuggestionRowSchema.parse(data) as DbBranchSuggestion;
}
