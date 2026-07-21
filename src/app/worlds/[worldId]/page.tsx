import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { WorldMapView } from "@/components/world-map/WorldMapView";
import { getWorldGraph } from "@/data/mock-world-map";
import { mockWorlds } from "@/data/mock-universe";

interface WorldMapPageProps {
  params: Promise<{ worldId: string }>;
}

export default async function WorldMapPage({ params }: WorldMapPageProps) {
  const { worldId } = await params;
  const world = mockWorlds.find((w) => w.id === worldId);

  if (!world) {
    notFound();
  }

  const graph = getWorldGraph(worldId);

  return (
    <AppShell>
      <WorldMapView key={graph.worldId} world={world} graph={graph} />
    </AppShell>
  );
}
