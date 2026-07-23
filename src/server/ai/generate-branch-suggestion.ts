import "server-only";

import { zodTextFormat } from "openai/helpers/zod";
import type { ParsedResponse } from "openai/resources/responses/responses";
import {
  branchSuggestionV1Schema,
  buildBranchSuggestionInput,
  parseBranchSuggestion,
  type BranchSuggestionV1,
} from "@/lib/ai/branch-suggestion";
import { getOpenAIClient, getOpenAIModel } from "@/lib/ai/openai";
import type { DbMessage } from "@/types/db";

export const MAX_SUGGESTION_OUTPUT_TOKENS = 1024;
export const BRANCH_SUGGESTION_FORMAT_NAME = "branch_suggestion";

export type GenerateBranchSuggestionFailureReason =
  | "invalid_structured_output"
  | "provider_refusal"
  | "incomplete_response"
  | "provider_error"
  | "aborted";

export type GenerateBranchSuggestionResult =
  | {
      ok: true;
      suggestion: BranchSuggestionV1;
      providerResponseId: string | null;
      inputTokens: number | null;
      outputTokens: number | null;
    }
  | {
      ok: false;
      reason: GenerateBranchSuggestionFailureReason;
    };

export interface GenerateBranchSuggestionDeps {
  getModel(): string;
  parseStructuredResponse(
    params: ReturnType<typeof buildSuggestionParseRequestParams>,
    options: { signal?: AbortSignal },
  ): Promise<ParsedResponse<BranchSuggestionV1>>;
}

export function buildSuggestionParseRequestParams(
  model: string,
  input: ReturnType<typeof buildBranchSuggestionInput>,
) {
  return {
    model,
    input,
    store: false as const,
    max_output_tokens: MAX_SUGGESTION_OUTPUT_TOKENS,
    text: {
      format: zodTextFormat(
        branchSuggestionV1Schema,
        BRANCH_SUGGESTION_FORMAT_NAME,
      ),
    },
  };
}

export function createDefaultGenerateBranchSuggestionDeps(): GenerateBranchSuggestionDeps {
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
  response: ParsedResponse<BranchSuggestionV1>,
): GenerateBranchSuggestionResult {
  if (hasProviderRefusal(response)) {
    return { ok: false, reason: "provider_refusal" };
  }

  if (response.status === "incomplete") {
    return { ok: false, reason: "incomplete_response" };
  }

  if (response.status !== "completed") {
    return { ok: false, reason: "provider_error" };
  }

  const parsed = parseBranchSuggestion(response.output_parsed);
  if (!parsed.ok) {
    return { ok: false, reason: "invalid_structured_output" };
  }

  return {
    ok: true,
    suggestion: parsed.suggestion,
    providerResponseId: typeof response.id === "string" ? response.id : null,
    inputTokens: response.usage?.input_tokens ?? null,
    outputTokens: response.usage?.output_tokens ?? null,
  };
}

export async function generateBranchSuggestion(
  messages: DbMessage[],
  options?: {
    signal?: AbortSignal;
    deps?: GenerateBranchSuggestionDeps;
  },
): Promise<GenerateBranchSuggestionResult> {
  const deps = options?.deps ?? createDefaultGenerateBranchSuggestionDeps();

  if (options?.signal?.aborted) {
    return { ok: false, reason: "aborted" };
  }

  const input = buildBranchSuggestionInput(messages);
  const requestParams = buildSuggestionParseRequestParams(deps.getModel(), input);

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
