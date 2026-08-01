# Universe AI — Current State

Primary handoff document for developers and AI agents. For durable technical architecture see `docs/ARCHITECTURE.md`. For product context see `docs/PROJECT.md`.

---

## Resume Here

A new developer or AI conversation should start here without relying on prior chat history.

1. **Read** `AGENTS.md`, `docs/PROJECT.md`, `docs/ARCHITECTURE.md`, `docs/UI.md`, and this file.
2. **Verify Git state** before changing code:
   - `git status -sb`
   - `git branch --show-current`
   - `git log --oneline --decorate --max-count=5`
3. **Confirm** you are on `stage-e-non-root-planning` (or a descendant branch created for Stage E work).
4. **Do not start relation implementation.** Relations are Stage F and later.
5. **Next work is Stage E — Non-root Planning.** Define the final Stage E implementation plan, then implement it.
6. **Preserve all Stage D invariants** (see `docs/ARCHITECTURE.md` — Stage D boundary). Root Planning behaviour must not regress.
7. **Request explicit product approval** before expanding Stage E scope beyond what is documented here and in `docs/ARCHITECTURE.md`.

---

## Current Stage

| Item | Value |
|---|---|
| **Completed stage** | Stage D — Branch Suggestions and initial structure creation |
| **Acceptance** | Manually accepted |
| **Merged into `main`** | Yes — fast-forwarded |
| **Accepted commit** | `95e09f6` — *docs: record stage d acceptance* |
| **`main` / `origin/main`** | Both at `95e09f6` (verified) |
| **Current working branch** | `stage-e-non-root-planning` |
| **Immediate next stage** | Stage E — Non-root Planning (**not yet implemented**) |

---

## Immediate Next Task

1. Define the final Stage E implementation plan (resolver boundaries, route shape, ancestor-context builder, acceptance criteria).
2. Implement Non-root Planning for Topic Nodes.
3. **No relation code yet.** Do not add `node_relations` writes, relation UI, or relation context injection during Stage E.

---

## Stage E — Non-root Planning (approved, not implemented)

### Purpose

- Make every Topic Node a real planning workspace.
- Allow the user to hold a persistent Planning conversation inside any non-root node.
- Establish real Planning content from which later cross-node relations and reconciliation can be inferred.

### Expected scope

- One Planning conversation per Topic Node.
- Reuse existing Root Planning streaming and persistence infrastructure where safe.
- Add a dedicated non-root resolver rather than weakening Root Planning invariants.
- Include compact ancestor-path context in model input.
- Preserve chronological message ordering and persisted history.
- Allow reopening and refreshing without losing messages.
- Keep Root Planning behaviour unchanged.

### Explicitly excluded from Stage E

- Execution conversations
- Automatic relation detection
- Manual relation editing
- Structure Reconciliation
- Update Existing Structure
- Relation impact propagation
- Full Context Engine
- Authentication
- New dependency additions unless technically unavoidable and explicitly approved

### Likely automated acceptance criteria

- Cross-World node/conversation mismatches are rejected.
- Root Planning and non-root Planning resolvers remain distinct.
- Only Topic Nodes use the non-root Planning flow.
- One Planning conversation per node.
- Message persistence and ordinal ordering.
- Deterministic ancestor-path context.
- Root Planning regression coverage.

### Likely manual acceptance criteria

- Opening a Topic Node Planning chat.
- Sending and receiving messages.
- Refreshing and reopening without losing history.
- Ancestor context influencing the response appropriately.
- Root Planning continuing to behave exactly as before.

---

## Approved Post-Stage-E Roadmap

Ordered stages. Do not skip ahead.

| Stage | Name | Status |
|---|---|---|
| **E** | Non-root Planning | **Next — not implemented** |
| **F** | Secondary Relations MVP | Approved, not implemented |
| **G** | AI Relation Proposals | Approved, not implemented |
| **H** | Impact Review | Approved, not implemented |
| **I** | Structure Reconciliation | Approved, not implemented |

