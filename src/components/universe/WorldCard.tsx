import type { World, WorldStatus } from "@/types/world";
import {
  ArrowRight,
  CircleDot,
  GitBranch,
  HelpCircle,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { WorldThumbnail } from "./WorldThumbnail";

const statusConfig: Record<
  WorldStatus,
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className: "text-status-active bg-status-active/12 border-status-active/20",
  },
  planning: {
    label: "Planning",
    className:
      "text-status-planning bg-status-planning/12 border-status-planning/20",
  },
  paused: {
    label: "Paused",
    className: "text-status-paused bg-status-paused/12 border-status-paused/20",
  },
};

interface WorldCardProps {
  world: World;
}

export function WorldCard({ world }: WorldCardProps) {
  const status = statusConfig[world.status];

  return (
    <Link
      href={`/worlds/${world.id}`}
      className="surface-card surface-card-hover group flex flex-col overflow-hidden rounded-xl p-0"
    >
      <div className="flex gap-5 p-5 pb-4">
        <WorldThumbnail worldId={world.id} />

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="truncate text-[17px] font-semibold tracking-tight text-text-primary transition-colors group-hover:text-accent">
              {world.name}
            </h3>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${status.className}`}
            >
              {status.label}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-text-secondary">
            {world.description}
          </p>
        </div>
      </div>

      <div className="px-5 pb-4">
        <div className="mb-2 flex items-center justify-between text-[13px] text-text-muted">
          <span>Progress</span>
          <span className="font-medium tabular-nums text-text-secondary">
            {world.progress}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-inset">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${world.progress}%` }}
          />
        </div>
      </div>

      <div className="mt-auto grid grid-cols-3 gap-3 border-t border-border px-5 py-4">
        <Stat icon={CircleDot} label="Nodes" value={world.activeNodes} />
        <Stat icon={Scale} label="Decisions" value={world.decisions} />
        <Stat icon={HelpCircle} label="Questions" value={world.openQuestions} />
      </div>

      <div className="flex items-center gap-1.5 border-t border-border/60 px-5 py-3 text-[13px] font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
        <GitBranch className="size-4" strokeWidth={1.75} />
        Open World Map
        <ArrowRight className="size-4" strokeWidth={1.75} />
      </div>
    </Link>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1.5 text-text-muted">
        <Icon className="size-4" strokeWidth={1.75} />
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-[15px] font-semibold tabular-nums text-text-primary">
        {value}
      </span>
    </div>
  );
}
