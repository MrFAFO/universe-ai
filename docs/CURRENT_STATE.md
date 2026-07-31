# Universe AI — Current State

For durable technical architecture see `docs/ARCHITECTURE.md`.

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

### Stage A — Database Foundation (completed)

- Supabase migration in `supabase/migrations/20260322000000_initial_schema.sql`: extensions, enums, tables (`worlds`, `nodes`, `node_relations`, `conversations`, `messages`, `ai_runs`, `branch_suggestions`), constraints, indexes, and RPCs `create_world_with_root` + `approve_branch_suggestion`.
- Server-only database layer in `src/lib/db/` (Supabase client, RPC wrappers, row-to-`WorldGraph` adapter) and typed models in `src/types/db.ts`.
- Zod validation schemas in `src/lib/validation/schemas.ts` for Stage A inputs and persisted suggestion payloads.
- Vitest foundation with unit tests for schemas and the map adapter (no live database required).
- `.env.example` documents `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (plus future OpenAI vars).
- Production Universe Home and World Map routes use persisted Supabase data; mock files remain only as development reference.

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

**Architecture:** Approved. See `docs/ARCHITECTURE.md`.

**Committed and pushed:**

- `12554e6` — feat: add structured branch suggestion schema
- `796806a` — feat: generate structured branch suggestions
- `d56edba` — feat: persist branch suggestions
- `0a08d61` — feat: add branch suggestions API

**Completed (committed):**

- D1 structured Branch Suggestion schema and input builder
- D1 standalone non-streaming OpenAI Responses API generation service
- Native structured output through `responses.parse` and `zodTextFormat`
- D2 `ai_run` lifecycle and `branch_suggestions` persistence
- D2 generation-and-persistence orchestration
- D3 Commit 1 GET/POST Branch Suggestions API

**Implemented in Stage D4.4:**

- Single pending proposal invariant (`superseded` status, partial unique index, replacement RPC)
- Initial-structure-only enforcement (`structure_already_exists`)
- Bounded stale-run recovery for abandoned Branch Suggestion `ai_runs`
- Branch Suggestion generation acquires its `ai_run` atomically through `begin_branch_suggestion_ai_run` before calling OpenAI

**Implemented in Stage D5:**

- D5 chronological timeline integration — Root Planning page loads messages and the singular pending proposal in parallel from the database; `initialSuggestion: BranchSuggestionDto | null` is passed to the client (no mount-time GET, no pending array)
- Messages expose `createdAt` for timeline ordering; `buildRootPlanningTimeline` merges messages and the pending proposal chronologically with stable tie handling
- `BranchSuggestionCard` is a presentational timeline item; Generate/Regenerate lives in the chat header with mutual disable against chat streaming
- Client helper handles both safe error bodies and conflict-only `{ code }` payloads

**Implemented in Stage D6:**

- D6 code-owned Root Planning prompt — `ROOT_PLANNING_SYSTEM_PROMPT` replaces persisted system rows in model input; persisted system messages remain stored but are excluded
- Compact World brief shared by Root Planning chat and Branch Suggestion generation — World name/description, Root title/goal, and up to 20 current non-root Node titles (`listWorldNodeTitles`)
- Domain-neutral generation instructions

**Implemented in Stage D7:**

- D7 readiness assessment and Discovery — `StructureAssessmentV1` transient contract; one structured OpenAI request returns either a ready proposal or insufficient Discovery questions
- Ready path persists only `BranchSuggestionV1` via the existing replacement RPC; insufficient path persists one ordinary assistant Discovery message linked to `ai_run_id` with no separate Discovery session state
- POST success is a discriminated union: `{ outcome: "proposal", suggestion }` or `{ outcome: "discovery", message }`; Discovery messages appear chronologically in the existing timeline

**Implemented in Stage D8:**

- D8 approval and rejection API — POST `/api/worlds/[worldId]/nodes/[nodeId]/branch-suggestions/[suggestionId]/approve` and `/reject`; uses existing atomic `approve_branch_suggestion` and `reject_branch_suggestion` RPCs with idempotent re-approve/re-reject
- Ownership validation against world, conversation and root node before decision RPCs; missing or mismatched suggestions return 404
- Successful approve/reject clears the pending proposal card; approval revalidates World Map (`/worlds/[worldId]`) and Root Planning paths, then client `router.refresh()` keeps the map DB-sourced
- Server-derived `hasInitialStructure` from `listWorldNodeTitles`; Generate/Regenerate hidden once initial structure exists
- Proposal card Approve/Reject actions with decision lifecycle guards, stale-response protection and safe client errors

**Approved target not yet implemented:**

- Generate with Assumptions (optional, cuttable final commit)
### Not Yet Implemented

- World Map editing beyond approved structure creation: relation editing, reparenting.
- Planning and execution chats for non-root nodes.
- Authentication.
- Structure Reconciliation and Update Existing Structure (post-D).

## Validation Status

**Latest automated verification:**

- 296 tests passed across 22 test files
- Lint passed with pre-existing UniverseHero `<img>` warning only
- Production build passed; approve and reject decision routes appear in build output
- Manual Stage D acceptance passed: Discovery, proposal generation, Regenerate replacement, Reject, Approve, persistence after refresh, map refresh, Generate hiding after approval, and duplicate-Approve protection were verified

**Prior automated verification (D7 committed):**

- 235 tests passed across 21 test files
- Lint passed with pre-existing UniverseHero `<img>` warning only
- Production build passed
- Branch Suggestions API route appeared in the build output

**Manual browser acceptance (local D3 UI prototype):**

- Initial loading, explicit generation, proposal persistence and display, and no automatic node creation all worked
- The original D3 UI prototype was not accepted as-is; the D5 refactor supersedes it while preserving the reusable generation and proposal-card work.

**Prototype status after D5:**

- Single pending proposal is enforced by the server, and the UI uses singular state
- The proposal is integrated chronologically as a `BranchSuggestionCard` timeline item
- Root Planning prompt ownership moved to code in D6 (domain-neutral instructions)

## Development Environment Note

- Next.js Turbopack development cache failed under the OneDrive project path (SST persistence failures, missing `.next` manifests).
- Workaround: delete `.next` and run `pnpm exec next dev --webpack`.
- Production build remained successful. This is not a D3 application-code failure.

## Latest Update

- Stage D architecture approved.
- Documentation updated: `docs/ARCHITECTURE.md` created; `PROJECT.md`, `UI.md`, `CURRENT_STATE.md`, and `AGENTS.md` updated.
- Stage D1–D3 Commit 1 committed and pushed on `stage-d-branch-suggestions`.
- D5 timeline integration completed: server-side pending load, chronological `BranchSuggestionCard`, chat-level Generate/Regenerate; mount-time GET and pending array removed.
- D6 code-owned Root Planning prompt and compact World brief completed: persisted system rows excluded from model input; chat and Branch Suggestion share the same brief and domain-neutral instructions.
- D7 readiness assessment and Discovery completed: `StructureAssessmentV1`, one-call structured assessment, proposal or Discovery assistant message outcomes, chronological timeline integration.
- D8 approval/rejection and map refresh completed: approve/reject endpoints, ownership validation, pending card removal, server-derived `hasInitialStructure`, Generate hidden after approval.

## Next Task

Resume Stage D implementation per the phased plan in `docs/ARCHITECTURE.md`:

1. Perform final branch review and merge `stage-d-branch-suggestions` into the main branch.`r`n2. Defer optional Generate with Assumptions to a future iteration.
