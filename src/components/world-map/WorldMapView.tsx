"use client";

import {
  Background,
  BackgroundVariant,
  type Edge,
  MarkerType,
  type NodeMouseHandler,
  type OnSelectionChangeFunc,
  ReactFlow,
  SelectionMode,
  type NodeTypes,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildHierarchyNodes,
  buildRelationNodes,
  getDefaultHierarchyPositions,
  getDefaultRelationPositions,
  getRelationsForView,
} from "@/lib/world-map-view";
import type { World } from "@/types/world";
import {
  DEFAULT_RELATION_OPACITY,
  RELATION_TYPES,
  type MapViewId,
  type RelationType,
  type WorldGraph,
  type WorldMapNode,
} from "@/types/world-map";
import { MapCanvasControls } from "./MapCanvasControls";
import { MapTopBar } from "./MapTopBar";
import { NodeDetailsPanel } from "./NodeDetailsPanel";
import { RelationFilters } from "./RelationFilters";
import { WorldNode } from "./WorldNode";

const nodeTypes: NodeTypes = { worldNode: WorldNode };

const relationColor = new Map(
  RELATION_TYPES.map((relation) => [relation.type, relation.color]),
);

type PositionMap = Record<string, { x: number; y: number }>;

function createDefaultOpacity(): Record<RelationType, number> {
  return Object.fromEntries(
    RELATION_TYPES.map((relation) => [
      relation.type,
      DEFAULT_RELATION_OPACITY,
    ]),
  ) as Record<RelationType, number>;
}

function getSecondaryEdgeStyle(
  opacity: number,
  color: string,
  related: boolean,
): { stroke: string; strokeWidth: number; strokeDasharray: string; opacity: number } | null {
  if (opacity <= 0) return null;

  const normalized = opacity / 100;
  const isMax = opacity >= 100;

  if (isMax) {
    return {
      stroke: color,
      strokeWidth: related ? 2.5 : 2.15,
      strokeDasharray: "7 5",
      opacity: related ? 1 : 0.92,
    };
  }

  const baseOpacity = normalized * 0.58;
  const relatedBoost = related ? 1.35 : 1;

  return {
    stroke: color,
    strokeWidth: 0.75 + normalized * 0.95,
    strokeDasharray: normalized < 0.35 ? "4 9" : "5 6",
    opacity: Math.min(baseOpacity * relatedBoost, 0.82),
  };
}

function getRelationGraphEdgeStyle(
  color: string,
  related: boolean,
): { stroke: string; strokeWidth: number; strokeDasharray: string; opacity: number } {
  return {
    stroke: color,
    strokeWidth: related ? 2.35 : 2,
    strokeDasharray: "7 5",
    opacity: related ? 0.98 : 0.88,
  };
}

function createInitialPositionStore(
  graph: WorldGraph,
): Record<MapViewId, PositionMap> {
  const store = {
    hierarchy: getDefaultHierarchyPositions(graph),
  } as Record<MapViewId, PositionMap>;

  for (const relation of RELATION_TYPES) {
    store[relation.type] = getDefaultRelationPositions(
      graph.worldId,
      graph,
      relation.type,
    );
  }

  return store;
}

interface WorldMapViewProps {
  world: World;
  graph: WorldGraph;
}

