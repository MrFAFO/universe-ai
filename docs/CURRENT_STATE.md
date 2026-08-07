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
3. **Confirm** you are on `stage-e-non-root-planning` (or a descendant branch created for Stage E.1 work).
4. **Do not start relation implementation.** Relations are Stage F and later. **Stage F must not begin before Stage E.1 is completed.**
5. **Next work is Stage E.1 — Planning Chat Concurrency Hardening.** Stage E — Non-root Planning is complete and manually accepted on this branch.
6. **Preserve all Stage D invariants** (see `docs/ARCHITECTURE.md` — Stage D boundary). Root Planning behaviour must not regress.
7. **Approved sequence:** Stage E → Stage E.1 Planning Chat Concurrency Hardening → Stage F.
8. **Stage E.1 must be planned and reviewed before implementation.** Request explicit product approval before expanding Stage E.1 beyond the already approved concurrency-hardening boundary.

---

## Current Stage

| Item | Value |
|---|---|
| **Completed stage** | Stage E — Non-root Planning |
| **Acceptance** | Manually accepted |
| **Merged into `main`** | No — implementation on working branch |
| **`main` / `origin/main`** | Both at `95e09f6` (verified) |
| **Implementation commits** | `609919b` target resolver · `2546253` conversation provisioning · `c7530b0` context and prompt · `3595c14` shared stream and topic orchestration · `020340e` UI and routing |
| **Prior completed stage** | Stage D — Branch Suggestions and initial structure creation (`95e09f6`, merged to `main`) |
| **Current working branch** | `stage-e-non-root-planning` |
| **Immediate next stage** | Stage E.1 — Planning Chat Concurrency Hardening (**not yet implemented**) |

---

## Immediate Next Task

1. Define or review the **Stage E.1 — Planning Chat Concurrency Hardening** plan and acceptance criteria.
2. Implement Stage E.1 only after that plan is reviewed and approved.
3. **Do not start Stage F** until Stage E.1 is complete.
4. **No relation code yet.** Do not add `node_relations` writes, relation UI, or relation context injection during Stage E.1.

### Stage E.1 planning obligations (not designed here)

- Stage E.1 must explicitly re-evaluate run-acquisition timing rather than assume acquisition simply replaces `createAiRun`.
- Planning must consider whether acquisition should happen before user-message persistence so that a rejected concurrent send does not leave an unanswered persisted user message.

---

## Stage E — Non-root Planning (completed)

Stage E made every Topic Node a persistent Planning workspace while keeping Root Planning unchanged and excluding all relation behaviour.

**Delivered capabilities:**

- Persistent Planning chat for every Topic Node (`/worlds/[worldId]/nodes/[nodeId]` dispatches by node kind).
- Dedicated Topic resolver distinct from Root (`verifyTopicPlanningTarget`, `resolveTopicPlanningConversation`).
- Lazy first-send conversation provisioning (`ensureTopicPlanningConversation`); page render stays read-only.
- Ancestor-path context in Topic model input (`resolveAncestorContext`, `buildTopicPlanningBrief`).
- Fail-closed corrupted hierarchy handling (`AncestorChainError` → blocked Planning state with safe message).
- Topic Planning UI and routing (`TopicPlanningChat`, kind dispatch in messages route and page).
- Active “Open Planning Chat” link for every node in the World Map details panel.
- Shared NDJSON planning stream core reused by Root and Topic orchestrators.
- Root Planning behaviour unchanged; Branch Suggestion surface remains Root-only.

**Explicitly excluded from Stage E (not delivered):**

- Execution conversations
- Automatic relation detection, manual relation editing, or relation context injection
- Structure Reconciliation, Update Existing Structure, relation impact propagation
- Full Context Engine, authentication
- Planning chat concurrency hardening (Stage E.1)
- New dependencies or migrations

### Accepted concurrency limitation (addressed by Stage E.1, not Stage E)

- Two separate tabs or clients can still send simultaneously to the same Planning conversation.
- Both completed replies persist.
- Partial assistant output is not persisted.
- Replies are coherent and not text-interleaved.
- After refresh, all tabs converge to the same persisted message order.
- Assistant completion order may differ from request-start order.
- Stage E.1 Planning Chat Concurrency Hardening is the approved task that resolves this limitation.

---

## Approved Post-Stage-E Roadmap

Ordered stages. Do not skip ahead.

| Stage | Name | Status |
|---|---|---|
| **E** | Non-root Planning | **Complete — manually accepted** |
| **E.1** | Planning Chat Concurrency Hardening | **Next — not implemented** |
| **F** | Secondary Relations MVP | Approved, not implemented (do not start before E.1) |
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

### Stage E completion (accepted on `stage-e-non-root-planning`)

**Automated:**

- 419 tests passed across 32 test files
- Lint passed with 0 errors; 1 pre-existing `@next/next/no-img-element` warning in `src/components/universe/UniverseHero.tsx`
- Production build passed
- `git diff --check e5b1391..HEAD`: clean
- Final Stage E scope review: no new dependencies, migrations, relation implementation, Execution implementation, reconciliation implementation, or Stage E.1 run-acquisition code

**Manual acceptance passed (scenarios 1–14):**

- Topic Node Planning chat open, send, receive, refresh, and reopen without losing history
- Ancestor context influencing responses appropriately
- Root Planning continuing to behave exactly as before
- Concurrent sends from two tabs on the same Topic conversation (documents the accepted limitation above)

### Known lint warning

- Pre-existing `UniverseHero` `<img>` warning — not introduced by Stage D or Stage E; not a blocker.

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

### Stage E — Non-root Planning

Topic Node Planning chat on the same route with kind dispatch; dedicated Topic resolver and lazy conversation provisioning; ancestor-path context; `TopicPlanningChat` UI; Root Planning and Branch Suggestions unchanged; no relation behaviour.

### Application routes (current)

- `/` — Universe Home
- `/worlds/[worldId]` — World Map
- `/worlds/[worldId]/nodes/[nodeId]` — Planning Chat (Root or Topic; dispatched by node kind)

### World Map (current)

- Hierarchy view and per-type relation graph views exist in the UI.
- Relation filters, opacity sliders, and edge rendering are built.
- **No application write path exists** — normal product flows do not create relation rows. Manually seeded database rows can already be loaded and rendered.

---

## Not Yet Implemented

- Planning Chat concurrency hardening (Stage E.1)
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
