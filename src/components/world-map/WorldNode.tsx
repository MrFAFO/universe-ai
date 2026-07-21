import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Activity,
  Bot,
  Boxes,
  BrainCircuit,
  Compass,
  Database,
  type LucideIcon,
  Monitor,
  MonitorSmartphone,
  Orbit,
  Share2,
  Zap,
} from "lucide-react";
import type { WorldMapNode } from "@/types/world-map";
import type { WorldStatus } from "@/types/world";
import { RootNodeOrb } from "./RootNodeOrb";

const NODE_ICONS: Record<string, LucideIcon> = {
  root: Orbit,
  "context-memory": BrainCircuit,
  "agent-system": Bot,
  "user-interface": MonitorSmartphone,
  integrations: Share2,
  "memory-layer": Database,
  "context-builder": Boxes,
  "planning-agent": Compass,
  "execution-agent": Zap,
  frontend: Monitor,
  visualization: Activity,
};

const STATUS_LABEL: Record<WorldStatus, string> = {
  active: "Active",
  planning: "Planning",
  paused: "Paused",
};

export function WorldNode({ id, data, selected }: NodeProps<WorldMapNode>) {
  const Icon = NODE_ICONS[id] ?? Orbit;
  const isRoot = data.kind === "root";

  return (
    <div
      className={`world-node world-node--${data.kind}${
        selected ? " world-node--selected" : ""
      }`}
    >
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Top}
          className="world-node__handle"
          isConnectable={false}
        />
      )}

      {isRoot && (
        <div className="world-node__orb-wrap">
          <RootNodeOrb />
        </div>
      )}

      <div className={`world-node__head${isRoot ? " world-node__head--root" : ""}`}>
        {!isRoot && (
          <span className="world-node__icon">
            <Icon className="size-full" strokeWidth={1.75} />
          </span>
        )}
        <div className="world-node__title-wrap">
          <p className="world-node__title">{data.label}</p>
          <p className="world-node__desc">{data.description}</p>
        </div>
      </div>

      <div className="world-node__foot">
        <span className={`world-node__status world-node__status--${data.status}`}>
          <span className="world-node__status-dot" />
          {STATUS_LABEL[data.status]}
        </span>
        <span className="world-node__progress-value">{data.progress}%</span>
      </div>

      <div className="world-node__progress-track">
        <div
          className="world-node__progress-fill"
          style={{ width: `${data.progress}%` }}
        />
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="world-node__handle"
        isConnectable={false}
      />
    </div>
  );
}