### Stage F — Secondary Relations MVP

**Approved writable relation types:** `dependency`, `reference` (both directed).

**Scope includes:** hardened relation persistence; manual create/edit/archive; relation panel; existing World Map relation rendering fed by real data; relation context injection into non-root Planning; **dependency visibility, navigation, bounded context, and provisional-work awareness**.

**Root children may have secondary relations.** Being a direct child of the Root does not imply workstream independence. Relations between Root children are expected.

**`dependency`:** source depends on target (directed). The source requires a decision, deliverable, constraint, or progress from the target in order to complete, validate, or finalize a material part of its work. A dependency does **not** necessarily mean no work may begin on the source — early exploration and provisional planning may proceed. Does not imply ownership or parenthood. Hard blocking belongs only to future Execution, not Topic Planning.

**`dependency` relation note must explain:** what may proceed immediately; what remains provisional or blocked; what exact output is required from the target.

**`reference`:** source should receive relevant context from target (directed); source is not blocked by target; does not imply ownership, hierarchy, or sequencing.

**Legacy enum values** (`shared-feature`, `shared-contract`) remain in PostgreSQL but are **not approved for new product writes**. Do not propose an enum-removal migration.

- `shared-feature` → future overlap or restructuring signal (often indicates missing shared node, duplicate work, or incorrect decomposition).
- `shared-contract` → initially represented through an owning deliverable Node that other Nodes depend on; no first-class Contract entity approved yet.

**Persistence boundary:**

- `node_relations` contains only approved or directly user-created World facts.
- Pending or rejected AI relation proposals must not be stored as active `node_relations`.
- Future AI relation proposals use a separate reviewed proposal artifact.
- Proposal state must never leak into map or AI context.

**Relation lifecycle direction:**

- Relations should be archived rather than silently hard-deleted.
- Stage F migration (minimal): likely fields `note`, `updated_at`, `archived_at`, plus partial unique indexes preventing duplicate live relations.
- Every manually created relation requires a short explanatory note. For `dependency`, the note must cover what may proceed, what remains provisional or blocked, and what output the target must provide.

**Legacy relation filters (Stage F):**

- The database enum and existing UI know all four values: `dependency`, `shared-feature`, `shared-contract`, `reference`.
- Relation creation controls expose only `dependency` and `reference`.
- `shared-feature` and `shared-contract` are read-only legacy schema values — not approved for new writes.
- Their filter/view controls should not be shown by default when no legacy rows exist.
- If legacy rows exist in the future, they may be shown read-only.
- Do not remove the PostgreSQL enum values.

**Manual relation creation must:** use a validated atomic RPC/server operation; verify both endpoints belong to the same World; reject self-relations; prevent duplicate live relations; preserve direction; avoid AI calls.

**Relation context rules:**

- Only active relations affect context.
- Information flows from target to source.
- Depth 1 only; no recursive relation traversal.
- Never load full related conversations.
- Use compact structured node data; deterministic ordering; bounded character budget.
- Exact numerical caps are tunable defaults, not permanent architectural constants.
- Pending, rejected, or archived relations never affect context.

**Stage F includes:** hardened relation persistence; manual create/edit/archive; relation panel; existing World Map relation rendering fed by real data; relation context injection into non-root Planning; dependency visibility, navigation, bounded context, and provisional-work awareness in Topic Planning.

**Stage F excludes:** AI relation proposals; automatic staleness analysis; recursive graph traversal; Structure Reconciliation; shared contract entities; automatic downstream mutation; hard blocking of Planning conversations.

### Stage G — AI Relation Proposals

Two explicit analysis modes (both user-triggered; neither runs automatically during structure approval):

**Initial relation analysis:**

