import React from "react";
import { Position, EdgeLabelRenderer, useReactFlow } from "reactflow";

const EDGE_COLORS = {
  purple: "#a78bfa",
  blue: "#93c5fd",
  cyan: "#67e8f9",
  green: "#6ee7b7",
  yellow: "#fcd34d",
  orange: "#fdba74",
  red: "#fca5a5",
  pink: "#f9a8d4",
  slate: "#94a3b8",
  default: "#a78bfa",
};

// Custom path generation for smarter routing
function getSmartPath(
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
) {
  const deltaX = targetX - sourceX;
  const deltaY = targetY - sourceY;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  // Determine if this is a "backwards" connection (source below target for vertical flow)
  const isBackwards =
    sourcePosition === Position.Bottom &&
    targetPosition === Position.Top &&
    deltaY < 0;
  const isSameLevel = Math.abs(deltaY) < 50;
  const isVeryClose = distance < 100;

  // For very close nodes, use a simple curve
  if (isVeryClose) {
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    const offset = Math.max(30, distance * 0.3);

    // Curve outward based on horizontal position
    const curveX = midX + (deltaX > 0 ? -offset : offset);

    return `M ${sourceX} ${sourceY} Q ${curveX} ${midY} ${targetX} ${targetY}`;
  }

  // For backwards connections, route around the side
  if (isBackwards) {
    const absDistance = Math.abs(deltaY);
    const horizontalOffset = Math.max(80, Math.min(150, absDistance * 0.5));
    const verticalPadding = Math.max(40, absDistance * 0.2);

    // Determine which side to route based on horizontal position
    const routeRight = deltaX >= 0;
    const sideX = routeRight
      ? Math.max(sourceX, targetX) + horizontalOffset
      : Math.min(sourceX, targetX) - horizontalOffset;

    // Create a smooth path that goes out to the side and back
    const cp1X = sourceX;
    const cp1Y = sourceY + verticalPadding;
    const cp2X = sideX;
    const cp2Y = sourceY + verticalPadding;
    const cp3X = sideX;
    const cp3Y = targetY - verticalPadding;
    const cp4X = targetX;
    const cp4Y = targetY - verticalPadding;

    return `M ${sourceX} ${sourceY}
            C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${sideX} ${(sourceY + targetY) / 2}
            C ${cp3X} ${cp3Y}, ${cp4X} ${cp4Y}, ${targetX} ${targetY}`;
  }

  // For nodes at same level, create a nice arc
  if (isSameLevel) {
    const arcHeight = Math.max(60, Math.abs(deltaX) * 0.3);
    const midX = (sourceX + targetX) / 2;

    // Arc goes down if connecting left-to-right at same level
    const arcY = Math.max(sourceY, targetY) + arcHeight;

    return `M ${sourceX} ${sourceY}
            Q ${midX} ${arcY} ${targetX} ${targetY}`;
  }

  // Normal forward connection - smooth bezier
  const curvature = Math.min(distance * 0.25, 60);
  const controlY1 = sourceY + curvature;
  const controlY2 = targetY - curvature;

  return `M ${sourceX} ${sourceY}
          C ${sourceX} ${controlY1}, ${targetX} ${controlY2}, ${targetX} ${targetY}`;
}

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
  selected,
  target,
}) {
  const { setEdges, getEdges } = useReactFlow();
  const edgePath = getSmartPath(
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  );

  // Check if this edge is active (default true if not set)
  const isActive = data?.active !== false;

  // Check if there are multiple edges to the same target (branching)
  const edges = getEdges();
  const siblingsToSameTarget = edges.filter((e) => e.target === target);
  const hasSiblings = siblingsToSameTarget.length > 1;

  const baseColor = data?.color ? EDGE_COLORS[data.color] : EDGE_COLORS.default;
  const color = isActive ? baseColor : "#4b5563"; // Gray out inactive edges
  const opacity = isActive ? 1 : 0.4;

  // Calculate center point for buttons
  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2;

  const handleDelete = (e) => {
    e.stopPropagation();
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  const handleToggleActive = (e) => {
    e.stopPropagation();
    setEdges((edges) =>
      edges.map((edge) => {
        // If this edge goes to the same target, deactivate it
        if (edge.target === target && edge.id !== id) {
          return { ...edge, data: { ...edge.data, active: false } };
        }
        // Activate the clicked edge
        if (edge.id === id) {
          return { ...edge, data: { ...edge.data, active: true } };
        }
        return edge;
      }),
    );
  };

  return (
    <>
      {/* Glow effect layer */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={selected ? 12 : 8}
        strokeOpacity={isActive ? 0.15 : 0.05}
        filter="blur(4px)"
        className="react-flow__edge-path"
      />
      {/* Invisible wider path for easier clicking */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-path"
        style={{ cursor: "pointer" }}
      />
      {/* Main edge */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={selected ? 4 : 3}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={isActive ? "none" : "8 4"}
        className="react-flow__edge-path transition-all duration-300"
        style={{
          filter:
            selected && isActive ? `drop-shadow(0 0 6px ${color})` : "none",
          cursor: "pointer",
          opacity,
          ...style,
        }}
      />

      {/* Edge controls - shown when selected or when there are siblings */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${centerX}px, ${centerY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan flex items-center gap-1"
        >
          {/* Active toggle - only show if there are multiple edges to same target */}
          {hasSiblings && (
            <button
              onClick={handleToggleActive}
              className={`w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 ${
                isActive
                  ? "bg-emerald-500 hover:bg-emerald-400 text-white"
                  : "bg-zinc-600 hover:bg-zinc-500 text-zinc-300"
              }`}
              title={
                isActive
                  ? "Active branch (click others to switch)"
                  : "Click to use this branch"
              }
            >
              {isActive ? (
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="3" strokeWidth={2} />
                </svg>
              )}
            </button>
          )}

          {/* Delete button - shown when selected */}
          {selected && (
            <button
              onClick={handleDelete}
              className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
              title="Delete connection"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
