import type { ResponseInput } from "openai/resources/responses/responses";
import { z } from "zod";
import {
  buildResponsesInput,
  type RootPlanningPromptContext,
} from "@/lib/ai/prompt";
import type { DbMessage } from "@/types/db";

export const SUGGESTED_NODE_TITLE_MAX = 120;
export const SUGGESTED_NODE_DESCRIPTION_MAX = 500;
export const SUGGESTED_NODE_GOAL_MAX = 1000;
export const BRANCH_SUGGESTION_RATIONALE_MAX = 800;
export const BRANCH_SUGGESTION_MAX_NODES = 6;

export const suggestedNodeV1Schema = z
  .object({
    title: z.string().trim().min(1).max(SUGGESTED_NODE_TITLE_MAX),
    description: z
      .string()
      .trim()
      .max(SUGGESTED_NODE_DESCRIPTION_MAX)
      .nullable(),
    goal: z.string().trim().max(SUGGESTED_NODE_GOAL_MAX).nullable(),
  })
  .strict();

export const branchSuggestionV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    rationale: z
      .string()
      .trim()
      .max(BRANCH_SUGGESTION_RATIONALE_MAX)
      .nullable(),
    nodes: z
      .array(suggestedNodeV1Schema)
      .min(1)
      .max(BRANCH_SUGGESTION_MAX_NODES),
  })
  .strict();

export type BranchSuggestionV1 = z.infer<typeof branchSuggestionV1Schema>;

export type ParseBranchSuggestionResult =
  | { ok: true; suggestion: BranchSuggestionV1 }
  | { ok: false; reason: "invalid_structured_output" };

export function parseBranchSuggestion(
  raw: unknown,
): ParseBranchSuggestionResult {
  const result = branchSuggestionV1Schema.safeParse(raw);

  if (!result.success) {
    return { ok: false, reason: "invalid_structured_output" };
  }

  return { ok: true, suggestion: result.data };
}

export const BRANCH_SUGGESTION_GENERATION_INSTRUCTION =
  "Based on the planning conversation and World brief above, propose a concise initial Root-level structure for this World. " +
  "Return 1 to 6 direct children of the Root only—major workstreams or equivalent top-level areas appropriate to the established domain. " +
  "Provide meaningful titles, descriptions, and goals or outcomes for each suggested area. " +
  "Do not include nested children in this response. " +
  "These are suggestions pending user review only; do not claim that any Nodes have already been created. " +
  "Do not assume software concepts unless the World context clearly establishes a software domain.";

export function buildBranchSuggestionInput(
  messages: DbMessage[],
  promptContext: RootPlanningPromptContext,
): ResponseInput {
  const history = buildResponsesInput(messages, promptContext);

  return [
    ...history,
    {
      role: "user",
      content: BRANCH_SUGGESTION_GENERATION_INSTRUCTION,
    },
  ];
}
