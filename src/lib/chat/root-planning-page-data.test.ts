import { describe, expect, it } from "vitest";
import type { BranchSuggestionV1 } from "@/lib/ai/branch-suggestion";
import { mapPendingSuggestionToDto } from "@/lib/chat/root-planning-page-data";
import type { PersistedBranchSuggestion } from "@/lib/db/branch-suggestions";

const worldId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const conversationId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const parentNodeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const aiRunId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const validPayload: BranchSuggestionV1 = {
  schemaVersion: 1,
  rationale: "Split the work into focused areas.",
  nodes: [
    {
      title: "Context",
      description: "Memory and context building",
      goal: "Define context strategy",
    },
  ],
};

function makePersistedSuggestion(
  overrides: Partial<PersistedBranchSuggestion> = {},
): PersistedBranchSuggestion {
  return {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    worldId,
    conversationId,
    parentNodeId,
    aiRunId,
    status: "pending",
    schemaVersion: 1,
    payload: validPayload,
    createdAt: "2026-01-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("mapPendingSuggestionToDto", () => {
  it("returns null when no pending suggestion exists", () => {
    expect(mapPendingSuggestionToDto([])).toBeNull();
  });

  it("maps the first pending suggestion to a singular DTO", () => {
    const suggestion = makePersistedSuggestion();

    expect(mapPendingSuggestionToDto([suggestion])).toEqual({
      id: suggestion.id,
      worldId,
      conversationId,
      parentNodeId,
      aiRunId,
      status: "pending",
      schemaVersion: 1,
      payload: validPayload,
      createdAt: "2026-01-01T12:00:00.000Z",
    });
  });

  it("uses only the first pending suggestion when multiple are supplied", () => {
    const first = makePersistedSuggestion({
      id: "11111111-1111-4111-8111-111111111111",
    });
    const second = makePersistedSuggestion({
      id: "22222222-2222-4222-8222-222222222222",
    });

    expect(mapPendingSuggestionToDto([first, second])?.id).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
  });
});
