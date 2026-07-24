# Universe AI — Agent Instructions

## Project Rules

- Use Next.js App Router, TypeScript and Tailwind CSS v4.
- Use pnpm for package management.
- Keep components modular, typed and easy to extend.
- Do not add dependencies without explicit approval.
- Do not refactor unrelated code.
- Do not add backend, authentication or API integrations unless requested.
- Read only the project documentation relevant to the current task.
- Update `docs/CURRENT_STATE.md` after meaningful implementation tasks.
- Avoid unnecessary abstractions and premature architecture.
- Run lint at the end of a meaningful implementation task.

## Structural changes

- Every **AI-generated** structural change requires an explicitly approved proposal applied by an **atomic server/database operation**.
- Direct **user-initiated** structural edits do not necessarily require an AI proposal.
- **All** structural edits — whether user-initiated or AI-proposed — must use validated atomic server/database operations.
- The AI must never apply structural changes autonomously.

See `docs/ARCHITECTURE.md` for the approved lifecycle, RPC contracts, and Stage D boundaries.

## Relevant Documentation

- Product context: `docs/PROJECT.md`
- UI direction: `docs/UI.md`
- Technical architecture: `docs/ARCHITECTURE.md`
- Current progress: `docs/CURRENT_STATE.md`