- Available after the initial structure is approved.
- May be triggered explicitly from Root Planning or the World Map.
- Primarily analyzes relations between direct Root children.
- Uses Root Planning conversation content, World description, and node titles, descriptions, and goals.
- Proposes only high-level relations supported by clear evidence.
- Does not require completed non-root Planning conversations.

**Deep relation analysis:**

- Available once Topic Planning conversations contain meaningful content.
- Uses that deeper evidence to propose more precise additions, changes, or archival.
- Remains explicitly user-triggered.
- Does not run after every message.

**Shared rules:**

- Proposals remain separate from active `node_relations`; AI never creates active relations without user approval.
- Every proposal must contain evidence grounded in node goals, descriptions, or Planning content.
- Hallucinated node IDs, cross-World targets, self-links, and duplicates are rejected.
- User may approve, edit, or reject; approval applies validated relations atomically.
- No numeric LLM confidence score.
- Rejected proposals should not immediately recur without materially new evidence.
- Likely schema additions (Stage G, not Stage F): `origin` (at least `manual` and `ai_approved`) and `created_by_suggestion_id` for audit trail — introduced with the proposal artifact and approval behaviour, not before.

### Stage H — Impact Review and Dependency Updates

**Meaningful changes** (committed, not ordinary chat) may make directly connected relations questionable or require downstream review. Examples: goal changes, material description changes, approved decisions, approved deliverables, move, archive, later split or merge, reversal of a decision used as evidence.

**Not meaningful:** position changes, progress changes, ordinary chat messages (draft conversation content does not automatically trigger downstream impact).

**Dynamic-change principles:**

- A target change must not silently rewrite dependent conversations, tasks, decisions, or plans.
- It should create a durable Dependency Update / Impact Review item.
- The dependent Node receives a Needs Review indicator.
- The next AI request may receive the latest approved target context, clearly labelled as changed or possibly stale.
- AI may propose affected changes, but the user must approve before existing work is modified.
- Historical chat messages are never rewritten retroactively.
- Automatic update events must be visually distinct from user and assistant messages.

**Planned notification surfaces:** World Map badge or Needs Review indicator; persistent banner in the dependent Planning chat; chronological dependency-update event; relation details showing the source of the change; direct navigation to the changed target Node.

**Bounded scope:** impact analysis is depth 1 only (durable invariant); no recursive graph-wide propagation. User confirms, edits, replaces, or archives affected relations.

### Stage I — Structure Reconciliation

Future reconciliation must preserve existing work and may propose operations including KEEP, UPDATE, ADD, MOVE, ARCHIVE, and later possibly SPLIT and MERGE. It should eventually support relation operations: ADD_RELATION, UPDATE_RELATION, ARCHIVE_RELATION, REVIEW_RELATION. Final proposal model is not yet specified.

---

## Stage D — Completed

Stage D delivered structured initial World structure proposals through Root Planning.

**Delivered capabilities:**

- Structured initial World structure proposals (`BranchSuggestionV1`)
- Readiness assessment and Discovery (`StructureAssessmentV1`)
- Chronological proposal cards in the conversation timeline
- One pending proposal per Root Planning conversation (partial unique index)
- Regenerate replacement (supersede previous pending)
- Reject and Approve with atomic RPCs
- Atomic AI-run acquisition (`begin_branch_suggestion_ai_run`) before OpenAI
- Atomic node creation on approval (`approve_branch_suggestion`)
- Persistence after refresh
- World Map refresh after approval
- Generate hidden after an initial structure exists
- Duplicate-Approve protection (idempotent re-approve)

**Deferred (not blocking Stage D):**

- Generate with Assumptions (optional, deliberately deferred; not on the immediate roadmap)

**Architecture:** See `docs/ARCHITECTURE.md` — Stage D boundary and implementation plan.

---

## Validation Status

### Stage D completion (accepted at `95e09f6`)

**Automated:**

- 296 tests passed across 22 test files
- Lint passed with pre-existing `UniverseHero` `<img>` warning only
- Production build passed

