import { notFound } from "next/navigation";
import { RootPlanningChat } from "@/components/chat/RootPlanningChat";
import { AppShell } from "@/components/shell/AppShell";
import { DatabaseErrorState } from "@/components/universe/DatabaseErrorState";
import { mapDbMessagesToRootPlanningChatMessages } from "@/lib/chat/root-planning-messages";
import { mapPendingSuggestionToDto } from "@/lib/chat/root-planning-page-data";
import {
  RootPlanningNotFoundError,
  listConversationMessages,
  listWorldNodeTitles,
  resolveRootPlanningConversation,
  type RootPlanningContext,
} from "@/lib/db/chat";
import { listPendingBranchSuggestionsForConversation } from "@/lib/db/branch-suggestions";
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
  let initialMessages = null;
  let initialSuggestion = null;
  let hasInitialStructure = false;
  let databaseError = false;

  try {
    context = await resolveRootPlanningConversation(
      parsedWorldId.data,
      parsedNodeId.data,
    );

    const [persistedMessages, pendingSuggestions, currentNodeTitles] =
      await Promise.all([
        listConversationMessages(context.conversation.id),
        listPendingBranchSuggestionsForConversation(context.conversation.id),
        listWorldNodeTitles(context.world.id),
      ]);

    initialMessages = mapDbMessagesToRootPlanningChatMessages(persistedMessages);
    initialSuggestion = mapPendingSuggestionToDto(pendingSuggestions);
    hasInitialStructure = currentNodeTitles.length > 0;
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

  if (!context || !initialMessages) {
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
          initialMessages={initialMessages}
          initialSuggestion={initialSuggestion}
          hasInitialStructure={hasInitialStructure}
        />
      </div>
    </AppShell>
  );
}
