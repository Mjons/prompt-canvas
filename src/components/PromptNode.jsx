import React, { useState, memo, useEffect } from "react";
import {
  Handle,
  Position,
  NodeResizer,
  useUpdateNodeInternals,
} from "reactflow";
import ReactMarkdown from "react-markdown";

const NODE_COLORS = {
  purple: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    accent: "bg-violet-500",
    text: "text-violet-300",
    ring: "ring-violet-500/20",
  },
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    accent: "bg-blue-500",
    text: "text-blue-300",
    ring: "ring-blue-500/20",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    accent: "bg-cyan-500",
    text: "text-cyan-300",
    ring: "ring-cyan-500/20",
  },
  green: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    accent: "bg-emerald-500",
    text: "text-emerald-300",
    ring: "ring-emerald-500/20",
  },
  yellow: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    accent: "bg-amber-500",
    text: "text-amber-300",
    ring: "ring-amber-500/20",
  },
  orange: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    accent: "bg-orange-500",
    text: "text-orange-300",
    ring: "ring-orange-500/20",
  },
  red: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    accent: "bg-red-500",
    text: "text-red-300",
    ring: "ring-red-500/20",
  },
  pink: {
    bg: "bg-pink-500/10",
    border: "border-pink-500/30",
    accent: "bg-pink-500",
    text: "text-pink-300",
    ring: "ring-pink-500/20",
  },
  slate: {
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
    accent: "bg-slate-500",
    text: "text-slate-300",
    ring: "ring-slate-500/20",
  },
};

const PromptNode = memo(({ data, selected, id }) => {
  const [copied, setCopied] = useState(false);
  const [pathCopied, setPathCopied] = useState(false);
  const { title, content, isExpanded = true, color = "purple", isPathRoot = false } = data;
  const colorScheme = NODE_COLORS[color] || NODE_COLORS.purple;
  const updateNodeInternals = useUpdateNodeInternals();

  // Update node internals when expand state changes to fix handle positions
  useEffect(() => {
    updateNodeInternals(id);
  }, [isExpanded, id, updateNodeInternals]);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleToggleExpand = (e) => {
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("toggleNodeExpand", {
        detail: { id, isExpanded: !isExpanded },
      }),
    );
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent("deleteNode", { detail: { id } }));
  };

  const handleDuplicate = (e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent("duplicateNode", { detail: { id } }));
  };

  const handleCopyPath = (e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent("copyPathFromNode", { detail: { id } }));
    setPathCopied(true);
    setTimeout(() => setPathCopied(false), 1500);
  };

  // Collapsed view - compact pill
  if (!isExpanded) {
    return (
      <div
        className={`
          relative rounded-xl transition-all duration-300 ease-out
          ${colorScheme.bg} backdrop-blur-sm
          border ${selected ? `${colorScheme.border} ring-2 ${colorScheme.ring}` : "border-white/5"}
          shadow-node hover:shadow-node-hover
          group cursor-pointer
          min-w-[180px]
        `}
        onClick={handleToggleExpand}
      >
        <div
          className={`absolute top-0 left-4 right-4 h-[2px] ${colorScheme.accent} rounded-full opacity-60`}
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

        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div
              className={`w-2 h-2 rounded-full ${colorScheme.accent} shadow-lg flex-shrink-0`}
            />
            <span
              className={`font-medium text-sm truncate ${colorScheme.text}`}
            >
              {title || "Untitled"}
            </span>
          </div>
          <svg
            className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0"
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

  // Expanded view - resizable with content
  return (
    <>
      <NodeResizer
        minWidth={200}
        minHeight={100}
        maxWidth={500}
        maxHeight={400}
        isVisible={selected}
        lineClassName="!border-white/20"
        handleClassName="!w-3 !h-3 !bg-white/30 !border-white/50 !rounded-sm"
      />
      <div
        className={`
          relative rounded-xl transition-all duration-200 ease-out
          ${colorScheme.bg} backdrop-blur-sm
          border ${selected ? `${colorScheme.border} ring-2 ${colorScheme.ring}` : "border-white/5"}
          shadow-node hover:shadow-node-hover
          group flex flex-col
          w-full h-full
        `}
      >
        <div
          className={`absolute top-0 left-4 right-4 h-[2px] ${colorScheme.accent} rounded-full opacity-60`}
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

        {/* Header - fixed */}
        <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div
              className={`w-2 h-2 rounded-full ${colorScheme.accent} shadow-lg flex-shrink-0`}
            />
            <span
              className={`font-semibold text-sm truncate ${colorScheme.text}`}
            >
              {title || "Untitled"}
            </span>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={handleCopy}
              className={`
                p-1 rounded-md transition-all duration-200
                ${
                  copied
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "hover:bg-white/10 text-zinc-500 hover:text-zinc-300"
                }
              `}
              title="Copy content"
            >
              {copied ? (
                <svg
                  className="w-3.5 h-3.5"
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
                  className="w-3.5 h-3.5"
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
              )}
            </button>

            {isPathRoot && (
              <button
                onClick={handleCopyPath}
                className={`
                  p-1 rounded-md transition-all duration-200
                  ${
                    pathCopied
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "hover:bg-accent/20 text-accent hover:text-accent"
                  }
                `}
                title="Copy path from this node"
              >
                {pathCopied ? (
                  <svg
                    className="w-3.5 h-3.5"
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
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 5l7 7-7 7M5 5l7 7-7 7"
                    />
                  </svg>
                )}
              </button>
            )}

            <button
              onClick={handleDuplicate}
              className="p-1 rounded-md hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-all duration-200"
              title="Duplicate node"
            >
              <svg
                className="w-3.5 h-3.5"
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

            <button
              onClick={handleToggleExpand}
              className="p-1 rounded-md hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-all duration-200"
              title="Collapse"
            >
              <svg
                className="w-3.5 h-3.5 rotate-180"
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

            <button
              onClick={handleDelete}
              className="p-1 rounded-md hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-all duration-200 opacity-0 group-hover:opacity-100"
              title="Delete node"
            >
              <svg
                className="w-3.5 h-3.5"
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

        {/* Content - fills remaining space */}
        <div className="flex-1 px-3 pb-3 min-h-0 overflow-hidden">
          <div className="h-full p-2 rounded-lg bg-black/20 border border-white/5 overflow-hidden">
            <div className="h-full text-xs text-zinc-300 markdown-content overflow-y-auto custom-scrollbar leading-relaxed">
              <ReactMarkdown>{content || "*No content*"}</ReactMarkdown>
            </div>
          </div>
        </div>

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
    </>
  );
});

function getComputedColorValue(color) {
  const colors = {
    purple: "#8b5cf6",
    blue: "#3b82f6",
    cyan: "#06b6d4",
    green: "#10b981",
    yellow: "#f59e0b",
    orange: "#f97316",
    red: "#ef4444",
    pink: "#ec4899",
    slate: "#64748b",
  };
  return colors[color] || colors.purple;
}

PromptNode.displayName = "PromptNode";

export default PromptNode;
export { NODE_COLORS, getComputedColorValue };
