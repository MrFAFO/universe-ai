import type { World } from "@/types/world";
import { WorldCard } from "./WorldCard";
import { CreateWorldButton } from "./CreateWorldButton";

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

      {worlds.length === 0 ? (
        <div className="worlds-empty surface-card rounded-xl px-6 py-12 text-center">
          <h3 className="text-lg font-semibold text-text-primary">
            No worlds yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-text-secondary">
            Create your first world to start planning at the root node and build
            your project map from there.
          </p>
          <div className="mt-6">
            <CreateWorldButton variant="empty" />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {worlds.map((world) => (
            <WorldCard key={world.id} world={world} />
          ))}
        </div>
      )}
    </section>
  );
}
