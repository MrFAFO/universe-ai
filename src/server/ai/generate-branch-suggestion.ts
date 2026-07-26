import "server-only";

import { zodTextFormat } from "openai/helpers/zod";
import type { ParsedResponse } from "openai/resources/responses/responses";
import {
  buildStructureAssessmentInput,
  parseStructureAssessment,
  structureAssessmentV1Schema,
  type StructureAssessmentV1,
} from "@/lib/ai/structure-assessment";
import { getOpenAIClient, getOpenAIModel } from "@/lib/ai/openai";
import type { RootPlanningPromptContext } from "@/lib/ai/prompt";
import type { DbMessage } from "@/types/db";

export const MAX_SUGGESTION_OUTPUT_TOKENS = 2048;
export const STRUCTURE_ASSESSMENT_FORMAT_NAME = "structure_assessment";

export type GenerateStructureAssessmentFailureReason =
  | "invalid_structured_output"
  | "provider_refusal"
  | "incomplete_response"
  | "provider_error"
  | "aborted";

export type GenerateStructureAssessmentResult =
  | {
      ok: true;
      assessment: StructureAssessmentV1;
      providerResponseId: string | null;
      inputTokens: number | null;
      outputTokens: number | null;
    }
  | {
      ok: false;
      reason: GenerateStructureAssessmentFailureReason;
    };

export interface GenerateStructureAssessmentDeps {
  getModel(): string;
  parseStructuredResponse(
    params: ReturnType<typeof buildStructureAssessmentParseRequestParams>,
    options: { signal?: AbortSignal },
  ): Promise<ParsedResponse<StructureAssessmentV1>>;
}

export function buildStructureAssessmentParseRequestParams(
  model: string,
  input: ReturnType<typeof buildStructureAssessmentInput>,
) {
  return {
    model,
    input,
    store: false as const,
    max_output_tokens: MAX_SUGGESTION_OUTPUT_TOKENS,
    text: {
      format: zodTextFormat(
        structureAssessmentV1Schema,
        STRUCTURE_ASSESSMENT_FORMAT_NAME,
      ),
    },
  };
}

export function createDefaultGenerateStructureAssessmentDeps(): GenerateStructureAssessmentDeps {
  const openai = getOpenAIClient();

  return {
    getModel: getOpenAIModel,
    parseStructuredResponse: (params, options) =>
      openai.responses.parse(params, { signal: options.signal }),
  };
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function hasProviderRefusal(response: ParsedResponse<unknown>): boolean {
  for (const item of response.output) {
    if (item.type !== "message") {
      continue;
    }

    for (const content of item.content) {
      if (content.type === "refusal") {
        return true;
      }
    }
  }

  return false;
}

function interpretParsedResponse(
  response: ParsedResponse<StructureAssessmentV1>,
): GenerateStructureAssessmentResult {
  if (hasProviderRefusal(response)) {
    return { ok: false, reason: "provider_refusal" };
  }

  if (response.status === "incomplete") {
    return { ok: false, reason: "incomplete_response" };
  }

  if (response.status !== "completed") {
    return { ok: false, reason: "provider_error" };
  }

  const parsed = parseStructureAssessment(response.output_parsed);
  if (!parsed.ok) {
    return { ok: false, reason: "invalid_structured_output" };
  }

  return {
    ok: true,
    assessment: parsed.assessment,
    providerResponseId: typeof response.id === "string" ? response.id : null,
    inputTokens: response.usage?.input_tokens ?? null,
    outputTokens: response.usage?.output_tokens ?? null,
  };
}

export async function generateStructureAssessment(
  messages: DbMessage[],
  promptContext: RootPlanningPromptContext,
  options?: {
    signal?: AbortSignal;
    deps?: GenerateStructureAssessmentDeps;
  },
): Promise<GenerateStructureAssessmentResult> {
  const deps =
    options?.deps ?? createDefaultGenerateStructureAssessmentDeps();

  if (options?.signal?.aborted) {
    return { ok: false, reason: "aborted" };
  }

  const input = buildStructureAssessmentInput(messages, promptContext);
  const requestParams = buildStructureAssessmentParseRequestParams(
    deps.getModel(),
    input,
  );

  try {
    const response = await deps.parseStructuredResponse(requestParams, {
      signal: options?.signal,
    });

    return interpretParsedResponse(response);
  } catch (error) {
    if (isAbortError(error)) {
      return { ok: false, reason: "aborted" };
    }

    return { ok: false, reason: "provider_error" };
  }
}
