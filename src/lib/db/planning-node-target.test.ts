import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseError } from "@/lib/db/errors";
import {
  PlanningNodeTargetNotFoundError,
  loadPlanningNodeKind,
} from "@/lib/db/planning-node-target";

const worldId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const nodeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

type QueryResult = { data: unknown; error: { message: string } | null };

function createQueryBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;

  builder.select = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));

  return builder;
}

const mockFrom = vi.fn();

vi.mock("@/lib/db/client", () => ({
  createSupabaseServerClient: () => ({
    from: mockFrom,
  }),
}));

describe("loadPlanningNodeKind", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("returns root when the node is a root in the requested world", async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: { world_id: worldId, kind: "root" },
        error: null,
      }),
    );

    await expect(loadPlanningNodeKind(worldId, nodeId)).resolves.toBe("root");
    expect(mockFrom).toHaveBeenCalledWith("nodes");
  });

  it("returns topic when the node is a topic in the requested world", async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: { world_id: worldId, kind: "topic" },
        error: null,
      }),
    );

    await expect(loadPlanningNodeKind(worldId, nodeId)).resolves.toBe("topic");
  });

  it("throws PlanningNodeTargetNotFoundError when the node is missing", async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: null,
        error: null,
      }),
    );

    await expect(loadPlanningNodeKind(worldId, nodeId)).rejects.toBeInstanceOf(
      PlanningNodeTargetNotFoundError,
    );
  });

  it("throws PlanningNodeTargetNotFoundError when the node belongs to another world", async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: {
          world_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          kind: "topic",
        },
        error: null,
      }),
    );

    await expect(loadPlanningNodeKind(worldId, nodeId)).rejects.toBeInstanceOf(
      PlanningNodeTargetNotFoundError,
    );
  });

  it("throws PlanningNodeTargetNotFoundError for unsupported node kinds", async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: { world_id: worldId, kind: "branch" },
        error: null,
      }),
    );

    await expect(loadPlanningNodeKind(worldId, nodeId)).rejects.toBeInstanceOf(
      PlanningNodeTargetNotFoundError,
    );
  });

  it("throws DatabaseError when the query fails", async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: null,
        error: { message: "kind query failed" },
      }),
    );

    let thrown: unknown;

    try {
      await loadPlanningNodeKind(worldId, nodeId);
      expect.unreachable("Expected DatabaseError to be thrown");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(DatabaseError);
    expect((thrown as DatabaseError).message).toContain("kind query failed");
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});
