# Product + UX Architecture v2 — Interim Approved Baseline

Product and UX **interim** decision checkpoint after Stage E.1. This document records **approved product direction so far** and clearly separates it from **open decisions** and **deferred concepts**.

**This checkpoint is not final Product/UX architecture approval.** Remaining Product/UX decisions must be resolved before final approval and before the UI redesign milestone.

For current implementation status see `docs/CURRENT_STATE.md`. For durable technical architecture (implemented and future) see `docs/ARCHITECTURE.md`. For product context and glossary see `docs/PROJECT.md`. For UI behavior and principles see `docs/UI.md`.

**Documentation checkpoint only.** No product code, schema, or migrations were changed as part of this baseline.

---

## Status legend

| Label | Meaning |
|---|---|
| **Implemented** | Exists in the current codebase |
| **Approved** | Product direction agreed; not yet implemented |
| **Open** | Under review; do not treat as decided |
| **Deferred** | Intentionally postponed |

---

## Product thesis — refined north star

**Status:** Approved product direction (refinement recorded after competitive/product analysis). This strengthens — does not invalidate — the interim Product/UX v2 baseline below.

Universe AI should enable a person to create and manage a complex project with AI **without losing understanding, access, or control**.

The user should remain capable of understanding what exists, why it exists, its current state, what decisions shaped it, what remains incomplete, what it depends on, what may be affected by changes, and what should happen next — even when the user is not an expert in the project's domain.

**Durable principles:**

> AI may handle complexity, but must never hide the project from its owner.

> Simplify the representation, never hide the underlying truth.

The same underlying Project truth may be presented at progressively deeper levels of detail according to the user's expertise and current need — for example: simple explanation → more detail → domain/technical detail → underlying implementation / artifacts. This is **presentation depth**, not different project truth.

### Control — not a spectator product

Universe AI is not intended to reduce the user to a spectator while AI controls an opaque project. The user should be able to inspect, add, remove, edit, redirect, and understand meaningful Project elements through concepts they can understand.

Where implementation requires expertise the user does not possess, AI may translate user intent into lower-level implementation work — subject to the already-approved authority, decision, structural-change, and safety boundaries.

Conceptual example (not software-specific core schema): the user expresses *"Allow Google login"* without manually finding and editing every relevant file; the system explains meaningful impact, affected areas, and resulting state while AI may handle authorized technical implementation.

### Initial validation focus — hypothesis

**Approved direction:** software-first initial product experience and validation focus.

**Hypothesis — not validated:** the initial wedge is **AI-assisted software / digital product creation**, especially for people who can build with coding agents or AI builders but do not comfortably understand or control the entire resulting system.

Candidate early users (hypothesis only — exact ICP not validated): founders, product-oriented builders, vibe coders, junior / semi-technical builders.

**Problem hypothesis:** AI increasingly enables people to create systems whose implementation complexity exceeds their own mental model. As the project grows, users may lose the ability to confidently answer: what have we actually built? how does this area work? why was it built this way? what is incomplete? what depends on this? what could break if I change it? what should happen next?

**Differentiated hypothesis:** Universe maintains a living, understandable model of the Project so the owner does not lose understanding and control as AI performs more of the work. Do **not** position "Agents" or "AI Project Manager" alone as the primary differentiator.

### Domain-neutral core vs software-first wedge

**Approved:** core architecture remains **domain-neutral** (Project, Node, Decision, Task, Artifact/File concept, dependency, policy/authority, execution state). Do not prematurely replace these with software-only concepts (Repository, Backend, Frontend, Pull Request, etc.) as core schema.

**Approved:** software-first applies to initial product experience, validation, example scenarios, and go-to-market — **not** a permanent restriction. Longer-term expansion to other complex project domains remains possible if the core thesis is validated.

### Differentiation and validation — hypothesis

The project is currently a **differentiated product hypothesis**, not proven PMF.

The important validation question is **not** "Can Universe build AI agents or automate project management?" but:

> Does Universe help a person understand, control, and correctly advance a complex AI-assisted project materially better than the tools they already use?

A future validation prototype / UI should help a user quickly answer:

