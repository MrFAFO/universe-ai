import { describe, expect, it } from "vitest";
import {
  BRANCH_SUGGESTION_CONFLICT_MESSAGES,
  buildBranchSuggestionsApiUrl,
  extractBranchSuggestionApiErrorMessage,
  formatBranchSuggestionCreatedAt,
  readBranchSuggestionApiErrorMessage,
  SAFE_BRANCH_SUGGESTIONS_GENERATE_ERROR_MESSAGE,
} from "@/lib/ai/branch-suggestions-client";

const worldId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const nodeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("buildBranchSuggestionsApiUrl", () => {
  it("builds the dedicated branch suggestions API path", () => {
    expect(buildBranchSuggestionsApiUrl(worldId, nodeId)).toBe(
      `/api/worlds/${worldId}/nodes/${nodeId}/branch-suggestions`,
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
