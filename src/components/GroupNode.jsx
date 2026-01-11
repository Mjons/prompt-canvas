import React, { memo, useEffect } from "react";
import {
  Handle,
  Position,
  NodeResizer,
  useUpdateNodeInternals,
} from "reactflow";
import { getComputedColorValue } from "./PromptNode";

const GROUP_COLORS = {
  purple: {
    bg: "bg-violet-500/5",
    border: "border-violet-500/30",
    accent: "bg-violet-500",
    text: "text-violet-300",
    ring: "ring-violet-500/30",
    gradient: "from-violet-500/10",
    pill: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  },
  blue: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/30",
    accent: "bg-blue-500",
    text: "text-blue-300",
    ring: "ring-blue-500/30",
    gradient: "from-blue-500/10",
    pill: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  cyan: {
    bg: "bg-cyan-500/5",
    border: "border-cyan-500/30",
    accent: "bg-cyan-500",
    text: "text-cyan-300",
    ring: "ring-cyan-500/30",
    gradient: "from-cyan-500/10",
    pill: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  },
  green: {
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/30",
    accent: "bg-emerald-500",
    text: "text-emerald-300",
    ring: "ring-emerald-500/30",
    gradient: "from-emerald-500/10",
    pill: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  yellow: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/30",
    accent: "bg-amber-500",
    text: "text-amber-300",
    ring: "ring-amber-500/30",
    gradient: "from-amber-500/10",
    pill: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  orange: {
    bg: "bg-orange-500/5",
    border: "border-orange-500/30",
    accent: "bg-orange-500",
    text: "text-orange-300",
    ring: "ring-orange-500/30",
    gradient: "from-orange-500/10",
    pill: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  },
  red: {
    bg: "bg-red-500/5",
    border: "border-red-500/30",
    accent: "bg-red-500",
    text: "text-red-300",
    ring: "ring-red-500/30",
    gradient: "from-red-500/10",
    pill: "bg-red-500/20 text-red-300 border-red-500/30",
  },
  pink: {
    bg: "bg-pink-500/5",
    border: "border-pink-500/30",
    accent: "bg-pink-500",
    text: "text-pink-300",
    ring: "ring-pink-500/30",
    gradient: "from-pink-500/10",
    pill: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  },
  slate: {
    bg: "bg-slate-500/5",
    border: "border-slate-500/30",
    accent: "bg-slate-500",
    text: "text-slate-300",
    ring: "ring-slate-500/30",
    gradient: "from-slate-500/10",
    pill: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  },
};

const GroupNode = memo(({ id, data, selected }) => {
  const {
    title,
    color = "blue",
    isExpanded = false,
    childNodes = [],
    isEditMode = false,
  } = data;
  const colorScheme = GROUP_COLORS[color] || GROUP_COLORS.blue;
  const updateNodeInternals = useUpdateNodeInternals();

  // Update node internals when expand state changes to fix handle positions
  useEffect(() => {
    updateNodeInternals(id);
  }, [isExpanded, id, updateNodeInternals]);

  const handleDelete = (e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent("deleteNode", { detail: { id } }));
  };

  const handleToggleExpand = (e) => {
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("toggleGroupExpand", {
        detail: { id, isExpanded: !isExpanded },
      }),
    );
  };

  const handleUngroup = (e) => {
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("ungroupNodes", { detail: { groupId: id } }),
    );
  };

  const handleDuplicate = (e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent("duplicateNode", { detail: { id } }));
  };

  const handleToggleEditMode = (e) => {
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("toggleGroupEditMode", {
        detail: { id, isEditMode: !isEditMode },
      }),
    );
  };

  // Collapsed view - compact card with child pills
  if (!isExpanded) {
    return (
      <div
        className={`
          relative rounded-xl transition-all duration-300 ease-out cursor-pointer
          ${colorScheme.bg}
          border ${selected ? colorScheme.border : "border-white/10"}
          ${selected ? `ring-2 ${colorScheme.ring}` : ""}
          shadow-node hover:shadow-node-hover
          min-w-[200px]
        `}
        onClick={handleToggleExpand}
      >
        {/* Accent line */}
        <div
          className={`absolute top-0 left-4 right-4 h-[2px] ${colorScheme.accent} rounded-full opacity-40`}
        />

        <Handle
          type="target"
          position={Position.Top}
          className="!-top-2"
          style={{
            background: getComputedColorValue(color),
            width: 16,
            height: 16,
            border: "3px solid #09090b",
          }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-2.5 h-2.5 rounded-sm ${colorScheme.accent} shadow-lg`}
            />
            <span className={`font-semibold text-sm ${colorScheme.text}`}>
              {title || "Group"}
            </span>
            <span className="text-xs text-zinc-500">({childNodes.length})</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Expand indicator */}
            <svg
              className="w-4 h-4 text-zinc-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {/* Child pills preview */}
        {childNodes.length > 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-1.5">
            {childNodes.slice(0, 4).map((child) => (
              <div
                key={child.id}
                className={`px-2 py-1 text-xs rounded-md border ${colorScheme.pill} truncate max-w-[100px]`}
                style={{
                  borderColor:
                    getComputedColorValue(child.data?.color || color) + "40",
                  background:
                    getComputedColorValue(child.data?.color || color) + "15",
                  color: getComputedColorValue(child.data?.color || color),
                }}
              >
                {child.data?.title || "Untitled"}
              </div>
            ))}
            {childNodes.length > 4 && (
              <div className="px-2 py-1 text-xs rounded-md bg-white/5 text-zinc-400">
                +{childNodes.length - 4} more
              </div>
            )}
          </div>
        )}

        {childNodes.length === 0 && (
          <div className="px-4 pb-3">
            <span className="text-xs text-zinc-600">Empty group</span>
          </div>
        )}

        <Handle
          type="source"
          position={Position.Bottom}
          className="!-bottom-2"
          style={{
            background: getComputedColorValue(color),
            width: 16,
            height: 16,
            border: "3px solid #09090b",
          }}
        />
      </div>
    );
  }

  // Expanded view - full container
  return (
    <>
      <NodeResizer
        minWidth={350}
        minHeight={250}
        isVisible={selected}
        lineClassName="!border-white/20"
        handleClassName="!w-3 !h-3 !bg-white/20 !border-white/40 !rounded"
      />
      <div
        className={`
          relative w-full h-full rounded-2xl transition-all duration-300 ease-out
          ${isEditMode ? "pointer-events-none" : ""}
          ${colorScheme.bg}
          border-2 ${isEditMode ? "border-solid" : "border-dashed"} ${selected ? colorScheme.border : "border-white/10"}
          ${selected ? `ring-2 ${colorScheme.ring}` : ""}
          ${isEditMode ? `ring-2 ring-amber-500/50` : ""}
          bg-gradient-to-br ${colorScheme.gradient} to-transparent
        `}
        style={{ minWidth: 350, minHeight: 250 }}
      >
        {/* Header bar */}
        <div
          className={`
            absolute top-0 left-0 right-0 h-12 rounded-t-2xl pointer-events-auto
            bg-gradient-to-r ${colorScheme.gradient} to-transparent
            border-b border-dashed ${selected ? colorScheme.border : "border-white/10"}
            flex items-center justify-between px-4
          `}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-2.5 h-2.5 rounded-sm ${colorScheme.accent} shadow-lg`}
            />
            <span className={`font-semibold text-sm ${colorScheme.text}`}>
              {title || "Group"}
            </span>
            <span className="text-xs text-zinc-500">
              ({childNodes.length} nodes)
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Edit mode toggle */}
            <button
              onClick={handleToggleEditMode}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                isEditMode
                  ? "bg-amber-500/20 text-amber-400"
                  : "hover:bg-white/10 text-zinc-400 hover:text-zinc-200"
              }`}
              title={
                isEditMode
                  ? "Lock group (exit edit mode)"
                  : "Edit group contents"
              }
            >
              {isEditMode ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              )}
            </button>
            {/* Duplicate button */}
            <button
              onClick={handleDuplicate}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-all duration-200"
              title="Duplicate group"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                />
              </svg>
            </button>
            {/* Collapse button */}
            <button
              onClick={handleToggleExpand}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-all duration-200"
              title="Collapse group"
            >
              <svg
                className="w-4 h-4 rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {/* Ungroup button */}
            {childNodes.length > 0 && (
              <button
                onClick={handleUngroup}
                className="p-1.5 rounded-lg hover:bg-amber-500/20 text-zinc-400 hover:text-amber-400 transition-all duration-200"
                title="Ungroup all nodes"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            )}
            {/* Delete button */}
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-all duration-200"
              title="Delete group"
            >
              <svg
                className="w-4 h-4"
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
          </div>
        </div>

        {/* Drop zone - child nodes render here via React Flow's parent mechanism */}
        <div className="absolute inset-4 top-16 rounded-xl border-2 border-dashed border-white/5 flex items-center justify-center pointer-events-none">
          {childNodes.length === 0 && (
            <span className="text-xs text-zinc-600">
              Drag nodes here to group
            </span>
          )}
        </div>

        <Handle
          type="target"
          position={Position.Top}
          className="!-top-2 !left-1/2 !-translate-x-1/2 !pointer-events-auto"
          style={{
            background: getComputedColorValue(color),
            width: 16,
            height: 16,
            border: "3px solid #09090b",
          }}
        />

        <Handle
          type="source"
          position={Position.Bottom}
          className="!-bottom-2 !left-1/2 !-translate-x-1/2 !pointer-events-auto"
          style={{
            background: getComputedColorValue(color),
            width: 16,
            height: 16,
            border: "3px solid #09090b",
          }}
        />
      </div>
    </>
  );
});

GroupNode.displayName = "GroupNode";

export default GroupNode;
export { GROUP_COLORS };