1. What is this Project / area?
2. What actually exists now?
3. What is incomplete or unresolved?
4. Why is it this way / what important Decisions shaped it?
5. What does it depend on / what depends on it?
6. What should happen next?
7. What could be affected if I change it?

Specific validation metrics and success criteria are **not finalized** in this document.

A **product-validation gate** is required before committing to a large implementation roadmap beyond the Product/UX work currently underway. This does **not** silently reorder the documented implementation roadmap; roadmap sequencing changes remain a separate product-owner decision.

### How this refinement relates to Product/UX v2

This refinement strengthens much of the interim baseline:

- **Legibility** becomes a central product differentiator, not merely a UX quality.
- **Nodes** should help explain meaningful areas of the Project, not merely organize work.
- **Decisions** help explain why Project state exists.
- **Tasks** explain work done / remaining but are not the product's central abstraction.
- **Files / Artifacts** connect understandable Project state to what exists in reality (entity semantics remain open).
- **Dependencies / impact** help users understand consequences.
- **Recommended Next / Project Guidance** becomes especially relevant for non-expert users.
- **AI delegation** remains useful only if delegated work remains understandable and inspectable.
- **Project Overview** should ultimately help users understand state and orientation quickly.

Do not formalize new entity schemas from these implications.

---

## 1. Product vision — Approved

The product is an **AI-native project management and execution workspace** that makes complex projects clear, accessible, editable, and understandable — including for users who are not experts in the project's domain.

It combines three conceptual layers:

### Project Workspace

The directly legible project system:

- structure
- planning
- Tasks
- Decisions
- Files / Artifacts
- status
- progress
- dependencies
- history
- attention / blockers

The Project must remain usable and understandable **independently of AI chat**.

### Project Intelligence

Persistent AI intelligence per Project that can:

- understand
- plan
- advise
- explain
- learn appropriate preferences and context
- detect problems
- recommend
- monitor
- coordinate

### Execution

Work may be performed by:

- AI
- the user / humans
- hybrid collaboration

### Conceptual lifecycle — Approved (not an implemented state machine)

```
Idea → Understand → Structure → Plan → Decide → Tasks → Execute → Track → Learn / Adapt
```

---

## 2. Core user value — legibility — Approved

Legibility is a **central product differentiator** — not merely a UX quality. A major product advantage is that the user can **read their project**.

A non-expert building software, opening a business, writing a book, planning an event, or pursuing other long-running goals should not need to repeatedly ask AI:

- What exists?
- Where are we?
- What is finished?
- What comes next?
- What decisions were made?
- What is blocking us?

**Durable principles:**

> Chat is a place to think. Approved structured project state is the durable project truth.

> AI autonomy must never make the Project progressively less legible to its owner.

The Project must not slowly evolve into an AI-shaped structure that only the AI can understand.

---

## 3. Progressive Project structure — Approved

> The Project Tree grows with understanding. It should not be deeper or more detailed than current project knowledge justifies.

Initial structure should be the **smallest useful macro structure**, based on information actually established during Discovery / Planning. As understanding improves, areas may later be decomposed further.

**Complementary principle:**

> Once an area is known to be a real part of the Project, it must not disappear merely because the user has delegated that area to AI.

Therefore:

- unknown complexity is not invented prematurely
- known complexity is not hidden from canonical project truth
- presentation may collapse or visually quiet delegated branches
- canonical structure remains accurate

**Current structural safety invariant — remains active:**

> AI-generated structural changes require reviewed proposal + explicit user approval + validated atomic server/database application.

**Deferred — not approved:** autonomous structural expansion inside delegated subtrees. A future design may consider delegated decomposition only after Decisions, Tasks, provenance, and recovery mechanisms exist. The likely future boundary is whether a child **decomposes the already-approved parent goal** versus **extends project scope** — not merely whether the operation is additive.

---

## 4. Workspace AI and User Working Model — Approved direction

A conceptual **Workspace-level AI** exists above Projects. It gradually builds a transparent working model of the user, focused on collaboration rather than indiscriminate biography.

Potential durable user-working information:

