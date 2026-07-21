import type {
  ActivityItem,
  ModelInfo,
  UniverseOverview,
} from "@/types/world";
import {
  Activity,
  Brain,
  CheckCircle2,
  GitBranch,
  Globe2,
  HelpCircle,
  Layers,
  Link2,
  Network,
  Scale,
  Sparkles,
} from "lucide-react";

interface OverviewPanelProps {
  activity: ActivityItem[];
  overview: UniverseOverview;
  modelInfo: ModelInfo;
}

const activityIcons = [CheckCircle2, GitBranch, Sparkles, Link2];

const overviewMeta = [
  { key: "totalWorlds" as const, label: "Worlds", icon: Globe2 },
  { key: "activeWorlds" as const, label: "Active", icon: Network },
  { key: "totalNodes" as const, label: "Nodes", icon: GitBranch },
  { key: "totalDecisions" as const, label: "Decisions", icon: Scale },
];

export function OverviewPanel({
  activity,
  overview,
  modelInfo,
}: OverviewPanelProps) {
  const activeRatio =
    overview.totalWorlds > 0
      ? Math.round((overview.activeWorlds / overview.totalWorlds) * 100)
      : 0;

  return (
    <aside
      className="hidden w-[var(--panel-width)] shrink-0 flex-col gap-8 overflow-y-auto border-l border-border bg-surface/40 px-7 py-8 xl:flex"
      aria-label="Universe overview"
    >
      <section>
        <PanelHeading title="Recent Activity" icon={Activity} />
        <ul className="mt-5 space-y-5">
          {activity.map((item, i) => {
            const Icon = activityIcons[i % activityIcons.length];
            const isLast = i === activity.length - 1;
            return (
              <li key={item.id} className="relative flex gap-3.5 pl-1">
                {!isLast && (
                  <span className="absolute left-[11px] top-7 h-[calc(100%+8px)] w-px bg-border" />
                )}
                <Icon
                  className="relative mt-0.5 size-[18px] shrink-0 text-accent"
                  strokeWidth={1.75}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[15px] font-medium text-text-primary">
                      {item.worldName}
                    </p>
                    <span className="shrink-0 text-xs text-text-muted">
                      {item.timestamp}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-snug text-text-secondary">
                    {item.action}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="border-t border-border pt-8">
        <PanelHeading title="Universe Overview" icon={Globe2} />
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5">
          {overviewMeta.map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-start gap-3">
              <Icon
                className="mt-0.5 size-[18px] shrink-0 text-text-muted"
                strokeWidth={1.75}
              />
              <div>
                <dt className="text-xs text-text-muted">{label}</dt>
                <dd className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-text-primary">
                  {overview[key]}
                </dd>
              </div>
            </div>
          ))}
        </dl>

        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Worlds active</span>
            <span className="font-medium tabular-nums text-text-primary">
              {overview.activeWorlds}/{overview.totalWorlds}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-overlay">
            <div
              className="h-full rounded-full bg-accent/80"
              style={{ width: `${activeRatio}%` }}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-text-secondary">
            <HelpCircle className="size-[18px] text-text-muted" strokeWidth={1.75} />
            Open questions
          </span>
          <span className="text-xl font-semibold tabular-nums text-text-primary">
            {overview.openQuestions}
          </span>
        </div>
      </section>

      <section className="border-t border-border pt-8">
        <PanelHeading title="Model" icon={Brain} />
        <div className="mt-5">
          <p className="text-[17px] font-semibold text-text-primary">
            {modelInfo.name}
          </p>
          <p className="mt-1 text-sm text-text-muted">{modelInfo.provider}</p>
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-text-secondary">
            <Layers className="size-[18px] text-accent" strokeWidth={1.75} />
            {modelInfo.contextWindow}
          </p>
        </div>
      </section>
    </aside>
  );
}

function PanelHeading({
  title,
  icon: Icon,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <h3 className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
      <Icon className="size-[18px] text-accent" strokeWidth={1.75} />
      {title}
    </h3>
  );
}
