import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BranchSuggestionV1 } from "@/lib/ai/branch-suggestion";
import {
  BranchSuggestionPayloadError,
  classifyBranchSuggestionPersistenceError,
  getBranchSuggestionById,
  listPendingBranchSuggestionsForConversation,
  mapDbBranchSuggestionRow,
  PendingProposalExistsError,
  replacePendingBranchSuggestion,
  StructureAlreadyExistsError,
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

  builder.select = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.order = vi.fn(chain);
  builder.maybeSingle = vi.fn(async () => result);
  builder.then = (
    onFulfilled: (value: QueryResult) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(onFulfilled, onRejected);

  return builder;
}

const mockFrom = vi.fn();
const mockReplaceRpc = vi.fn();

vi.mock("@/lib/db/client", () => ({
  createSupabaseServerClient: () => ({
    from: mockFrom,
  }),
}));

vi.mock("@/lib/db/rpc", () => ({
  replacePendingBranchSuggestion: (...args: unknown[]) => mockReplaceRpc(...args),
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

  it("accepts superseded status in row mapping", () => {
    const mapped = mapDbBranchSuggestionRow(
      makeDbRow({ status: "superseded", decided_at: "2026-01-02T00:00:00.000Z" }),
    );

    expect(mapped.status).toBe("superseded");
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

describe("classifyBranchSuggestionPersistenceError", () => {
  it("maps structure_already_exists RPC messages", () => {
    expect(() =>
      classifyBranchSuggestionPersistenceError({
        message: "structure_already_exists",
      }),
    ).toThrow(StructureAlreadyExistsError);
  });

  it("maps PostgreSQL 23505 for the pending-proposal index to pending_proposal_exists", () => {
    expect(() =>
      classifyBranchSuggestionPersistenceError({
        message:
          'duplicate key value violates unique constraint "branch_suggestions_one_pending_per_conversation_idx"',
        code: "23505",
      }),
    ).toThrow(PendingProposalExistsError);
  });

  it("maps PostgreSQL 23505 for the pending-proposal index when the index appears in details", () => {
    expect(() =>
      classifyBranchSuggestionPersistenceError({
        message: "duplicate key value violates unique constraint",
        details:
          'Key (conversation_id)=(cccccccc-cccc-4ccc-8ccc-cccccccccccc) already exists on index "branch_suggestions_one_pending_per_conversation_idx".',
        code: "23505",
      }),
    ).toThrow(PendingProposalExistsError);
  });

  it("maps PostgreSQL 23505 for another unique constraint to DatabaseError", () => {
    expect(() =>
      classifyBranchSuggestionPersistenceError({
        message:
          'duplicate key value violates unique constraint "branch_suggestions_ai_run_id_key"',
        code: "23505",
      }),
    ).toThrow(DatabaseError);
  });

  it("maps unknown database failures to DatabaseError", () => {
    expect(() =>
      classifyBranchSuggestionPersistenceError({
        message: "connection failed",
        code: "08006",
      }),
    ).toThrow(DatabaseError);
  });
});

describe("replacePendingBranchSuggestion", () => {
  beforeEach(() => {
    mockReplaceRpc.mockReset();
  });

  it("calls the replacement RPC with conversation, ai_run, schema version, and payload only", async () => {
    const insertedRow = makeDbRow();
    mockReplaceRpc.mockResolvedValue(insertedRow);

    const result = await replacePendingBranchSuggestion({
      conversationId,
      aiRunId,
      schemaVersion: 1,
      suggestion: validPayload,
    });

    expect(mockReplaceRpc).toHaveBeenCalledWith({
      conversationId,
      aiRunId,
      schemaVersion: 1,
      payload: validPayload,
    });
    expect(result).toEqual(insertedRow);
  });

  it("classifies structure_already_exists from the RPC layer", async () => {
    mockReplaceRpc.mockRejectedValue({
      message: "structure_already_exists",
    });

    await expect(
      replacePendingBranchSuggestion({
        conversationId,
        aiRunId,
        schemaVersion: 1,
        suggestion: validPayload,
      }),
    ).rejects.toThrow(StructureAlreadyExistsError);
  });

  it("classifies PostgreSQL 23505 for the pending-proposal index as pending_proposal_exists", async () => {
    mockReplaceRpc.mockRejectedValue({
      message:
        'duplicate key value violates unique constraint "branch_suggestions_one_pending_per_conversation_idx"',
      code: "23505",
    });

    await expect(
      replacePendingBranchSuggestion({
        conversationId,
        aiRunId,
        schemaVersion: 1,
        suggestion: validPayload,
      }),
    ).rejects.toThrow(PendingProposalExistsError);
  });

  it("classifies PostgreSQL 23505 for another unique constraint as DatabaseError", async () => {
    mockReplaceRpc.mockRejectedValue({
      message:
        'duplicate key value violates unique constraint "branch_suggestions_ai_run_id_key"',
      code: "23505",
    });

    await expect(
      replacePendingBranchSuggestion({
        conversationId,
        aiRunId,
        schemaVersion: 1,
        suggestion: validPayload,
      }),
    ).rejects.toThrow(DatabaseError);
  });

  it("surfaces unknown database failures as DatabaseError", async () => {
    mockReplaceRpc.mockRejectedValue({
      message: "connection failed",
      code: "08006",
    });

    await expect(
      replacePendingBranchSuggestion({
        conversationId,
        aiRunId,
        schemaVersion: 1,
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
    expect(results.every((row) => row.status === "pending")).toBe(true);
  });

  it("does not return superseded suggestions because the query filters pending only", async () => {
    const builder = createQueryBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    await listPendingBranchSuggestionsForConversation(conversationId);

    expect(builder.eq).toHaveBeenCalledWith("status", "pending");
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
