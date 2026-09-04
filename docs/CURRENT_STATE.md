# Universe AI — Current State

Primary handoff document for developers and AI agents. For durable technical architecture see `docs/ARCHITECTURE.md`. For product context see `docs/PROJECT.md`. For approved Product/UX v2 baseline see `docs/PRODUCT_UX_V2.md`.

---

## Resume Here

A new developer or AI conversation should start here without relying on prior chat history.

1. **Read** `AGENTS.md`, `docs/PROJECT.md`, `docs/PRODUCT_UX_V2.md`, `docs/ARCHITECTURE.md`, `docs/UI.md`, and this file.
2. **Verify Git state** before changing code:
   - `git status -sb`
   - `git branch --show-current`
   - `git log --oneline --decorate --max-count=5`
3. **Confirm** you are on `stage-e1-planning-chat-concurrency-hardening` (or a descendant branch for follow-on work).
4. **Stage E and Stage E.1 are complete and manually accepted.** Do not regress Root/Topic Planning or E.1 concurrency invariants.
5. **Current gate:** Product/UX Architecture v2 — **interim documentation baseline** (partial progress; **not complete**). **Refined product thesis** recorded — understanding / access / control; software-first validation wedge (hypothesis). **Decision 6 approved** (Tree/Outline vs Graph/Map roles). **Next Product/UX topic:** Project Guidance / Recommended Next / workflow safety. **Gate sequence:** remaining Product/UX decisions → final Product/UX approval → UI redesign / validation prototype → Product Validation Gate (GO / PIVOT / STOP) → major implementation. **UI redesign has not started.** **Do not start UI redesign** until final Product/UX approval. **Stage F remains blocked.**
6. **Do not start Stage F** (Relations) or other major roadmap implementation until the **Product Validation Gate** is accepted (after final Product/UX approval and UI redesign / validation prototype).
7. **Do not implement** future Decision, Task, policy-engine, or autonomy architecture until explicitly planned and approved (Decision and Task are approved future concepts — not implemented; Files/Artifacts entity semantics remain open).
8. **Preserve** structural proposal/approval invariant and Stage D/E/E.1 technical boundaries.
9. **Roadmap reorder** (Decisions/Tasks before Relations UI) is **pending** approval — the documented F–I sequence in this file remains authoritative until resolved. See `docs/PRODUCT_UX_V2.md`.

---

## Current Stage

| Item | Value |
|---|---|
| **Completed stage** | Stage E.1 — Planning Chat Concurrency Hardening |
| **Acceptance** | Manually accepted at `b7eb057` — `docs: record stage e1 acceptance` |
| **Merged into `main`** | No — implementation on working branch |
| **`main` / `origin/main`** | Both at `95e09f6` (verified at Stage E acceptance) |
| **Stage E accepted baseline** | `e282d69` — docs: record stage e acceptance |
| **Stage E.1 implementation commits** | `99d6644` database layer · `31d698f` API conflict mapping · `4318870` client conflict handling · `db9198c` activation and fenced completion |
| **Prior completed stage** | Stage E — Non-root Planning (`e282d69`, manually accepted on this branch) |
| **Current working branch** | `stage-e1-planning-chat-concurrency-hardening` |
| **Stage E.1 acceptance commit** | `b7eb057` |
| **Current checkpoint** | **Product/UX Architecture v2** — interim documentation baseline (not final Product/UX approval) |
| **Decision 6** | **Approved** — Tree/Outline vs Graph/Map roles |
| **Next Product/UX topic** | Project Guidance / Recommended Next / workflow safety |
| **Later gates (not started)** | Remaining Product/UX decisions → final Product/UX approval → UI redesign / validation prototype → Product Validation Gate → major implementation (Stage F blocked) |

---

## Immediate Next Task

