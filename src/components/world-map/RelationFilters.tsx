"use client";

import type { CSSProperties } from "react";
import { GitFork, Network } from "lucide-react";
import {
  MAX_RELATION_OPACITY,
  MIN_RELATION_OPACITY,
  RELATION_TYPES,
  type MapViewId,
  type RelationType,
} from "@/types/world-map";

interface RelationFiltersProps {
  activeView: MapViewId;
  opacityByType: Record<RelationType, number>;
  openType: RelationType | null;
  onViewChange: (view: MapViewId) => void;
  onOpenTypeChange: (type: RelationType | null) => void;
  onOpacityChange: (type: RelationType, opacity: number) => void;
}

function activeBarCount(opacity: number): number {
  if (opacity <= 0) return 0;
  if (opacity <= 34) return 1;
  if (opacity <= 67) return 2;
  return 3;
}

export function RelationFilters({
  activeView,
  opacityByType,
  openType,
  onViewChange,
  onOpenTypeChange,
  onOpacityChange,
}: RelationFiltersProps) {
  const hierarchyActive = activeView === "hierarchy";

  return (
    <div className="world-map__filters" role="group" aria-label="Relation filters">
      <button
        type="button"
        onClick={() => onViewChange("hierarchy")}
        className={`world-map__filter-chip world-map__filter-chip--static${
          hierarchyActive ? " world-map__filter-chip--view-active" : ""
        }`}
        aria-pressed={hierarchyActive}
      >
        <GitFork className="size-4" strokeWidth={1.75} />
        Hierarchy
      </button>

      <span className="world-map__filter-divider" aria-hidden="true" />

      {RELATION_TYPES.map((relation) => {
        const opacity = opacityByType[relation.type];
        const isOpen = openType === relation.type;
        const isGraphView = activeView === relation.type;
        const activeLevel = activeBarCount(opacity);

        return (
          <div key={relation.type} className="world-map__filter-item">
            <button
              type="button"
              onClick={() =>
                onOpenTypeChange(isOpen ? null : relation.type)
              }
              onDoubleClick={() => {
                onViewChange(relation.type);
                onOpenTypeChange(null);
              }}
              className={`world-map__filter-chip world-map__filter-chip--scale${
                isOpen ? " world-map__filter-chip--open" : ""
              }${isGraphView ? " world-map__filter-chip--view-active" : ""}${
                opacity > 0 ? " world-map__filter-chip--visible" : ""
              }`}
              aria-expanded={isOpen}
              aria-haspopup="dialog"
              aria-pressed={isGraphView}
              aria-label={`${relation.label} opacity ${opacity}%`}
            >
              <span
                className="world-map__filter-swatch"
                style={{ backgroundColor: relation.color }}
              />
              <span className="world-map__filter-label">{relation.label}</span>
              <span className="world-map__filter-scale" aria-hidden="true">
                {[1, 2, 3].map((step) => (
                  <span
                    key={step}
                    className={`world-map__filter-scale-bar${
                      step <= activeLevel ? " is-active" : ""
                    }`}
                    style={
                      step <= activeLevel
                        ? ({ "--scale-color": relation.color } as CSSProperties)
                        : undefined
                    }
                  />
                ))}
              </span>
            </button>

            {isOpen && (
              <div
                className="world-map__filter-popover"
                role="dialog"
                aria-label={`${relation.label} opacity`}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <div className="world-map__filter-popover-head">
                  <span
                    className="world-map__filter-swatch"
                    style={{ backgroundColor: relation.color }}
                  />
                  <span className="world-map__filter-popover-title">
                    {relation.label}
                  </span>
                  <span className="world-map__filter-popover-value">
                    {opacity}%
                  </span>
                </div>

                <label className="world-map__filter-slider-label">
                  <span className="sr-only">{relation.label} opacity</span>
                  <input
                    type="range"
                    className="world-map__filter-slider"
                    min={MIN_RELATION_OPACITY}
                    max={MAX_RELATION_OPACITY}
                    step={1}
                    value={opacity}
                    onChange={(event) =>
                      onOpacityChange(relation.type, Number(event.target.value))
                    }
                    style={
                      {
                        "--slider-color": relation.color,
                        "--slider-progress": `${opacity}%`,
                      } as CSSProperties
                    }
                  />
                </label>

                <div className="world-map__filter-slider-labels">
                  <span>Hidden</span>
                  <span>Prominent</span>
                </div>

                <button
                  type="button"
                  className="world-map__filter-graph-btn"
                  onClick={() => {
                    onViewChange(relation.type);
                    onOpenTypeChange(null);
                  }}
                >
                  <Network className="size-4" strokeWidth={1.75} />
                  Open relation graph
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
