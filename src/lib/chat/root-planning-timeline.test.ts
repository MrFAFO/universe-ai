import { describe, expect, it } from "vitest";
import type { BranchSuggestionDto } from "@/lib/ai/branch-suggestion-api";
import type { RootPlanningChatMessage } from "@/lib/chat/root-planning-messages";
import { buildRootPlanningTimeline } from "@/lib/chat/root-planning-timeline";

const worldId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const conversationId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const parentNodeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const aiRunId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function makeMessage(
  overrides: Partial<RootPlanningChatMessage> = {},
): RootPlanningChatMessage {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    role: "user",
    content: "Hello",
    status: "complete",
    createdAt: "2026-01-01T10:00:00.000Z",
    ...overrides,
  };
}

function makeSuggestion(
  overrides: Partial<BranchSuggestionDto> = {},
): BranchSuggestionDto {
  return {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    worldId,
    conversationId,
    parentNodeId,
    aiRunId,
    status: "pending",
    schemaVersion: 1,
    payload: {
      schemaVersion: 1,
      rationale: "Split the work into focused areas.",
      nodes: [
        {
          title: "Context",
          description: "Memory and context building",
          goal: "Define context strategy",
        },
      ],
    },
    createdAt: "2026-01-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("buildRootPlanningTimeline", () => {
  it("preserves message order when no suggestion exists", () => {
    const messages = [
      makeMessage({
        id: "msg-1",
        createdAt: "2026-01-01T10:00:00.000Z",
      }),
      makeMessage({
        id: "msg-2",
        role: "assistant",
        createdAt: "2026-01-01T11:00:00.000Z",
      }),
    ];

    const timeline = buildRootPlanningTimeline(messages, null);

    expect(timeline.map((item) => item.type === "message" && item.id)).toEqual([
      "msg-1",
      "msg-2",
    ]);
  });

  it("inserts the suggestion between earlier and later messages", () => {
    const messages = [
      makeMessage({
        id: "before",
        createdAt: "2026-01-01T10:00:00.000Z",
      }),
      makeMessage({
        id: "after",
        role: "assistant",
        createdAt: "2026-01-01T14:00:00.000Z",
      }),
    ];
    const suggestion = makeSuggestion({
      createdAt: "2026-01-01T12:00:00.000Z",
    });

    const timeline = buildRootPlanningTimeline(messages, suggestion);

    expect(
      timeline.map((item) =>
        item.type === "message" ? item.id : `suggestion:${item.suggestion.id}`,
      ),
    ).toEqual(["before", `suggestion:${suggestion.id}`, "after"]);
  });

  it("places a suggestion older than all messages first", () => {
    const messages = [
      makeMessage({
        id: "later",
        createdAt: "2026-01-01T12:00:00.000Z",
      }),
    ];
    const suggestion = makeSuggestion({
      createdAt: "2026-01-01T08:00:00.000Z",
    });

    const timeline = buildRootPlanningTimeline(messages, suggestion);

    expect(timeline[0]?.type).toBe("suggestion");
    expect(timeline[1]?.type).toBe("message");
  });

  it("places a suggestion newer than all messages last", () => {
    const messages = [
      makeMessage({
        id: "earlier",
        createdAt: "2026-01-01T08:00:00.000Z",
      }),
    ];
    const suggestion = makeSuggestion({
      createdAt: "2026-01-01T12:00:00.000Z",
    });

    const timeline = buildRootPlanningTimeline(messages, suggestion);

    expect(timeline[0]?.type).toBe("message");
    expect(timeline[1]?.type).toBe("suggestion");
  });

  it("does not mutate the input message array", () => {
    const messages = [
      makeMessage({ id: "msg-1" }),
      makeMessage({ id: "msg-2", createdAt: "2026-01-01T11:00:00.000Z" }),
    ];
    const snapshot = messages.map((message) => ({ ...message }));

    buildRootPlanningTimeline(messages, makeSuggestion());

    expect(messages).toEqual(snapshot);
  });

  it("uses stable ordering for equal timestamps", () => {
    const messages = [
      makeMessage({
        id: "msg-b",
        createdAt: "2026-01-01T10:00:00.000Z",
      }),
      makeMessage({
        id: "msg-a",
        createdAt: "2026-01-01T10:00:00.000Z",
      }),
    ];
    const suggestion = makeSuggestion({
      createdAt: "2026-01-01T10:00:00.000Z",
    });

    const timeline = buildRootPlanningTimeline(messages, suggestion);

    expect(
      timeline.map((item) =>
        item.type === "message" ? item.id : "suggestion",
      ),
    ).toEqual(["msg-b", "msg-a", "suggestion"]);
  });
});