- domain expertise (per area, not a single global level)
- explanation preferences
- preferred working style
- areas where the user typically wants involvement
- areas where they typically delegate

Distinguish:

- explicit user statements
- learned working preferences
- project-specific observations

The Workspace AI should not conduct an unnecessary questionnaire to populate a profile. Learn naturally when it improves real work.

Relevant parts of the User Working Model may **seed** a new Project's Working Agreement.

**Isolation rule — Approved:**

> User working preferences may flow into Projects. Project content does not automatically flow into other Projects.

Project knowledge, files, decisions, conversations, and secrets must not leak across Project boundaries. A Project-specific policy always overrides a global working preference. Only appropriate abstractions about *how the user works* may eventually be proposed for user-level memory.

---

## 5. Project Intelligence — Approved direction

Each Project has deep persistent intelligence that understands the Project as a whole. It is not merely a chatbot attached to the Project.

Intelligence should draw from **typed project state** (structure, Decisions, Tasks, project files/outputs, events) plus focused retrieval — not from dumping entire conversation history. See `docs/ARCHITECTURE.md` — Product/UX v2 future architecture principles.

---

## 6. Working Agreement — Approved

Normal users should **not** configure a permission matrix during onboarding.

During early Project understanding, the system proposes a concise natural-language **Working Agreement** describing:

- what AI will generally handle
- what it will bring to the user
- the memorable consequence boundary (cost, time, experience, safety, flexibility)
- the initial high-level delegation split across known project areas

Example conceptual shape (not locked copy):

> I'll handle Backend and Infrastructure and bring you the results.
> We'll work together on Product, UX and Launch.
> I'll come to you for anything materially affecting cost, timing, users, safety, or something difficult to change later.
> Tell me if you'd rather be involved in any of those areas.

Working Agreement timing is not an immutable UI rule. It should exist before meaningful autonomous work begins, usually once enough initial Project / structure understanding exists.

Natural-language policy is input and presentation. Internally, confirmed authority must be represented as **structured, versioned policy**, not merely prompt prose.

**Durable invariants:**

- Every meaningful autonomous action must be attributable to authority that existed at the time. **No unattributable autonomy.**
- The AI must never widen its own authority. It may propose a change; the user confirms it.

---

## 7. Decisions — Approved (future first-class entity)

**Decision** is a first-class future entity. Not yet implemented.

**Principles:**

- Chat text does not automatically become project truth.
- Significant user decisions may be promoted into durable Decision state.
- AI may create a Decision under explicitly delegated authority.
- Delegated Decisions and user-approved Decisions both constrain future work.
- Who decided, why, and under what authority must remain inspectable.
- Meaningful Decision changes use supersession / history rather than silent mutation.
- AI must never silently act against an explicit approved Decision.
- A delegated Decision can be overturned by the user.
- AI dissent from an explicit user choice may be recorded once and must not become repeated nagging.

**Decision threshold — Approved:**

> A Decision is a meaningful choice, constraint, or preference that should guide or constrain future work, especially where a relevant alternative existed or preserving user intent matters.

Routine implementation details remain Events / execution history rather than first-class Decisions.

---

## 8. Tasks — Approved (future first-class entity)

**Task** is a first-class future work concept independent of executor. Not yet implemented.

A Task may be:

- **Human**
- **AI**
- **Hybrid**

Task execution ownership is a property of the Task — **not** a parallel Node autonomy setting.

Increasing decision involvement in a Node does **not** automatically transfer AI Tasks into the user's personal Task list. Nothing enters the user's work queue without actual Human / Hybrid assignment or an explicit user-required action.

---

## 9. Time — Approved (minimal future model)

Time enters the future model minimally:

- optional target date on Tasks / Nodes where useful
- actual started / completed timestamps derived from activity

Do **not** introduce a heavy Gantt / Sprint / capacity system in this baseline. Dates should emerge naturally from Planning rather than becoming mandatory project setup bureaucracy.

---

## 10. Authority and delegation — Approved baseline

Separate **governance** from **execution**.

The user remains the ultimate authority over project direction and meaningful project ownership. The user must **not** be forced to approve every professional micro-decision. The product must support substantial delegation.

