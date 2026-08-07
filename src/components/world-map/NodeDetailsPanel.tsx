import Link from "next/link";
import {
  ArrowUpRight,
  CircleHelp,
  GitBranch,
  Link2,
  ScrollText,
  Target,
  X,
} from "lucide-react";
import type { WorldStatus } from "@/types/world";
import type { WorldMapNode } from "@/types/world-map";

const STATUS_LABEL: Record<WorldStatus, string> = {
  active: "Active",
  planning: "Planning",
  paused: "Paused",
};

interface LinkedNodeRef {
  id: string;
  label: string;
}

interface NodeDetailsPanelProps {
  worldId: string;
  node: WorldMapNode;
  parent: WorldMapNode | null;
  childNodes: WorldMapNode[];
  linkedNodes: LinkedNodeRef[];
  onSelectNode: (id: string) => void;
  onClose: () => void;
}

export function NodeDetailsPanel({
  worldId,
  node,
  parent,
  childNodes,
  linkedNodes,
  onSelectNode,
  onClose,
}: NodeDetailsPanelProps) {
  const { data } = node;

  return (
    <aside className="node-details" aria-label="Node details">
      <div className="node-details__header">
        <div className="min-w-0">
          <p className="node-details__name">{data.label}</p>
          <span
            className={`node-details__status node-details__status--${data.status}`}
          >
            <span className="node-details__status-dot" />
            {STATUS_LABEL[data.status]}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="node-details__close"
          aria-label="Close details"
        >
          <X className="size-4" strokeWidth={1.75} />
        </button>
      </div>

      <div className="node-details__progress">
        <div className="node-details__progress-row">
          <span>Overall Progress</span>
          <span className="node-details__progress-value">{data.progress}%</span>
        </div>
        <div className="node-details__progress-track">
          <div
            className="node-details__progress-fill"
            style={{ width: `${data.progress}%` }}
          />
        </div>
      </div>

      <div className="node-details__body">
        <Section icon={Target} title="Goal">
          <p className="node-details__text">{data.goal}</p>
        </Section>

        <Section icon={GitBranch} title="Parent">
          {parent ? (
            <button
              type="button"
              className="node-details__link-row"
              onClick={() => onSelectNode(parent.id)}
            >
              {parent.data.label}
              <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
            </button>
          ) : (
            <p className="node-details__muted">Root node — no parent</p>
          )}
        </Section>

        <Section icon={GitBranch} title={`Children (${childNodes.length})`}>
          {childNodes.length > 0 ? (
            <ul className="node-details__list">
              {childNodes.map((child) => (
                <li key={child.id}>
                  <button
                    type="button"
                    className="node-details__link-row"
                    onClick={() => onSelectNode(child.id)}
                  >
                    {child.data.label}
                    <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="node-details__muted">No children</p>
          )}
        </Section>

        <Section icon={Link2} title={`Linked Nodes (${linkedNodes.length})`}>
          {linkedNodes.length > 0 ? (
            <div className="node-details__chips">
              {linkedNodes.map((linked) => (
                <button
                  key={linked.id}
                  type="button"
                  className="node-details__chip"
                  onClick={() => onSelectNode(linked.id)}
                >
                  {linked.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="node-details__muted">No linked nodes</p>
          )}
        </Section>

        <Section
          icon={ScrollText}
          title={`Key Decisions (${data.decisions.length})`}
        >
          {data.decisions.length > 0 ? (
            <ul className="node-details__list">
              {data.decisions.map((decision) => (
                <li key={decision.id} className="node-details__text">
                  {decision.label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="node-details__muted">No decisions recorded</p>
          )}
        </Section>

        <Section
          icon={CircleHelp}
          title={`Open Questions (${data.openQuestions.length})`}
        >
          {data.openQuestions.length > 0 ? (
            <ul className="node-details__list">
              {data.openQuestions.map((q) => (
                <li key={q.id} className="node-details__text">
                  {q.question}
                </li>
              ))}
            </ul>
          ) : (
            <p className="node-details__muted">No open questions</p>
          )}
        </Section>
      </div>

      <Link
        href={`/worlds/${worldId}/nodes/${node.id}`}
        className="node-details__open node-details__open--active"
      >
        Open Planning Chat
        <ArrowUpRight className="size-4" strokeWidth={1.75} />
      </Link>
    </aside>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="node-details__section">
      <h3 className="node-details__section-title">
        <Icon className="size-4 text-accent" strokeWidth={1.75} />
        {title}
      </h3>
      {children}
    </section>
  );
}
