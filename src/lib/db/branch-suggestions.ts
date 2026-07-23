import type { BranchSuggestionV1 } from "@/lib/ai/branch-suggestion";
import { parseBranchSuggestion } from "@/lib/ai/branch-suggestion";
import type { DbBranchSuggestion, DbBranchSuggestionStatus } from "@/types/db";
import { DatabaseError } from "./errors";
import { createSupabaseServerClient } from "./client";

export class BranchSuggestionPayloadError extends Error {
  readonly suggestionId: string;

  constructor(suggestionId: string) {
    super(`Stored branch suggestion payload is invalid (${suggestionId}).`);
    this.name = "BranchSuggestionPayloadError";
    this.suggestionId = suggestionId;
  }
}

export interface PersistedBranchSuggestion {
  id: string;
  worldId: string;
  conversationId: string;
  parentNodeId: string;
  aiRunId: string;
  status: DbBranchSuggestionStatus;
  schemaVersion: 1;
  payload: BranchSuggestionV1;
  createdAt: string;
}

export interface InsertPendingBranchSuggestionInput {
  worldId: string;
  conversationId: string;
  parentNodeId: string;
  aiRunId: string;
  suggestion: BranchSuggestionV1;
}

export function mapDbBranchSuggestionRow(
  row: DbBranchSuggestion,
): PersistedBranchSuggestion {
  if (!row.ai_run_id) {
    throw new BranchSuggestionPayloadError(row.id);
  }

  const parsed = parseBranchSuggestion(row.payload);
  if (!parsed.ok || parsed.suggestion.schemaVersion !== 1) {
    throw new BranchSuggestionPayloadError(row.id);
  }

  return {
    id: row.id,
    worldId: row.world_id,
    conversationId: row.conversation_id,
    parentNodeId: row.parent_node_id,
    aiRunId: row.ai_run_id,
    status: row.status,
    schemaVersion: 1,
    payload: parsed.suggestion,
    createdAt: row.created_at,
  };
}

export async function insertPendingBranchSuggestion(
  input: InsertPendingBranchSuggestionInput,
): Promise<DbBranchSuggestion> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("branch_suggestions")
    .insert({
      world_id: input.worldId,
      conversation_id: input.conversationId,
      parent_node_id: input.parentNodeId,
      ai_run_id: input.aiRunId,
      status: "pending",
      schema_version: input.suggestion.schemaVersion,
      payload: input.suggestion,
      created_node_ids: null,
      decided_at: null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new DatabaseError(error?.message ?? "Unable to persist branch suggestion.");
  }

  return data as DbBranchSuggestion;
}

export async function listPendingBranchSuggestionsForConversation(
  conversationId: string,
): Promise<PersistedBranchSuggestion[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("branch_suggestions")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw new DatabaseError(error.message);
  }

  return (data ?? []).map((row) =>
    mapDbBranchSuggestionRow(row as DbBranchSuggestion),
  );
}

export async function getBranchSuggestionById(
  suggestionId: string,
): Promise<PersistedBranchSuggestion | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("branch_suggestions")
    .select("*")
    .eq("id", suggestionId)
    .maybeSingle();

  if (error) {
    throw new DatabaseError(error.message);
  }

  if (!data) {
    return null;
  }

  return mapDbBranchSuggestionRow(data as DbBranchSuggestion);
}