**Important refinement:**

> Decision delegation and execution autonomy are related but distinct.

The user can allow AI to decide professional details within an approved scope without giving AI unrestricted governance authority.

---

## 11. Decision and Delegation interaction model — Approved baseline

Internally, use three conceptual outcomes:

### 1. Act + Event

AI handles routine / inconsequential work within authority. No user interruption. Recorded in activity / execution history.

### 2. Act + Decision

AI makes a meaningful delegated choice within approved authority. The choice becomes inspectable durable Decision state. No immediate approval interruption required.

### 3. Ask

The user must be involved. The affected work may become **blocked-pending-input** while unrelated work continues.

**Not approved:** "proceed unless objected" as an async governance mode. A live synchronous cancel / steer affordance may exist later but is not consent.

### Underdetermination principle — Approved

The system should not ask users merely because a decision is professionally complex.

Key question:

> Does approved project state and delegated authority already determine the appropriate choice?

Broad behavior:

- determined + routine → Act + Event
- determined / delegated + meaningful → Act + Decision
- meaningful and genuinely underdetermined → Ask
- hard gate → Ask regardless

Model judgment may **escalate** involvement above deterministic requirements. It must **not** weaken the deterministic floor. Do not use numeric LLM confidence as an authority mechanism.

### Consequence-level communication — Approved

Users should be asked questions at the level of **consequence they actually own and understand**.

Useful cross-domain consequence framing:

| Consequence | Examples |
|---|---|
| **Cost** | build cost, running cost, vendor spend |
| **Time** | deadline, delay, sequencing |
| **Experience** | what users, guests, or readers encounter |
| **Safety** | data, legal, financial, physical, reputational exposure |
| **Flexibility** | lock-in, rework cost, difficulty of changing later |

Expertise affects vocabulary and explanation depth — not the user's fundamental ownership rights where accountability applies.

---

## 12. Deterministic authority floor — Approved principle

Some boundaries must not rely purely on model judgment. Hard gates should ultimately be enforced at the capability / server / tool layer where possible.

Examples include appropriately scoped:

- spending beyond explicit / pre-authorized budget
- consequential outbound communication attributable to the user or actionable by a third party
- irreversible / destructive changes to user-owned state
- contracts / legal commitments
- exposing private / project data outside authorized boundaries
- cross-project data leakage
- widening AI authority
- acting against an approved Decision
- production / exposure / access changes where explicit authorization is required
- structural writes outside validated server / database operations

---

## 13. Involvement architecture — Approved

Only **decision involvement** is a true configurable policy dimension. Do **not** expose three parallel autonomy axes to users.

### Visibility — view state, not policy

- expand / collapse
- inspect
- show more / show less
- explanation style (adaptive by default; sticky per node)

**Inspection has no governance effect.**

> Looking is free. Being brought in is a request.

Opening or expanding a Node never changes involvement. Repeated inspection may eventually motivate a contextual suggestion — never an automatic authority change.

### Execution ownership — Task property

Human / AI / Hybrid per Task. Not a Node setting.

### Decision involvement — the actual policy

Versioned, inherited policy compiled from Working Agreement, natural language, and manual edits. See §14 and §15.

**Asymmetry — Approved:**

- increasing user involvement on explicit request is always safe
- decreasing involvement / increasing AI authority requires explicit user confirmation

---

## 14. Happy-path involvement UX — Approved direction

Do **not** make normal users choose involvement levels such as AI managed / Key decisions / Collaborative / Hands-on. Do **not** require detail-level selectors. Avoid autonomy sliders and permission wizards.

**Minimal conceptual vocabulary:**

| Element | Role |
|---|---|
| `AI handling` | standing label on delegated areas |
| *(no label)* | normal involved state — the default |
| `Needs you` | temporary overlay when user action is required |

**Natural contextual actions:**

- `Involve me more`
- `Handle this for me`

These are **intent inputs**, not hidden levels. The AI converts vague intent into specific professional policy and confirms in plain language. The user does not select "Level 3."

---

## 15. "What I handle here" — Approved (power-user surface)

