import type {
  DbConversation,
  DbMessage,
  DbNode,
  DbWorld,
} from "@/types/db";
import { DatabaseError } from "./errors";
import { createSupabaseServerClient } from "./client";

export type RootPlanningNotFoundReason =
  | "world"
  | "node"
  | "node_world_mismatch"
  | "not_root"
  | "conversation";

export class RootPlanningNotFoundError extends Error {
  readonly reason: RootPlanningNotFoundReason;

  constructor(reason: RootPlanningNotFoundReason) {
    super(`Root planning conversation could not be resolved (${reason}).`);
    this.name = "RootPlanningNotFoundError";
    this.reason = reason;
  }
}

export class MessageAppendError extends Error {
  constructor(message = "Unable to append message to the conversation.") {
    super(message);
    this.name = "MessageAppendError";
  }
}

export interface RootPlanningContext {
  world: DbWorld;
  node: DbNode;
  conversation: DbConversation;
}

export function verifyRootPlanningTarget(params: {
  world: DbWorld | null;
  node: DbNode | null;
  conversation: DbConversation | null;
}): RootPlanningContext {
  if (!params.world) {
    throw new RootPlanningNotFoundError("world");
  }

  if (!params.node) {
    throw new RootPlanningNotFoundError("node");
  }

  if (params.node.world_id !== params.world.id) {
    throw new RootPlanningNotFoundError("node_world_mismatch");
  }

  if (params.node.kind !== "root" || params.node.parent_id !== null) {
    throw new RootPlanningNotFoundError("not_root");
  }

  if (
    !params.conversation ||
    params.conversation.kind !== "planning" ||
    params.conversation.world_id !== params.world.id ||
    params.conversation.node_id !== params.node.id
  ) {
    throw new RootPlanningNotFoundError("conversation");
  }

  return {
    world: params.world,
    node: params.node,
    conversation: params.conversation,
  };
}

export async function resolveRootPlanningConversation(
  worldId: string,
  nodeId: string,
): Promise<RootPlanningContext> {
  const supabase = createSupabaseServerClient();

  const { data: world, error: worldError } = await supabase
    .from("worlds")
    .select("*")
    .eq("id", worldId)
    .maybeSingle();

  if (worldError) {
    throw new DatabaseError(worldError.message);
  }

  const { data: node, error: nodeError } = await supabase
    .from("nodes")
    .select("*")
    .eq("id", nodeId)
    .maybeSingle();

  if (nodeError) {
    throw new DatabaseError(nodeError.message);
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("*")
    .eq("node_id", nodeId)
    .eq("kind", "planning")
    .maybeSingle();

  if (conversationError) {
    throw new DatabaseError(conversationError.message);
  }

  return verifyRootPlanningTarget({
    world: (world as DbWorld | null) ?? null,
    node: (node as DbNode | null) ?? null,
    conversation: (conversation as DbConversation | null) ?? null,
  });
}

export async function listWorldNodeTitles(worldId: string): Promise<string[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("nodes")
    .select("title")
    .eq("world_id", worldId)
    .neq("kind", "root")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(20);

  if (error) {
    throw new DatabaseError(error.message);
  }

  return (data ?? []).map((row) => row.title as string);
}

export async function listConversationMessages(
  conversationId: string,
): Promise<DbMessage[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("ordinal", { ascending: true });

  if (error) {
    throw new DatabaseError(error.message);
  }

  return (data ?? []) as DbMessage[];
}

export async function insertUserMessage(
  conversationId: string,
  content: string,
): Promise<DbMessage> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role: "user",
      content,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new MessageAppendError();
  }

  return data as DbMessage;
}

export async function insertAssistantMessage(
  conversationId: string,
  content: string,
  aiRunId: string,
): Promise<DbMessage> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role: "assistant",
      content,
      ai_run_id: aiRunId,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new MessageAppendError();
  }

  return data as DbMessage;
}

export async function createAiRun(
  conversationId: string,
  model: string,
  options?: {
    metadata?: Record<string, unknown> | null;
  },
): Promise<{ id: string }> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ai_runs")
    .insert({
      conversation_id: conversationId,
      model,
      status: "running",
      metadata: options?.metadata ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new DatabaseError(error?.message ?? "Unable to create ai_run.");
  }

  return { id: data.id as string };
}

export interface CompleteAiRunInput {
  openaiResponseId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
}

export async function completeAiRun(
  aiRunId: string,
  input: CompleteAiRunInput,
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("ai_runs")
    .update({
      status: "completed",
      openai_response_id: input.openaiResponseId,
      input_tokens: input.inputTokens,
      output_tokens: input.outputTokens,
      completed_at: new Date().toISOString(),
      error: null,
    })
    .eq("id", aiRunId)
    .eq("status", "running");

  if (error) {
    throw new DatabaseError(error.message);
  }
}

export async function failAiRun(
  aiRunId: string,
  errorSummary: string,
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("ai_runs")
    .update({
      status: "failed",
      error: errorSummary,
      completed_at: new Date().toISOString(),
    })
    .eq("id", aiRunId)
    .eq("status", "running");

  if (error) {
    throw new DatabaseError(error.message);
  }
}
