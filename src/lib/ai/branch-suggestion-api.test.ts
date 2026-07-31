import { describe, expect, it } from "vitest";
import {
  parseApproveBranchSuggestionResponse,
  parsePostBranchSuggestionResponse,
  parseRejectBranchSuggestionResponse,
  postBranchSuggestionResponseSchema,
} from "@/lib/ai/branch-suggestion-api";

const worldId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const conversationId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const parentNodeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const aiRunId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const suggestionId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

describe("parsePostBranchSuggestionResponse", () => {
  it("parses a proposal outcome", () => {
    const raw = {
      outcome: "proposal",
      suggestion: {
        id: suggestionId,
        worldId,
        conversationId,
        parentNodeId,
        aiRunId,
        status: "pending",
        schemaVersion: 1,
        payload: {
          schemaVersion: 1,
          rationale: null,
          nodes: [{ title: "Context", description: null, goal: null }],
        },
        createdAt: "2026-01-01T00:00:02.000Z",
      },
    };

    expect(parsePostBranchSuggestionResponse(raw)).toEqual(raw);
  });

  it("parses a discovery outcome", () => {
    const raw = {
      outcome: "discovery",
      message: {
        id: "11111111-1111-4111-8111-111111111111",
        role: "assistant",
        content: "I need a little more context before I can propose a useful initial structure:\n\n1. What is the goal?",
        createdAt: "2026-01-01T00:00:03.000Z",
      },
    };

    expect(parsePostBranchSuggestionResponse(raw)).toEqual(raw);
  });

  it("rejects malformed union variants", () => {
    expect(() =>
      parsePostBranchSuggestionResponse({
        outcome: "proposal",
      }),
    ).toThrow();

    expect(() =>
      parsePostBranchSuggestionResponse({
        outcome: "discovery",
        message: {
          id: "11111111-1111-4111-8111-111111111111",
          role: "user",
          content: "Not assistant",
          createdAt: "2026-01-01T00:00:03.000Z",
        },
      }),
    ).toThrow();

    expect(
      postBranchSuggestionResponseSchema.safeParse({
        outcome: "unknown",
        suggestion: {},
      }).success,
    ).toBe(false);
  });

  it("rejects a Discovery message with an unexpected extra field", () => {
    expect(() =>
      parsePostBranchSuggestionResponse({
        outcome: "discovery",
        message: {
          id: "11111111-1111-4111-8111-111111111111",
          role: "assistant",
          content: "What is the primary goal?",
          createdAt: "2026-01-01T00:00:03.000Z",
          extra: "field",
        },
      }),
    ).toThrow();
  });

  it("rejects a Discovery outcome containing an unexpected suggestion field", () => {
    expect(() =>
      parsePostBranchSuggestionResponse({
        outcome: "discovery",
        message: {
          id: "11111111-1111-4111-8111-111111111111",
          role: "assistant",
          content: "What is the primary goal?",
          createdAt: "2026-01-01T00:00:03.000Z",
        },
        suggestion: {
          id: suggestionId,
          worldId,
          conversationId,
          parentNodeId,
          aiRunId,
          status: "pending",
          schemaVersion: 1,
          payload: {
            schemaVersion: 1,
            rationale: null,
            nodes: [{ title: "Context", description: null, goal: null }],
          },
          createdAt: "2026-01-01T00:00:02.000Z",
        },
      }),
    ).toThrow();
  });

  it("rejects a Proposal outcome containing an unexpected message field", () => {
    expect(() =>
      parsePostBranchSuggestionResponse({
        outcome: "proposal",
        suggestion: {
          id: suggestionId,
          worldId,
          conversationId,
          parentNodeId,
          aiRunId,
          status: "pending",
          schemaVersion: 1,
          payload: {
            schemaVersion: 1,
            rationale: null,
            nodes: [{ title: "Context", description: null, goal: null }],
          },
          createdAt: "2026-01-01T00:00:02.000Z",
        },
        message: {
          id: "11111111-1111-4111-8111-111111111111",
          role: "assistant",
          content: "What is the primary goal?",
          createdAt: "2026-01-01T00:00:03.000Z",
        },
      }),
    ).toThrow();
  });
});

describe("parseApproveBranchSuggestionResponse", () => {
  it("parses a valid approval response", () => {
    const raw = {
      outcome: "approved",
      suggestionId,
      createdNodeIds: [parentNodeId],
      idempotent: false,
    };

    expect(parseApproveBranchSuggestionResponse(raw)).toEqual(raw);
  });

  it("rejects malformed approval responses", () => {
    expect(() =>
      parseApproveBranchSuggestionResponse({
        outcome: "approved",
        suggestionId: "not-a-uuid",
        createdNodeIds: [],
        idempotent: false,
      }),
    ).toThrow();

    expect(() =>
      parseApproveBranchSuggestionResponse({
        outcome: "approved",
        suggestionId,
        createdNodeIds: [],
        idempotent: false,
        extra: true,
      }),
    ).toThrow();
  });
});

describe("parseRejectBranchSuggestionResponse", () => {
  it("parses a valid rejection response", () => {
    const raw = {
      outcome: "rejected",
      suggestionId,
      decidedAt: "2026-01-02T00:00:00.000Z",
      idempotent: true,
    };

    expect(parseRejectBranchSuggestionResponse(raw)).toEqual(raw);
  });

  it("rejects malformed rejection responses", () => {
    expect(() =>
      parseRejectBranchSuggestionResponse({
        outcome: "rejected",
        suggestionId,
        decidedAt: "2026-01-02T00:00:00.000Z",
        idempotent: true,
        extra: true,
      }),
    ).toThrow();

    expect(() =>
      parseRejectBranchSuggestionResponse({
        outcome: "approved",
        suggestionId,
        decidedAt: "2026-01-02T00:00:00.000Z",
        idempotent: true,
      }),
    ).toThrow();
  });
});
