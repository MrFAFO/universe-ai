# Universe AI — Product Context

## Product

Universe AI is an **AI-native project management and execution workspace** that makes complex projects clear, accessible, editable, and understandable — including for users who are not experts in the project's domain.

It combines:

1. **Project Workspace** — a legible project system (structure, planning, Tasks, Decisions, Files / Artifacts, status, progress, dependencies, history, attention) usable independently of AI chat
2. **Project Intelligence** — persistent AI that understands, plans, advises, explains, monitors, and coordinates
3. **Execution** — work performed by AI, humans, or hybrid collaboration

The conceptual lifecycle is: Idea → Understand → Structure → Plan → Decide → Tasks → Execute → Track → Learn / Adapt. This is a product model, not an implemented state machine.

## Product thesis — north star

Universe AI enables a person to create and manage a complex project with AI **without losing understanding, access, or control** — maintaining a living, understandable model of the Project as AI performs more of the work.

> AI may handle complexity, but must never hide the project from its owner.

Full thesis, control principle, validation questions, and relationship to Product/UX v2: see `docs/PRODUCT_UX_V2.md` — Product thesis — refined north star.

## Initial validation focus — hypothesis

**Software-first** initial product experience and go-to-market: AI-assisted software / digital product creation for builders who can ship with AI tools but do not comfortably understand or control the entire resulting system (founders, product-oriented builders, vibe coders, semi-technical builders — **exact ICP not validated**).

Core architecture remains **domain-neutral**; software-first is a wedge, not a permanent product restriction.

**Approved Product/UX direction:** see `docs/PRODUCT_UX_V2.md` for the full v2 baseline, involvement model, and open decisions.

**Current implementation terminology:** the codebase still uses Universe / World / Root / Topic node naming. Future terminology and branding remain **open** — do not rename schema or routes without explicit approval.

## Core principle

**AI proposes; the user reviews and explicitly approves; the server applies the change atomically.**

The AI may suggest structure, ask questions, and recommend actions. It must never create, modify, move, or archive nodes autonomously. AI-proposed changes require explicit user approval and an atomic server operation. User-initiated structural edits use the same validated atomic server operations but do not require an AI proposal.

**Permanent safety principles:**

- Existing conversations, progress, decisions, and completed or relevant work must not be silently deleted or blindly replaced.
- Proposed state must remain separate from approved World state.
- Prefer simple incremental implementation over speculative abstractions.
- **Chat is a place to think.** Approved structured project state is durable project truth. Chat text does not automatically become project truth.
- **AI autonomy must never make the Project progressively less legible to its owner.**

**Structural changes (current implementation invariant):** AI-generated structural changes still require reviewed proposal, explicit user approval, and validated atomic server/database application. Autonomous structural expansion is **deferred** — see `docs/PRODUCT_UX_V2.md`.

## Core Structure

- **Universe:** the global home page.
- **World:** a project or long-running subject.
- **Root node:** planning only; hosts the Root Planning conversation for forming or reconciling World structure.
- **Topic nodes:** non-root nodes in the hierarchy; each has its own Planning conversation (Stage E — implemented). Future Tasks and execution attach to work areas; execution is **not** modelled as a separate conversation type in the approved Product/UX v2 direction.
- Every non-root node has exactly one hierarchical parent (`nodes.parent_id`).
- The hierarchy represents decomposition and ownership of work.
- Secondary relations must not become an alternative hierarchy.
- Nodes inherit summarized context from their ancestor path.
- Nodes may have secondary links to nodes in other branches.
- Secondary links transfer relevant structured context, not entire conversations.
- Full history is stored; only a focused context package is sent to the AI.

## Conversation types (current implementation)

| Type | Node | Purpose | Status |
|---|---|---|---|
| Root Planning | Root | Form or reconcile World structure | Implemented (Stage D) |
| Planning | Topic Node | Plan work within a branch | Implemented (Stage E) |

