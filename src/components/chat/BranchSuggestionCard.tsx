import type { BranchSuggestionDto } from "@/lib/ai/branch-suggestion-api";
import { formatBranchSuggestionCreatedAt } from "@/lib/ai/branch-suggestions-client";

export type BranchSuggestionDecisionState =
  | "idle"
  | "approving"
  | "rejecting";

export interface BranchSuggestionCardProps {
  suggestion: BranchSuggestionDto;
  onApprove(): void;
  onReject(): void;
  decisionState: BranchSuggestionDecisionState;
  decisionError: string | null;
  actionsDisabled: boolean;
}

export function BranchSuggestionCard({
  suggestion,
  onApprove,
  onReject,
  decisionState,
  decisionError,
  actionsDisabled,
}: BranchSuggestionCardProps) {
  const isDeciding = decisionState !== "idle";
  const buttonsDisabled = actionsDisabled || isDeciding;

  return (
    <article
      className="branch-suggestion-card"
      aria-busy={isDeciding}
    >
      <header className="branch-suggestion-card__header">
        <span className="branch-suggestion-card__status-label">
          Pending review
        </span>
        <time
          className="branch-suggestion-card__timestamp"
          dateTime={suggestion.createdAt}
        >
          {formatBranchSuggestionCreatedAt(suggestion.createdAt)}
        </time>
      </header>

      <p className="branch-suggestion-card__notice">
        This is a proposal only. No nodes are created until you approve it.
      </p>

      {suggestion.payload.rationale ? (
        <p className="branch-suggestion-card__rationale">
          {suggestion.payload.rationale}
        </p>
      ) : null}

      <p className="branch-suggestion-card__node-count">
        {suggestion.payload.nodes.length}{" "}
        {suggestion.payload.nodes.length === 1
          ? "proposed node"
          : "proposed nodes"}
      </p>

      <ul className="branch-suggestion-card__nodes">
        {suggestion.payload.nodes.map((node, index) => (
          <li
            key={`${suggestion.id}-${index}`}
            className="branch-suggestion-card__node"
          >
            <h3 className="branch-suggestion-card__node-title">{node.title}</h3>
            {node.description ? (
              <p className="branch-suggestion-card__node-description">
                {node.description}
              </p>
            ) : null}
            {node.goal ? (
              <p className="branch-suggestion-card__node-goal">
                <span className="branch-suggestion-card__node-goal-label">
                  Goal
                </span>
                {node.goal}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <footer className="branch-suggestion-card__actions">
        <button
          type="button"
          className="branch-suggestion-card__approve"
          onClick={onApprove}
          disabled={buttonsDisabled}
          aria-label="Approve world structure suggestion"
        >
          {decisionState === "approving" ? "Approving…" : "Approve"}
        </button>
        <button
          type="button"
          className="branch-suggestion-card__reject"
          onClick={onReject}
          disabled={buttonsDisabled}
          aria-label="Reject world structure suggestion"
        >
          {decisionState === "rejecting" ? "Rejecting…" : "Reject"}
        </button>
      </footer>

      {decisionError ? (
        <p className="branch-suggestion-card__decision-error" role="alert">
          {decisionError}
        </p>
      ) : null}
    </article>
  );
}
