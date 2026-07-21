import { ArrowLeft, Star } from "lucide-react";
import Link from "next/link";
import type { World } from "@/types/world";

import {
  RELATION_TYPES,
  type MapViewId,
} from "@/types/world-map";

interface MapTopBarProps {
  world: World;
  activeView: MapViewId;
}

function viewLabel(activeView: MapViewId): string {
  if (activeView === "hierarchy") return "Hierarchy view";
  const relation = RELATION_TYPES.find((item) => item.type === activeView);
  return relation ? `${relation.label} graph` : "World map";
}

export function MapTopBar({ world, activeView }: MapTopBarProps) {
  return (
    <div className="world-map__topbar">
      <Link href="/" className="world-map__back">
        <ArrowLeft className="size-4" strokeWidth={1.75} />
        Back to Universe
      </Link>
      <div className="world-map__title-row">
        <h1 className="world-map__title">{world.name}</h1>
        <Star className="size-4 text-text-muted" strokeWidth={1.75} />
      </div>
      <p className="world-map__subtitle">{world.description}</p>
      <p className="world-map__view-label">{viewLabel(activeView)}</p>
    </div>
  );
}
