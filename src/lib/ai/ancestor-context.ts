export class PlanningContextUnavailableError extends Error {
  constructor(message = "Planning context is unavailable.") {
    super(message);
    this.name = "PlanningContextUnavailableError";
  }
}

export type AncestorChainErrorReason =
  | "missing_parent"
  | "cycle"
  | "no_root"
  | "multiple_roots";

export class AncestorChainError extends PlanningContextUnavailableError {
  readonly reason: AncestorChainErrorReason;

  constructor(reason: AncestorChainErrorReason) {
    super(`Ancestor chain is corrupted (${reason}).`);
    this.name = "AncestorChainError";
    this.reason = reason;
  }
}

export interface WorldNodeForAncestorPath {
  id: string;
  parent_id: string | null;
  kind: "root" | "topic";
  title: string;
  description: string | null;
  goal: string | null;
}

export interface ResolvedAncestorContext {
  root: WorldNodeForAncestorPath;
  ancestors: WorldNodeForAncestorPath[];
}

export function resolveAncestorContext(
  worldNodes: WorldNodeForAncestorPath[],
  currentNode: WorldNodeForAncestorPath,
): ResolvedAncestorContext {
  const nodeById = new Map(worldNodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  const ancestorsChildToParent: WorldNodeForAncestorPath[] = [];
  let root: WorldNodeForAncestorPath | undefined;
  let walkerId: string | null = currentNode.parent_id;

  while (walkerId !== null) {
    if (visited.has(walkerId)) {
      throw new AncestorChainError("cycle");
    }

    visited.add(walkerId);

    const node = nodeById.get(walkerId);
    if (!node) {
      throw new AncestorChainError("missing_parent");
    }

    if (node.kind === "root") {
      if (root !== undefined) {
        throw new AncestorChainError("multiple_roots");
      }

      if (node.parent_id !== null) {
        const parentNode = nodeById.get(node.parent_id);
        if (parentNode?.kind === "root") {
          throw new AncestorChainError("multiple_roots");
        }

        throw new AncestorChainError("no_root");
      }

      root = node;
      break;
    }

    ancestorsChildToParent.push(node);
    walkerId = node.parent_id;
  }

  if (!root) {
    throw new AncestorChainError("no_root");
  }

  return {
    root,
    ancestors: [...ancestorsChildToParent].reverse(),
  };
}
