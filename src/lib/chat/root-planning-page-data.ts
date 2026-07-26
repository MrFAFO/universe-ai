import {
  toBranchSuggestionDto,
  type BranchSuggestionDto,
} from "@/lib/ai/branch-suggestion-api";
import type { PersistedBranchSuggestion } from "@/lib/db/branch-suggestions";

export function mapPendingSuggestionToDto(
  suggestions: PersistedBranchSuggestion[],
): BranchSuggestionDto | null {
  const pending = suggestions[0];

  if (!pending) {
    return null;
  }

  return toBranchSuggestionDto({
    id: pending.id,
    worldId: pending.worldId,
    conversationId: pending.conversationId,
    parentNodeId: pending.parentNodeId,
    aiRunId: pending.aiRunId,
    status: "pending",
    schemaVersion: 1,
    payload: pending.payload,
    createdAt: pending.createdAt,
  });
}
