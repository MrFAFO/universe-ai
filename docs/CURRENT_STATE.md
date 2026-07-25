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

**Locally implemented but not committed (requires refactor per approved architecture):**

- D3 Commit 2 Branch Suggestions UI prototype
- Generate World Structure button, pending proposal loading, explicit POST generation, proposal review display
- Client helpers, tests, and styles

**Implemented in Stage D4.4:**

- Single pending proposal invariant (`superseded` status, partial unique index, replacement RPC)
- Initial-structure-only enforcement (`structure_already_exists`)
- Bounded stale-run recovery for abandoned Branch Suggestion `ai_runs`
- Branch Suggestion generation acquires its `ai_run` atomically through `begin_branch_suggestion_ai_run` before calling OpenAI

**Approved target not yet implemented:**

- Chronological timeline integration (`BranchSuggestionCard` as timeline item)
- Code-owned domain-neutral Root Planning prompt and World brief
- Readiness assessment and Discovery (`StructureAssessmentV1`)
- Approval and rejection UI and API
- Map refresh after approval
- Generate with Assumptions (optional, cuttable final commit)

### Not Yet Implemented

- World Map editing beyond approved structure creation: relation editing, reparenting.
- Planning and execution chats for non-root nodes.
- Authentication.
- Structure Reconciliation and Update Existing Structure (post-D).

## Validation Status

**Latest automated verification:**

- 147 tests passed across 14 test files
- Lint passed with only the existing UniverseHero `<img>` warning
- Production build passed
- Branch Suggestions API route appeared in the build output

**Manual browser acceptance (local D3 UI prototype):**

- Initial loading, explicit generation, proposal persistence and display, and no automatic node creation all worked
- The prototype is **not accepted for commit** — see `docs/ARCHITECTURE.md` (Uncommitted D3 UI disposition)

**Known prototype issues (addressed by approved architecture, not yet implemented):**

- Multiple pending proposals allowed per conversation
- Proposal panel breaks chronological message flow
- Root Planning behaves too much like a generic chatbot

## Development Environment Note

- Next.js Turbopack development cache failed under the OneDrive project path (SST persistence failures, missing `.next` manifests).
- Workaround: delete `.next` and run `pnpm exec next dev --webpack`.
- Production build remained successful. This is not a D3 application-code failure.

## Latest Update

- Stage D architecture approved.
- Documentation updated: `docs/ARCHITECTURE.md` created; `PROJECT.md`, `UI.md`, `CURRENT_STATE.md`, and `AGENTS.md` updated.
- Stage D1–D3 Commit 1 committed and pushed on `stage-d-branch-suggestions`.
- Local D3 Commit 2 UI prototype exists but is blocked from commit pending refactor per approved architecture.
- Automated verification: 147 tests, lint (one pre-existing warning), production build all pass.

## Next Task

Resume Stage D implementation per the phased plan in `docs/ARCHITECTURE.md`:

1. Phase D4 — single pending proposal (migrations, replacement RPC, route updates)
2. Phase D5 — chronological timeline integration and UI refactor
3. Phase D6 — code-owned prompt, World brief, domain-neutral instructions
4. Phase D7 — readiness assessment and Discovery
5. Phase D8 — approval, rejection, map refresh
6. Optional — Generate with Assumptions

Do not commit the current D3 UI prototype as-is.
