import { AppShell } from "@/components/shell/AppShell";
import { OverviewPanel } from "@/components/universe/OverviewPanel";
import { UniverseHero } from "@/components/universe/UniverseHero";
import { WorldsGrid } from "@/components/universe/WorldsGrid";
import {
  mockActivity,
  mockModelInfo,
  mockOverview,
  mockWorlds,
} from "@/data/mock-universe";

export default function Home() {
  return (
    <AppShell
      rightPanel={
        <OverviewPanel
          activity={mockActivity}
          overview={mockOverview}
          modelInfo={mockModelInfo}
        />
      }
    >
      <div className="universe-home">
        <div className="universe-home__content space-y-12">
          <UniverseHero />
          <WorldsGrid worlds={mockWorlds} />
        </div>
      </div>
    </AppShell>
  );
}
