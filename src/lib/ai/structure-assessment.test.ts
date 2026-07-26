import { describe, expect, it } from "vitest";
import type { BranchSuggestionV1 } from "@/lib/ai/branch-suggestion";
import {
  STRUCTURE_ASSESSMENT_GENERATION_INSTRUCTION,
  STRUCTURE_ASSESSMENT_MAX_QUESTIONS,
  STRUCTURE_ASSESSMENT_QUESTION_MAX,
  buildStructureAssessmentInput,
  extractReadyProposal,
  formatDiscoveryMessage,
  parseStructureAssessment,
} from "@/lib/ai/structure-assessment";
import { ROOT_PLANNING_SYSTEM_PROMPT } from "@/lib/ai/prompt";
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

function validProposal(): BranchSuggestionV1 {
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
  };
}

describe("parseStructureAssessment", () => {
  it("accepts a valid ready assessment", () => {
    const assessment = {
      schemaVersion: 1 as const,
      readiness: "ready" as const,
      missingInformation: null,
      questions: null,
      proposal: validProposal(),
    };

    expect(parseStructureAssessment(assessment)).toEqual({
      ok: true,
      assessment,
    });
  });

  it("accepts a valid insufficient assessment", () => {
    const assessment = {
      schemaVersion: 1 as const,
      readiness: "insufficient" as const,
      missingInformation: ["Primary audience"],
      questions: ["Who is the primary audience for this World?"],
      proposal: null,
    };

    expect(parseStructureAssessment(assessment)).toEqual({
      ok: true,
      assessment,
    });
  });

  it("rejects ready assessments without a proposal", () => {
    expect(
      parseStructureAssessment({
        schemaVersion: 1,
        readiness: "ready",
        missingInformation: null,
        questions: null,
        proposal: null,
      }),
    ).toEqual({ ok: false, reason: "invalid_structured_output" });
  });

  it("rejects ready assessments that include questions", () => {
    expect(
      parseStructureAssessment({
        schemaVersion: 1,
        readiness: "ready",
        missingInformation: null,
        questions: ["What is the goal?"],
        proposal: validProposal(),
      }),
    ).toEqual({ ok: false, reason: "invalid_structured_output" });
  });

  it("rejects insufficient assessments that include a proposal", () => {
    expect(
      parseStructureAssessment({
        schemaVersion: 1,
        readiness: "insufficient",
        missingInformation: null,
        questions: ["What is the goal?"],
        proposal: validProposal(),
      }),
    ).toEqual({ ok: false, reason: "invalid_structured_output" });
  });

  it("rejects insufficient assessments without questions", () => {
    expect(
      parseStructureAssessment({
        schemaVersion: 1,
        readiness: "insufficient",
        missingInformation: null,
        questions: null,
        proposal: null,
      }),
    ).toEqual({ ok: false, reason: "invalid_structured_output" });
  });

  it("rejects blank questions", () => {
    expect(
      parseStructureAssessment({
        schemaVersion: 1,
        readiness: "insufficient",
        missingInformation: null,
        questions: ["   "],
        proposal: null,
      }),
    ).toEqual({ ok: false, reason: "invalid_structured_output" });
  });

  it("rejects more than three questions", () => {
    expect(
      parseStructureAssessment({
        schemaVersion: 1,
        readiness: "insufficient",
        missingInformation: null,
        questions: Array.from(
          { length: STRUCTURE_ASSESSMENT_MAX_QUESTIONS + 1 },
          (_, index) => `Question ${index + 1}?`,
        ),
        proposal: null,
      }),
    ).toEqual({ ok: false, reason: "invalid_structured_output" });
  });

  it("rejects questions over the maximum length", () => {
    expect(
      parseStructureAssessment({
        schemaVersion: 1,
        readiness: "insufficient",
        missingInformation: null,
        questions: ["a".repeat(STRUCTURE_ASSESSMENT_QUESTION_MAX + 1)],
        proposal: null,
      }),
    ).toEqual({ ok: false, reason: "invalid_structured_output" });
  });
});

describe("formatDiscoveryMessage", () => {
  it("formats one question deterministically", () => {
    expect(formatDiscoveryMessage(["What is the primary goal?"])).toBe(
      "I need a little more context before I can propose a useful initial structure:\n\n1. What is the primary goal?",
    );
  });

  it("formats three questions in order", () => {
    expect(
      formatDiscoveryMessage([
        "Who is the audience?",
        "What outcomes matter most?",
        "What constraints should shape the structure?",
      ]),
    ).toBe(
      "I need a little more context before I can propose a useful initial structure:\n\n" +
        "1. Who is the audience?\n" +
        "2. What outcomes matter most?\n" +
        "3. What constraints should shape the structure?",
    );
  });
});

describe("extractReadyProposal", () => {
  it("returns the nested proposal for ready assessments", () => {
    const proposal = validProposal();

    expect(
      extractReadyProposal({
        schemaVersion: 1,
        readiness: "ready",
        missingInformation: null,
        questions: null,
        proposal,
      }),
    ).toEqual(proposal);
  });
});

describe("buildStructureAssessmentInput", () => {
  it("uses the code-owned prompt and readiness instruction", () => {
    const input = buildStructureAssessmentInput(
      [
        makeMessage({ id: "m-1", role: "system", ordinal: 1, content: "Old system" }),
        makeMessage({ id: "m-2", role: "user", ordinal: 2, content: "Hello" }),
      ],
      {
        worldName: "Acme World",
        worldDescription: "Planning",
        rootTitle: "Root",
        rootGoal: "Launch",
        currentNodeTitles: [],
      },
    );

    expect(input[0]?.content).toContain(ROOT_PLANNING_SYSTEM_PROMPT);
    expect(input.at(-1)).toEqual({
      role: "user",
      content: STRUCTURE_ASSESSMENT_GENERATION_INSTRUCTION,
    });
    expect(STRUCTURE_ASSESSMENT_GENERATION_INSTRUCTION).toContain("readiness");
    expect(STRUCTURE_ASSESSMENT_GENERATION_INSTRUCTION).not.toContain("frontend");
  });
});
