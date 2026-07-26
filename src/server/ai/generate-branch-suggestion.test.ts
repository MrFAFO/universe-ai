import type { ParsedResponse } from "openai/resources/responses/responses";
import { describe, expect, it, vi } from "vitest";
import {
  BRANCH_SUGGESTION_GENERATION_INSTRUCTION,
  type BranchSuggestionV1,
} from "@/lib/ai/branch-suggestion";
import {
  ROOT_PLANNING_SYSTEM_PROMPT,
  type RootPlanningPromptContext,
} from "@/lib/ai/prompt";
import {
  BRANCH_SUGGESTION_FORMAT_NAME,
  MAX_SUGGESTION_OUTPUT_TOKENS,
  buildSuggestionParseRequestParams,
  createDefaultGenerateBranchSuggestionDeps,
  generateBranchSuggestion,
  type GenerateBranchSuggestionDeps,
} from "@/server/ai/generate-branch-suggestion";
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

function makePromptContext(
  overrides: Partial<RootPlanningPromptContext> = {},
): RootPlanningPromptContext {
  return {
    worldName: "Test World",
    worldDescription: "A planning world",
    rootTitle: "Root",
    rootGoal: "Define the world",
    currentNodeTitles: ["Context"],
    ...overrides,
  };
}

const validSuggestion: BranchSuggestionV1 = {
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

function makeCompletedResponse(
  overrides: Partial<ParsedResponse<BranchSuggestionV1>> = {},
): ParsedResponse<BranchSuggestionV1> {
  return {
    id: "resp_suggestion_123",
    status: "completed",
    output_parsed: validSuggestion,
    usage: {
      input_tokens: 42,
      output_tokens: 17,
      total_tokens: 59,
    },
    output: [
      {
        id: "msg_1",
        type: "message",
        role: "assistant",
        status: "completed",
        content: [
          {
            type: "output_text",
            text: JSON.stringify(validSuggestion),
            annotations: [],
          },
        ],
      },
    ],
    ...overrides,
  } as ParsedResponse<BranchSuggestionV1>;
}

function createMockDeps(
  overrides: Partial<GenerateBranchSuggestionDeps> = {},
): GenerateBranchSuggestionDeps & {
  parseCalls: Array<{
    params: ReturnType<typeof buildSuggestionParseRequestParams>;
    options: { signal?: AbortSignal };
  }>;
} {
  const parseCalls: Array<{
    params: ReturnType<typeof buildSuggestionParseRequestParams>;
    options: { signal?: AbortSignal };
  }> = [];

  return {
    parseCalls,
    getModel: vi.fn(() => "gpt-test"),
    parseStructuredResponse: vi.fn(async (params, options) => {
      parseCalls.push({ params, options });
      return makeCompletedResponse();
    }),
    ...overrides,
  };
}

const sampleMessages = [
  makeMessage({ id: "m-1", role: "system", ordinal: 1, content: "System" }),
  makeMessage({ id: "m-2", role: "user", ordinal: 2, content: "Hello" }),
];

describe("buildSuggestionParseRequestParams", () => {
  it("requests the installed SDK native structured-output format", () => {
    const params = buildSuggestionParseRequestParams(
      "gpt-test",
      [
        { role: "system", content: "Code-owned system" },
        { role: "user", content: "Hello" },
        { role: "user", content: BRANCH_SUGGESTION_GENERATION_INSTRUCTION },
      ],
    );

    expect(params.model).toBe("gpt-test");
    expect(params.store).toBe(false);
    expect(params.max_output_tokens).toBe(MAX_SUGGESTION_OUTPUT_TOKENS);
    expect(params.text.format).toMatchObject({
      type: "json_schema",
      name: BRANCH_SUGGESTION_FORMAT_NAME,
      strict: true,
    });
    expect(params.input).toEqual([
      { role: "system", content: "Code-owned system" },
      { role: "user", content: "Hello" },
      { role: "user", content: BRANCH_SUGGESTION_GENERATION_INSTRUCTION },
    ]);
  });
});

describe("generateBranchSuggestion", () => {
  it("builds the request from the code-owned Root Planning input", async () => {
    const deps = createMockDeps();
    const promptContext = makePromptContext({ worldName: "Acme World" });

    await generateBranchSuggestion(sampleMessages, promptContext, { deps });

    expect(deps.parseCalls).toHaveLength(1);
    const input = deps.parseCalls[0]?.params.input;
    expect(input?.[0]).toMatchObject({ role: "system" });
    expect(input?.[0]?.content).toContain(ROOT_PLANNING_SYSTEM_PROMPT);
    expect(input?.[0]?.content).toContain('"worldName": "Acme World"');
    expect(input?.map((item) => item.content)).not.toContain("System");
    expect(input?.at(-1)).toEqual({
      role: "user",
      content: BRANCH_SUGGESTION_GENERATION_INSTRUCTION,
    });
  });

  it("uses the configured model", async () => {
    const deps = createMockDeps();

    await generateBranchSuggestion(sampleMessages, makePromptContext(), { deps });

    expect(deps.getModel).toHaveBeenCalledTimes(1);
    expect(deps.parseCalls[0]?.params.model).toBe("gpt-test");
  });

  it("uses store false and max_output_tokens 1024", async () => {
    const deps = createMockDeps();

    await generateBranchSuggestion(sampleMessages, makePromptContext(), { deps });

    expect(deps.parseCalls[0]?.params.store).toBe(false);
    expect(deps.parseCalls[0]?.params.max_output_tokens).toBe(1024);
  });

  it("returns a validated suggestion on successful structured output", async () => {
    const deps = createMockDeps();

    const result = await generateBranchSuggestion(
      sampleMessages,
      makePromptContext(),
      { deps },
    );

    expect(result).toEqual({
      ok: true,
      suggestion: validSuggestion,
      providerResponseId: "resp_suggestion_123",
      inputTokens: 42,
      outputTokens: 17,
    });
  });

  it("returns null token counts when usage is unavailable", async () => {
    const deps = createMockDeps({
      parseStructuredResponse: vi.fn(async () =>
        makeCompletedResponse({ usage: undefined }),
      ),
    });

    const result = await generateBranchSuggestion(
      sampleMessages,
      makePromptContext(),
      { deps },
    );

    expect(result).toMatchObject({
      ok: true,
      inputTokens: null,
      outputTokens: null,
    });
  });

  it("returns the provider response id when available", async () => {
    const deps = createMockDeps({
      parseStructuredResponse: vi.fn(async () =>
        makeCompletedResponse({ id: "resp_abc" }),
      ),
    });

    const result = await generateBranchSuggestion(
      sampleMessages,
      makePromptContext(),
      { deps },
    );

    expect(result).toMatchObject({
      ok: true,
      providerResponseId: "resp_abc",
    });
  });

  it("returns invalid_structured_output for malformed provider values", async () => {
    const deps = createMockDeps({
      parseStructuredResponse: vi.fn(async () =>
        makeCompletedResponse({
          output_parsed: {
            schemaVersion: 1,
            rationale: null,
            nodes: [],
          } as unknown as BranchSuggestionV1,
        }),
      ),
    });

    const result = await generateBranchSuggestion(
      sampleMessages,
      makePromptContext(),
      { deps },
    );

    expect(result).toEqual({
      ok: false,
      reason: "invalid_structured_output",
    });
  });

  it("returns provider_refusal when the response contains a refusal", async () => {
    const deps = createMockDeps({
      parseStructuredResponse: vi.fn(async () =>
        makeCompletedResponse({
          output: [
            {
              id: "msg_1",
              type: "message",
              role: "assistant",
              status: "completed",
              content: [{ type: "refusal", refusal: "I cannot help with that." }],
            },
          ],
        }),
      ),
    });

    const result = await generateBranchSuggestion(
      sampleMessages,
      makePromptContext(),
      { deps },
    );

    expect(result).toEqual({
      ok: false,
      reason: "provider_refusal",
    });
  });

  it("returns incomplete_response when the provider status is incomplete", async () => {
    const deps = createMockDeps({
      parseStructuredResponse: vi.fn(async () =>
        makeCompletedResponse({
          status: "incomplete",
        }),
      ),
    });

    const result = await generateBranchSuggestion(
      sampleMessages,
      makePromptContext(),
      { deps },
    );

    expect(result).toEqual({
      ok: false,
      reason: "incomplete_response",
    });
  });

  it("returns provider_error when the provider request fails", async () => {
    const deps = createMockDeps({
      parseStructuredResponse: vi.fn(async () => {
        throw new Error("Provider unavailable");
      }),
    });

    const result = await generateBranchSuggestion(
      sampleMessages,
      makePromptContext(),
      { deps },
    );

    expect(result).toEqual({
      ok: false,
      reason: "provider_error",
    });
  });

  it("returns aborted for a pre-aborted signal without calling OpenAI", async () => {
    const deps = createMockDeps();
    const controller = new AbortController();
    controller.abort();

    const result = await generateBranchSuggestion(
      sampleMessages,
      makePromptContext(),
      { deps, signal: controller.signal },
    );

    expect(result).toEqual({ ok: false, reason: "aborted" });
    expect(deps.parseStructuredResponse).not.toHaveBeenCalled();
  });

  it("returns aborted when the provider request is aborted", async () => {
    const deps = createMockDeps({
      parseStructuredResponse: vi.fn(async () => {
        throw new DOMException("Aborted", "AbortError");
      }),
    });

    const result = await generateBranchSuggestion(
      sampleMessages,
      makePromptContext(),
      { deps },
    );

    expect(result).toEqual({ ok: false, reason: "aborted" });
  });

  it("does not automatically retry after provider failure", async () => {
    const deps = createMockDeps({
      parseStructuredResponse: vi.fn(async () => {
        throw new Error("Provider unavailable");
      }),
    });

    await generateBranchSuggestion(sampleMessages, makePromptContext(), { deps });

    expect(deps.parseStructuredResponse).toHaveBeenCalledTimes(1);
  });

  it("exposes a production default dependency factory", () => {
    vi.stubEnv("OPENAI_API_KEY", "test-api-key");
    vi.stubEnv("OPENAI_MODEL", "test-model");

    try {
      const deps = createDefaultGenerateBranchSuggestionDeps();

      expect(typeof deps.getModel).toBe("function");
      expect(typeof deps.parseStructuredResponse).toBe("function");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
