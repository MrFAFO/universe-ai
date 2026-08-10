import "server-only";

import { buildResponsesInput } from "@/lib/ai/prompt";
import { getOpenAIClient, getOpenAIModel } from "@/lib/ai/openai";
import {
  failAiRun,
  insertUserMessage,
  listConversationMessages,
  listWorldNodeTitles,
  resolveRootPlanningConversation,
  type RootPlanningContext,
} from "@/lib/db/chat";
import {
  beginPlanningChatAiRun,
  completePlanningChatRun,
} from "@/lib/db/planning-chat-runs";
import type { DbMessage } from "@/types/db";
import {
  createPlanningChatStream,
  type PlanningChatStreamDeps,
} from "@/server/chat/planning-chat-stream";

export { MAX_OUTPUT_TOKENS } from "@/server/chat/planning-chat-stream";

export interface RootPlanningChatDeps extends PlanningChatStreamDeps {
  resolveRootPlanningConversation(
    worldId: string,
    nodeId: string,
  ): Promise<RootPlanningContext>;
  listConversationMessages(conversationId: string): Promise<DbMessage[]>;
  listWorldNodeTitles(worldId: string): Promise<string[]>;
}

export function createDefaultRootPlanningChatDeps(): RootPlanningChatDeps {
  const openai = getOpenAIClient();

  return {
    resolveRootPlanningConversation,
    listConversationMessages,
    listWorldNodeTitles,
    insertUserMessage,
    beginPlanningChatAiRun,
    completePlanningChatRun,
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

export async function createRootPlanningChatStream(
  params: {
    worldId: string;
    nodeId: string;
    content: string;
    signal?: AbortSignal;
  },
  deps: RootPlanningChatDeps = createDefaultRootPlanningChatDeps(),
): Promise<ReadableStream<Uint8Array>> {
  const context = await deps.resolveRootPlanningConversation(
    params.worldId,
    params.nodeId,
  );

  return createPlanningChatStream(
    {
      conversationId: context.conversation.id,
      content: params.content,
      signal: params.signal,
      prepareInputAfterUserInsert: async () => {
        const [messages, currentNodeTitles] = await Promise.all([
          deps.listConversationMessages(context.conversation.id),
          deps.listWorldNodeTitles(context.world.id),
        ]);

        return buildResponsesInput(messages, {
          worldName: context.world.name,
          worldDescription: context.world.description,
          rootTitle: context.node.title,
          rootGoal: context.node.goal,
          currentNodeTitles,
        });
      },
    },
    deps,
  );
}
