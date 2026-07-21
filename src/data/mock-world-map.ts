import type { SecondaryRelation, WorldGraph, WorldMapNode } from "@/types/world-map";

const universeAiNodes: WorldMapNode[] = [
  {
    id: "root",
    type: "worldNode",
    position: { x: 776, y: 0 },
    data: {
      label: "Root Planning",
      kind: "root",
      status: "active",
      description: "Project foundation and strategic planning",
      goal: "Establish the product vision, guiding principles and the initial breakdown of the project into focused branches.",
      progress: 85,
      parentId: null,
      decisions: [
        { id: "d-root-1", label: "Adopt hierarchical world/node model" },
        { id: "d-root-2", label: "Mock data first, backend later" },
      ],
      openQuestions: [
        { id: "q-root-1", question: "Which branch should be prioritized for the first execution pass?" },
      ],
    },
  },
  {
    id: "context-memory",
    type: "worldNode",
    position: { x: 0, y: 210 },
    data: {
      label: "Context & Memory",
      kind: "branch",
      status: "active",
      description: "Hierarchical memory, context building, and knowledge management",
      goal: "Build a robust hierarchical memory system that stores, retrieves, and contextualizes information across all project layers.",
      progress: 64,
      parentId: "root",
      decisions: [
        { id: "d-cm-1", label: "Chose hierarchical memory architecture" },
        { id: "d-cm-2", label: "Selected vector DB for semantic search" },
      ],
      openQuestions: [
        { id: "q-cm-1", question: "How should we handle context versioning and rollback across agent actions?" },
      ],
    },
  },
  {
    id: "agent-system",
    type: "worldNode",
    position: { x: 520, y: 210 },
    data: {
      label: "Agent System",
      kind: "branch",
      status: "active",
      description: "Intelligent agents for planning, execution, and collaboration",
      goal: "Coordinate planning and execution agents that operate over focused context packages.",
      progress: 58,
      parentId: "root",
      decisions: [{ id: "d-as-1", label: "Separate planning and execution agents" }],
      openQuestions: [
        { id: "q-as-1", question: "What is the hand-off contract between planning and execution?" },
      ],
    },
  },
  {
    id: "user-interface",
    type: "worldNode",
    position: { x: 1040, y: 210 },
    data: {
      label: "User Interface",
      kind: "branch",
      status: "active",
      description: "Modern UI/UX for seamless project management",
      goal: "Deliver a calm, premium interface for navigating worlds, nodes and context.",
      progress: 72,
      parentId: "root",
      decisions: [{ id: "d-ui-1", label: "Shared shell across all screens" }],
      openQuestions: [],
    },
  },
  {
    id: "integrations",
    type: "worldNode",
    position: { x: 1560, y: 210 },
    data: {
      label: "Integrations",
      kind: "branch",
      status: "planning",
      description: "Connectors, APIs, and third-party services",
      goal: "Connect external services and expose structured project context to them.",
      progress: 46,
      parentId: "root",
      decisions: [],
      openQuestions: [
        { id: "q-int-1", question: "Which integrations are required for the first release?" },
      ],
    },
  },
  {
    id: "memory-layer",
    type: "worldNode",
    position: { x: -116, y: 430 },
    data: {
      label: "Memory Layer",
      kind: "child",
      status: "active",
      description: "Persistent memory storage and retrieval",
      goal: "Persist and retrieve summarized context and binding decisions per node.",
      progress: 66,
      parentId: "context-memory",
      decisions: [{ id: "d-ml-1", label: "Store summaries, not full transcripts" }],
      openQuestions: [],
    },
  },
  {
    id: "context-builder",
    type: "worldNode",
    position: { x: 144, y: 430 },
    data: {
      label: "Context Builder",
      kind: "child",
      status: "active",
      description: "Context aggregation and enrichment",
      goal: "Assemble focused context packages from the ancestor path and linked nodes.",
      progress: 58,
      parentId: "context-memory",
      decisions: [],
      openQuestions: [
        { id: "q-cb-1", question: "How large should a context package be allowed to grow?" },
      ],
    },
  },
  {
    id: "planning-agent",
    type: "worldNode",
    position: { x: 404, y: 430 },
    data: {
      label: "Planning Agent",
      kind: "child",
      status: "active",
      description: "Strategic planning and task decomposition",
      goal: "Decompose subjects into focused child nodes and suggest structure.",
      progress: 71,
      parentId: "agent-system",
      decisions: [{ id: "d-pa-1", label: "Never create nodes without approval" }],
      openQuestions: [],
    },
  },
  {
    id: "execution-agent",
    type: "worldNode",
    position: { x: 664, y: 430 },
    data: {
      label: "Execution Agent",
      kind: "child",
      status: "active",
      description: "Task execution and workflow automation",
      goal: "Execute tasks against the provided context and record progress.",
      progress: 63,
      parentId: "agent-system",
      decisions: [],
      openQuestions: [],
    },
  },
  {
    id: "frontend",
    type: "worldNode",
    position: { x: 1054, y: 430 },
    data: {
      label: "Frontend",
      kind: "child",
      status: "active",
      description: "Web application and components",
      goal: "Implement the shell, Universe Home and World Map screens.",
      progress: 75,
      parentId: "user-interface",
      decisions: [],
      openQuestions: [],
    },
  },
  {
    id: "visualization",
    type: "worldNode",
    position: { x: 1574, y: 430 },
    data: {
      label: "Visualization",
      kind: "child",
      status: "active",
      description: "Data visualization and insights",
      goal: "Render the living intelligence network and project insights.",
      progress: 62,
      parentId: "integrations",
      decisions: [],
      openQuestions: [],
    },
  },
];

const universeAiRelations: SecondaryRelation[] = [
  { id: "r1", source: "context-memory", target: "planning-agent", type: "dependency" },
  { id: "r2", source: "context-memory", target: "execution-agent", type: "shared-feature" },
  { id: "r3", source: "context-memory", target: "visualization", type: "reference" },
  { id: "r4", source: "frontend", target: "visualization", type: "shared-contract" },
  { id: "r5", source: "context-builder", target: "memory-layer", type: "shared-feature" },
  { id: "r6", source: "execution-agent", target: "frontend", type: "dependency" },
];

const worldGraphs: Record<string, WorldGraph> = {
  "universe-ai": {
    worldId: "universe-ai",
    nodes: universeAiNodes,
    relations: universeAiRelations,
  },
};

export function getWorldGraph(worldId: string): WorldGraph {
  const graph = worldGraphs[worldId];
  if (graph) return graph;

  return {
    worldId,
    nodes: [
      {
        id: "root",
        type: "worldNode",
        position: { x: 0, y: 0 },
        data: {
          label: "Root Planning",
          kind: "root",
          status: "planning",
          description: "Project foundation and strategic planning",
          goal: "Start the planning conversation at the root of this world.",
          progress: 0,
          parentId: null,
          decisions: [],
          openQuestions: [],
        },
      },
    ],
    relations: [],
  };
}

export function getDefaultLayoutPositions(
  worldId: string,
): Record<string, { x: number; y: number }> {
  const graph = getWorldGraph(worldId);
  return Object.fromEntries(
    graph.nodes.map((node) => [node.id, { ...node.position }]),
  );
}

export { getDefaultRelationPositions } from "@/lib/world-map-view";
