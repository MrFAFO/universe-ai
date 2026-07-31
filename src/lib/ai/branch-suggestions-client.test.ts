import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BRANCH_SUGGESTION_CONFLICT_MESSAGES,
  SAFE_BRANCH_SUGGESTIONS_APPROVE_ERROR_MESSAGE,
  SAFE_BRANCH_SUGGESTIONS_REJECT_ERROR_MESSAGE,
  approveBranchSuggestionRequest,
  buildApproveBranchSuggestionApiUrl,
  buildBranchSuggestionsApiUrl,
  buildRejectBranchSuggestionApiUrl,
  extractBranchSuggestionApiErrorMessage,
  formatBranchSuggestionCreatedAt,
  readBranchSuggestionApiErrorMessage,
  rejectBranchSuggestionRequest,
  SAFE_BRANCH_SUGGESTIONS_GENERATE_ERROR_MESSAGE,
  SAFE_BRANCH_SUGGESTIONS_RESPONSE_ERROR_MESSAGE,
} from "@/lib/ai/branch-suggestions-client";

const worldId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const nodeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const suggestionId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("buildBranchSuggestionsApiUrl", () => {
  it("builds the dedicated branch suggestions API path", () => {
    expect(buildBranchSuggestionsApiUrl(worldId, nodeId)).toBe(
      `/api/worlds/${worldId}/nodes/${nodeId}/branch-suggestions`,
    );
  });
});

describe("buildApproveBranchSuggestionApiUrl", () => {
  it("builds the approve decision API path", () => {
    expect(buildApproveBranchSuggestionApiUrl(worldId, nodeId, suggestionId)).toBe(
      `/api/worlds/${worldId}/nodes/${nodeId}/branch-suggestions/${suggestionId}/approve`,
    );
  });
});

describe("buildRejectBranchSuggestionApiUrl", () => {
  it("builds the reject decision API path", () => {
    expect(buildRejectBranchSuggestionApiUrl(worldId, nodeId, suggestionId)).toBe(
      `/api/worlds/${worldId}/nodes/${nodeId}/branch-suggestions/${suggestionId}/reject`,
    );
  });
});

describe("extractBranchSuggestionApiErrorMessage", () => {
  it("returns the stable API error message when present", () => {
    expect(
      extractBranchSuggestionApiErrorMessage({
        error: "Suggestion generation is temporarily unavailable.",
        code: "provider_error",
      }),
    ).toBe("Suggestion generation is temporarily unavailable.");
  });

  it("returns a stable message for generation_in_progress conflict bodies", () => {
    expect(
      extractBranchSuggestionApiErrorMessage({
        code: "generation_in_progress",
      }),
    ).toBe(BRANCH_SUGGESTION_CONFLICT_MESSAGES.generation_in_progress);
  });

  it("returns a stable message for structure_already_exists conflict bodies", () => {
    expect(
      extractBranchSuggestionApiErrorMessage({
        code: "structure_already_exists",
      }),
    ).toBe(BRANCH_SUGGESTION_CONFLICT_MESSAGES.structure_already_exists);
  });

  it("returns a stable message for pending_proposal_exists conflict bodies", () => {
    expect(
      extractBranchSuggestionApiErrorMessage({
        code: "pending_proposal_exists",
      }),
    ).toBe(BRANCH_SUGGESTION_CONFLICT_MESSAGES.pending_proposal_exists);
  });

  it("returns null for invalid error payloads", () => {
    expect(
      extractBranchSuggestionApiErrorMessage({
        error: "raw provider secret",
      }),
    ).toBeNull();
  });

  it("returns null for unknown conflict codes", () => {
    expect(
      extractBranchSuggestionApiErrorMessage({
        code: "unknown_conflict",
      }),
    ).toBeNull();
  });
});

