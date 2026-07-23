import {
  createDefaultBranchSuggestionsRouteDeps,
  handleGetBranchSuggestions,
  handlePostBranchSuggestions,
} from "@/server/api/branch-suggestions-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ worldId: string; nodeId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { worldId, nodeId } = await context.params;

  return handlePostBranchSuggestions(
    {
      worldId,
      nodeId,
      signal: request.signal,
    },
    createDefaultBranchSuggestionsRouteDeps(),
  );
}

export async function GET(_request: Request, context: RouteContext) {
  const { worldId, nodeId } = await context.params;

  return handleGetBranchSuggestions(
    { worldId, nodeId },
    createDefaultBranchSuggestionsRouteDeps(),
  );
}
