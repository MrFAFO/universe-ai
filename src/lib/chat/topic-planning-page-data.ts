import {
  AncestorChainError,
  resolveAncestorContext,
  type WorldNodeForAncestorPath,
} from "@/lib/ai/ancestor-context";
import {
  mapDbMessagesToRootPlanningChatMessages,
  type RootPlanningChatMessage,
} from "@/lib/chat/root-planning-messages";
import { listConversationMessages } from "@/lib/db/chat";
import {
  listWorldNodesForAncestorContext,
  resolveTopicPlanningConversation,
  type DbTopicNode,
  type VerifiedTopicPlanningTarget,
} from "@/lib/db/topic-planning";

export const TOPIC_PLANNING_BLOCKED_MESSAGE =
  "This Node's position in the World could not be determined, so Planning is unavailable for it.";

export interface TopicPlanningPageData {
  worldId: string;
  nodeId: string;
  worldName: string;
  topicTitle: string;
  topicGoal: string;
  breadcrumbTitles: string[];
  initialMessages: RootPlanningChatMessage[];
  planningBlocked: boolean;
  blockedMessage: string | null;
}

function toWorldNodeForAncestorPath(
  node: DbTopicNode,
): WorldNodeForAncestorPath {
  return {
    id: node.id,
    parent_id: node.parent_id,
    kind: node.kind,
    title: node.title,
    description: node.description,
    goal: node.goal,
  };
}

function buildBreadcrumbTitles(
  ancestry: ReturnType<typeof resolveAncestorContext>,
): string[] {
  return [ancestry.root.title, ...ancestry.ancestors.map((ancestor) => ancestor.title)];
}

async function loadInitialMessages(
  target: VerifiedTopicPlanningTarget,
): Promise<RootPlanningChatMessage[]> {
  if (!target.conversation) {
    return [];
  }

  const persistedMessages = await listConversationMessages(
    target.conversation.id,
  );

  return mapDbMessagesToRootPlanningChatMessages(persistedMessages);
}

export async function loadTopicPlanningPageData(
  worldId: string,
  nodeId: string,
): Promise<TopicPlanningPageData> {
  const target = await resolveTopicPlanningConversation(worldId, nodeId);
  const worldNodes = await listWorldNodesForAncestorContext(worldId);

  const base = {
    worldId,
    nodeId,
    worldName: target.world.name,
    topicTitle: target.node.title,
    topicGoal: target.node.goal?.trim() ?? "",
  };

  try {
    const ancestry = resolveAncestorContext(
      worldNodes,
      toWorldNodeForAncestorPath(target.node),
    );
    const initialMessages = await loadInitialMessages(target);

    return {
      ...base,
      breadcrumbTitles: buildBreadcrumbTitles(ancestry),
      initialMessages,
      planningBlocked: false,
      blockedMessage: null,
    };
  } catch (error) {
    if (error instanceof AncestorChainError) {
      const initialMessages = await loadInitialMessages(target);

      return {
        ...base,
        breadcrumbTitles: [],
        initialMessages,
        planningBlocked: true,
        blockedMessage: TOPIC_PLANNING_BLOCKED_MESSAGE,
      };
    }

    throw error;
  }
}