**Approved future direction (not implemented):** Tasks and inspectable execution surfaces — not a third "Execution conversation" per node. Generalized Run entity model remains to be designed. See `docs/PRODUCT_UX_V2.md`.

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

## Progressive structure — approved product principle

> The Project Tree grows with understanding. It should not be deeper or more detailed than current project knowledge justifies.

Initial structure should be the smallest useful macro structure based on information established during Discovery / Planning. Once an area is known to be a real part of the Project, it must not disappear merely because the user has delegated that area to AI. Presentation may collapse or quiet delegated branches; canonical structure remains accurate.

**Stage E (Non-root Planning) — implemented:** each Topic Node is a real planning workspace with persistent Planning chat. This produces the node-level Planning content that later relation detection, context transfer, and reconciliation depend on.

Relations and reconciliation should follow real node-level Planning content where precision matters. **Initial** relation analysis (Stage G) may use Root Planning content and node metadata without completed Topic Planning conversations; **deep** analysis requires meaningful Topic Planning content. Relation **implementation** (Stage F) follows Stage E but remains **blocked** until the UI redesign milestone is completed and accepted.

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
| **dependency** | A decision, deliverable, constraint, or progress output from another node required to complete, validate, or finalize a material part of this node's work |
| **deliverable** | A concrete output from a workstream or stage |

Do not assume frontend, backend, database, or software architecture unless the project conversation establishes a software context.

## Secondary Relations

### Primary hierarchy versus secondary relations

The hierarchy (`parent_id`) is the single source of decomposition and ownership. Secondary relations are additive links between nodes that are not parent and child. They must never substitute for correct hierarchy placement.

**Direct children of the Root may have secondary relations with each other.** Being a Root child does not imply those workstreams are independent. Cross-workstream dependencies and references are expected and valuable.

### Approved product relation types (new writes)

Only two relation types are approved for new product writes. **Both are directed** (source → target):

**`dependency`**

- The **source** depends on the **target** (directed: source → target).
- The source requires a decision, deliverable, constraint, or progress from the target in order to **complete, validate, or finalize a material part** of its work.
- A dependency does **not** necessarily mean that no work may begin on the source node. Early exploration and provisional planning may proceed; specific completion or validation may remain blocked or provisional until the target output exists.
- Does not imply ownership or parenthood.
- May eventually influence blockers and readiness in future Execution — but **hard blocking belongs only to future Execution behaviour, not Topic Planning**.

*Example (event planning):* "Venue Setup" depends on "Venue Contract Signed" — preliminary planning may proceed, but final setup validation cannot be completed until the signed contract deliverable exists.

**Required relation note** (every `dependency`, manual or AI-approved) should explain:

- What may proceed immediately on the source
- What remains provisional or blocked
- What exact output is required from the target

**`reference`**

- The **source** should receive relevant context from the **target** (directed: source → target).
- The source is **not** blocked by the target.
- Does not imply ownership, hierarchy, or sequencing.

*Example (book project):* "Chapter Draft" references "Character Bible" — the draft workspace should know character details without waiting on the bible to be finished.

Information flows from **target to source** in both types. The difference is whether the source requires target output to finalize material work (`dependency`) or merely benefits from target context (`reference`).

### Legacy schema values (not for new writes)

The PostgreSQL `relation_type` enum also contains `shared-feature` and `shared-contract`. These remain in the schema as historical facts. They are **not approved for new product writes**. Do not propose an enum-removal migration.

Approved interpretation:

- **`shared-feature`** — better treated as a future overlap or restructuring signal. It often indicates a missing shared node, duplicate work, or incorrect decomposition.
- **`shared-contract`** — initially represented through an owning deliverable Node that other Nodes depend on via `dependency`. No first-class Contract entity is approved yet.

### User value of relations

Relations exist to:

