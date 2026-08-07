import { notFound } from "next/navigation";
import { RootPlanningChat } from "@/components/chat/RootPlanningChat";
import { TopicPlanningChat } from "@/components/chat/TopicPlanningChat";
import { AppShell } from "@/components/shell/AppShell";
import { DatabaseErrorState } from "@/components/universe/DatabaseErrorState";
import { mapPendingSuggestionToDto } from "@/lib/chat/root-planning-page-data";
import { loadTopicPlanningPageData } from "@/lib/chat/topic-planning-page-data";
import { mapDbMessagesToRootPlanningChatMessages } from "@/lib/chat/root-planning-messages";
import {
  RootPlanningNotFoundError,
  listConversationMessages,
  listWorldNodeTitles,
  resolveRootPlanningConversation,
} from "@/lib/db/chat";
import { listPendingBranchSuggestionsForConversation } from "@/lib/db/branch-suggestions";
import { PUBLIC_CHAT_ERROR_MESSAGE } from "@/lib/db/errors";
import {
  PlanningNodeTargetNotFoundError,
  loadPlanningNodeKind,
} from "@/lib/db/planning-node-target";
import { TopicPlanningNotFoundError } from "@/lib/db/topic-planning";
import {
  nodeIdParamSchema,
  worldIdParamSchema,
} from "@/lib/validation/schemas";
import type { TopicPlanningPageData } from "@/lib/chat/topic-planning-page-data";
import type { BranchSuggestionDto } from "@/lib/ai/branch-suggestion-api";
import type { RootPlanningChatMessage } from "@/lib/chat/root-planning-messages";

export const dynamic = "force-dynamic";

interface PlanningChatPageProps {
  params: Promise<{ worldId: string; nodeId: string }>;
}

type RootPlanningPageView = {
  kind: "root";
  worldId: string;
  worldName: string;
  nodeId: string;
  nodeTitle: string;
  initialMessages: RootPlanningChatMessage[];
  initialSuggestion: BranchSuggestionDto | null;
  hasInitialStructure: boolean;
};

type TopicPlanningPageView = {
  kind: "topic";
  pageData: TopicPlanningPageData;
};

type PlanningChatPageView = RootPlanningPageView | TopicPlanningPageView;

export default async function PlanningChatPage({
  params,
}: PlanningChatPageProps) {
  const { worldId, nodeId } = await params;
  const parsedWorldId = worldIdParamSchema.safeParse(worldId);
  const parsedNodeId = nodeIdParamSchema.safeParse(nodeId);

  if (!parsedWorldId.success || !parsedNodeId.success) {
    notFound();
  }

  let view: PlanningChatPageView | null = null;
  let databaseError = false;

  try {
    const kind = await loadPlanningNodeKind(
      parsedWorldId.data,
      parsedNodeId.data,
    );

    if (kind === "root") {
      const context = await resolveRootPlanningConversation(
        parsedWorldId.data,
        parsedNodeId.data,
      );

      const [persistedMessages, pendingSuggestions, currentNodeTitles] =
        await Promise.all([
          listConversationMessages(context.conversation.id),
          listPendingBranchSuggestionsForConversation(context.conversation.id),
          listWorldNodeTitles(context.world.id),
        ]);

      view = {
        kind: "root",
        worldId: context.world.id,
        worldName: context.world.name,
        nodeId: context.node.id,
        nodeTitle: context.node.title,
        initialMessages: mapDbMessagesToRootPlanningChatMessages(
          persistedMessages,
        ),
        initialSuggestion: mapPendingSuggestionToDto(pendingSuggestions),
        hasInitialStructure: currentNodeTitles.length > 0,
      };
    } else {
      const pageData = await loadTopicPlanningPageData(
        parsedWorldId.data,
        parsedNodeId.data,
      );

      view = {
        kind: "topic",
        pageData,
      };
    }
  } catch (error) {
    if (
      error instanceof PlanningNodeTargetNotFoundError ||
      error instanceof RootPlanningNotFoundError ||
      error instanceof TopicPlanningNotFoundError
    ) {
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

  if (!view) {
    notFound();
  }

  if (view.kind === "root") {
    return (
      <AppShell>
        <div className="root-planning-chat-page">
          <RootPlanningChat
            worldId={view.worldId}
            worldName={view.worldName}
            nodeId={view.nodeId}
            nodeTitle={view.nodeTitle}
            initialMessages={view.initialMessages}
            initialSuggestion={view.initialSuggestion}
            hasInitialStructure={view.hasInitialStructure}
          />
        </div>
      </AppShell>
    );
  }

  const { pageData } = view;

  return (
    <AppShell>
      <div className="root-planning-chat-page">
        <TopicPlanningChat
          worldId={pageData.worldId}
          nodeId={pageData.nodeId}
          worldName={pageData.worldName}
          topicTitle={pageData.topicTitle}
          topicGoal={pageData.topicGoal}
          breadcrumbTitles={pageData.breadcrumbTitles}
          initialMessages={pageData.initialMessages}
          planningBlocked={pageData.planningBlocked}
          blockedMessage={pageData.blockedMessage}
        />
      </div>
    </AppShell>
  );
}
