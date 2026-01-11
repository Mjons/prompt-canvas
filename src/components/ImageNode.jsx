import React, { useState, memo, useEffect } from "react";
import {
  Handle,
  Position,
  NodeResizer,
  useUpdateNodeInternals,
} from "reactflow";
import { NODE_COLORS, getComputedColorValue } from "./PromptNode";

const ImageNode = memo(({ data, selected, id }) => {
  const [copied, setCopied] = useState(false);
  const {
    title,
    src,
    thumbnail,
    isExpanded = true,
    color = "purple",
    opacity = 1,
    showBorder = true,
    attachedTo = null,
  } = data;
  const colorScheme = NODE_COLORS[color] || NODE_COLORS.purple;
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(id);
  }, [isExpanded, id, updateNodeInternals]);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      // Copy image to clipboard
      const response = await fetch(src);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: copy data URL
      navigator.clipboard.writeText(src);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleToggleExpand = (e) => {
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("toggleNodeExpand", {
        detail: { id, isExpanded: !isExpanded },
      })
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

  // Collapsed view - compact pill with thumbnail
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

        <div className="flex items-center gap-3 px-3 py-2.5">
          {/* Thumbnail */}
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/30 flex-shrink-0">
            <img
              src={thumbnail || src}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <svg
              className={`w-3.5 h-3.5 ${colorScheme.text} flex-shrink-0`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className={`font-medium text-sm truncate ${colorScheme.text}`}>
              {title || "Image"}
            </span>
          </div>

          {attachedTo && (
            <svg
              className="w-3 h-3 text-zinc-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              title="Attached to node"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          )}

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

  // Expanded view - resizable with full image
  return (
    <>
      <NodeResizer
        minWidth={150}
        minHeight={150}
        maxWidth={800}
        maxHeight={800}
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

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <svg
              className={`w-3.5 h-3.5 ${colorScheme.text} flex-shrink-0`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className={`font-semibold text-sm truncate ${colorScheme.text}`}>
              {title || "Image"}
            </span>
            {attachedTo && (
              <svg
                className="w-3 h-3 text-zinc-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                title="Attached to node"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            )}
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
              title="Copy image"
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

        {/* Image content */}
        <div className="flex-1 px-3 pb-3 min-h-0 overflow-hidden">
          <div
            className={`
              h-full rounded-lg overflow-hidden
              ${showBorder ? "bg-black/20 border border-white/5 p-1" : ""}
            `}
          >
            <img
              src={src}
              alt={title || "Image"}
              className="w-full h-full object-contain rounded"
              style={{ opacity }}
              draggable={false}
            />
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

ImageNode.displayName = "ImageNode";

export default ImageNode;
