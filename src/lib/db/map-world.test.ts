import { describe, expect, it } from "vitest";
import { mapDbWorldToWorld } from "@/lib/db/map-world";
import type { DbWorld } from "@/types/db";

const dbWorld: DbWorld = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Test World",
  description: "A persisted world",
  status: "planning",
  owner_id: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
};

describe("mapDbWorldToWorld", () => {
  it("maps stored world fields and uses neutral defaults for unstored metrics", () => {
    const world = mapDbWorldToWorld(dbWorld);

    expect(world).toEqual({
      id: dbWorld.id,
      name: dbWorld.name,
      description: dbWorld.description,
      status: dbWorld.status,
      progress: 0,
      activeNodes: 0,
      decisions: 0,
      openQuestions: 0,
      updatedAt: dbWorld.updated_at,
    });
  });

  it("uses the provided node count for activeNodes", () => {
    const world = mapDbWorldToWorld(dbWorld, 3);
    expect(world.activeNodes).toBe(3);
  });
});
