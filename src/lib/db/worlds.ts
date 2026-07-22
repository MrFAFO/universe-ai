import type { DbNode, DbNodeRelation, DbWorld } from "@/types/db";
import type { World } from "@/types/world";
import type { WorldGraph } from "@/types/world-map";
import { DatabaseError } from "./errors";
import { mapRowsToWorldGraph } from "./map";
import { mapDbWorldToWorld } from "./map-world";
import { createSupabaseServerClient } from "./client";

type WorldWithNodeCountRow = DbWorld & {
  nodes: Array<{ count: number }>;
};

function getNodeCount(row: WorldWithNodeCountRow): number {
  const count = row.nodes?.[0]?.count;
  return typeof count === "number" ? count : 0;
}

export async function listWorlds(): Promise<World[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("worlds")
    .select("*, nodes(count)")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new DatabaseError(error.message);
  }

  return ((data ?? []) as WorldWithNodeCountRow[]).map((row) => {
    const nodeCount = getNodeCount(row);
    const dbWorld: DbWorld = {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      owner_id: row.owner_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
    return mapDbWorldToWorld(dbWorld, nodeCount);
  });
}

export interface WorldGraphBundle {
  world: World;
  graph: WorldGraph;
}

export async function getWorldGraphById(
  worldId: string,
): Promise<WorldGraphBundle | null> {
  const supabase = createSupabaseServerClient();

  const { data: dbWorld, error: worldError } = await supabase
    .from("worlds")
    .select("*")
    .eq("id", worldId)
    .maybeSingle();

  if (worldError) {
    throw new DatabaseError(worldError.message);
  }

  if (!dbWorld) {
    return null;
  }

  const [nodesResult, relationsResult] = await Promise.all([
    supabase.from("nodes").select("*").eq("world_id", worldId),
    supabase.from("node_relations").select("*").eq("world_id", worldId),
  ]);

  if (nodesResult.error) {
    throw new DatabaseError(nodesResult.error.message);
  }

  if (relationsResult.error) {
    throw new DatabaseError(relationsResult.error.message);
  }

  const nodes = (nodesResult.data ?? []) as DbNode[];
  const relations = (relationsResult.data ?? []) as DbNodeRelation[];

  return {
    world: mapDbWorldToWorld(dbWorld as DbWorld, nodes.length),
    graph: mapRowsToWorldGraph(worldId, nodes, relations),
  };
}
