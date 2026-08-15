# Universe AI — UI Context

For approved Product/UX v2 principles (involvement, legibility, delegation) see `docs/PRODUCT_UX_V2.md`. This file covers visual identity, **implemented** UI behavior, and approved UX direction not yet implemented.

**UI redesign implementation has not started.** Final layouts, branding, and whether tree or graph is canonical (Decision 6) remain **open**.

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

## World Map (current implementation)

The World Map is the **current** primary structure navigation surface. It uses the same shell and visual identity as Universe Home.

**Open — Decision 6:** whether outline/tree becomes the canonical primary interface and graph becomes a secondary lens for relations, dependencies, and impact is **not yet approved**. Do not treat the World Map's current centrality as a permanent product decision.

Implemented behavior today:
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

## Non-root Planning Chat (Stage E — implemented)

Topic Nodes open their own Planning chat at `/worlds/[worldId]/nodes/[nodeId]` (dispatched by node kind).

**Implemented behaviour:**

- Root Planning remains visually and behaviourally distinct from Topic Node Planning.
- Each Topic Node has one persistent Planning conversation.
- Message history loads chronologically and survives refresh and reopen.
- Ancestor-path context is injected into model input but **not** presented as editable messages in the timeline.
- No structure proposal cards, Generate World Structure, or branch-suggestion flow in non-root Planning.
- Streaming, composer, safe error handling, and HTTP 409 conflict handling follow Root Planning patterns (Stage E.1).

Relation UI and relation context injection remain out of scope until Stage F (blocked until UI redesign is accepted).

## Secondary Relations (Stage F+ — planned, not implemented)

Relation management UI does not exist today. The World Map already renders relation edges and filters when data is present. **No application write path exists** — normal product flows do not create relation rows. Manually seeded database rows can already be loaded and rendered.

### Legacy relation filters (Stage F)

The database enum and existing UI currently know: `dependency`, `shared-feature`, `shared-contract`, `reference`. Only `dependency` and `reference` are approved for new writes.

- Relation **creation** controls expose only `dependency` and `reference`.
- `shared-feature` and `shared-contract` are read-only legacy schema values.
- Their filter/view controls should **not** be shown by default when no legacy rows exist.
- If legacy rows exist in the future, they may be shown read-only.
- Do not remove the PostgreSQL enum values.

### Details panel as primary relation surface (Stage F)

The node details panel is the primary place to manage relations:

- List incoming and outgoing relations with **direction visible** (source → target labels or equivalent incoming/outgoing presentation).
- Each relation shows its **note** explaining why the connection exists.
- For `dependency` relations, the note should cover: what may proceed immediately; what remains provisional or blocked; what exact output the target must provide.
- Navigate to the connected node from the list (clear link to dependency targets).
- Create, edit note, and archive actions.
- Relations between direct Root children are supported — Root children are not assumed independent.

### Dependency-aware Planning UI (Stage F — planned)

- Topic Planning conversations remain accessible when dependencies exist; the conversation is not blocked.
- Show incoming dependencies with navigation to the target Node.
- AI responses should distinguish work that can proceed now, provisional work, and work waiting for a dependency output.
- Hard blocking of work actions is future Execution only — not Stage F Topic Planning.

### World Map relation display (Stage F)

- Active relations may remain visible through the existing per-type filters (`dependency`, `reference` by default), opacity sliders, and relation graph views.
- Legacy-type filters (`shared-feature`, `shared-contract`) hidden by default unless legacy rows exist (read-only if shown).
- Avoid graph clutter: hierarchy edges remain stronger than secondary edges; per-node edge caps may apply.
- Archived relations are **not** rendered as active edges.
- Pending AI relation proposals are **not** rendered as edges (Stage G).

### AI relation proposals (Stage G — planned)

Two explicit analysis modes (both user-triggered; neither runs automatically during structure approval):

**Initial relation analysis** — available after initial structure is approved. Trigger from Root Planning or World Map. Primarily analyzes relations between direct Root children using Root Planning content and node metadata. Does not require completed Topic Planning conversations.