Detailed manual Node control must exist but must **not** become part of the happy path.

**"What I handle here"** is a **read-first mirror of effective policy**, not an empty configuration panel.

Conceptual example rows for a software Backend node (not a fixed cross-domain taxonomy):

| Category | Effective behavior | Origin (example) |
|---|---|---|
| Architecture | Ask you | From your Backend instruction |
| Data storage | Ask you | From project agreement |
| Security / privacy | Ask you | Always — system requirement |
| Libraries / tools | AI decides | From project agreement |
| Routine implementation | AI decides | From project agreement |
| Cost-affecting choices | Ask | Always — system requirement |
| External actions | Ask | Always — system requirement |

**Rules:**

- every row shows effective behavior — nothing to "complete"
- editing is secondary
- floor / system requirements are visible but non-editable
- show human-readable origin; do not expose inheritance machinery
- do not expose engine flags, risk scores, confidence numbers, or capability internals
- natural-language changes and manual edits compile to the **same** underlying structured policy — no parallel settings store

Categories must be **domain-appropriate** per Node. Once a Node's category taxonomy has become user-visible, it should remain stable. AI may propose meaningful new categories rather than silently reorganizing the collaboration model.

### Policy scope — Approved

Conceptual levels: User defaults → Project Working Agreement → Node policy (inheriting toward descendants) → deterministic non-overridable floor.

**Durable rules:**

- more specific explicit user policy wins
- explicit user policy is never silently overridden by inference
- inference / adaptation operates only where the user has remained silent
- policy changes never alter Project structure, dependencies, Task ownership, or approved Decisions

**Subtree changes — monotone / safe behavior:**

> "Involve me more in Backend and everything below it" must not reduce involvement in a child already configured to be more involving.

Deliberate child overrides survive broader parent changes and are reported simply. Never silently erase explicit child preferences.

---

## 16. Canonical hierarchical project structure and autonomous areas — Approved

The **canonical hierarchical project structure** (the project hierarchy as project truth) represents currently justified Project structure.

**Decision 6 (approved):** Tree/Outline is the primary representation for reading, navigating, understanding, and managing the Project hierarchy; Graph/Map is a first-class view for dependencies, relations, impact, cross-branch relationships, and systemic understanding. Tree and Graph are projections of the same underlying Project state — not separate sources of truth. See §25 — Decision 6.

An AI-managed area **remains visible** in canonical truth. Example:

```text
Application
├── Product
├── UX
├── Backend            AI handling
│   └── children collapsed
├── Infrastructure     AI handling
└── Launch
```

Delegated areas may be collapsed by default, visually quieter, or omitted from a user-selected focus view — but if hidden, the interface must preserve awareness (e.g. "4 AI-managed areas hidden").

Opening or expanding a delegated area changes **nothing** about involvement. The user can inspect state, significant Decisions, AI Tasks, dependencies, outputs, and history without becoming responsible for those items.

---

## 17. FOMO and calm transparency — Approved direction

Do **not** solve FOMO with repetitive "nothing needs your attention" reassurance. Absence of `Needs you` is generally the quiet signal.

Trust develops from:

1. a memorable Working Agreement
2. cheap inspection
3. clear `AI handling` state
4. meaningful Decisions being inspectable
5. proof events where AI correctly escalates something that genuinely matters

Tree decision counts are a **UX experiment**, not a durable invariant. Do not lock copy such as `AI handling · 6 decisions` as mandatory. Routine reassurance on timers is not approved. User-requested recurring reports / digests may be considered in future.

---

## 18. Wrong inference and calibration — Approved

The AI does not have to perfectly predict involvement. Mistakes must be visible, cheap to correct, non-destructive, and non-blocking where possible.

On correction (conceptual):

- explain briefly what evidence led to the inference
- immediately increase involvement as requested
- state concretely what will now reach the user
- offer the small set of historical load-bearing Decisions worth reviewing
- do not reopen every past action
- offer related calibration only when useful

Involvement changes are generally **prospective**. Historical Decisions remain inspectable and can be superseded separately.

**Calibration — Approved principles:**

