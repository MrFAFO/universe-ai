import type { BranchSuggestionDto } from "@/lib/ai/branch-suggestion-api";
import type { RootPlanningChatMessage } from "@/lib/chat/root-planning-messages";

export type RootPlanningTimelineMessage = RootPlanningChatMessage & {
  type: "message";
};

export type RootPlanningTimelineSuggestion = {
  type: "suggestion";
  suggestion: BranchSuggestionDto;
  createdAt: string;
};

export type RootPlanningTimelineItem =
  | RootPlanningTimelineMessage
  | RootPlanningTimelineSuggestion;

type SortableTimelineItem = RootPlanningTimelineItem & {
  sortIndex: number;
};

export function buildRootPlanningTimeline(
  messages: ReadonlyArray<RootPlanningChatMessage>,
  suggestion: BranchSuggestionDto | null,
): RootPlanningTimelineItem[] {
  const items: SortableTimelineItem[] = messages.map((message, index) => ({
    type: "message",
    ...message,
    sortIndex: index,
  }));

  if (suggestion) {
    items.push({
      type: "suggestion",
      suggestion,
      createdAt: suggestion.createdAt,
      sortIndex: messages.length,
    });
  }

  return items
    .slice()
    .sort((left, right) => {
      const byCreatedAt = left.createdAt.localeCompare(right.createdAt);
      if (byCreatedAt !== 0) {
        return byCreatedAt;
      }

      if (left.type !== right.type) {
        return left.type === "message" ? -1 : 1;
      }

      return left.sortIndex - right.sortIndex;
    })
    .map((item) => {
      const { sortIndex, ...rest } = item;
      void sortIndex;
      return rest;
    });
}
