# Universe AI — UI Context

## Visual Identity

- Premium, mature and technological.
- Dark navy foundation, not pure black.
- Restrained electric blue and violet accents.
- Subtle borders, layered surfaces and soft depth.
- Calm and professional application shell.
- Visually exciting central project visualizations.
- Consistent spacing, typography, radii and iconography.

Avoid:

- Childish or gaming-style design.
- Excessive colors.
- Excessive neon, glow or gradients.
- A generic and visually boring SaaS appearance.
- Different visual systems between screens.

## Universe Home

- Fixed left sidebar.
- Top search field and New World action.
- Main hero inspired by a living digital universe.
- World cards containing:
  - Name
  - Description
  - Status
  - Progress
  - Active nodes
  - Decisions
  - Open questions
- Right panel containing:
  - Recent activity
  - Universe overview
  - Model information when relevant
- Clicking a World opens its World Map.

## World Map

- Uses exactly the same shell and visual identity as Universe Home.
- Primary hierarchy flows from top to bottom.
- Root node is visually prominent.
- Main branches are more prominent than child nodes.
- Hierarchical connections are clearer than secondary relations.
- Secondary relations are thinner, subtler and filterable.
- Selecting a node highlights:
  - The node
  - Its ancestor path
  - Its directly relevant relations
- Right details panel shows:
  - Goal
  - Status
  - Progress
  - Parent
  - Children
  - Linked nodes
  - Decisions
  - Open questions
- Map controls include pan, zoom and fit view.
- The map should feel like an elegant living intelligence network, not an organization chart.
- After a structure proposal is approved, the map refreshes to show the new topic nodes.

## Root Planning Chat

### Conversation timeline

The Root Planning screen renders a single chronological timeline. Items appear in time order:

```
earlier messages → structure proposal card (if pending) → later messages → composer
```

Proposal cards are **timeline items**, not a separate panel between the message list and composer. Messages sent after a proposal was generated appear **below** the proposal card.

The proposal is not serialized into a normal chat message. It retains its own identity, status, and database record.

### Generate World Structure

- The **initial-structure** flow — available only while the World has no approved topic-node structure yet.
- Always an explicit user action — never automatic, never triggered by chat content.
- The button is never secretly disabled based on a hidden AI readiness decision.
- On click the system assesses readiness and either generates a proposal or asks Discovery questions.
- While generating: button disabled, concise progress text shown.
- On failure: safe error message; previously loaded proposal remains visible.
- After initial topic nodes exist, this action is unavailable. The future replacement is **Update Existing Structure** (post-D).

### Proposal card states and actions

| State | Visible label | Available actions |
|---|---|---|
| No proposal (no structure yet) | — | Generate World Structure |
| Assessing | Progress text | — (button disabled) |
| Discovery | Assistant message with questions | Generate World Structure (after user replies) |
| Pending review | "Pending review" | Regenerate, Approve, Reject |
| Approved | Card shows approved state (post-D polish) | — |
| Rejected (no structure yet) | — | Generate World Structure |

**Update Existing Structure** is a separate future action for Worlds that already have an approved structure. It is not part of initial generation.

### Proposal card anatomy

Each pending proposal card displays:

- Status label: **Pending review**
- Creation time (`<time>` element, accessible format)
- Rationale (when non-null)
- Proposed node count
- Each proposed node in payload order:
  - Title
  - Description (when non-null)
  - Goal (when non-null)

**Do not display:** `aiRunId` or internal run metadata.

**Do not render before approval:**

- Proposed map nodes as if they already exist on the World Map
- Edit or Apply controls implying the structure is already active
- Copy claiming that the World has already changed

Approve and Reject are valid actions on a pending proposal card.

**Required notice copy:**

> This is a proposal only. No nodes are created until you approve it.

### Regenerate

Available when a pending proposal exists. Replaces the current pending proposal on success. The previous proposal is marked superseded and is no longer approvable.

### Approve and Reject

Available only on a pending proposal. Approve creates topic nodes on the World Map atomically. Reject marks the proposal rejected. Both require explicit user action.

## Interaction Principles

- One click selects a node.
- Opening a node is a separate explicit action.
- Changing a parent must be explicit and confirmed.
- Secondary relations may be hidden by type.
- Focus Mode shows the selected node, its ancestors, children and directly linked nodes.
- AI-proposed structural changes require explicit user approval before application; all structural changes use validated atomic server operations.