1. **Product/UX Architecture v2 — interim baseline** — this documentation checkpoint records approved direction so far in `docs/PRODUCT_UX_V2.md`. Product/UX architecture work is **not complete**.
2. **Next Product/UX topic:** Project Guidance / Recommended Next / workflow safety (`docs/PRODUCT_UX_V2.md`). **Decision 6** (Tree/Outline vs Graph/Map roles) is **approved**.
3. **Then:** remaining Product/UX decisions → **final Product/UX approval** → UI redesign / validation prototype → Product Validation Gate → major implementation. **Do not start UI redesign** until final Product/UX approval.
4. **Do not start Stage F** or other major roadmap implementation until the **Product Validation Gate** is accepted.
5. **No relation code yet.** Do not add `node_relations` writes, relation UI, or relation context injection before Stage F.
6. **Preserve Stage E.1 Planning concurrency invariants** (see `docs/ARCHITECTURE.md` — Planning Chat Concurrency).

---

## Product/UX Architecture v2 — interim documentation checkpoint

**Status:** Interim Product/UX baseline in `docs/PRODUCT_UX_V2.md` (documentation only). **Not** final Product/UX approval. **Refined product thesis** (understanding / access / control; software-first validation wedge) strengthens the baseline — see `docs/PRODUCT_UX_V2.md` — Product thesis — refined north star.

**Approved so far at this checkpoint (product direction, not implementation):**

- Refined north star: understanding, access, and control; AI must not hide the Project from its owner
- Software-first initial validation focus (hypothesis — exact ICP not validated)
- AI-native project management and execution workspace product category
- Project legibility as core value; chat is not automatic project truth
- Progressive structure; delegated areas remain in canonical tree
- Decision involvement as the only configurable policy axis; visibility is view state; Task executor is Task property
- Three interaction outcomes: Act + Event, Act + Decision, Ask
- Deterministic authority floor; no unattributable autonomy
- Working Agreement compiled to structured versioned policy
- Happy-path vocabulary: `AI handling`, `Needs you`, `Involve me more`, `Handle this for me`
- "What I handle here" read-first policy mirror for power users
- Tasks (Human/AI/Hybrid) and Decisions — approved first-class future concepts (not implemented)
- Files / Artifacts as Project Workspace concept; provenance/recovery as hard future requirement
- Structural proposal/approval invariant **unchanged** in current implementation
- **Decision 6:** canonical hierarchical structure as structural truth; Tree/Outline = primary hierarchy interface; Graph/Map = relations / dependencies / impact; Project Overview = high-level entry; Tree and Graph project the same underlying state (exact layouts open)

**Open product-owner decisions (not approved in this checkpoint):**

- Project Guidance / Recommended Next / workflow safety — **next Product/UX topic**
- Terminology / rebrand (Universe, World, Root, etc.)
- Roadmap reorder (relative priority of Decisions, Tasks, Files/Artifacts vs Relations UI — recommended, not approved)
- Files/Artifacts first-class entity semantics and execution Run model (to be designed)
- Product-validation gate criteria and exact MVP (before large roadmap commitment)
- Final UI layouts and visual design

**Gate sequence (not started until noted):** remaining Product/UX decisions → **final Product/UX approval** → **UI redesign / validation prototype** → **Product Validation Gate** (GO / PIVOT / STOP) → **major implementation** (Stage F and documented F–I sequence blocked until Product Validation Gate accepted). Roadmap sequencing unchanged by this thesis refinement.

---

## Stage E.1 — Planning Chat Concurrency Hardening (completed)

Stage E.1 hardened Planning chat concurrency for **both Root and Topic Planning** using the same shared mechanism. Branch Suggestions remain Root-only with their separate lifecycle.

**Delivered capabilities:**

