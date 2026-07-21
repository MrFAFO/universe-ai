import type {
  ApproveBranchSuggestionResult,
  CreateWorldWithRootResult,
} from "@/types/db";
import {
  approveBranchSuggestionResultSchema,
  createWorldWithRootResultSchema,
  type ApproveSuggestionInput,
  type CreateWorldInput,
} from "@/lib/validation/schemas";
import { createSupabaseServerClient } from "./client";

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
