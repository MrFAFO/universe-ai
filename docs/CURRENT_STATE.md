# Universe AI — Current State

## Completed

- Next.js project created successfully.
- pnpm configured.
- TypeScript enabled.
- Tailwind CSS v4 installed.
- App Router enabled.
- lucide-react installed.
- @xyflow/react installed.
- Development server runs successfully.
- **Static Universe Home at `/` implemented and visually refined.**
- **Static World Map at `/worlds/[worldId]` implemented with @xyflow/react.**

## Current Application State

### Universe Home (`/`)

- Shared application shell with fixed left sidebar, top header and scrollable main area.
- Design tokens defined as CSS variables in `globals.css` (dark navy foundation, blue/violet accents, depth shadows and inner glow utilities).
- Living-universe hero with full-width intelligence network visualization — layered orbital rings, central core, connected nodes and restrained ambient animation.
- Typed World data loaded from Supabase on the server.
- Reusable `WorldCard` components with per-world SVG thumbnails (`WorldThumbnail`), improved hierarchy and hover depth; linking to `/worlds/[worldId]`.
- Right overview panel with card-based surfaces for Recent Activity, Universe Overview and Model (visible at `xl` breakpoint).
- Basic desktop-first responsiveness: sidebar hidden below `md`, overview panel hidden below `xl`, responsive world grid.
- Typography and spacing scaled up for desktop; premium depth via surface cards, inset backgrounds and restrained glow.

### World Map (`/worlds/[worldId]`)

- Server route in `src/app/worlds/[worldId]/page.tsx` reusing the shared `AppShell`; loads world graph from Supabase by UUID and returns `notFound()` for invalid or missing ids.
- Typed graph model in `src/types/world-map.ts` and mock graph in `src/data/mock-world-map.ts` (root, four branches, six children plus secondary relations). Manual node positions.
- Interactive canvas via `@xyflow/react` (`WorldMapView`): pan, zoom, fit-view, single- and multi-node selection (marquee box + Ctrl/Cmd+click), and draggable nodes (group drag when multiple selected); nodes are non-connectable.
- Custom `WorldNode` with root/branch/child variants; root uses a hero-style orb core.
- Primary hierarchy view plus dedicated floating relation graphs per secondary relation type (`dependency`, `shared-feature`, `shared-contract`, `reference`). Users switch views from the filter bar (Hierarchy button, “Open relation graph” in each filter popover, or double-click a relation chip).
- Relation graphs show only participating nodes and that type’s links (network layout, not a tree). Each view keeps its own manual positions and reset-layout behavior.
- Primary hierarchy edges (solid, arrowed) always visible in hierarchy view; secondary relation edges (dashed, color-coded) use per-type opacity sliders in hierarchy view.
- Selecting a node highlights relevant connections and opens `NodeDetailsPanel` (goal, parent, children, linked nodes, key decisions, open questions, progress).
- Themed React Flow controls and dotted background; details panel docks on wide screens and overlays below `xl`.

### Stage B — Persistent Worlds and DB-backed World Map (completed)

- Persistent world queries in `src/lib/db/worlds.ts`: list worlds (ordered by `updated_at`), load world graph with nodes and secondary relations by UUID.
- `mapDbWorldToWorld` adapts database rows to the existing `World` card contract with neutral defaults for unstored metrics.
- `createWorldAction` server action validates input, calls `create_world_with_root`, revalidates `/`, and redirects to the new world map.
- Functional Create World dialog wired to Header, Sidebar and empty-state actions (`CreateWorldProvider`, `CreateWorldDialog`, `CreateWorldButton`).
- Universe Home loads persisted worlds from Supabase on the server; overview totals derive from stored data; restrained database error state on failure.
- `/worlds/[worldId]` loads the graph from Supabase (UUID-only), returns `notFound()` for missing/invalid ids, and preserves the existing React Flow UI.
- Mock universe/world-map files retained for development reference; production routes no longer depend on them.

### Stage C — Root Planning Chat (completed)