describe("readBranchSuggestionApiErrorMessage", () => {
  it("falls back to a safe message when the response body is not parseable JSON", async () => {
    const response = new Response("not json", { status: 502 });

    await expect(
      readBranchSuggestionApiErrorMessage(
        response,
        SAFE_BRANCH_SUGGESTIONS_GENERATE_ERROR_MESSAGE,
      ),
    ).resolves.toBe(SAFE_BRANCH_SUGGESTIONS_GENERATE_ERROR_MESSAGE);
  });

  it("returns the API error message from a failed response body", async () => {
    const response = new Response(
      JSON.stringify({
        error: "Unable to save the suggestion right now.",
        code: "persistence_error",
      }),
      { status: 500 },
    );

    await expect(
      readBranchSuggestionApiErrorMessage(
        response,
        SAFE_BRANCH_SUGGESTIONS_GENERATE_ERROR_MESSAGE,
      ),
    ).resolves.toBe("Unable to save the suggestion right now.");
  });

  it("returns a stable conflict message from a 409 response body", async () => {
    const response = new Response(
      JSON.stringify({
        code: "generation_in_progress",
      }),
      { status: 409 },
    );

    await expect(
      readBranchSuggestionApiErrorMessage(
        response,
        SAFE_BRANCH_SUGGESTIONS_GENERATE_ERROR_MESSAGE,
      ),
    ).resolves.toBe(BRANCH_SUGGESTION_CONFLICT_MESSAGES.generation_in_progress);
  });
});

describe("formatBranchSuggestionCreatedAt", () => {
  it("formats valid timestamps with a stable locale", () => {
    expect(formatBranchSuggestionCreatedAt("2026-01-15T14:30:00.000Z")).toBe(
      new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date("2026-01-15T14:30:00.000Z")),
    );
  });

  it("returns the original value when the timestamp is invalid", () => {
    expect(formatBranchSuggestionCreatedAt("not-a-date")).toBe("not-a-date");
  });
});

describe("approveBranchSuggestionRequest", () => {
  it("POSTs to the approve endpoint without a body and forwards AbortSignal", async () => {
    const signal = new AbortController().signal;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          outcome: "approved",
          suggestionId,
          createdNodeIds: [nodeId],
          idempotent: false,
        }),
        { status: 200 },
      ),
    );

    const result = await approveBranchSuggestionRequest(
      worldId,
      nodeId,
      suggestionId,
      { signal },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      buildApproveBranchSuggestionApiUrl(worldId, nodeId, suggestionId),
      { method: "POST", signal },
    );
    expect(result).toEqual({
      ok: true,
      data: {
        outcome: "approved",
        suggestionId,
        createdNodeIds: [nodeId],
        idempotent: false,
      },
    });
  });

  it("returns a safe response error for malformed success bodies", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ outcome: "approved" }), { status: 200 }),
    );

    await expect(
      approveBranchSuggestionRequest(worldId, nodeId, suggestionId),
    ).resolves.toEqual({
      ok: false,
      error: SAFE_BRANCH_SUGGESTIONS_RESPONSE_ERROR_MESSAGE,
    });
  });

  it("returns a safe approve error for failed responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "This world structure suggestion can no longer be decided.",
          code: "suggestion_not_pending",
        }),
        { status: 409 },
      ),
    );

    await expect(
      approveBranchSuggestionRequest(worldId, nodeId, suggestionId),
    ).resolves.toEqual({
      ok: false,
      error: "This world structure suggestion can no longer be decided.",
    });
  });

  it("falls back to the safe approve error when the failure body is unusable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not json", { status: 500 }),
    );

    await expect(
      approveBranchSuggestionRequest(worldId, nodeId, suggestionId),
    ).resolves.toEqual({
      ok: false,
      error: SAFE_BRANCH_SUGGESTIONS_APPROVE_ERROR_MESSAGE,
    });
  });
});

describe("rejectBranchSuggestionRequest", () => {
  it("POSTs to the reject endpoint without a body", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          outcome: "rejected",
          suggestionId,
          decidedAt: "2026-01-02T00:00:00.000Z",
          idempotent: false,
        }),
        { status: 200 },
      ),
    );

    const result = await rejectBranchSuggestionRequest(
      worldId,
      nodeId,
      suggestionId,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      buildRejectBranchSuggestionApiUrl(worldId, nodeId, suggestionId),
      { method: "POST", signal: undefined },
    );
    expect(result.ok).toBe(true);
  });

  it("returns a stable conflict message for structure_already_exists", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ code: "structure_already_exists" }), {
        status: 409,
      }),
    );

    await expect(
      rejectBranchSuggestionRequest(worldId, nodeId, suggestionId),
    ).resolves.toEqual({
      ok: false,
      error: BRANCH_SUGGESTION_CONFLICT_MESSAGES.structure_already_exists,
    });
  });

  it("falls back to the safe reject error when the failure body is unusable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not json", { status: 500 }),
    );

    await expect(
      rejectBranchSuggestionRequest(worldId, nodeId, suggestionId),
    ).resolves.toEqual({
      ok: false,
      error: SAFE_BRANCH_SUGGESTIONS_REJECT_ERROR_MESSAGE,
    });
  });
});