- Root Planning and Topic Planning share the same concurrency-hardened planning-chat run lifecycle via `createPlanningChatStream`.
- At most one `running` `ai_run` with `metadata.purpose = 'planning_chat'` per Planning conversation (partial unique index).
- Run acquisition (`begin_planning_chat_ai_run`) happens **before** user-message persistence.
- A concurrent send is rejected before its user message is persisted and before OpenAI is called; `PlanningRunInProgressError` maps to HTTP **409** with code `planning_run_in_progress` and safe planning-chat conflict copy.
- `RootPlanningChat` and `TopicPlanningChat` remove both optimistic temporary messages on that conflict, restore the exact trimmed submitted input, show the safe conflict message, release the streaming guard before `router.refresh()`, and reconcile to persisted state.
- Successful assistant persistence and `ai_run` completion are **atomic** through the fenced `complete_planning_chat_ai_run` RPC (via `completePlanningChatRun` wrapper).
- The `ai_run` id plus `status = 'running'` is the fencing token; **no separate epoch column**.
- If ownership is lost (lease expiry or stale reclamation), stale assistant output is **discarded** rather than persisted; the client sees a stream `error` event, not a `done` event.
- Branch Suggestions remain Root-only and continue using `begin_branch_suggestion_ai_run` and generic `chat.ts` helpers unchanged.
- `src/lib/db/chat.ts` was **not modified** as part of Stage E.1.

**Database / migration:**

- `supabase/migrations/20260808000000_planning_chat_run_acquisition.sql`
- Partial unique index: `ai_runs_one_running_planning_chat_per_conversation_idx`
- `SECURITY DEFINER` RPCs (service_role only):
  - `begin_planning_chat_ai_run(p_conversation_id uuid, p_model text)` — advisory transaction lock on conversation, purpose-scoped stale sweep, insert with `purpose = planning_chat`
  - `complete_planning_chat_ai_run(p_ai_run_id uuid, p_conversation_id uuid, p_content text, p_openai_response_id text, p_input_tokens integer, p_output_tokens integer)` — row lock, ownership check, atomic assistant insert + completion

**5-minute stale-run lease policy:**

- Prevents abandoned `planning_chat` runs from blocking a conversation forever after a crash.
- This is a **lease/fencing policy**, not a guarantee about real response duration.
- A legitimate response running longer than the lease may lose ownership; its stale assistant output must be discarded (accepted tradeoff B1).

**Deployment / activation invariant (durable):**

- First activation of the fenced Planning writer required **old-writer quiescence** — legacy pre-E.1 Planning writers must never coexist with the new fenced writer during first activation.
- For a future first activation in a multi-instance deployment, use **drain-and-replace**, not a rolling deployment, until every writer uses the fenced protocol.
- Once all active writers implement fencing, normal rolling deployments are safe again.
- Legacy `running` Planning `ai_runs` with `metadata = null` are **not backfilled** into `planning_chat` ownership.

**Accepted edge cases / limitations (not Stage E.1 failures):**

- **B1:** A legitimate Planning response running longer than the 5-minute lease may lose ownership; its assistant result is discarded and the user message may remain unanswered.
- **B2:** Atomic finalization can commit successfully and then the network response can be lost; the client may show a transient error while `router.refresh()` reconciles to persisted state.

**Manual-testing follow-up (known, not a concurrency invariant):**

- If a Planning run fails after the user message was already persisted (for example a provider or incomplete response failure), that failed user message remains in persisted conversation history.
- A later Planning request can therefore include that unanswered user turn in model context.
- This was observed during an intentionally long manual test and is a known follow-up issue — not part of the concurrency invariant and not a blocker for Stage E.1 acceptance.
- The exact provider failure cause was **not** proven to be output-token exhaustion.

**Explicitly excluded from Stage E.1 (not delivered):**

- Relations, future Task/execution surfaces, Structure Reconciliation
- Changes to Branch Suggestion acquisition or `generate-and-persist-branch-suggestion` behaviour
- UI redesign
- New dependencies

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

- Task / execution product surfaces (approved future direction — not execution conversations)
- Automatic relation detection, manual relation editing, or relation context injection
- Structure Reconciliation, Update Existing Structure, relation impact propagation
- Full Context Engine, authentication
- New dependencies

### Concurrency limitation (resolved by Stage E.1)

Stage E documented concurrent-send behaviour before E.1. Stage E.1 now enforces at most one active `planning_chat` run per conversation and rejects concurrent sends before user-message persistence. See Stage E.1 section above.

