# Universe AI — Product Context

## Product

Universe AI replaces long, flat AI conversations with organized project worlds.

## Core principle

**AI proposes; the user reviews and explicitly approves; the server applies the change atomically.**

The AI may suggest structure, ask questions, and recommend actions. It must never create, modify, move, or archive nodes autonomously. AI-proposed changes require explicit user approval and an atomic server operation. User-initiated structural edits use the same validated atomic server operations but do not require an AI proposal.

**Permanent safety principles:**

- Existing conversations, progress, decisions, and completed or relevant work must not be silently deleted or blindly replaced.
- Proposed state must remain separate from approved World state.
- Prefer simple incremental implementation over speculative abstractions.

## Core Structure

- **Universe:** the global home page.
- **World:** a project or long-running subject.
- **Root node:** planning only; hosts the Root Planning conversation for forming or reconciling World structure.
- **Topic nodes:** non-root nodes in the hierarchy; each will have its own Planning conversation (Stage E) and later Execution contexts.
- Every non-root node has exactly one hierarchical parent (`nodes.parent_id`).
- The hierarchy represents decomposition and ownership of work.
- Secondary relations must not become an alternative hierarchy.
- Nodes inherit summarized context from their ancestor path.
- Nodes may have secondary links to nodes in other branches.
- Secondary links transfer relevant structured context, not entire conversations.
- Full history is stored; only a focused context package is sent to the AI.

## Conversation types

| Type | Node | Purpose | Status |
|---|---|---|---|
| Root Planning | Root | Form or reconcile World structure | Implemented (Stage D) |
| Planning | Topic Node | Plan work within a branch | Stage E (next) |
| Execution | Any work node | Carry out approved work | Future |

## Root Planning AI

Root Planning is the strategic expert for its World — described by the product owner as the **"God of the World"**.

It must:

- Understand the project's purpose and domain
- Connect new questions to World goals
- Ask how apparently unrelated information affects the project
- Recognize constraints, contradictions, dependencies, and risks
- Distinguish facts, assumptions, decisions, and recommendations
- Recommend professional and efficient planning for the current domain
- Avoid acting like a generic assistant when relevance is unclear
- Remain open to topics that may be relevant after clarification

It must never assume a software project or use software-specific vocabulary unless the conversation establishes one.

## World structure proposals

**Generate World Structure** is the initial-structure flow. It is available only while the World does not yet have an approved or created topic-node structure.

A user explicitly requests a World structure proposal when ready. The system assesses context readiness on that click:

- If ready, it generates a structure proposal for review.
- If insufficient, it asks 1–3 Discovery questions as an ordinary assistant message.
- The user answers in the normal composer; readiness is evaluated again only on the next explicit Generate click.

A proposal is a review artifact only. **No nodes exist on the map until the user approves.**

Regenerating replaces the pending proposal; the previous one is marked superseded. Only one pending proposal may exist per Root Planning conversation.

After initial topic nodes exist, Generate World Structure must not create or approve another initial structure. Server and database validation must enforce this. The future action for a structured World is **Update Existing Structure** — modifying an already-approved structure while preserving node identity and attached work — which is Structure Reconciliation (Stage I).

## Why non-root Planning is next

Stage D created the initial topic-node structure, but only Root Planning is a real workspace today. Topic Nodes exist on the map without their own Planning conversations.

Non-root Planning is the immediate next capability because:

- It makes each Topic Node a real planning workspace, not just a map label.
- It produces the persistent Planning content that later relation detection, context transfer, and reconciliation depend on.
- It can reuse proven streaming and persistence infrastructure without prematurely introducing relations or reconciliation complexity.

Relations and reconciliation should follow real node-level Planning content, not precede it.

## Cross-domain support

Universe AI must work professionally across project types, including:

- Software projects
- Books and writing projects
- Physical product development
- Event planning
- Business and operational programs
- Other long-running structured goals

### Domain-neutral glossary