**Deep relation analysis** — available once Topic Planning conversations contain meaningful content. Proposes more precise additions, changes, or archival. Explicitly user-triggered; does not run after every message.

- Proposals appear as reviewed proposal cards (similar pattern to structure proposal cards), not as immediate map edges.
- User approves, edits, or rejects before any relation becomes active.
- AI never creates active relations without user approval.

### Impact review and dependency updates (Stage H — planned)

- "Needs Review" indicators on dependent Nodes when a meaningful committed change affects a relation.
- Planned surfaces: World Map badge; persistent banner in dependent Planning chat; chronological dependency-update event (visually distinct from user/assistant messages); relation details showing change source; navigation to changed target Node.
- Target changes must not silently rewrite dependent conversations or plans.
- AI may propose downstream updates; user must approve before existing work is modified.
- Historical chat messages are never rewritten retroactively.
- Not part of Stage F.

## Interaction Principles

- One click selects a node.
- Opening a node is a separate explicit action.
- Changing a parent must be explicit and confirmed.
- Secondary relations may be hidden by type.
- Focus Mode shows the selected node, its ancestors, children and directly linked nodes.
- AI-proposed structural changes require explicit user approval before application; all structural changes use validated atomic server operations.

## Product/UX v2 — approved UX principles (not yet implemented)

The following are **approved direction** for the UI redesign. Exact layouts are not designed yet. See `docs/PRODUCT_UX_V2.md` for full detail.

### Legibility and structure

- The Project must remain readable independently of AI chat.
- Structure grows progressively — smallest useful macro structure first; do not invent depth prematurely.
- The canonical **hierarchical project structure** (project hierarchy as project truth) represents justified structure. Delegated areas remain visible; presentation may collapse or quiet them. This structural invariant does not settle Decision 6: the primary UI representation of the hierarchy (Tree/Outline vs Graph role) remains open.
- If a focus view hides AI-managed branches, show awareness (e.g. "4 AI-managed areas hidden").

### Inspection versus involvement

> Looking is free. Being brought in is a request.

- Opening, expanding, or inspecting a Node **never** changes involvement or policy.
- Repeated inspection may eventually suggest involvement change — never apply it automatically.

### Involvement — happy path (no level selectors)

Do **not** require autonomy wizards, level selectors, or involvement presets in the normal workflow.

**Standing / overlay vocabulary:**

- `AI handling` — label on delegated areas
- *(no label)* — normal involved state (default)
- `Needs you` — temporary overlay when user action is required

**Contextual actions:** `Involve me more` · `Handle this for me` — intent inputs compiled into specific policy with user confirmation.

Increasing involvement on request is always safe. Decreasing involvement / increasing AI authority requires explicit confirmation.

### "What I handle here" — read-first policy mirror

Power-user surface showing **effective policy** per Node (domain-appropriate categories, human-readable origins, non-editable floor rows). Editing is secondary. Not part of the happy path. Same underlying policy as natural-language compilation — no parallel settings store.

### Attention surfaces

Conceptual separation (not yet implemented):

- **Your work** — Human / Hybrid Tasks assigned to the user only
- **Needs your decision** — Attention queue (single system)
- **AI working** — compact status (e.g. "N AI tasks running · M blocked"), not a giant peer task list

Increasing involvement does **not** convert AI Tasks into user Tasks.

### Explanation depth

Adaptive by default via `Show more` / `Show less` on summaries (sticky per node). No detail-level selector in the happy path. Power users may override explanation style in "What I handle here."

### Task execution UI (future)

No full persistent Chat per Task by default. Support **Watch**, **Stop**, **Steer** (steer is an input event, not a conversation). Meaningful blockers escalate to Planning / Needs-you as translated issues — not raw agent errors.

### FOMO and calm transparency

- Do not use repetitive "nothing needs your attention" reassurance.
- Absence of `Needs you` is the quiet signal.
- Tree decision counts are a UX experiment — not locked copy.
- No timer-based reassurance. User-requested digests may be considered later.

### Visual design

Actual UI redesign, final branding, and light/dark priority remain **pending**. Do not invent final screen layouts in implementation without an approved UI redesign plan.