**Manual acceptance passed:**

- Discovery
- Proposal generation
- Regenerate replacement
- Reject
- Approve
- Persistence after refresh
- Map refresh
- Generate hiding after approval
- Duplicate-Approve protection

### Known lint warning

- Pre-existing `UniverseHero` `<img>` warning — not introduced by Stage D; not a blocker.

---

## Development Environment

Next.js Turbopack development cache can fail under the Windows/OneDrive project path (SST persistence failures, missing `.next` manifests).

**Known reliable command:**

```bash
pnpm exec next dev --webpack
```

If the dev server misbehaves, delete `.next` and retry. Production build is unaffected.

---

## Working Method

- Simple mechanical terminal work (Git, installs, running servers) is performed manually by the developer.
- **Composer 2.5** is preferred for ordinary implementation.
- **Opus 5 High** is reserved for architecture review or difficult planning.
- Use the cheapest sufficient model/tool for each task.
- Before coding, state what, why, and how.
- Update `docs/CURRENT_STATE.md` at each completed stage.
- Review diff and validation results before commit.
- Report exact validation results without exaggeration.

---

## Completed Prior Stages (summary)

### Stage A — Database Foundation

Supabase migration, server-only database layer, Zod validation, Vitest foundation, RPCs `create_world_with_root` and `approve_branch_suggestion`.

### Stage B — Persistent Worlds and DB-backed World Map

Persistent world queries, Create World flow, Universe Home and World Map load from Supabase.

### Stage C — Root Planning Chat

Dedicated Root Planning Chat at `/worlds/[worldId]/nodes/[nodeId]`; streaming via OpenAI Responses API; NDJSON protocol; message and `ai_runs` persistence.

### Application routes (current)

- `/` — Universe Home
- `/worlds/[worldId]` — World Map
- `/worlds/[worldId]/nodes/[nodeId]` — Root Planning Chat (Root node only today; Topic Node Planning is Stage E)

### World Map (current)

- Hierarchy view and per-type relation graph views exist in the UI.
- Relation filters, opacity sliders, and edge rendering are built.
- **No application write path exists** — normal product flows do not create relation rows. Manually seeded database rows can already be loaded and rendered.

---

## Not Yet Implemented

- Non-root Planning conversations (Stage E)
- Relation create/edit/archive (Stage F)
- AI relation proposals (Stage G)
- Relation impact review (Stage H)
- Structure Reconciliation and Update Existing Structure (Stage I)
- Execution conversations
- Authentication
- Full Context Engine
- `nodes.archived_at`, `worlds.structure_revision` (deferred to reconciliation work)

---

## Open Product Decisions

### Stage E

- Exact Stage E route and resolver shape (to be finalized in the Stage E plan).

### Stage G (require approval before implementation)

- How “enough context” is determined for deep relation analysis eligibility.
- Whether initial and deep analysis share one proposal artifact or separate flows.

### Stage H (require approval before implementation)

- Dependency satisfaction states and transitions.
- Whether satisfaction is user-set, artifact-driven, or AI-proposed and reviewed.
- Exact storage model for dependency-update events.
- Whether stale relations continue contributing context.
- Future Execution actions that may be hard-blocked.

### Stage F (require approval before implementation)

- Whether `dependency` cycles are blocked, warned about, or allowed.
- Whether `dependency` and `reference` may coexist for the same directed node pair.
- Whether changing relation type or direction is an in-place update or archive-and-create.
- Whether archived relations can be restored.
- Whether Stage F editing means note only or also type/direction.
- Whether legacy relation filters (`shared-feature`, `shared-contract`) are fully hidden or conditionally shown when legacy data exists.
- Exact archival RPC signatures.
- Whether relation direction is shown as raw source→target or with incoming/outgoing labels in the details panel.

### Stage I

- Final Structure Reconciliation proposal model.