AI may notice collaboration mismatch (reversals, repeated steering, repeated inspection, repeated acceptance without modification) and propose widening or narrowing — but:

- no silent authority changes
- never make calibration a standalone recurring conversation
- offers ride along with substantive work
- avoid repeated suggestions after decline
- no gamified trust score
- no numeric expertise score exposed to users

---

## 19. Dependency and autonomy boundaries — Approved

> Delegation boundaries behave like contracts. Internal decisions stay internal; relevant outputs cross.

Example: Frontend (user involved) depends on Backend (AI handling). A caching-library choice stays internal. An API contract consumed by Frontend crosses the boundary.

If a decision changes an output affecting an area with higher user involvement, escalation may be required based on the affected policy. Deduplicate fan-out into **one** user decision listing all consequences.

**Additional invariants:**

- policy changes do not modify dependency edges
- blocked Tasks remain visible as blocked
- dismissing an Attention item must not hide the underlying block
- avoid circular dependency deadlocks
- allow provisional progress where dependency semantics permit
- increasing involvement never transfers all downstream AI Tasks into the user's queue

---

## 20. Task interaction — Approved direction

Do **not** create a full persistent Chat per Task by default.

Future Task execution should support:

- **Watch**
- **Stop**
- **Steer** — an input event to a running Task, not a new long-lived conversation

Meaningful blockers should be translated through Project / Node Intelligence into relevant Planning / Needs-you context — not raw execution-agent errors forwarded as Planning questions. Translate: what was attempted, what happened, why it matters, options, recommendation.

---

## 21. User attention surfaces — Approved direction

Avoid turning the Project into a giant task list.

| Surface | Contents |
|---|---|
| **Your work** | only actual Human / Hybrid work assigned to the user |
| **Needs your decision** | the Attention / Needs-you queue — do not duplicate with a second Attention system |
| **AI working** | compact project status (e.g. "17 AI tasks running · 2 blocked") — not a giant peer task list |

Increasing involvement changes what decisions / planning / reviews reach the user. It does **not** automatically assign AI execution Tasks to them.

---

## 22. Provenance and recovery — Approved (hard future requirement)

High autonomy requires strong recovery. When an AI delegated Decision proves wrong, the system should eventually support:

- plainly identify the AI Decision that was wrong
- show concrete blast radius from **recorded provenance** — not LLM reconstruction
- identify affected Tasks, project outputs, and Decisions (exact provenance model for Files/Artifacts TBD)
- provide realistic repair / rollback options
- supersede the Decision
- optionally propose a narrower future policy

Provenance is a hard architectural requirement for future meaningful autonomous execution. **Not implemented** in the current codebase.

---

## 23. Current structural safety invariant — remains active

For the **current implementation** and near-term architecture:

- AI structural changes require proposal
- user approval
- validated atomic apply
- proposed state remains separate from approved state

Do **not** relax this in implementation until explicitly approved. See `docs/ARCHITECTURE.md` — Core principle.

---

## 24. Status summary — approved, superseded, open, and deferred

| Concept | Status |
|---|---|
| **Decision** (first-class) | **Approved** future concept — not implemented |
| **Task** (first-class) | **Approved** future concept — not implemented |
| **Policy engine / Working Agreement** | **Approved** future architecture direction — not implemented |
| **Workspace AI / User Working Model** | **Approved** direction — not implemented |
| **Files / Artifacts** (Project Workspace) | **Approved** workspace concept — first-class entity, versioning, and detailed semantics **open** (to be designed) |
| **Inspectable execution state** | **Approved** conceptual requirement — generalized Run entity model **open** (to be designed) |
| **Execution as a conversation type** | **Superseded** — not the approved future product model |
| Numeric LLM confidence for authority | **Rejected** |
| "Proceed unless objected" async governance | **Rejected** |
| Autonomy sliders and involvement level selectors in happy path | **Rejected** |
| Autonomous structural expansion / decomposition in delegated subtrees | **Deferred** |
| Heavy Gantt / Sprint / capacity planning | **Deferred** / not in scope |
| Cross-project portfolio AI briefing / reasoning | **Deferred** — distinct from approved Workspace AI + User Working Model |
| **Decision 6** — Tree/Outline vs Graph/Map roles | **Approved** — exact layouts and visual design remain open |

