import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BranchSuggestionV1 } from "@/lib/ai/branch-suggestion";
import {
  BranchSuggestionPayloadError,
  getBranchSuggestionById,
  insertPendingBranchSuggestion,
  listPendingBranchSuggestionsForConversation,
  mapDbBranchSuggestionRow,
} from "@/lib/db/branch-suggestions";
import { DatabaseError } from "@/lib/db/errors";
import type { DbBranchSuggestion } from "@/types/db";

const worldId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const conversationId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const parentNodeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const aiRunId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const suggestionId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const validPayload: BranchSuggestionV1 = {
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

function makeDbRow(
  overrides: Partial<DbBranchSuggestion> = {},
): DbBranchSuggestion {
  return {
    id: suggestionId,
    world_id: worldId,
    conversation_id: conversationId,
    parent_node_id: parentNodeId,
    ai_run_id: aiRunId,
    status: "pending",
    schema_version: 1,
    payload: validPayload,
    created_node_ids: null,
    created_at: "2026-01-01T00:00:00.000Z",
    decided_at: null,
    ...overrides,
  };
}

type QueryResult = { data: unknown; error: { message: string } | null };

function createQueryBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;

  builder.insert = vi.fn(chain);
  builder.select = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.order = vi.fn(chain);
  builder.single = vi.fn(async () => result);
  builder.maybeSingle = vi.fn(async () => result);
  builder.then = (
    onFulfilled: (value: QueryResult) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(onFulfilled, onRejected);

  return builder;
}

const mockFrom = vi.fn();

vi.mock("@/lib/db/client", () => ({
  createSupabaseServerClient: () => ({
    from: mockFrom,
  }),
}));

describe("mapDbBranchSuggestionRow", () => {
  it("maps a valid pending row with validated payload", () => {
    const mapped = mapDbBranchSuggestionRow(makeDbRow());

    expect(mapped).toEqual({
      id: suggestionId,
      worldId,
      conversationId,
      parentNodeId,
      aiRunId,
      status: "pending",
      schemaVersion: 1,
      payload: validPayload,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("rejects malformed persisted payloads instead of omitting them", () => {
    expect(() =>
      mapDbBranchSuggestionRow(
        makeDbRow({
          payload: {
            schemaVersion: 1,
            rationale: null,
            nodes: [],
          },
        }),
      ),
    ).toThrow(BranchSuggestionPayloadError);
  });

  it("rejects rows without an ai_run_id", () => {
    expect(() =>
      mapDbBranchSuggestionRow(makeDbRow({ ai_run_id: null })),
    ).toThrow(BranchSuggestionPayloadError);
  });
});

describe("insertPendingBranchSuggestion", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("inserts pending rows with the correct ids and validated payload", async () => {
    const insertedRow = makeDbRow();
    const builder = createQueryBuilder({ data: insertedRow, error: null });
    mockFrom.mockReturnValue(builder);

    const result = await insertPendingBranchSuggestion({
      worldId,
      conversationId,
      parentNodeId,
      aiRunId,
      suggestion: validPayload,
    });

    expect(mockFrom).toHaveBeenCalledWith("branch_suggestions");
    expect(builder.insert).toHaveBeenCalledWith({
      world_id: worldId,
      conversation_id: conversationId,
      parent_node_id: parentNodeId,
      ai_run_id: aiRunId,
      status: "pending",
      schema_version: 1,
      payload: validPayload,
      created_node_ids: null,
      decided_at: null,
    });
    expect(result).toEqual(insertedRow);
  });

  it("surfaces database insert failures as DatabaseError", async () => {
    const builder = createQueryBuilder({
      data: null,
      error: { message: "duplicate key value violates unique constraint" },
    });
    mockFrom.mockReturnValue(builder);

    await expect(
      insertPendingBranchSuggestion({
        worldId,
        conversationId,
        parentNodeId,
        aiRunId,
        suggestion: validPayload,
      }),
    ).rejects.toThrow(DatabaseError);
  });
});

describe("listPendingBranchSuggestionsForConversation", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("filters by conversation and pending status, newest first", async () => {
    const newer = makeDbRow({
      id: "11111111-1111-4111-8111-111111111111",
      created_at: "2026-01-02T00:00:00.000Z",
    });
    const older = makeDbRow({
      id: "22222222-2222-4222-8222-222222222222",
      created_at: "2026-01-01T00:00:00.000Z",
    });
    const builder = createQueryBuilder({ data: [newer, older], error: null });
    mockFrom.mockReturnValue(builder);

    const results = await listPendingBranchSuggestionsForConversation(
      conversationId,
    );

    expect(builder.eq).toHaveBeenCalledWith("conversation_id", conversationId);
    expect(builder.eq).toHaveBeenCalledWith("status", "pending");
    expect(builder.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(results.map((row) => row.id)).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]);
  });

  it("rejects malformed persisted payloads instead of omitting them", async () => {
    const builder = createQueryBuilder({
      data: [
        makeDbRow({
          payload: {
            schemaVersion: 1,
            rationale: null,
            nodes: [],
          },
        }),
      ],
      error: null,
    });
    mockFrom.mockReturnValue(builder);

    await expect(
      listPendingBranchSuggestionsForConversation(conversationId),
    ).rejects.toThrow(BranchSuggestionPayloadError);
  });

  it("surfaces database query failures as DatabaseError", async () => {
    const builder = createQueryBuilder({
      data: null,
      error: { message: "connection failed" },
    });
    mockFrom.mockReturnValue(builder);

    await expect(
      listPendingBranchSuggestionsForConversation(conversationId),
    ).rejects.toThrow(DatabaseError);
  });
});

describe("getBranchSuggestionById", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("returns a validated suggestion when found", async () => {
    const row = makeDbRow();
    const builder = createQueryBuilder({ data: row, error: null });
    mockFrom.mockReturnValue(builder);

    const result = await getBranchSuggestionById(suggestionId);

    expect(builder.eq).toHaveBeenCalledWith("id", suggestionId);
    expect(result?.id).toBe(suggestionId);
    expect(result?.payload).toEqual(validPayload);
  });

  it("returns null when the suggestion does not exist", async () => {
    const builder = createQueryBuilder({ data: null, error: null });
    mockFrom.mockReturnValue(builder);

    await expect(getBranchSuggestionById(suggestionId)).resolves.toBeNull();
  });

  it("surfaces database query failures as DatabaseError", async () => {
    const builder = createQueryBuilder({
      data: null,
      error: { message: "connection failed" },
    });
    mockFrom.mockReturnValue(builder);

    await expect(getBranchSuggestionById(suggestionId)).rejects.toThrow(
      DatabaseError,
    );
  });
});
