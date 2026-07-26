import { beforeEach, describe, expect, it, vi } from "vitest";
import { listWorldNodeTitles } from "@/lib/db/chat";
import { DatabaseError } from "@/lib/db/errors";

const worldId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

type QueryResult = { data: unknown; error: { message: string } | null };

function createQueryBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;

  builder.select = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.neq = vi.fn(chain);
  builder.order = vi.fn(chain);
  builder.limit = vi.fn(chain);
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

describe("listWorldNodeTitles", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("returns non-root node titles in deterministic order", async () => {
    const builder = createQueryBuilder({
      data: [{ title: "Context" }, { title: "Execution" }],
      error: null,
    });
    mockFrom.mockReturnValue(builder);

    await expect(listWorldNodeTitles(worldId)).resolves.toEqual([
      "Context",
      "Execution",
    ]);

    expect(mockFrom).toHaveBeenCalledWith("nodes");
    expect(builder.select).toHaveBeenCalledWith("title");
    expect(builder.eq).toHaveBeenCalledWith("world_id", worldId);
    expect(builder.neq).toHaveBeenCalledWith("kind", "root");
    expect(builder.order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(builder.order).toHaveBeenCalledWith("id", { ascending: true });
    expect(builder.limit).toHaveBeenCalledWith(20);
  });

  it("returns an empty array when no non-root nodes exist", async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: [],
        error: null,
      }),
    );

    await expect(listWorldNodeTitles(worldId)).resolves.toEqual([]);
  });

  it("throws DatabaseError when the query fails", async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: null,
        error: { message: "query failed" },
      }),
    );

    await expect(listWorldNodeTitles(worldId)).rejects.toThrow(DatabaseError);
    await expect(listWorldNodeTitles(worldId)).rejects.toThrow(/query failed/);
  });
});
