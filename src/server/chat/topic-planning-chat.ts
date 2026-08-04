import "server-only";

import type { WorldNodeForAncestorPath } from "@/lib/ai/ancestor-context";
import { resolveAncestorContext } from "@/lib/ai/ancestor-context";
import { getOpenAIClient, getOpenAIModel } from "@/lib/ai/openai";
import { buildTopicResponsesInput } from "@/lib/ai/topic-prompt";
import {
  completeAiRun,
  createAiRun,
  failAiRun,
  insertAssistantMessage,
  insertUserMessage,
  listConversationMessages,
} from "@/lib/db/chat";
import {
  ensureTopicPlanningConversation,
  listWorldNodesForAncestorContext,
  resolveTopicPlanningConversation,
  type DbPlanningConversation,
  type DbTopicNode,
  type VerifiedTopicPlanningTarget,
} from "@/lib/db/topic-planning";
import type { DbMessage } from "@/types/db";
import {
  createPlanningChatStream,
  type PlanningChatStreamDeps,
} from "@/server/chat/planning-chat-stream";

export interface TopicPlanningChatParams {
  worldId: string;
  nodeId: string;
  content: string;
  signal?: AbortSignal;
}

export interface TopicPlanningChatDeps extends PlanningChatStreamDeps {
  resolveTopicPlanningConversation(
    worldId: string,
    nodeId: string,
  ): Promise<VerifiedTopicPlanningTarget>;
  ensureTopicPlanningConversation(
    target: VerifiedTopicPlanningTarget,
  ): Promise<DbPlanningConversation>;
  listConversationMessages(conversationId: string): Promise<DbMessage[]>;
  listWorldNodesForAncestorContext(
    worldId: string,
  ): Promise<WorldNodeForAncestorPath[]>;
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

export function createDefaultTopicPlanningChatDeps(): TopicPlanningChatDeps {
  const openai = getOpenAIClient();

  return {
    resolveTopicPlanningConversation,
    ensureTopicPlanningConversation,
    listConversationMessages,
    listWorldNodesForAncestorContext,
    insertUserMessage,
    insertAssistantMessage,
    createAiRun,
    completeAiRun,
    failAiRun,
    getModel: getOpenAIModel,
    createResponseStream: (params, options) =>
      openai.responses.create(
        {
          model: params.model,
          input: params.input,
          stream: true,
          store: false,
          max_output_tokens: params.maxOutputTokens,
        },
        { signal: options.signal },
      ),
  };
}

export async function createTopicPlanningChatStream(
  params: TopicPlanningChatParams,
  deps: TopicPlanningChatDeps = createDefaultTopicPlanningChatDeps(),
): Promise<ReadableStream<Uint8Array>> {
  const target = await deps.resolveTopicPlanningConversation(
    params.worldId,
    params.nodeId,
  );
  const conversation = await deps.ensureTopicPlanningConversation(target);

  return createPlanningChatStream(
    {
      conversationId: conversation.id,
      content: params.content,
      signal: params.signal,
      prepareInputAfterUserInsert: async () => {
        const [messages, worldNodes] = await Promise.all([
          deps.listConversationMessages(conversation.id),
          deps.listWorldNodesForAncestorContext(target.world.id),
        ]);

        const ancestry = resolveAncestorContext(
          worldNodes,
          toWorldNodeForAncestorPath(target.node),
        );

        return buildTopicResponsesInput(messages, {
          worldName: target.world.name,
          worldDescription: target.world.description,
          ancestry,
          currentTitle: target.node.title,
          currentDescription: target.node.description,
          currentGoal: target.node.goal,
        });
      },
    },
    deps,
  );
}