---

## 25. Decision 6 — canonical Project visualization — Approved

**Status:** **Approved** by product owner.

- The Project's **canonical hierarchical structure** remains the **structural source of truth**.
- **Tree / Outline** is the **primary representation** for reading, navigating, understanding, and managing the Project hierarchy.
- **Graph / Map** remains a **first-class Project view** whose primary role is dependencies, relations, impact, cross-branch relationships, and systemic understanding.
- **Project Overview** is the normal high-level entry point for current state, orientation, attention, and eventually Recommended Next.
- **Tree and Graph are projections of the same underlying Project state**, not separate sources of truth.
- **Exact layouts and visual design remain open.**

---

## 26. Open decisions — not approved yet

### Terminology and branding

Universe / World / Root / Node naming remains under review. Do not rename schema, code, or routes until explicitly approved. Conceptual documentation may use "Project" for the future product model while distinguishing current implementation terminology (`worlds`, `nodes`, etc.).

### Roadmap reorder

A prior architecture review recommended prioritizing Decisions and Tasks (and Files/Artifacts work) before Relations UI (Stages F–I). This recommendation is **important but not formally approved** as the new implementation roadmap. The approved post-E sequence (final Product/UX approval → UI redesign → F → G → H → I) remains in place until product-owner approval of a reorder.

### Files / Artifacts and execution Run model

Files / Artifacts are an approved part of the Project Workspace concept. Provenance for meaningful autonomous execution is an approved hard future requirement. **First-class Artifact entity semantics, versioning model, and generalized Run entity design remain open** — to be resolved as part of later Product/UX and roadmap work.

### Validation domain and product-validation gate

**Approved direction:** initial validation focuses on **AI-assisted software / digital product creation** (software-first wedge — see Product thesis).

**Hypothesis — not validated:** exact ICP, commercial differentiation / PMF, exact first MVP, specific validation metrics.

A **product-validation gate** is required before a large implementation roadmap commitment beyond current Product/UX work. This does not reorder the documented F–I implementation sequence.

### Global vs Project AI boundaries

**Workspace AI + User Working Model** is **approved direction** (see §4). What remains **deferred / open** is broader **cross-project portfolio briefing and reasoning** — not the Workspace-level collaboration model itself. Further detail on Workspace AI capabilities beyond the isolation rules in §4 may require additional product-owner decisions before implementation.

### Visual design

UI redesign implementation and final visual design remain pending. No final layouts or branding are approved in this checkpoint.

---

## 27. Relationship to current implementation

**Implemented today (Stages A–E.1):**

- Worlds, nodes, hierarchy, Root and Topic Planning chat
- Structure proposals with approval flow
- Planning chat concurrency hardening
- World Map visualization (hierarchy and relation graph views)
- Relation rendering from existing data (no application write path)

**Not implemented — approved future direction only:**

- **Decision** and **Task** as first-class entities (approved concepts)
- Working Agreement and policy engine
- Files / Artifacts as a dedicated Project Workspace surface (entity semantics open)
- Inspectable execution state for AI work (Run entity model open)
- Decision delegation interaction modes in product UI
- Execution beyond Planning chat
- "What I handle here" policy mirror
- Provenance and recovery machinery
- Attention / Needs-you surfaces as specified here

See `docs/CURRENT_STATE.md` for exact commit, branch, and validation status.

---

## 28. Documentation map

| File | Role |
|---|---|
| `docs/PRODUCT_UX_V2.md` | This file — approved Product/UX v2 baseline and open decisions |
| `docs/PROJECT.md` | Product context, glossary, relations, implementation terminology |
| `docs/UI.md` | Visual identity, implemented UI behavior, approved UX principles |
| `docs/ARCHITECTURE.md` | Technical architecture — implemented stages + future principles |
| `docs/CURRENT_STATE.md` | Handoff, stage status, Resume Here |
| `AGENTS.md` | Agent workflow and stage boundaries |