| Term | Meaning |
|---|---|
| **workstream** | A major area of effort within the World |
| **stage** | A phase or step within a workstream |
| **responsibility** | Who or what owns an outcome |
| **outcome** | What success looks like for an area |
| **dependency** | What must happen or exist before something else can proceed |
| **deliverable** | A concrete output from a workstream or stage |

Do not assume frontend, backend, database, or software architecture unless the project conversation establishes a software context.

## Secondary Relations

### Primary hierarchy versus secondary relations

The hierarchy (`parent_id`) is the single source of decomposition and ownership. Secondary relations are additive links between nodes that are not parent and child. They must never substitute for correct hierarchy placement.

### Approved product relation types (new writes)

Only two relation types are approved for new product writes. **Both are directed** (source → target):

**`dependency`**

- The **source** depends on the **target**.
- The target provides a required prerequisite, decision, deliverable, or progress needed by the source.
- May eventually influence blockers and readiness.
- Does not imply ownership or parenthood.

*Example (event planning):* "Venue Setup" depends on "Venue Contract Signed" — setup cannot proceed until the contract deliverable exists.

**`reference`**

- The **source** should receive relevant context from the **target**.
- The source is **not** blocked by the target.
- Does not imply ownership, hierarchy, or sequencing.

*Example (book project):* "Chapter Draft" references "Character Bible" — the draft workspace should know character details without waiting on the bible to be finished.

Information flows from **target to source** in both types. The difference is whether the source is blocked (`dependency`) or merely informed (`reference`).

### Legacy schema values (not for new writes)

The PostgreSQL `relation_type` enum also contains `shared-feature` and `shared-contract`. These remain in the schema as historical facts. They are **not approved for new product writes**. Do not propose an enum-removal migration.

Approved interpretation:

- **`shared-feature`** — better treated as a future overlap or restructuring signal. It often indicates a missing shared node, duplicate work, or incorrect decomposition.
- **`shared-contract`** — initially represented through an owning deliverable Node that other Nodes depend on via `dependency`. No first-class Contract entity is approved yet.

### User value of relations

Relations exist to:

- **Transfer context** — send compact, relevant information from one branch to another without copying entire conversations.
- **Surface blockers** — show when one area cannot proceed until another provides a prerequisite.
- **Enable cross-branch navigation** — move between related workstreams on the map and in the details panel.
- **Create impact awareness** — flag when a node change may make an existing link questionable (Stage H).

Every manually created relation requires a short explanatory note describing why the connection exists.

### Relation proposals and approved state

AI may propose relations only after explicit user action (Stage G). Proposals remain separate from active World state until approved. Pending or rejected proposals must never appear on the map or in AI context.

Relations should be archived rather than silently hard-deleted when no longer valid.

## Product Purpose

Traditional AI chats become difficult to navigate as conversations grow. Important decisions, context and outputs become buried inside a long linear history.

Universe AI turns a complex AI conversation into a structured visual project.

A user begins with a planning conversation at the root of a World. When the subject expands, the AI suggests splitting it into focused child nodes. Each node receives only the relevant summarized context, binding decisions and connected project information it needs.

The product combines:

- AI conversation
- Hierarchical project structure
- Visual knowledge navigation
- Focused context management
- Planning and execution workspaces
- Structured decisions, progress and project memory

The core promise is:

> Keep the full history, but expose and send only the information that is relevant to the current task.

The World Map is therefore not decorative. It is the primary interface for understanding the project, navigating its knowledge and controlling which context each AI workspace receives.

## Current implementation status

Stages A–D are complete and merged into `main` at commit `95e09f6`. Stage E (Non-root Planning) is the immediate next implementation stage. See `docs/CURRENT_STATE.md` for exact progress and the approved post-D roadmap.

Technical architecture is defined in `docs/ARCHITECTURE.md`.

## Frontend Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- lucide-react
- @xyflow/react
- pnpm
- Desktop-first responsive layout

## Routes

- `/` — Universe Home
- `/worlds/[worldId]` — World Map
- `/worlds/[worldId]/nodes/[nodeId]` — Planning Chat (Root node today; Topic Nodes in Stage E)
