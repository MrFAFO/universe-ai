import { DatabaseError } from "./errors";
import {
  beginPlanningChatAiRun as beginPlanningChatAiRunRpc,
  completePlanningChatRun as completePlanningChatRunRpc,
} from "./rpc";

export class PlanningRunInProgressError extends Error {
  constructor() {
    super("planning_run_in_progress");
    this.name = "PlanningRunInProgressError";
  }
}

export class PlanningRunOwnershipLostError extends Error {
  constructor() {
    super("planning_run_not_active");
    this.name = "PlanningRunOwnershipLostError";
  }
}

export interface BeginPlanningChatAiRunInput {
  conversationId: string;
  model: string;
}

export interface CompletePlanningChatRunInput {
  aiRunId: string;
  conversationId: string;
  content: string;
  openaiResponseId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
}

interface PostgrestErrorLike {
  message: string;
  code?: string;
  details?: string;
}

const RUNNING_PLANNING_CHAT_UNIQUE_INDEX =
  "ai_runs_one_running_planning_chat_per_conversation_idx";

function isPostgrestErrorLike(error: unknown): error is PostgrestErrorLike {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as PostgrestErrorLike).message === "string"
  );
}

function isRunningPlanningChatUniqueViolation(error: PostgrestErrorLike): boolean {
  if (error.code !== "23505") {
    return false;
  }

  const constraintText = [error.message, error.details]
    .filter((value): value is string => typeof value === "string")
    .join(" ");

  return constraintText.includes(RUNNING_PLANNING_CHAT_UNIQUE_INDEX);
}

export function classifyPlanningChatAcquisitionError(error: unknown): never {
  if (error instanceof PlanningRunInProgressError) {
    throw error;
  }

  if (error instanceof DatabaseError) {
    throw error;
  }

  if (isPostgrestErrorLike(error)) {
    if (error.message.includes("planning_run_in_progress")) {
      throw new PlanningRunInProgressError();
    }

    if (isRunningPlanningChatUniqueViolation(error)) {
      throw new PlanningRunInProgressError();
    }

    throw new DatabaseError(error.message);
  }

  throw error;
}

export function classifyPlanningChatFinalizationError(error: unknown): never {
  if (error instanceof PlanningRunOwnershipLostError) {
    throw error;
  }

  if (error instanceof DatabaseError) {
    throw error;
  }

  if (isPostgrestErrorLike(error)) {
    if (error.message.includes("planning_run_not_active")) {
      throw new PlanningRunOwnershipLostError();
    }

    throw new DatabaseError(error.message);
  }

  throw error;
}

export async function beginPlanningChatAiRun(
  input: BeginPlanningChatAiRunInput,
): Promise<{ id: string }> {
  try {
    return await beginPlanningChatAiRunRpc({
      conversationId: input.conversationId,
      model: input.model,
    });
  } catch (error) {
    classifyPlanningChatAcquisitionError(error);
  }
}

export async function completePlanningChatRun(
  input: CompletePlanningChatRunInput,
): Promise<{ messageId: string }> {
  try {
    return await completePlanningChatRunRpc({
      aiRunId: input.aiRunId,
      conversationId: input.conversationId,
      content: input.content,
      openaiResponseId: input.openaiResponseId,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
    });
  } catch (error) {
    classifyPlanningChatFinalizationError(error);
  }
}
