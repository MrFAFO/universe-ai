import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { DatabaseErrorState } from "@/components/universe/DatabaseErrorState";
import { WorldMapView } from "@/components/world-map/WorldMapView";
import { PUBLIC_DATABASE_ERROR_MESSAGE } from "@/lib/db/errors";
import { getWorldGraphById } from "@/lib/db/worlds";
import { worldIdParamSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

interface WorldMapPageProps {
  params: Promise<{ worldId: string }>;
}

export default async function WorldMapPage({ params }: WorldMapPageProps) {
  const { worldId } = await params;
  const parsedWorldId = worldIdParamSchema.safeParse(worldId);

  if (!parsedWorldId.success) {
    notFound();
  }

  let bundle;

  try {
    bundle = await getWorldGraphById(parsedWorldId.data);
  } catch {
    return (
      <AppShell>
        <div className="world-map-page-error">
          <DatabaseErrorState
            title="Unable to open world"
            message={PUBLIC_DATABASE_ERROR_MESSAGE}
          />
        </div>
      </AppShell>
    );
  }

  if (!bundle) {
    notFound();
  }

  return (
    <AppShell>
      <WorldMapView
        key={bundle.graph.worldId}
        world={bundle.world}
        graph={bundle.graph}
      />
    </AppShell>
  );
}
