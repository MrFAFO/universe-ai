import type { BranchSuggestionV1 } from "@/lib/ai/branch-suggestion";
import { parseBranchSuggestion } from "@/lib/ai/branch-suggestion";
import type { DbBranchSuggestion, DbBranchSuggestionStatus } from "@/types/db";
import { DatabaseError } from "./errors";
import { createSupabaseServerClient } from "./client";
import {
  beginBranchSuggestionAiRun as beginBranchSuggestionAiRunRpc,
  approveBranchSuggestion as approveBranchSuggestionRpc,
  rejectBranchSuggestion as rejectBranchSuggestionRpc,
  replacePendingBranchSuggestion as replacePendingBranchSuggestionRpc,
} from "./rpc";
import type {
  ApproveBranchSuggestionResult,
  RejectBranchSuggestionResult,
} from "@/types/db";

export class BranchSuggestionPayloadError extends Error {
  readonly suggestionId: string;

  constructor(suggestionId: string) {
    super(`Stored branch suggestion payload is invalid (${suggestionId}).`);
    this.name = "BranchSuggestionPayloadError";
    this.suggestionId = suggestionId;
  }
}

export class StructureAlreadyExistsError extends Error {
  constructor() {
    super("structure_already_exists");
    this.name = "StructureAlreadyExistsError";
  }
}

export class PendingProposalExistsError extends Error {
  constructor() {
    super("pending_proposal_exists");
    this.name = "PendingProposalExistsError";
  }
}

export class GenerationInProgressError extends Error {
  constructor() {
    super("generation_in_progress");
    this.name = "GenerationInProgressError";
  }
}

export class BranchSuggestionNotFoundError extends Error {
  constructor() {
    super("Suggestion not found");
    this.name = "BranchSuggestionNotFoundError";
  }
}

export class BranchSuggestionNotPendingError extends Error {
  constructor() {
    super("Suggestion is not pending");
    this.name = "BranchSuggestionNotPendingError";
  }
}

export interface PersistedBranchSuggestion {
  id: string;
  worldId: string;
  conversationId: string;
  parentNodeId: string;
  aiRunId: string;
  status: DbBranchSuggestionStatus;
  schemaVersion: 1;
  payload: BranchSuggestionV1;
  createdAt: string;
}

export interface ReplacePendingBranchSuggestionInput {
  conversationId: string;
  aiRunId: string;
  schemaVersion: 1;
  suggestion: BranchSuggestionV1;
}

export interface BeginBranchSuggestionAiRunInput {
  conversationId: string;
  model: string;
  schemaVersion: 1;
}

interface PostgrestErrorLike {
  message: string;
  code?: string;
  details?: string;
}

const PENDING_PROPOSAL_UNIQUE_INDEX =
  "branch_suggestions_one_pending_per_conversation_idx";

const RUNNING_BRANCH_SUGGESTION_UNIQUE_INDEX =
  "ai_runs_one_running_branch_suggestion_per_conversation_idx";

function isPostgrestErrorLike(error: unknown): error is PostgrestErrorLike {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as PostgrestErrorLike).message === "string"
  );
}

function isPendingProposalUniqueViolation(error: PostgrestErrorLike): boolean {
  if (error.code !== "23505") {
    return false;
  }

  const constraintText = [error.message, error.details]
    .filter((value): value is string => typeof value === "string")
    .join(" ");

  return constraintText.includes(PENDING_PROPOSAL_UNIQUE_INDEX);
}

function isRunningBranchSuggestionUniqueViolation(
  error: PostgrestErrorLike,
): boolean {
  if (error.code !== "23505") {
    return false;
  }

  const constraintText = [error.message, error.details]
    .filter((value): value is string => typeof value === "string")
    .join(" ");

  return constraintText.includes(RUNNING_BRANCH_SUGGESTION_UNIQUE_INDEX);
}

export function classifyBranchSuggestionAcquisitionError(error: unknown): never {
  if (error instanceof GenerationInProgressError) {
    throw error;
  }

  if (error instanceof StructureAlreadyExistsError) {
    throw error;
  }

  if (error instanceof DatabaseError) {
    throw error;
  }

  if (isPostgrestErrorLike(error)) {
    if (error.message.includes("generation_in_progress")) {
      throw new GenerationInProgressError();
    }

    if (error.message.includes("structure_already_exists")) {
      throw new StructureAlreadyExistsError();
    }

    if (isRunningBranchSuggestionUniqueViolation(error)) {
      throw new GenerationInProgressError();
    }

    throw new DatabaseError(error.message);
  }

  throw error;
}

