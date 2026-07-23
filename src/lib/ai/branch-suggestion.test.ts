import { describe, expect, it } from "vitest";
import {
  BRANCH_SUGGESTION_GENERATION_INSTRUCTION,
  BRANCH_SUGGESTION_MAX_NODES,
  BRANCH_SUGGESTION_RATIONALE_MAX,
  SUGGESTED_NODE_DESCRIPTION_MAX,
  SUGGESTED_NODE_GOAL_MAX,
  SUGGESTED_NODE_TITLE_MAX,
  buildBranchSuggestionInput,
  parseBranchSuggestion,
  type BranchSuggestionV1,
} from "@/lib/ai/branch-suggestion";
import { ToolMessageNotSupportedError } from "@/lib/ai/prompt";
import type { DbMessage } from "@/types/db";

const conversationId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function makeMessage(
  overrides: Partial<DbMessage> & Pick<DbMessage, "id" | "role" | "ordinal">,
): DbMessage {
  return {
    conversation_id: conversationId,
    content: "Message content",
    ai_run_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function validPayload(
  overrides: Partial<BranchSuggestionV1> = {},
): BranchSuggestionV1 {
  return {
    schemaVersion: 1,
    rationale: "Split the work into focused areas.",
    nodes: [
      {
        title: "Context",
        description: "Memory and context building",
        goal: "Define context strategy",
      },
    ],
    ...overrides,
  };
}

describe("parseBranchSuggestion", () => {
  it("accepts a valid version 1 payload", () => {
    const payload = validPayload();

    expect(parseBranchSuggestion(payload)).toEqual({
      ok: true,
      suggestion: payload,
    });
  });

  it("accepts nullable rationale, description, and goal", () => {
    const payload = validPayload({
      rationale: null,
      nodes: [
        {
          title: "Branch A",
          description: null,
          goal: null,
        },
      ],
    });

    expect(parseBranchSuggestion(payload)).toEqual({
      ok: true,
      suggestion: payload,
    });
  });

  it("rejects an empty nodes array", () => {
    expect(
      parseBranchSuggestion(
        validPayload({
          nodes: [],
        }),
      ),
    ).toEqual({ ok: false, reason: "invalid_structured_output" });
  });

  it("rejects more than 6 nodes", () => {
    expect(
      parseBranchSuggestion(
        validPayload({
          nodes: Array.from({ length: BRANCH_SUGGESTION_MAX_NODES + 1 }, (_, index) => ({
            title: `Branch ${index + 1}`,
            description: null,
            goal: null,
          })),
        }),
      ),
    ).toEqual({ ok: false, reason: "invalid_structured_output" });
  });

  it("rejects a missing title", () => {
    expect(
      parseBranchSuggestion({
        schemaVersion: 1,
        rationale: null,
        nodes: [{ description: null, goal: null }],
      }),
    ).toEqual({ ok: false, reason: "invalid_structured_output" });
  });

  it("rejects a blank title", () => {
    expect(
      parseBranchSuggestion(
        validPayload({
          nodes: [{ title: "   ", description: null, goal: null }],
        }),
      ),
    ).toEqual({ ok: false, reason: "invalid_structured_output" });
  });

  it("rejects a title over 120 characters", () => {
    expect(
      parseBranchSuggestion(
        validPayload({
          nodes: [
            {
              title: "a".repeat(SUGGESTED_NODE_TITLE_MAX + 1),
              description: null,
              goal: null,
            },
          ],
        }),
      ),
    ).toEqual({ ok: false, reason: "invalid_structured_output" });
  });

  it("rejects a description over 500 characters", () => {
    expect(
      parseBranchSuggestion(
        validPayload({
          nodes: [
            {
              title: "Branch",
              description: "a".repeat(SUGGESTED_NODE_DESCRIPTION_MAX + 1),
              goal: null,
            },
          ],
        }),
      ),
    ).toEqual({ ok: false, reason: "invalid_structured_output" });
  });

  it("rejects a goal over 1000 characters", () => {
    expect(
      parseBranchSuggestion(
        validPayload({
          nodes: [
            {
              title: "Branch",
              description: null,
              goal: "a".repeat(SUGGESTED_NODE_GOAL_MAX + 1),
            },
          ],
        }),
      ),
    ).toEqual({ ok: false, reason: "invalid_structured_output" });
  });

  it("rejects a rationale over 800 characters", () => {
    expect(
      parseBranchSuggestion(
        validPayload({
          rationale: "a".repeat(BRANCH_SUGGESTION_RATIONALE_MAX + 1),
        }),
      ),
    ).toEqual({ ok: false, reason: "invalid_structured_output" });
  });

  it("rejects an unsupported schemaVersion", () => {
    expect(
      parseBranchSuggestion({
        ...validPayload(),
        schemaVersion: 2,
      }),
    ).toEqual({ ok: false, reason: "invalid_structured_output" });
  });

  it("returns a safe parse failure for malformed non-object values", () => {
    expect(parseBranchSuggestion(null)).toEqual({
      ok: false,
      reason: "invalid_structured_output",
    });
    expect(parseBranchSuggestion("not-an-object")).toEqual({
      ok: false,
      reason: "invalid_structured_output",
    });
  });

  it("rejects an unexpected top-level field", () => {
    expect(
      parseBranchSuggestion({
        ...validPayload(),
        extra: "field",
      }),
    ).toEqual({ ok: false, reason: "invalid_structured_output" });
  });

  it("rejects an unexpected node field", () => {
    expect(
      parseBranchSuggestion(
        validPayload({
          nodes: [
            {
              title: "Branch",
              description: null,
              goal: null,
              extra: "field",
            },
          ],
        }),
      ),
    ).toEqual({ ok: false, reason: "invalid_structured_output" });
  });
});

describe("buildBranchSuggestionInput", () => {
  it("preserves chronological history from the persisted conversation", () => {
    const input = buildBranchSuggestionInput([
      makeMessage({ id: "m-3", role: "assistant", ordinal: 3, content: "Third" }),
      makeMessage({ id: "m-1", role: "system", ordinal: 1, content: "System" }),
      makeMessage({ id: "m-2", role: "user", ordinal: 2, content: "Second" }),
    ]);

    expect(input.slice(0, 3)).toEqual([
      { role: "system", content: "System" },
      { role: "user", content: "Second" },
      { role: "assistant", content: "Third" },
    ]);
  });

  it("includes the persisted system message exactly once", () => {
    const input = buildBranchSuggestionInput([
      makeMessage({ id: "m-1", role: "system", ordinal: 1, content: "Root system" }),
      makeMessage({ id: "m-2", role: "user", ordinal: 2, content: "Hello" }),
    ]);

    const systemMessages = input.filter((item) => item.role === "system");
    expect(systemMessages).toHaveLength(1);
    expect(systemMessages[0]).toEqual({
      role: "system",
      content: "Root system",
    });
  });

  it("includes the generation instruction exactly once as the final user message", () => {
    const input = buildBranchSuggestionInput([
      makeMessage({ id: "m-1", role: "system", ordinal: 1, content: "Root system" }),
      makeMessage({ id: "m-2", role: "user", ordinal: 2, content: "Hello" }),
    ]);

    const instructionMessages = input.filter(
      (item) => item.content === BRANCH_SUGGESTION_GENERATION_INSTRUCTION,
    );

    expect(instructionMessages).toHaveLength(1);
    expect(instructionMessages[0]).toEqual({
      role: "user",
      content: BRANCH_SUGGESTION_GENERATION_INSTRUCTION,
    });
    expect(input.at(-1)).toEqual(instructionMessages[0]);
  });

  it("preserves existing tool-message rejection behavior", () => {
    expect(() =>
      buildBranchSuggestionInput([
        makeMessage({ id: "m-tool", role: "tool", ordinal: 1, content: "tool output" }),
      ]),
    ).toThrow(ToolMessageNotSupportedError);

    expect(() =>
      buildBranchSuggestionInput([
        makeMessage({ id: "m-tool", role: "tool", ordinal: 1, content: "tool output" }),
      ]),
    ).toThrow(/Tool messages are not supported in Stage C chat/);
  });
});
