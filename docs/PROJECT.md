# Universe AI — Product Context

## Product

Universe AI replaces long, flat AI conversations with organized project worlds.

## Core Structure

- Universe: the global home page.
- World: a project or long-running subject.
- Root node: planning only.
- Other nodes: separate Planning and Execution tabs.
- Every node has one hierarchical parent.
- Nodes inherit summarized context and binding decisions from their ancestor path.
- Nodes may have secondary links to nodes in other branches.
- Secondary links transfer relevant structured context, not entire conversations.
- The AI may suggest creating nodes but never creates them without user approval.
- Full history is stored, but only a focused context package is sent to the AI.

## Secondary Relations

The initial relation types are:

- Dependency
- Shared Feature
- Shared Contract
- Reference

Relations must be individually filterable in the World Map.

## Initial Personal MVP

- Universe Home.
- World Map.
- Create and open Worlds.
- Create and select Nodes.
- Hierarchical and secondary relations.
- Relation filters.
- Node details panel.
- Planning and Execution areas in a later stage.
- Mock data first.
- No backend or OpenAI integration yet.

## Frontend Stack

- Next.js App Router.
- TypeScript.
- Tailwind CSS v4.
- lucide-react.
- @xyflow/react.
- pnpm.
- Desktop-first responsive layout.

## Planned Routes

- `/` — Universe Home.
- `/worlds/[worldId]` — World Map.

## Initial Implementation Stages

1. Static Universe Home.
2. Static World Map.
3. World Map interactions.
4. Local Create World and Create Node flows.
5. Backend and AI integration only after frontend approval.

## Product Purpose

Traditional AI chats become difficult to navigate as conversations grow. Important decisions, context and outputs become buried inside a long linear history.

Universe AI turns a complex AI conversation into a structured visual project.

A user begins with a planning conversation at the root of a World. When the subject expands, the AI suggests splitting it into focused child nodes. Each node receives only the relevant summarized context, binding decisions and connected project information it needs.

The product combines:

- AI conversation.
- Hierarchical project structure.
- Visual knowledge navigation.
- Focused context management.
- Planning and execution workspaces.
- Structured decisions, progress and project memory.

The core promise is:

> Keep the full history, but expose and send only the information that is relevant to the current task.

The World Map is therefore not decorative. It is the primary interface for understanding the project, navigating its knowledge and controlling which context each AI workspace receives.
