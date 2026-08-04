import type {
  DbConversation,
  DbNode,
  DbWorld,
} from "@/types/db";
import { DatabaseError } from "./errors";
import { createSupabaseServerClient } from "./client";

export type TopicPlanningNotFoundReason =
  | "world"
  | "node"
  | "node_world_mismatch"
  | "not_topic"
  | "conversation_mismatch";

export class TopicPlanningNotFoundError extends Error {
  readonly reason: TopicPlanningNotFoundReason;

  constructor(reason: TopicPlanningNotFoundReason) {
    super(`Topic planning conversation could not be resolved (${reason}).`);
    this.name = "TopicPlanningNotFoundError";
    this.reason = reason;
  }
}

export type DbTopicNode = Readonly<
  DbNode & {
    kind: "topic";
    parent_id: string;
  }
>;

export type DbPlanningConversation = Readonly<
  DbConversation & {
    kind: "planning";
  }
>;

export interface VerifiedTopicPlanningTarget {
  readonly world: Readonly<DbWorld>;
  readonly node: DbTopicNode;
  readonly conversation: DbPlanningConversation | null;
}

export function verifyTopicPlanningTarget(params: {
  world: DbWorld | null;
  node: DbNode | null;
  conversation: DbConversation | null;
}): VerifiedTopicPlanningTarget {
  if (!params.world) {
    throw new TopicPlanningNotFoundError("world");
  }

  if (!params.node) {
    throw new TopicPlanningNotFoundError("node");
  }

  if (params.node.world_id !== params.world.id) {
    throw new TopicPlanningNotFoundError("node_world_mismatch");
  }

  if (params.node.kind !== "topic" || params.node.parent_id === null) {
    throw new TopicPlanningNotFoundError("not_topic");
  }

  if (
    params.conversation &&
    (params.conversation.kind !== "planning" ||
      params.conversation.world_id !== params.world.id ||
      params.conversation.node_id !== params.node.id)
  ) {
    throw new TopicPlanningNotFoundError("conversation_mismatch");
  }

  return {
    world: params.world,
    node: params.node as DbTopicNode,
    conversation: params.conversation
      ? (params.conversation as DbPlanningConversation)
      : null,
  };
}

export async function resolveTopicPlanningConversation(
  worldId: string,
  nodeId: string,
): Promise<VerifiedTopicPlanningTarget> {
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

  return verifyTopicPlanningTarget({
    world: (world as DbWorld | null) ?? null,
    node: (node as DbNode | null) ?? null,
    conversation: (conversation as DbConversation | null) ?? null,
  });
}
