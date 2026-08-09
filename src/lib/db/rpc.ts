import type { BranchSuggestionV1 } from "@/lib/ai/branch-suggestion";
import type {
  ApproveBranchSuggestionResult,
  CreateWorldWithRootResult,
  DbBranchSuggestion,
  RejectBranchSuggestionResult,
} from "@/types/db";
import {
  approveBranchSuggestionResultSchema,
  beginBranchSuggestionAiRunResultSchema,
  beginPlanningChatAiRunResultSchema,
  completePlanningChatRunResultSchema,
  createWorldWithRootResultSchema,
  dbBranchSuggestionRowSchema,
  rejectBranchSuggestionResultSchema,
  type ApproveSuggestionInput,
  type CreateWorldInput,
  type RejectSuggestionInput,
} from "@/lib/validation/schemas";
import { DatabaseError } from "./errors";
import { createSupabaseServerClient } from "./client";

export interface ReplacePendingBranchSuggestionRpcInput {
  conversationId: string;
  aiRunId: string;
  schemaVersion: 1;
  payload: BranchSuggestionV1;
}

export interface BeginBranchSuggestionAiRunRpcInput {
  conversationId: string;
  model: string;
  schemaVersion: 1;
}

export interface BeginPlanningChatAiRunRpcInput {
  conversationId: string;
  model: string;
}

export interface CompletePlanningChatRunRpcInput {
  aiRunId: string;
  conversationId: string;
  content: string;
  openaiResponseId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
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

export async function rejectBranchSuggestion(
  input: RejectSuggestionInput,
): Promise<RejectBranchSuggestionResult> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("reject_branch_suggestion", {
    p_suggestion_id: input.suggestionId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return rejectBranchSuggestionResultSchema.parse(data);
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

export async function beginBranchSuggestionAiRun(
  input: BeginBranchSuggestionAiRunRpcInput,
): Promise<{ id: string }> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("begin_branch_suggestion_ai_run", {
    p_conversation_id: input.conversationId,
    p_model: input.model,
    p_schema_version: input.schemaVersion,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new DatabaseError("Unable to acquire branch suggestion ai_run.");
  }

  return beginBranchSuggestionAiRunResultSchema.parse(data);
}

export async function beginPlanningChatAiRun(
  input: BeginPlanningChatAiRunRpcInput,
): Promise<{ id: string }> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("begin_planning_chat_ai_run", {
    p_conversation_id: input.conversationId,
    p_model: input.model,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new DatabaseError("Unable to acquire planning chat ai_run.");
  }

  return beginPlanningChatAiRunResultSchema.parse(data);
}

export async function completePlanningChatRun(
  input: CompletePlanningChatRunRpcInput,
): Promise<{ messageId: string }> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("complete_planning_chat_ai_run", {
    p_ai_run_id: input.aiRunId,
    p_conversation_id: input.conversationId,
    p_content: input.content,
    p_openai_response_id: input.openaiResponseId,
    p_input_tokens: input.inputTokens,
    p_output_tokens: input.outputTokens,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new DatabaseError("Unable to finalize planning chat ai_run.");
  }

  return completePlanningChatRunResultSchema.parse(data);
}
