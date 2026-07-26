import type { ResponseInput } from "openai/resources/responses/responses";
import { z } from "zod";
import {
  branchSuggestionV1Schema,
  type BranchSuggestionV1,
} from "@/lib/ai/branch-suggestion";
import {
  buildResponsesInput,
  type RootPlanningPromptContext,
} from "@/lib/ai/prompt";
import type { DbMessage } from "@/types/db";

export const STRUCTURE_ASSESSMENT_QUESTION_MAX = 300;
export const STRUCTURE_ASSESSMENT_MAX_QUESTIONS = 3;
export const STRUCTURE_ASSESSMENT_MISSING_INFO_MAX = 200;
export const STRUCTURE_ASSESSMENT_MAX_MISSING_INFORMATION = 5;

const structureAssessmentBaseSchema = z
  .object({
    schemaVersion: z.literal(1),
    readiness: z.enum(["ready", "insufficient"]),
    missingInformation: z
      .array(
        z.string().trim().min(1).max(STRUCTURE_ASSESSMENT_MISSING_INFO_MAX),
      )
      .max(STRUCTURE_ASSESSMENT_MAX_MISSING_INFORMATION)
      .nullable(),
    questions: z
      .array(z.string().trim().min(1).max(STRUCTURE_ASSESSMENT_QUESTION_MAX))
      .max(STRUCTURE_ASSESSMENT_MAX_QUESTIONS)
      .nullable(),
    proposal: branchSuggestionV1Schema.nullable(),
  })
  .strict();

export const structureAssessmentV1Schema = structureAssessmentBaseSchema.superRefine(
  (value, context) => {
    if (value.readiness === "ready") {
      if (!value.proposal) {
        context.addIssue({
          code: "custom",
          message: "A ready assessment must include a proposal.",
          path: ["proposal"],
        });
      }

      if (value.questions !== null) {
        context.addIssue({
          code: "custom",
          message: "A ready assessment must not include questions.",
          path: ["questions"],
        });
      }

      return;
    }

    if (value.proposal !== null) {
      context.addIssue({
        code: "custom",
        message: "An insufficient assessment must not include a proposal.",
        path: ["proposal"],
      });
    }

    if (
      !value.questions ||
      value.questions.length < 1 ||
      value.questions.length > STRUCTURE_ASSESSMENT_MAX_QUESTIONS
    ) {
      context.addIssue({
        code: "custom",
        message:
          "An insufficient assessment must include 1 to 3 focused questions.",
        path: ["questions"],
      });
    }
  },
);

export type StructureAssessmentV1 = z.infer<typeof structureAssessmentV1Schema>;

export type ParseStructureAssessmentResult =
  | { ok: true; assessment: StructureAssessmentV1 }
  | { ok: false; reason: "invalid_structured_output" };

export function parseStructureAssessment(
  raw: unknown,
): ParseStructureAssessmentResult {
  const result = structureAssessmentV1Schema.safeParse(raw);

  if (!result.success) {
    return { ok: false, reason: "invalid_structured_output" };
  }

  return { ok: true, assessment: result.data };
}

export const STRUCTURE_ASSESSMENT_GENERATION_INSTRUCTION =
  "Based on the planning conversation and World brief above, first determine whether enough context exists to form a useful initial Root-level structure for this World. " +
  "Return a structured readiness assessment only.\n\n" +
  "Readiness rules:\n" +
  "- Mark readiness as ready when the conversation and World brief provide enough context to create a useful initial top-level structure. Do not require perfect knowledge. Minor uncertainties must not automatically cause Discovery.\n" +
  "- Mark readiness as insufficient only when missing information would materially change the major top-level areas or make the proposal arbitrary or misleading.\n" +
  "- Do not ask for information already present in the World brief or conversation.\n" +
  "- Do not ask generic questions such as \"Can you tell me more?\"\n" +
  "- Questions must be concrete, concise, non-overlapping, and appropriate to the established domain.\n" +
  "- Produce no more than three questions.\n" +
  "- Remain domain-neutral. Do not assume software terminology unless the World clearly establishes software.\n\n" +
  "If readiness is ready:\n" +
  "- Set questions to null.\n" +
  "- Include a valid proposal with 1 to 6 direct Root children only—major workstreams or equivalent top-level areas.\n" +
  "- Provide meaningful titles, descriptions, and goals or outcomes.\n" +
  "- Do not include nested children.\n" +
  "- These are suggestions pending user review only; do not claim that any Nodes have already been created.\n\n" +
  "If readiness is insufficient:\n" +
  "- Set proposal to null.\n" +
  "- Include 1 to 3 focused questions.\n" +
  "- Identify the materially missing information in missingInformation when helpful.\n" +
  "- Do not fabricate a proposal.";

export function buildStructureAssessmentInput(
  messages: DbMessage[],
  promptContext: RootPlanningPromptContext,
): ResponseInput {
  const history = buildResponsesInput(messages, promptContext);

  return [
    ...history,
    {
      role: "user",
      content: STRUCTURE_ASSESSMENT_GENERATION_INSTRUCTION,
    },
  ];
}

export function formatDiscoveryMessage(questions: ReadonlyArray<string>): string {
  if (questions.length === 0) {
    throw new Error("Discovery requires at least one question.");
  }

  const intro =
    "I need a little more context before I can propose a useful initial structure:";
  const numbered = questions.map((question, index) => `${index + 1}. ${question}`);

  return `${intro}\n\n${numbered.join("\n")}`;
}

export function extractReadyProposal(
  assessment: StructureAssessmentV1,
): BranchSuggestionV1 {
  if (assessment.readiness !== "ready" || !assessment.proposal) {
    throw new Error("Assessment is not ready.");
  }

  return assessment.proposal;
}
