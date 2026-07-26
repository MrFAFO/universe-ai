import type { ParsedResponse } from "openai/resources/responses/responses";
import { describe, expect, it, vi } from "vitest";
import type { BranchSuggestionV1 } from "@/lib/ai/branch-suggestion";
import {
  ROOT_PLANNING_SYSTEM_PROMPT,
  type RootPlanningPromptContext,
} from "@/lib/ai/prompt";
import {
  STRUCTURE_ASSESSMENT_GENERATION_INSTRUCTION,
  type StructureAssessmentV1,
} from "@/lib/ai/structure-assessment";
import {
  MAX_SUGGESTION_OUTPUT_TOKENS,
  STRUCTURE_ASSESSMENT_FORMAT_NAME,
  buildStructureAssessmentParseRequestParams,
  createDefaultGenerateStructureAssessmentDeps,
  generateStructureAssessment,
  type GenerateStructureAssessmentDeps,
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

const readyAssessment: StructureAssessmentV1 = {
  schemaVersion: 1,
  readiness: "ready",
  missingInformation: null,
  questions: null,
  proposal: validSuggestion,
};

const insufficientAssessment: StructureAssessmentV1 = {
  schemaVersion: 1,
  readiness: "insufficient",
  missingInformation: ["Primary audience"],
  questions: ["Who is the primary audience for this World?"],
  proposal: null,
};

function makeCompletedResponse(
  assessment: StructureAssessmentV1,
  overrides: Partial<ParsedResponse<StructureAssessmentV1>> = {},
): ParsedResponse<StructureAssessmentV1> {
  return {
    id: "resp_assessment_123",
    status: "completed",
    output_parsed: assessment,
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
            text: JSON.stringify(assessment),
            annotations: [],
          },
        ],
      },
    ],
    ...overrides,
  } as ParsedResponse<StructureAssessmentV1>;
}

function createMockDeps(
  overrides: Partial<GenerateStructureAssessmentDeps> = {},
): GenerateStructureAssessmentDeps & {
  parseCalls: Array<{
    params: ReturnType<typeof buildStructureAssessmentParseRequestParams>;
    options: { signal?: AbortSignal };
  }>;
} {
  const parseCalls: Array<{
    params: ReturnType<typeof buildStructureAssessmentParseRequestParams>;
    options: { signal?: AbortSignal };
  }> = [];

  return {
    parseCalls,
    getModel: vi.fn(() => "gpt-test"),
    parseStructuredResponse: vi.fn(async (params, options) => {
      parseCalls.push({ params, options });
      return makeCompletedResponse(readyAssessment);
    }),
    ...overrides,
  };
}

const sampleMessages = [
  makeMessage({ id: "m-1", role: "system", ordinal: 1, content: "System" }),
  makeMessage({ id: "m-2", role: "user", ordinal: 2, content: "Hello" }),
];

describe("buildStructureAssessmentParseRequestParams", () => {
  it("requests the structure assessment schema with a 2048 token limit", () => {
    const params = buildStructureAssessmentParseRequestParams(
      "gpt-test",
      [
        { role: "system", content: "Code-owned system" },
        { role: "user", content: "Hello" },
        { role: "user", content: STRUCTURE_ASSESSMENT_GENERATION_INSTRUCTION },
      ],
    );

    expect(params.model).toBe("gpt-test");
    expect(params.store).toBe(false);
    expect(params.max_output_tokens).toBe(MAX_SUGGESTION_OUTPUT_TOKENS);
    expect(params.max_output_tokens).toBe(2048);
    expect(params.text.format).toMatchObject({
      type: "json_schema",
      name: STRUCTURE_ASSESSMENT_FORMAT_NAME,
      strict: true,
    });
  });
});

describe("generateStructureAssessment", () => {
  it("builds the request from the code-owned Root Planning input", async () => {
    const deps = createMockDeps();
    const promptContext = makePromptContext({ worldName: "Acme World" });

    await generateStructureAssessment(sampleMessages, promptContext, { deps });

    expect(deps.parseCalls).toHaveLength(1);
    const input = deps.parseCalls[0]?.params.input;
    expect(input?.[0]?.content).toContain(ROOT_PLANNING_SYSTEM_PROMPT);
    expect(input?.[0]?.content).toContain('"worldName": "Acme World"');
    expect(input?.map((item) => item.content)).not.toContain("System");
    expect(input?.at(-1)).toEqual({
      role: "user",
      content: STRUCTURE_ASSESSMENT_GENERATION_INSTRUCTION,
    });
  });

  it("returns a validated ready assessment on successful structured output", async () => {
    const deps = createMockDeps();

    const result = await generateStructureAssessment(
      sampleMessages,
      makePromptContext(),
      { deps },
    );

    expect(result).toEqual({
      ok: true,
      assessment: readyAssessment,
      providerResponseId: "resp_assessment_123",
      inputTokens: 42,
      outputTokens: 17,
    });
  });

  it("returns a validated insufficient assessment on successful structured output", async () => {
    const deps = createMockDeps({
      parseStructuredResponse: vi.fn(async () =>
        makeCompletedResponse(insufficientAssessment),
      ),
    });

    const result = await generateStructureAssessment(
      sampleMessages,
      makePromptContext(),
      { deps },
    );

    expect(result).toEqual({
      ok: true,
      assessment: insufficientAssessment,
      providerResponseId: "resp_assessment_123",
      inputTokens: 42,
      outputTokens: 17,
    });
  });

  it("returns invalid_structured_output for inconsistent envelopes", async () => {
    const deps = createMockDeps({
      parseStructuredResponse: vi.fn(async () =>
        makeCompletedResponse({
          schemaVersion: 1,
          readiness: "ready",
          missingInformation: null,
          questions: ["What is the goal?"],
          proposal: validSuggestion,
        }),
      ),
    });

    const result = await generateStructureAssessment(
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
        makeCompletedResponse(readyAssessment, {
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

    const result = await generateStructureAssessment(
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
        makeCompletedResponse(readyAssessment, {
          status: "incomplete",
        }),
      ),
    });

    const result = await generateStructureAssessment(
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

    const result = await generateStructureAssessment(
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

    const result = await generateStructureAssessment(
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

    const result = await generateStructureAssessment(
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

    await generateStructureAssessment(sampleMessages, makePromptContext(), { deps });

    expect(deps.parseStructuredResponse).toHaveBeenCalledTimes(1);
  });

  it("exposes a production default dependency factory", () => {
    vi.stubEnv("OPENAI_API_KEY", "test-api-key");
    vi.stubEnv("OPENAI_MODEL", "test-model");

    try {
      const deps = createDefaultGenerateStructureAssessmentDeps();

      expect(typeof deps.getModel).toBe("function");
      expect(typeof deps.parseStructuredResponse).toBe("function");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
