import type { DbWorld } from "@/types/db";
import type { World } from "@/types/world";

export function mapDbWorldToWorld(dbWorld: DbWorld, nodeCount = 0): World {
  return {
    id: dbWorld.id,
    name: dbWorld.name,
    description: dbWorld.description,
    status: dbWorld.status,
    progress: 0,
    activeNodes: nodeCount,
    decisions: 0,
    openQuestions: 0,
    updatedAt: dbWorld.updated_at,
  };
}
