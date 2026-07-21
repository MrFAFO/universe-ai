"use client";

import { ControlButton, Controls } from "@xyflow/react";
import { LayoutTemplate } from "lucide-react";

interface MapCanvasControlsProps {
  onResetLayout: () => void;
}

export function MapCanvasControls({ onResetLayout }: MapCanvasControlsProps) {
  return (
    <Controls
      position="bottom-center"
      showInteractive={false}
      className="world-map__controls"
    >
      <ControlButton
        onClick={onResetLayout}
        title="Reset hierarchy layout"
        aria-label="Reset hierarchy layout"
      >
        <LayoutTemplate className="size-4" strokeWidth={1.75} />
      </ControlButton>
    </Controls>
  );
}
