import type { World } from "@/types/world";
import { WorldCard } from "./WorldCard";

interface WorldsGridProps {
  worlds: World[];
}

export function WorldsGrid({ worlds }: WorldsGridProps) {
  return (
    <section aria-labelledby="worlds-heading">
      <div className="mb-6 flex items-baseline justify-between">
        <h2
          id="worlds-heading"
          className="text-xl font-semibold tracking-tight text-text-primary"
        >
          Your Worlds
        </h2>
        <span className="text-[15px] text-text-muted">
          {worlds.length} {worlds.length === 1 ? "world" : "worlds"}
        </span>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {worlds.map((world) => (
          <WorldCard key={world.id} world={world} />
        ))}
      </div>
    </section>
  );
}
