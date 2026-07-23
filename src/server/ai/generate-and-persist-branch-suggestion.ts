import "server-only";

import type { BranchSuggestionV1 } from "@/lib/ai/branch-suggestion";
import { getOpenAIModel } from "@/lib/ai/openai";
import {
  completeAiRun,
  createAiRun,
  failAiRun,
  listConversationMessages,
  resolveRootPlanningConversation,
  RootPlanningNotFoundError,
  type CompleteAiRunInput,
  type RootPlanningContext,
} from "@/lib/db/chat";
import {
  insertPendingBranchSuggestion,
  mapDbBranchSuggestionRow,
  type PersistedBranchSuggestion,
} from "@/lib/db/branch-suggestions";
import { DatabaseError } from "@/lib/db/errors";
import type { DbBranchSuggestion, DbMessage } from "@/types/db";
import {
  generateBranchSuggestion,
  type GenerateBranchSuggestionFailureReason,
  type GenerateBranchSuggestionResult,
} from "@/server/ai/generate-branch-suggestion";

export const BRANCH_SUGGESTION_RUN_METADATA = {
  purpose: "branch_suggestion",
  schemaVersion: 1,
} as const;

export type GenerateAndPersistBranchSuggestionFailureReason =
  | "root_planning_not_found"
  | GenerateBranchSuggestionFailureReason
  | "persistence_error";

export type GenerateAndPersistBranchSuggestionResult =
  | {
      ok: true;
      suggestion: PersistedBranchSuggestion;
    }
  | {
      ok: false;
      reason: GenerateAndPersistBranchSuggestionFailureReason;
    };

export interface GenerateAndPersistBranchSuggestionDeps {
  resolveRootPlanningConversation(
    worldId: string,
    nodeId: string,
  ): Promise<RootPlanningContext>;
  listConversationMessages(conversationId: string): Promise<DbMessage[]>;
  getModel(): string;
  createAiRun(
    conversationId: string,
    model: string,
    options?: {
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<{ id: string }>;
  completeAiRun(aiRunId: string, input: CompleteAiRunInput): Promise<void>;
  failAiRun(aiRunId: string, errorSummary: string): Promise<void>;
  generateBranchSuggestion(
    messages: DbMessage[],
    options?: { signal?: AbortSignal },
  ): Promise<GenerateBranchSuggestionResult>;
  insertPendingBranchSuggestion(input: {
    worldId: string;
    conversationId: string;
    parentNodeId: string;
    aiRunId: string;
    suggestion: BranchSuggestionV1;
  }): Promise<DbBranchSuggestion>;
}

export function createDefaultGenerateAndPersistBranchSuggestionDeps(): GenerateAndPersistBranchSuggestionDeps {
  return {
    resolveRootPlanningConversation,
    listConversationMessages,
    getModel: getOpenAIModel,
    createAiRun,
    completeAiRun,
    failAiRun,
    generateBranchSuggestion,
    insertPendingBranchSuggestion,
  };
}

function toFailureSummary(reason: string): string {
  return reason.slice(0, 500);
}

async function safeFailRun(
  deps: GenerateAndPersistBranchSuggestionDeps,
  aiRunId: string,
  summary: string,
): Promise<void> {
  try {
    await deps.failAiRun(aiRunId, toFailureSummary(summary));
  } catch {
    // Best-effort finalization only.
  }
}

export async function generateAndPersistBranchSuggestion(
  params: {
    worldId: string;
    nodeId: string;
    signal?: AbortSignal;
  },
  deps?: GenerateAndPersistBranchSuggestionDeps,
): Promise<GenerateAndPersistBranchSuggestionResult> {
  const resolvedDeps =
    deps ?? createDefaultGenerateAndPersistBranchSuggestionDeps();

  if (params.signal?.aborted) {
    return { ok: false, reason: "aborted" };
  }

  let context: RootPlanningContext;
  try {
    context = await resolvedDeps.resolveRootPlanningConversation(
      params.worldId,
      params.nodeId,
    );
  } catch (error) {
    if (error instanceof RootPlanningNotFoundError) {
      return { ok: false, reason: "root_planning_not_found" };
    }

    if (error instanceof DatabaseError) {
      return { ok: false, reason: "persistence_error" };
    }

    throw error;
  }

  let messages: DbMessage[];
  try {
    messages = await resolvedDeps.listConversationMessages(
      context.conversation.id,
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      return { ok: false, reason: "persistence_error" };
    }

    throw error;
  }

  const model = resolvedDeps.getModel();

  let aiRun: { id: string };
  try {
    aiRun = await resolvedDeps.createAiRun(context.conversation.id, model, {
      metadata: { ...BRANCH_SUGGESTION_RUN_METADATA },
    });
  } catch (error) {
    if (error instanceof DatabaseError) {
      return { ok: false, reason: "persistence_error" };
    }

    throw error;
  }

  const generation = await resolvedDeps.generateBranchSuggestion(messages, {
    signal: params.signal,
  });

  if (!generation.ok) {
    await safeFailRun(resolvedDeps, aiRun.id, generation.reason);
    return { ok: false, reason: generation.reason };
  }

  let persistedRow: DbBranchSuggestion;
  try {
    persistedRow = await resolvedDeps.insertPendingBranchSuggestion({
      worldId: context.world.id,
      conversationId: context.conversation.id,
      parentNodeId: context.node.id,
      aiRunId: aiRun.id,
      suggestion: generation.suggestion,
    });
  } catch {
    await safeFailRun(
      resolvedDeps,
      aiRun.id,
      "Branch suggestion persistence failed.",
    );
    return { ok: false, reason: "persistence_error" };
  }

  try {
    await resolvedDeps.completeAiRun(aiRun.id, {
      openaiResponseId: generation.providerResponseId,
      inputTokens: generation.inputTokens,
      outputTokens: generation.outputTokens,
    });
  } catch {
    await safeFailRun(
      resolvedDeps,
      aiRun.id,
      "Branch suggestion ai_run completion failed.",
    );
    return { ok: false, reason: "persistence_error" };
  }

  return {
    ok: true,
    suggestion: mapDbBranchSuggestionRow(persistedRow),
  };
}