- Dedicated Root Planning Chat at `/worlds/[worldId]/nodes/[nodeId]`.
- The Root node details panel links directly to its Planning Chat.
- Existing Root Planning conversation history loads from Supabase in ordinal order.
- User messages are persisted before the OpenAI request begins.
- Assistant text streams progressively through the OpenAI Responses API using an NDJSON protocol.
- Completed assistant messages and `ai_runs` lifecycle data are persisted in Supabase.
- Failed, interrupted, or cancelled streams do not persist partial assistant messages and do not leave the client permanently stuck.
- Supabase remains the authoritative conversation history; the OpenAI API key and model configuration remain server-only.
- Manual acceptance passed: progressive streaming, persistence after refresh, history reload after reopening, and no server errors.

### Stage D — Branch Suggestions (in progress)

**Current branch:** `stage-d-branch-suggestions`

**Committed and pushed:**

- `12554e6` — feat: add structured branch suggestion schema
- `796806a` — feat: generate structured branch suggestions
- `d56edba` — feat: persist branch suggestions
- `0a08d61` — feat: add branch suggestions API

**Completed (committed):**

- D1 structured Branch Suggestion schema and input builder (`src/lib/ai/branch-suggestion.ts`)
- D1 standalone non-streaming OpenAI Responses API generation service (`src/server/ai/generate-branch-suggestion.ts`)
- Native structured output through `responses.parse` and `zodTextFormat`
- D2 `ai_run` lifecycle and `branch_suggestions` persistence (`src/lib/db/branch-suggestions.ts`)
- D2 generation-and-persistence orchestration (`src/server/ai/generate-and-persist-branch-suggestion.ts`)
- D3 Commit 1 GET/POST Branch Suggestions API (`src/app/api/worlds/[worldId]/nodes/[nodeId]/branch-suggestions/route.ts`)

**Locally implemented but not committed:**

- D3 Commit 2 Branch Suggestions UI (`src/components/chat/BranchSuggestionsPanel.tsx`, integrated in `RootPlanningChat.tsx`)
- Generate World Structure button
- Loading existing pending proposals
- Generating a proposal explicitly through POST
- Displaying rationale and proposed nodes
- Client helpers (`src/lib/ai/branch-suggestions-client.ts`), tests, and styles

**Not yet implemented in Stage D:**

- Branch suggestion approval, rejection, or node creation
- Map refresh after structure changes
- Structure reconciliation or updates to existing project structure

### Not Yet Implemented

- World Map editing: Create Node, relation editing, reparenting.
- Planning and execution chats for non-root nodes.
- Authentication.
- Branch suggestion approval UI and workflow.
- Structure reconciliation and update flows.

### Stage A — Database Foundation (completed)

