# Universe AI — Product Context

## Product

Universe AI replaces long, flat AI conversations with organized project worlds.

## Core principle

**AI proposes; the user reviews and explicitly approves; the server applies the change.**

The AI may suggest structure, ask questions, and recommend actions. It must never create, modify, move, or archive nodes autonomously. AI-proposed changes require explicit user approval and an atomic server operation. User-initiated structural edits use the same validated atomic server operations but do not require an AI proposal.

## Core Structure

- **Universe:** the global home page.
- **World:** a project or long-running subject.
- **Root node:** planning only; hosts the Root Planning conversation.
- **Topic nodes:** non-root nodes in the hierarchy; each has separate Planning and Execution contexts (Execution is a later stage). Stage D initial structure creation creates direct children of Root. Future hierarchy editing may create deeper levels.
- Every node has one hierarchical parent (`nodes.parent_id`).
- Nodes inherit summarized context and binding decisions from their ancestor path.
- Nodes may have secondary links to nodes in other branches.
- Secondary links transfer relevant structured context, not entire conversations.
- Full history is stored; only a focused context package is sent to the AI.

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

After initial topic nodes exist, Generate World Structure must not create or approve another initial structure. Server and database validation must enforce this. The future action for a structured World is **Update Existing Structure** — modifying an already-approved structure while preserving node identity and attached work — which is a separate post-D capability (Structure Reconciliation).

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

The relation types are:

- Dependency
- Shared Feature
- Shared Contract
- Reference

Relations must be individually filterable in the World Map. Secondary relation generation by AI is post-D.

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

Stages A–C are complete. Stage D (Branch Suggestions and initial structure creation) is in progress. See `docs/CURRENT_STATE.md` for exact progress. Technical architecture is defined in `docs/ARCHITECTURE.md`.

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
- `/worlds/[worldId]/nodes/[nodeId]` — Root Planning Chat
