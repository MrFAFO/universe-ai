import type { RelationType } from "@/types/world-map";
import type { WorldStatus } from "@/types/world";

export type DbWorldStatus = WorldStatus;

export type DbNodeKind = "root" | "topic";

export type DbConversationKind = "planning" | "execution";

export type DbMessageRole = "system" | "user" | "assistant" | "tool";

export type DbAiRunStatus = "running" | "completed" | "failed";

export type DbBranchSuggestionStatus = "pending" | "approved" | "rejected";

export type DbRelationType = RelationType;

export interface DbWorld {
  id: string;
  name: string;
  description: string;
  status: DbWorldStatus;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbNode {
  id: string;
  world_id: string;
  parent_id: string | null;
  kind: DbNodeKind;
  title: string;
  description: string;
  goal: string;
  status: DbWorldStatus;
  progress: number;
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
}

export interface DbNodeRelation {
  id: string;
  world_id: string;
  source_node_id: string;
  target_node_id: string;
  type: DbRelationType;
  created_at: string;
}

export interface DbConversation {
  id: string;
  world_id: string;
  node_id: string;
  kind: DbConversationKind;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  role: DbMessageRole;
  content: string;
  ai_run_id: string | null;
  ordinal: number;
  created_at: string;
}

export interface DbAiRun {
  id: string;
  conversation_id: string;
  model: string;
  status: DbAiRunStatus;
  openai_response_id: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  error: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
}

export interface DbBranchSuggestion {
  id: string;
  world_id: string;
  conversation_id: string;
  parent_node_id: string;
  ai_run_id: string | null;
  status: DbBranchSuggestionStatus;
  schema_version: number;
  payload: Record<string, unknown>;
  created_node_ids: string[] | null;
  created_at: string;
  decided_at: string | null;
}

export interface CreateWorldWithRootResult {
  world_id: string;
  root_node_id: string;
  conversation_id: string;
}

export interface ApproveBranchSuggestionResult {
  suggestion_id: string;
  status: "approved";
  created_node_ids: string[];
  idempotent: boolean;
}
