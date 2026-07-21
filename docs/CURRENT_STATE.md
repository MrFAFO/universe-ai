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
- Typed mock World data in `src/data/mock-universe.ts`.
- Reusable `WorldCard` components with per-world SVG thumbnails (`WorldThumbnail`), improved hierarchy and hover depth; linking to `/worlds/[worldId]` (route not yet implemented).
- Right overview panel with card-based surfaces for Recent Activity, Universe Overview and Model (visible at `xl` breakpoint).
- Basic desktop-first responsiveness: sidebar hidden below `md`, overview panel hidden below `xl`, responsive world grid.
- Typography and spacing scaled up for desktop; premium depth via surface cards, inset backgrounds and restrained glow.

### World Map (`/worlds/[worldId]`)

- Server route in `src/app/worlds/[worldId]/page.tsx` reusing the shared `AppShell`; resolves the world from mock data and returns `notFound()` for unknown ids.
- Typed graph model in `src/types/world-map.ts` and mock graph in `src/data/mock-world-map.ts` (root, four branches, six children plus secondary relations). Manual node positions.
- Interactive canvas via `@xyflow/react` (`WorldMapView`): pan, zoom, fit-view, single- and multi-node selection (marquee box + Ctrl/Cmd+click), and draggable nodes (group drag when multiple selected); nodes are non-connectable.
- Custom `WorldNode` with root/branch/child variants; root uses a hero-style orb core.
- Primary hierarchy view plus dedicated floating relation graphs per secondary relation type (`dependency`, `shared-feature`, `shared-contract`, `reference`). Users switch views from the filter bar (Hierarchy button, “Open relation graph” in each filter popover, or double-click a relation chip).
- Relation graphs show only participating nodes and that type’s links (network layout, not a tree). Each view keeps its own manual positions and reset-layout behavior.
- Primary hierarchy edges (solid, arrowed) always visible in hierarchy view; secondary relation edges (dashed, color-coded) use per-type opacity sliders in hierarchy view.
- Selecting a node highlights relevant connections and opens `NodeDetailsPanel` (goal, parent, children, linked nodes, key decisions, open questions, progress).
- Themed React Flow controls and dotted background; details panel docks on wide screens and overlays below `xl`.

### Not Yet Implemented

- World Map editing: Create Node, relation editing, reparenting.
- Node chats and persistence.
- Create World flow.
- Backend, authentication or API integration.
- OpenAI integration.

## Latest Update

- World Map supports hierarchy plus per-relation floating subgraph views with independent layouts.
- Marquee box selection for moving multiple nodes together; details panel opens only for a single selected node.
- Lint passes.

## Next Task

Wire the World Map to real data and enable node creation and relation editing when backend work begins.