- Supabase migration in `supabase/migrations/20260322000000_initial_schema.sql`: extensions, enums, tables (`worlds`, `nodes`, `node_relations`, `conversations`, `messages`, `ai_runs`, `branch_suggestions`), constraints, indexes, and RPCs `create_world_with_root` + `approve_branch_suggestion`.
- Server-only database layer in `src/lib/db/` (Supabase client, RPC wrappers, row-to-`WorldGraph` adapter) and typed models in `src/types/db.ts`.
- Zod validation schemas in `src/lib/validation/schemas.ts` for Stage A inputs and persisted suggestion payloads.
- Vitest foundation with unit tests for schemas and the map adapter (no live database required).
- `.env.example` documents `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (plus future OpenAI vars).
- Production Universe Home and World Map routes use persisted Supabase data; mock files remain only as development reference.

## Validation Status

**Latest automated verification:**

- 147 tests passed across 14 test files
- Lint passed with only the existing UniverseHero `<img>` warning
- Production build passed
- Branch Suggestions API route appeared in the build output

**Manual browser acceptance (Stage D3 UI):**

- Initial loading worked
- Explicit generation worked
- The proposal persisted and displayed correctly
- No nodes were created automatically
- The current UI is technically functional but **not accepted for commit** because product and architecture issues were identified (see below)

## Manual Acceptance Findings (Stage D3 UI)

### A. Multiple pending proposals

- Generate World Structure remains active after a pending proposal exists.
- Clicking it again creates another pending proposal.
- The current database/API flow allows multiple pending proposals for one Root Planning conversation.
- This behavior is **not accepted**.

### B. Proposal placement

- `BranchSuggestionsPanel` currently sits between the message list and composer.
- New chat messages appear above the proposal.
- This breaks chronological conversation flow.
- The proposal should become an item in the conversation timeline so later messages appear below it.

### C. Root Planning AI focus

- Root Planning currently answers unrelated general questions directly.
- Desired behavior is a project-focused strategic expert, described by the product owner as the “God of the World”.
- It should connect new questions to the World’s goals, ask for relevance when unclear, and maintain domain expertise without hard-blocking potentially relevant topics.

## Architecture Decisions Requiring Opus Review

**No implementation should continue before an Opus 4.8 High architecture review validates and refines these decisions:**

- Only one pending structure proposal per Root Planning conversation.
- A Regenerate action should supersede or reject the previous pending proposal.
- Distinguish:
  - Create Initial Structure
  - Regenerate Pending Proposal
  - Update Existing Structure
- Future updates to an existing project must preserve relevant work and node identity.
- Future Structure Reconciliation should propose reviewed operations such as:
  - KEEP
  - UPDATE
  - ADD
  - MOVE
  - ARCHIVE
  - potentially later SPLIT and MERGE
- Prefer archive or supersede over physical deletion.
- Existing conversations, work, progress, decisions, and history must remain attached to preserved nodes.
- AI proposes changes; user explicitly approves before an atomic database operation.
- The current `approve_branch_suggestion` RPC only adds topic nodes under Root and is suitable for initial creation only.
- Reconciliation requires a separate future architecture and database operation.

## Context Readiness and Discovery Plan (Requires Review)

**Planned behavior:**

- Generate World Structure should remain explicitly user-triggered.
- Do not disable the button based on a hidden AI readiness decision.
- On click, perform a Context Readiness Assessment.
- When enough context exists, generate the proposal.
- When context is insufficient, enter a Discovery flow.
- Ask 1–3 high-value questions at a time.
- Determine:
  - project purpose
  - target audience
  - desired outcome and success criteria
  - current state
  - constraints
  - intended scope
  - whether non-technical areas such as marketing, operations, finance, legal, content, or logistics should be included
- After insufficient cooperation, explain that a reliable structure cannot yet be generated.
- Future options may include:
  - Continue Discovery
  - Generate with Assumptions
- Generate with Assumptions should expose assumptions, missing information, and low confidence.
- Opus must decide the exact structured-output/API/state-machine contract.

## Cross-Domain Product Requirement

Universe AI must support technical and non-technical projects professionally, including:

- software projects
- writing a book
- physical product development
- event planning
- business and operational projects

The system should use domain-neutral concepts such as:

- workstream
- stage
- responsibility
- outcome
- dependency
- deliverable

It must not assume every World has software concepts such as frontend or backend.

## Future Context Engine

A prompt-only solution is not considered sufficient long-term.

A future Context Engine should maintain:

- World summary
- goals
- success criteria
- constraints
- decisions
- assumptions
- open questions
- node structure
- execution state
- research and sources
- recent changes

This is not part of the current committed Stage D implementation and requires later architectural planning.

## Development Environment Note

- Next.js Turbopack development cache failed under the OneDrive project path.
- Errors included SST persistence failures and missing `.next` manifests/runtime files.
- Deleting `.next` and running `pnpm exec next dev --webpack` restored a working development server.
- Production build remained successful.
- Do not treat this as a D3 application-code failure.

## Latest Update

- Stage D1–D3 Commit 1 are committed and pushed on `stage-d-branch-suggestions`.
- D3 Commit 2 UI is implemented locally and passed basic manual browser acceptance, but is blocked from commit pending architecture review.
- Key open issues: multiple pending proposals, proposal placement in the conversation timeline, Root Planning AI focus, context readiness/discovery flow, and future structure reconciliation.
- Automated verification: 147 tests, lint (one pre-existing warning), production build all pass.

## Next Task

- **Do not commit the current D3 UI yet.**
- Request an **Opus 4.8 High architectural review**.
- Ask Opus to validate feasibility, identify required schema/API/database/UI changes, determine what belongs in Stage D versus a post-D stage, and propose a safe incremental implementation plan.
- After the architecture is approved, update `PROJECT.md` and `UI.md`, then resume implementation.