---

## Approved Post-Stage-E Roadmap

Ordered stages. Do not skip ahead. **Note:** a recommended reorder (Decisions/Tasks/Artifacts before Relations) is documented in `docs/PRODUCT_UX_V2.md` but **not formally approved** — the sequence below remains authoritative until product-owner approval.

| Stage | Name | Status |
|---|---|---|
| **E** | Non-root Planning | **Complete — manually accepted** (`e282d69`) |
| **E.1** | Planning Chat Concurrency Hardening | **Complete — manually accepted** (`b7eb057`) |
| **Product/UX v2** | Product/UX architecture (interim baseline) | **In progress** — this documentation checkpoint |
| **—** | Decision 6 — Tree/Outline vs Graph/Map roles | **Approved** |
| **—** | Project Guidance / Recommended Next / workflow safety and remaining Product/UX decisions | **Next product work** — not implementation |
| **—** | Final Product/UX approval | **Not started** |
| **UI redesign** | UI redesign / validation prototype | **Not started** — after final Product/UX approval |
| **—** | Product Validation Gate | **Not started** — after UI redesign; before major implementation |
| **F** | Secondary Relations MVP | Approved, not implemented (blocked until Product Validation Gate accepted) |
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
- Concurrent sends from two tabs on the same Topic conversation (documents the pre-E.1 limitation; resolved by Stage E.1)

### Stage E.1 completion (implementation through `db9198c`, manually accepted at `b7eb057` on `stage-e1-planning-chat-concurrency-hardening`)

**Automated (C4 activation validation):**

- `pnpm test`: 34/34 test files, 463/463 tests passed
- `pnpm lint`: 0 errors; 1 pre-existing `@next/next/no-img-element` warning in `src/components/universe/UniverseHero.tsx`
- `pnpm build`: success
- `git diff --check`: clean

**Manual acceptance passed:**

- Topic Planning two-tab concurrency conflict: PASS
- Topic retry after active run completion and refresh convergence: PASS
- Root Planning two-tab concurrency conflict: PASS
- Root retry after active run completion and refresh convergence: PASS
- Branch Suggestion flow regression in Root: PASS
- Branch Suggestion controls remain absent from Topic Planning: PASS

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

### Stage E.1 — Planning Chat Concurrency Hardening

Acquisition-before-persist Planning chat runs; fenced atomic completion; HTTP 409 conflict contract; Root and Topic parity; Branch Suggestions unchanged; `chat.ts` unchanged. Migration `20260808000000_planning_chat_run_acquisition.sql` applied on target dev database.

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

- Decision and Task as first-class future concepts; Working Agreement / policy engine (approved direction only — not implemented)
- Files/Artifacts surface concept and provenance requirement (entity semantics not yet formally approved)
- Inspectable execution state for future AI work (Run entity model not yet formally approved)
- Final Product/UX approval and UI redesign milestone implementation
- Relation create/edit/archive (Stage F — blocked until UI redesign accepted)
- AI relation proposals (Stage G)
- Relation impact review (Stage H)
- Structure Reconciliation and Update Existing Structure (Stage I)
- Authentication
- Full Context Engine
- `nodes.archived_at`, `worlds.structure_revision` (deferred to reconciliation work)

---

## Open Product Decisions

### Product/UX v2 (see `docs/PRODUCT_UX_V2.md`)

- **Decision 6:** canonical Tree/Outline vs Graph/Map roles — **approved**
- Project Guidance / Recommended Next / workflow safety — **next Product/UX topic**
- Terminology and branding (Universe / World / Root / Project)
- Roadmap reorder: relative priority of Decisions, Tasks, Files/Artifacts vs Relations UI (recommended, not approved)
- Files/Artifacts first-class entity semantics; execution Run model (open — to be designed)
- Product-validation gate criteria and exact MVP (software-first wedge — hypothesis not validated)
- Autonomous structural decomposition inside delegated subtrees (deferred)

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
