import {
  branchSuggestionApiErrorResponseSchema,
  branchSuggestionConflictResponseSchema,
  parseApproveBranchSuggestionResponse,
  parseRejectBranchSuggestionResponse,
  type BranchSuggestionConflictResponse,
} from "@/lib/ai/branch-suggestion-api";

export const SAFE_BRANCH_SUGGESTIONS_GENERATE_ERROR_MESSAGE =
  "Unable to generate a world structure suggestion right now.";

export const SAFE_BRANCH_SUGGESTIONS_APPROVE_ERROR_MESSAGE =
  "Unable to approve this world structure suggestion right now.";

export const SAFE_BRANCH_SUGGESTIONS_REJECT_ERROR_MESSAGE =
  "Unable to reject this world structure suggestion right now.";

export const SAFE_BRANCH_SUGGESTIONS_RESPONSE_ERROR_MESSAGE =
  "Unable to process the suggestion response.";

export const BRANCH_SUGGESTION_CONFLICT_MESSAGES = {
  generation_in_progress:
    "A world structure suggestion is already being generated.",
  structure_already_exists:
    "This world already has an initial structure.",
  pending_proposal_exists:
    "A pending world structure suggestion already exists.",
} as const satisfies Record<
  BranchSuggestionConflictResponse["code"],
  string
>;

export function buildBranchSuggestionsApiUrl(
  worldId: string,
  nodeId: string,
): string {
  return `/api/worlds/${worldId}/nodes/${nodeId}/branch-suggestions`;
}

export function buildApproveBranchSuggestionApiUrl(
  worldId: string,
  nodeId: string,
  suggestionId: string,
): string {
  return `/api/worlds/${worldId}/nodes/${nodeId}/branch-suggestions/${suggestionId}/approve`;
}

export function buildRejectBranchSuggestionApiUrl(
  worldId: string,
  nodeId: string,
  suggestionId: string,
): string {
  return `/api/worlds/${worldId}/nodes/${nodeId}/branch-suggestions/${suggestionId}/reject`;
}

export async function approveBranchSuggestionRequest(
  worldId: string,
  nodeId: string,
  suggestionId: string,
  options?: { signal?: AbortSignal },
): Promise<
  | { ok: true; data: ReturnType<typeof parseApproveBranchSuggestionResponse> }
  | { ok: false; error: string }
> {
  const response = await fetch(
    buildApproveBranchSuggestionApiUrl(worldId, nodeId, suggestionId),
    {
      method: "POST",
      signal: options?.signal,
    },
  );

  if (!response.ok) {
    return {
      ok: false,
      error: await readBranchSuggestionApiErrorMessage(
        response,
        SAFE_BRANCH_SUGGESTIONS_APPROVE_ERROR_MESSAGE,
      ),
    };
  }

  try {
    const raw: unknown = await response.json();
    return { ok: true, data: parseApproveBranchSuggestionResponse(raw) };
  } catch {
    return {
      ok: false,
      error: SAFE_BRANCH_SUGGESTIONS_RESPONSE_ERROR_MESSAGE,
    };
  }
}

export async function rejectBranchSuggestionRequest(
  worldId: string,
  nodeId: string,
  suggestionId: string,
  options?: { signal?: AbortSignal },
): Promise<
  | { ok: true; data: ReturnType<typeof parseRejectBranchSuggestionResponse> }
  | { ok: false; error: string }
> {
  const response = await fetch(
    buildRejectBranchSuggestionApiUrl(worldId, nodeId, suggestionId),
    {
      method: "POST",
      signal: options?.signal,
    },
  );

  if (!response.ok) {
    return {
      ok: false,
      error: await readBranchSuggestionApiErrorMessage(
        response,
        SAFE_BRANCH_SUGGESTIONS_REJECT_ERROR_MESSAGE,
      ),
    };
  }

  try {
    const raw: unknown = await response.json();
    return { ok: true, data: parseRejectBranchSuggestionResponse(raw) };
  } catch {
    return {
      ok: false,
      error: SAFE_BRANCH_SUGGESTIONS_RESPONSE_ERROR_MESSAGE,
    };
  }
}

export function extractBranchSuggestionApiErrorMessage(
  raw: unknown,
): string | null {
  const errorParsed = branchSuggestionApiErrorResponseSchema.safeParse(raw);
  if (errorParsed.success) {
    return errorParsed.data.error;
  }

  const conflictParsed = branchSuggestionConflictResponseSchema.safeParse(raw);
  if (conflictParsed.success) {
    return BRANCH_SUGGESTION_CONFLICT_MESSAGES[conflictParsed.data.code];
  }

  return null;
}

export async function readBranchSuggestionApiErrorMessage(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  try {
    const raw: unknown = await response.json();
    return extractBranchSuggestionApiErrorMessage(raw) ?? fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export function formatBranchSuggestionCreatedAt(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
