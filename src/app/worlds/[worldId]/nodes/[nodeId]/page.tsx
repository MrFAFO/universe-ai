import { notFound } from "next/navigation";
import {
  RootPlanningChat,
  type RootPlanningChatMessage,
} from "@/components/chat/RootPlanningChat";
import { AppShell } from "@/components/shell/AppShell";
import { DatabaseErrorState } from "@/components/universe/DatabaseErrorState";
import {
  RootPlanningNotFoundError,
  listConversationMessages,
  resolveRootPlanningConversation,
  type RootPlanningContext,
} from "@/lib/db/chat";
import { PUBLIC_CHAT_ERROR_MESSAGE } from "@/lib/db/errors";
import {
  nodeIdParamSchema,
  worldIdParamSchema,
} from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

interface RootPlanningChatPageProps {
  params: Promise<{ worldId: string; nodeId: string }>;
}

export default async function RootPlanningChatPage({
  params,
}: RootPlanningChatPageProps) {
  const { worldId, nodeId } = await params;
  const parsedWorldId = worldIdParamSchema.safeParse(worldId);
  const parsedNodeId = nodeIdParamSchema.safeParse(nodeId);

  if (!parsedWorldId.success || !parsedNodeId.success) {
    notFound();
  }

  let context: RootPlanningContext | null = null;
  let visibleMessages: RootPlanningChatMessage[] | null = null;
  let databaseError = false;

  try {
    context = await resolveRootPlanningConversation(
      parsedWorldId.data,
      parsedNodeId.data,
    );
    const persistedMessages = await listConversationMessages(
      context.conversation.id,
    );
    visibleMessages = persistedMessages
      .filter(
        (message) => message.role === "user" || message.role === "assistant",
      )
      .map((message) => ({
        id: message.id,
        role: message.role as "user" | "assistant",
        content: message.content,
        status: "complete" as const,
      }));
  } catch (error) {
    if (error instanceof RootPlanningNotFoundError) {
      notFound();
    }

    databaseError = true;
  }

  if (databaseError) {
    return (
      <AppShell>
        <div className="root-planning-chat-page root-planning-chat-page--error">
          <DatabaseErrorState
            title="Unable to open planning chat"
            message={PUBLIC_CHAT_ERROR_MESSAGE}
          />
        </div>
      </AppShell>
    );
  }

  if (!context || !visibleMessages) {
    notFound();
  }

  return (
    <AppShell>
      <div className="root-planning-chat-page">
        <RootPlanningChat
          worldId={context.world.id}
          worldName={context.world.name}
          nodeId={context.node.id}
          nodeTitle={context.node.title}
          initialMessages={visibleMessages}
        />
      </div>
    </AppShell>
  );
}
