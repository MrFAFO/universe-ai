import { DatabaseError } from "./errors";
import { createSupabaseServerClient } from "./client";

export type PlanningNodeKind = "root" | "topic";

export class PlanningNodeTargetNotFoundError extends Error {
  constructor() {
    super("Planning node target could not be resolved.");
    this.name = "PlanningNodeTargetNotFoundError";
  }
}

export async function loadPlanningNodeKind(
  worldId: string,
  nodeId: string,
): Promise<PlanningNodeKind> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("nodes")
    .select("world_id, kind")
    .eq("id", nodeId)
    .maybeSingle();

  if (error) {
    throw new DatabaseError(error.message);
  }

  if (!data || data.world_id !== worldId) {
    throw new PlanningNodeTargetNotFoundError();
  }

  if (data.kind === "root" || data.kind === "topic") {
    return data.kind;
  }

  throw new PlanningNodeTargetNotFoundError();
}