export function classifyBranchSuggestionPersistenceError(error: unknown): never {
  if (error instanceof StructureAlreadyExistsError) {
    throw error;
  }

  if (error instanceof PendingProposalExistsError) {
    throw error;
  }

  if (error instanceof DatabaseError) {
    throw error;
  }

  if (isPostgrestErrorLike(error)) {
    if (error.message.includes("structure_already_exists")) {
      throw new StructureAlreadyExistsError();
    }

    if (isPendingProposalUniqueViolation(error)) {
      throw new PendingProposalExistsError();
    }

    throw new DatabaseError(error.message);
  }

  throw error;
}

export interface BranchSuggestionOwnershipContext {
  world: { id: string };
  conversation: { id: string };
  node: { id: string };
}

export function assertBranchSuggestionOwnership(
  context: BranchSuggestionOwnershipContext,
  suggestion: PersistedBranchSuggestion,
): void {
  if (
    suggestion.worldId !== context.world.id ||
    suggestion.conversationId !== context.conversation.id ||
    suggestion.parentNodeId !== context.node.id
  ) {
    throw new BranchSuggestionNotFoundError();
  }
}

export function classifyBranchSuggestionDecisionError(error: unknown): never {
  if (
    error instanceof BranchSuggestionNotFoundError ||
    error instanceof BranchSuggestionNotPendingError ||
    error instanceof StructureAlreadyExistsError ||
    error instanceof DatabaseError
  ) {
    throw error;
  }

  const message =
    error instanceof Error
      ? error.message
      : isPostgrestErrorLike(error)
        ? error.message
        : null;

  if (!message) {
    throw new DatabaseError("Unable to classify branch suggestion decision error.");
  }

  switch (message) {
    case "Suggestion not found":
      throw new BranchSuggestionNotFoundError();
    case "Suggestion has already been rejected":
    case "Suggestion has already been approved":
    case "Suggestion has been superseded":
    case "Suggestion is not pending":
      throw new BranchSuggestionNotPendingError();
    case "structure_already_exists":
      throw new StructureAlreadyExistsError();
    default:
      throw new DatabaseError(message);
  }
}

export async function approvePendingBranchSuggestion(
  suggestionId: string,
): Promise<ApproveBranchSuggestionResult> {
  try {
    return await approveBranchSuggestionRpc({ suggestionId });
  } catch (error) {
    classifyBranchSuggestionDecisionError(error);
  }
}

export async function rejectPendingBranchSuggestion(
  suggestionId: string,
): Promise<RejectBranchSuggestionResult> {
  try {
    return await rejectBranchSuggestionRpc({ suggestionId });
  } catch (error) {
    classifyBranchSuggestionDecisionError(error);
  }
}

export function mapDbBranchSuggestionRow(
  row: DbBranchSuggestion,
): PersistedBranchSuggestion {
  if (!row.ai_run_id) {
    throw new BranchSuggestionPayloadError(row.id);
  }

  const parsed = parseBranchSuggestion(row.payload);
  if (!parsed.ok || parsed.suggestion.schemaVersion !== 1) {
    throw new BranchSuggestionPayloadError(row.id);
  }

  return {
    id: row.id,
    worldId: row.world_id,
    conversationId: row.conversation_id,
    parentNodeId: row.parent_node_id,
    aiRunId: row.ai_run_id,
    status: row.status,
    schemaVersion: 1,
    payload: parsed.suggestion,
    createdAt: row.created_at,
  };
}

export async function beginBranchSuggestionAiRun(
  input: BeginBranchSuggestionAiRunInput,
): Promise<{ id: string }> {
  try {
    return await beginBranchSuggestionAiRunRpc({
      conversationId: input.conversationId,
      model: input.model,
      schemaVersion: input.schemaVersion,
    });
  } catch (error) {
    classifyBranchSuggestionAcquisitionError(error);
  }
}

export async function replacePendingBranchSuggestion(
  input: ReplacePendingBranchSuggestionInput,
): Promise<DbBranchSuggestion> {
  try {
    return await replacePendingBranchSuggestionRpc({
      conversationId: input.conversationId,
      aiRunId: input.aiRunId,
      schemaVersion: input.schemaVersion,
      payload: input.suggestion,
    });
  } catch (error) {
    classifyBranchSuggestionPersistenceError(error);
  }
}

export async function listPendingBranchSuggestionsForConversation(
  conversationId: string,
): Promise<PersistedBranchSuggestion[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("branch_suggestions")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw new DatabaseError(error.message);
  }

  return (data ?? []).map((row) =>
    mapDbBranchSuggestionRow(row as DbBranchSuggestion),
  );
}

export async function getBranchSuggestionById(
  suggestionId: string,
): Promise<PersistedBranchSuggestion | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("branch_suggestions")
    .select("*")
    .eq("id", suggestionId)
    .maybeSingle();

  if (error) {
    throw new DatabaseError(error.message);
  }

  if (!data) {
    return null;
  }

  return mapDbBranchSuggestionRow(data as DbBranchSuggestion);
}