export function WorldMapView({ world, graph }: WorldMapViewProps) {
  const [activeView, setActiveView] = useState<MapViewId>("hierarchy");
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [openFilterType, setOpenFilterType] = useState<RelationType | null>(null);
  const [opacityByType, setOpacityByType] = useState<Record<RelationType, number>>(
    createDefaultOpacity,
  );
  const positionStoreRef = useRef<Record<MapViewId, PositionMap>>(
    createInitialPositionStore(graph),
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<WorldMapNode>(
    buildHierarchyNodes(graph, getDefaultHierarchyPositions(graph)),
  );

  const selectedIdsKey = useMemo(() => {
    const ids = nodes.filter((node) => node.selected).map((node) => node.id);
    return ids.length > 0 ? ids.sort().join(",") : "";
  }, [nodes]);

  const selectedNodeIds = useMemo(
    () => (selectedIdsKey ? selectedIdsKey.split(",") : []),
    [selectedIdsKey],
  );

  useEffect(() => {
    if (!openFilterType) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenFilterType(null);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [openFilterType]);

  const nodeById = useMemo(() => {
    const map = new Map<string, WorldMapNode>();
    for (const node of graph.nodes) map.set(node.id, node);
    return map;
  }, [graph.nodes]);

  const visibleNodeIds = useMemo(
    () => new Set(nodes.map((node) => node.id)),
    [nodes],
  );

  const { childIds, linkedIds, highlightIds, pathEdgeIds } = useMemo(() => {
    const ancestors = new Set<string>();
    const kids = new Set<string>();
    const linked = new Set<string>();
    const pathEdges = new Set<string>();

    if (selectedNodeIds.length === 0) {
      return {
        childIds: kids,
        linkedIds: linked,
        highlightIds: new Set<string>(),
        pathEdgeIds: pathEdges,
      };
    }

    if (selectedNodeIds.length > 1) {
      return {
        childIds: kids,
        linkedIds: linked,
        highlightIds: new Set(selectedNodeIds),
        pathEdgeIds: pathEdges,
      };
    }

    const selectedNodeId = selectedNodeIds[0];

    if (activeView === "hierarchy") {
      let current = nodeById.get(selectedNodeId);
      while (current?.data.parentId) {
        const parentId = current.data.parentId;
        ancestors.add(parentId);
        pathEdges.add(`h-${parentId}-${current.id}`);
        current = nodeById.get(parentId);
      }
      for (const node of graph.nodes) {
        if (node.data.parentId === selectedNodeId) kids.add(node.id);
      }
      for (const relation of graph.relations) {
        if (relation.source === selectedNodeId) linked.add(relation.target);
        if (relation.target === selectedNodeId) linked.add(relation.source);
      }
    } else {
      const relations = getRelationsForView(graph, activeView);
      for (const relation of relations) {
        if (relation.source === selectedNodeId) linked.add(relation.target);
        if (relation.target === selectedNodeId) linked.add(relation.source);
      }
    }

    const highlight = new Set<string>([...ancestors, ...kids, ...linked]);
    highlight.add(selectedNodeId);

    return {
      childIds: kids,
      linkedIds: linked,
      highlightIds: highlight,
      pathEdgeIds: pathEdges,
    };
  }, [selectedNodeIds, activeView, nodeById, graph]);

  const displayNodes = useMemo(
    () =>
      nodes.map((node) => {
        let className = "";
        if (selectedNodeIds.length === 1 && focusNodeId) {
          className = highlightIds.has(node.id) ? "is-related" : "is-dimmed";
        } else if (selectedNodeIds.length > 1) {
          className = node.selected ? "is-related" : "is-dimmed";
        }

        if (node.className === className) return node;
        return { ...node, className };
      }),
    [nodes, focusNodeId, selectedNodeIds, highlightIds],
  );

  const edges = useMemo<Edge[]>(() => {
    if (activeView === "hierarchy") {
      const hierarchyEdges: Edge[] = graph.nodes
        .filter((node) => node.data.parentId)
        .map((node) => {
          const parentId = node.data.parentId as string;
          const edgeId = `h-${parentId}-${node.id}`;
          const onPath = pathEdgeIds.has(edgeId);
          const related =
            selectedNodeIds.length === 0 ||
            (highlightIds.has(node.id) && highlightIds.has(parentId));
          return {
            id: edgeId,
            source: parentId,
            target: node.id,
            type: "smoothstep",
            className: `wm-edge wm-edge--primary${
              onPath ? " is-path" : ""
            }${selectedNodeIds.length > 0 && !related ? " is-dimmed" : ""}`,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: onPath ? "#bfdbfe" : "#60a5fa",
              width: 16,
              height: 16,
            },
          } satisfies Edge;
        });

      const secondaryEdges: Edge[] = graph.relations.flatMap((relation) => {
        const opacity = opacityByType[relation.type];
        const related =
          selectedNodeIds.length === 0 ||
          (highlightIds.has(relation.source) &&
            highlightIds.has(relation.target));
        const color = relationColor.get(relation.type) ?? "#94a3b8";
        const style = getSecondaryEdgeStyle(
          opacity,
          color,
          related && selectedNodeIds.length === 1,
        );

        if (!style) return [];

        return [
          {
            id: relation.id,
            source: relation.source,
            target: relation.target,
            type: "bezier",
            className: `wm-edge wm-edge--secondary wm-edge--${relation.type}${
              opacity >= 100 ? " wm-edge--strong" : ""
            }${
              related && selectedNodeIds.length === 1 ? " is-related" : ""
            }${selectedNodeIds.length > 0 && !related ? " is-dimmed" : ""}`,
            style,
          } satisfies Edge,
        ];
      });

      return [...hierarchyEdges, ...secondaryEdges];
    }

    const color = relationColor.get(activeView) ?? "#94a3b8";
    return getRelationsForView(graph, activeView).map((relation) => {
      const related =
        selectedNodeIds.length === 0 ||
        (highlightIds.has(relation.source) &&
          highlightIds.has(relation.target));
      const style = getRelationGraphEdgeStyle(
        color,
        related && selectedNodeIds.length === 1,
      );

      return {
        id: relation.id,
        source: relation.source,
        target: relation.target,
        type: "bezier",
        className: `wm-edge wm-edge--secondary wm-edge--${activeView} wm-edge--strong wm-edge--graph${
          related && selectedNodeIds.length === 1 ? " is-related" : ""
        }${selectedNodeIds.length > 0 && !related ? " is-dimmed" : ""}`,
        style,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
          width: 14,
          height: 14,
        },
      } satisfies Edge;
    });
  }, [
    activeView,
    graph,
    opacityByType,
    selectedNodeIds,
    highlightIds,
    pathEdgeIds,
  ]);

  const handleViewChange = useCallback(
    (view: MapViewId) => {
      positionStoreRef.current[activeView] = Object.fromEntries(
        nodes.map((node) => [node.id, { ...node.position }]),
      );

      setActiveView(view);
      setOpenFilterType(null);
      setFocusNodeId(null);

      const positions = positionStoreRef.current[view];
      const nextNodes =
        view === "hierarchy"
          ? buildHierarchyNodes(graph, positions)
          : buildRelationNodes(graph, view, positions);

      setNodes(nextNodes);
    },
    [activeView, graph, nodes, setNodes],
  );

  const onNodeClick = useCallback<NodeMouseHandler>(() => {
    setOpenFilterType(null);
  }, []);

  const onSelectionChange = useCallback<OnSelectionChangeFunc>(
    ({ nodes: selectedNodes }) => {
      setFocusNodeId(
        selectedNodes.length === 1 ? selectedNodes[0].id : null,
      );
    },
    [],
  );

  const onPaneClick = useCallback(() => {
    setOpenFilterType(null);
    setFocusNodeId(null);
  }, []);

  const clearSelection = useCallback(() => {
    setFocusNodeId(null);
    setNodes((current) =>
      current.map((node) => ({ ...node, selected: false })),
    );
  }, [setNodes]);

  const selectNode = useCallback(
    (id: string) => {
      setFocusNodeId(id);
      setNodes((current) =>
        current.map((node) => ({
          ...node,
          selected: node.id === id,
        })),
      );
    },
    [setNodes],
  );

  const setOpacity = useCallback((type: RelationType, opacity: number) => {
    setOpacityByType((prev) => ({ ...prev, [type]: opacity }));
  }, []);

  const resetLayout = useCallback(() => {
    const nextPositions =
      activeView === "hierarchy"
        ? getDefaultHierarchyPositions(graph)
        : getDefaultRelationPositions(graph.worldId, graph, activeView);

    positionStoreRef.current[activeView] = nextPositions;

    const nextNodes =
      activeView === "hierarchy"
        ? buildHierarchyNodes(graph, nextPositions)
        : buildRelationNodes(graph, activeView, nextPositions);

    setNodes(nextNodes);
  }, [activeView, graph, setNodes]);

  const handlePointerDownCapture = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".world-map__filters")) {
        setOpenFilterType(null);
      }
    },
    [],
  );

  const selectedNode =
    focusNodeId && visibleNodeIds.has(focusNodeId)
      ? nodeById.get(focusNodeId) ?? null
      : null;
  const parentNode =
    selectedNode?.data.parentId != null
      ? nodeById.get(selectedNode.data.parentId) ?? null
      : null;
  const childNodes = useMemo(
    () => graph.nodes.filter((n) => childIds.has(n.id)),
    [graph.nodes, childIds],
  );
  const linkedNodes = useMemo(
    () =>
      graph.nodes
        .filter((n) => linkedIds.has(n.id))
        .map((n) => ({ id: n.id, label: n.data.label })),
    [graph.nodes, linkedIds],
  );

  return (
    <div className="world-map" onPointerDownCapture={handlePointerDownCapture}>
      <div className="world-map__main">
        <MapTopBar world={world} activeView={activeView} />
        <RelationFilters
          activeView={activeView}
          opacityByType={opacityByType}
          openType={openFilterType}
          onViewChange={handleViewChange}
          onOpenTypeChange={setOpenFilterType}
          onOpacityChange={setOpacity}
        />

        <div
          className={`world-map__canvas${
            activeView !== "hierarchy" ? " world-map__canvas--relation" : ""
          }`}
        >
          <div className="world-map__canvas-depth" aria-hidden="true" />
          <ReactFlow
            nodes={displayNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onSelectionChange={onSelectionChange}
            onInit={(instance) => {
              void instance.fitView({
                padding: 0.06,
                minZoom: 0.55,
                maxZoom: 1.35,
              });
            }}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
            selectionOnDrag
            selectionMode={SelectionMode.Partial}
            panOnDrag={[1, 2]}
            selectNodesOnDrag
            minZoom={0.4}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1.1}
              color="rgba(148, 163, 184, 0.14)"
            />
            <MapCanvasControls onResetLayout={resetLayout} />
          </ReactFlow>
        </div>
      </div>

      {selectedNode && (
        <div className="world-map__details">
          <NodeDetailsPanel
            node={selectedNode}
            parent={parentNode}
            childNodes={childNodes}
            linkedNodes={linkedNodes}
            onSelectNode={selectNode}
            onClose={clearSelection}
          />
        </div>
      )}
    </div>
  );
}