- **Transfer context** — send compact, relevant information from one branch to another without copying entire conversations.
- **Surface blockers** — show when completing or validating specific work on the source depends on output from the target (without blocking the Planning conversation itself).
- **Enable cross-branch navigation** — move between related workstreams on the map and in the details panel.
- **Create impact awareness** — flag when a node change may make an existing link questionable (Stage H).

Every manually created relation requires a short explanatory note. For `dependency` relations, the note should cover what may proceed, what remains provisional or blocked, and what output the target must provide.

### Dependency-aware Planning (approved principles)

**Durable principles (Topic Planning):**

- A Topic Planning conversation remains accessible even when the Topic Node depends on another Node.
- A dependency does not block the conversation itself.
- It may prevent completing, validating, or finalizing specific parts of the work.
- The AI should distinguish: work that can proceed now; work that is provisional; work waiting for a dependency output.
- The user must not be forced to leave the current conversation.
- The UI should provide a clear link to the dependency target.

**Stage placement:** Stage F delivers dependency visibility, navigation, bounded context, and provisional-work awareness. Stage H delivers meaningful-change detection, Needs Review, durable update events, and reviewed downstream updates. Hard blocking belongs only to future Execution.

### Relation proposals and approved state

AI may propose relations only after explicit user action (Stage G). Proposals remain separate from active World state until approved. The AI never creates active relations without user approval. Pending or rejected proposals must never appear on the map or in AI context.

**Stage G supports two explicit analysis modes** (both user-triggered; neither runs automatically during structure approval):

**Initial relation analysis** — available after initial structure is approved. May be triggered from Root Planning or the World Map. Primarily analyzes relations between direct Root children. Uses Root Planning conversation content, World description, and node titles, descriptions, and goals. Proposes only high-level relations supported by clear evidence. Does not require completed non-root Planning conversations.

**Deep relation analysis** — available once Topic Planning conversations contain meaningful content. Uses that deeper evidence to propose more precise additions, changes, or archival. Remains explicitly user-triggered. Does not run after every message.

Relations should be archived rather than silently hard-deleted when no longer valid.

## Product purpose

Traditional AI chats become difficult to navigate as conversations grow. Important decisions, context, and outputs become buried inside a long linear history.

Universe AI makes the project **readable** — structure, decisions, work, and outputs remain visible and manageable without repeatedly asking AI what exists, where things stand, or what was decided.

A user begins with planning at the root of a World. When the subject expands, the AI proposes splitting it into focused child nodes. Each node receives only the relevant summarized context, binding decisions, and connected project information it needs.

The product combines:

- AI conversation and Project Intelligence
- Hierarchical project structure
- Visual project navigation
- Focused context management
- Planning and future execution workspaces
- Structured Decisions, Tasks, progress, and project memory (approved future entities — see `docs/PRODUCT_UX_V2.md`)

**Durable context principle:**

> Keep the full history, but expose and send only the information that is relevant to the current task.

**Structure visualization — open (Decision 6):** the World Map exists today as hierarchy and relation graph views. Whether outline/tree becomes the canonical primary interface and graph becomes a secondary lens is **not yet formally approved**. See `docs/PRODUCT_UX_V2.md` — Decision 6.

## Current implementation status

Stages A–E.1 are **implemented and manually accepted** on branch `stage-e1-planning-chat-concurrency-hardening` (Stage E.1 acceptance at `b7eb057`). Stages A–D are merged into `main` at commit `95e09f6`.

**Current gate:** Product/UX Architecture v2 — interim documentation baseline (Product/UX work **not complete**). **Next product-owner decision:** Decision 6. Sequence: remaining Product/UX decisions → final Product/UX approval → UI redesign → later implementation. **Stage F must not start yet.**

See `docs/CURRENT_STATE.md` for exact progress. See `docs/PRODUCT_UX_V2.md` for approved product direction and open decisions.

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
- `/worlds/[worldId]/nodes/[nodeId]` — Planning Chat (Root or Topic; dispatched by node kind — Stage E)
