# Universe AI — Agent Instructions

## Before changing code

1. Read `docs/CURRENT_STATE.md` first — especially the **Resume Here** section.
2. Verify Git branch and status match the documented current stage.
3. State what, why, and how before implementing.
4. Update `docs/CURRENT_STATE.md` after meaningful implementation tasks.
5. Report exact validation results without exaggeration.

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

**Stage E (Non-root Planning) is the immediate next implementation stage.**

During Stage E:

- **Do not** implement relation writes, relation UI, relation context injection, or AI relation proposals.
- **Preserve** all Stage D Root Planning invariants — do not weaken Root-only checks to accommodate Topic Nodes.
- **Use** a dedicated non-root Planning resolver separate from Root Planning handlers.
- **Do not** add dependencies or migrations unless required by the approved Stage E plan and explicitly approved.

## Structural changes

- Every **AI-generated** structural change requires an explicitly approved proposal applied by an **atomic server/database operation**.
- Direct **user-initiated** structural edits do not necessarily require an AI proposal.
- **All** structural edits — whether user-initiated or AI-proposed — must use validated atomic server/database operations.
- The AI must never apply structural changes autonomously.
- **Proposed state must remain separate from approved World state.** Pending proposals must never leak into map rendering or AI context.

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
- Product context: `docs/PROJECT.md`
- UI direction: `docs/UI.md`
- Technical architecture: `docs/ARCHITECTURE.md`
