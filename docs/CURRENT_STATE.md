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

### Not Yet Implemented

- World Map editing: Create Node, relation editing, reparenting.
- Node chats and persistence.
- OpenAI integration.
- Authentication.

### Stage A — Database Foundation (completed)

- Supabase migration in `supabase/migrations/20260322000000_initial_schema.sql`: extensions, enums, tables (`worlds`, `nodes`, `node_relations`, `conversations`, `messages`, `ai_runs`, `branch_suggestions`), constraints, indexes, and RPCs `create_world_with_root` + `approve_branch_suggestion`.
- Server-only database layer in `src/lib/db/` (Supabase client, RPC wrappers, row-to-`WorldGraph` adapter) and typed models in `src/types/db.ts`.
- Zod validation schemas in `src/lib/validation/schemas.ts` for Stage A inputs and persisted suggestion payloads.
- Vitest foundation with unit tests for schemas and the map adapter (no live database required).
- `.env.example` documents `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (plus future OpenAI vars).
- Production Universe Home and World Map routes use persisted Supabase data; mock files remain only as development reference.

## Latest Update

- Stage B implemented: persistent worlds, Create World flow, and DB-backed World Map route.
- Create World failure was traced to invalid qualified SQL calls (`pg_catalog.trim`, `pg_catalog.coalesce`, and `pg_catalog.nullif`) inside the RPC definitions.
- RPC definitions were corrected to use `pg_catalog.btrim`, `coalesce`, and `nullif`, and the remote Supabase functions were updated successfully.
- Manual acceptance test passed: creating a World persists it and redirects to its DB-backed World Map with the Root Planning Node.
- Validation complete: lint passes with one pre-existing `<img>` warning, all 14 tests pass, and the production build succeeds.

## Next Task

Stage C — Root Planning Chat and OpenAI streaming.
