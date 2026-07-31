import {
  createDefaultBranchSuggestionDecisionsRouteDeps,
  handleApproveBranchSuggestion,
} from "@/server/api/branch-suggestion-decisions-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ worldId: string; nodeId: string; suggestionId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const { worldId, nodeId, suggestionId } = await context.params;

  return handleApproveBranchSuggestion(
    { worldId, nodeId, suggestionId },
    createDefaultBranchSuggestionDecisionsRouteDeps(),
  );
}
