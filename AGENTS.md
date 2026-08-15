# Universe AI — Agent Instructions

## Before changing code

1. Read `docs/CURRENT_STATE.md` first — especially the **Resume Here** section.
2. Read `docs/PRODUCT_UX_V2.md` for approved product direction and open decisions.
3. Verify Git branch and status match the documented current stage.
4. State what, why, and how before implementing.
5. Update `docs/CURRENT_STATE.md` after meaningful implementation tasks.
6. Report exact validation results without exaggeration.

## Project Rules

- Use Next.js App Router, TypeScript and Tailwind CSS v4.
- Use pnpm for package management.
- Keep components modular, typed and easy to extend.
- Do not add dependencies without explicit approval.
- Do not refactor unrelated code.
- Do not add backend, authentication or API integrations unless requested.
- Read only the project documentation relevant to the current task.
- Avoid unnecessary abstractions and premature architecture.
- Run lint at the end of a meaningful implementation task.

## Current stage boundaries

**Stages E and E.1 are complete and manually accepted.** The **current gate** is **Product/UX Architecture v2** — an interim documentation baseline, not the completion of all Product/UX work.

**Sequence (current):** Product/UX v2 decision work → **Decision 6** (next product-owner decision) → remaining Product/UX decisions → final Product/UX approval → UI redesign milestone → later implementation. **Do not start UI redesign** until Product/UX architecture is fully approved. **Stage F remains blocked** until after UI redesign. The documented F–I sequence remains authoritative until a pending roadmap-reorder decision is resolved.

During this gate:

- **Do not** start Stage F (Relations) or implement relation writes, relation UI, relation context injection, or AI relation proposals.
- **Do not** implement future Decision, Task, policy-engine, or autonomy architecture until explicitly planned and approved (Decision and Task are approved **future concepts** — not implemented; Files/Artifacts entity semantics remain open).
- **Do not** rename schema, routes, or code identifiers for terminology/branding until explicitly approved.
- **Preserve** all Stage D Root Planning invariants and Stage E/E.1 Planning concurrency invariants.
- **Use** a dedicated non-root Planning resolver separate from Root Planning handlers (Stage E — implemented).
- **Do not** add dependencies or migrations unless required by an approved plan and explicitly approved.

**Open product decisions** (not settled): Decision 6 (Tree vs Graph), terminology/rebrand, roadmap reorder. See `docs/PRODUCT_UX_V2.md`.

## Structural changes

- Every **AI-generated** structural change requires an explicitly approved proposal applied by an **atomic server/database operation**.
- Direct **user-initiated** structural edits do not necessarily require an AI proposal.
- **All** structural edits — whether user-initiated or AI-proposed — must use validated atomic server/database operations.
- The AI must never apply structural changes autonomously.
- **Proposed state must remain separate from approved World state.** Pending proposals must never leak into map rendering or AI context.
- Autonomous structural expansion inside delegated subtrees is **deferred** — not approved.

See `docs/ARCHITECTURE.md` for the approved lifecycle, RPC contracts, Stage D boundaries, and the post-D roadmap.

## Working method

- Simple mechanical terminal work is performed manually by the developer.
- **Composer 2.5** is preferred for ordinary implementation.
- **Opus 5 High** is reserved for architecture review or difficult planning.
- Use the cheapest sufficient model/tool for each task.
- Review diff and validation before commit.

## Development server

On Windows/OneDrive paths, use the known reliable command:

```bash
pnpm exec next dev --webpack
```

See `docs/CURRENT_STATE.md` for details.

## Relevant Documentation

- **Handoff and current stage:** `docs/CURRENT_STATE.md`
- **Product/UX v2 baseline:** `docs/PRODUCT_UX_V2.md`
- Product context: `docs/PROJECT.md`
- UI direction: `docs/UI.md`
- Technical architecture: `docs/ARCHITECTURE.md`
