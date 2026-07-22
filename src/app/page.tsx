import { AppShell } from "@/components/shell/AppShell";
import { DatabaseErrorState } from "@/components/universe/DatabaseErrorState";
import { OverviewPanel } from "@/components/universe/OverviewPanel";
import { UniverseHero } from "@/components/universe/UniverseHero";
import { WorldsGrid } from "@/components/universe/WorldsGrid";
import { mockActivity, mockModelInfo } from "@/data/mock-universe";
import { PUBLIC_DATABASE_ERROR_MESSAGE } from "@/lib/db/errors";
import { listWorlds } from "@/lib/db/worlds";
import type { UniverseOverview, World } from "@/types/world";

export const dynamic = "force-dynamic";

function buildOverviewFromWorlds(worlds: World[]): UniverseOverview {
  return {
    totalWorlds: worlds.length,
    activeWorlds: worlds.filter((world) => world.status === "active").length,
    totalNodes: worlds.reduce((sum, world) => sum + world.activeNodes, 0),
    totalDecisions: 0,
    openQuestions: 0,
  };
}

export default async function Home() {
  let worlds: World[];

  try {
    worlds = await listWorlds();
  } catch {
    return (
      <AppShell>
        <div className="universe-home">
          <div className="universe-home__content space-y-12">
            <UniverseHero />
            <DatabaseErrorState message={PUBLIC_DATABASE_ERROR_MESSAGE} />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      rightPanel={
        <OverviewPanel
          activity={mockActivity}
          overview={buildOverviewFromWorlds(worlds)}
          modelInfo={mockModelInfo}
        />
      }
    >
      <div className="universe-home">
        <div className="universe-home__content space-y-12">
          <UniverseHero />
          <WorldsGrid worlds={worlds} />
        </div>
      </div>
    </AppShell>
  );
}
