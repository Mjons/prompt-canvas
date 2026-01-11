import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { getComputedColorValue } from "./PromptNode";

const COLOR_OPTIONS = [
  { name: "purple", label: "Purple" },
  { name: "blue", label: "Blue" },
  { name: "cyan", label: "Cyan" },
  { name: "green", label: "Green" },
  { name: "yellow", label: "Yellow" },
  { name: "orange", label: "Orange" },
  { name: "red", label: "Red" },
  { name: "pink", label: "Pink" },
  { name: "slate", label: "Slate" },
];

function Sidebar({ isOpen, node, onClose, onUpdate, onDelete, allNodes = [] }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [template, setTemplate] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [color, setColor] = useState("purple");
  const [showPreview, setShowPreview] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  // Image-specific state
  const [opacity, setOpacity] = useState(1);
  const [showBorder, setShowBorder] = useState(true);
  const [attachedTo, setAttachedTo] = useState(null);
  const [anchorPoint, setAnchorPoint] = useState("top-right");

  useEffect(() => {
    if (node) {
      setTitle(node.data.title || "");
      setContent(node.data.content || "");
      setTemplate(node.data.template || "");
      setIsExpanded(node.data.isExpanded !== false);
      setColor(node.data.color || "purple");
      setIsEditMode(node.data.isEditMode || false);
      // Image-specific
      if (node.type === "image") {
        setOpacity(node.data.opacity ?? 1);
        setShowBorder(node.data.showBorder !== false);
        setAttachedTo(node.data.attachedTo || null);
        setAnchorPoint(node.data.anchorPoint || "top-right");
      }
    }
  }, [node]);

  const handleSave = () => {
    if (node) {
      if (node.type === "template") {
        onUpdate(node.id, { title, template, isExpanded, color });
      } else {
        onUpdate(node.id, { title, content, isExpanded, color });
      }
    }
  };

  const handleColorChange = (newColor) => {
    setColor(newColor);
    if (node) {
      onUpdate(node.id, { color: newColor });
    }
  };

  const handleDelete = () => {
    if (node && confirm("Delete this node?")) {
      onDelete(node.id);
    }
  };

  const handleCopyAll = async () => {
    if (node?.type === "template") {
      navigator.clipboard.writeText(template);
    } else if (node?.type === "image") {
      try {
        const response = await fetch(node.data.src);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob }),
        ]);
      } catch {
        // Fallback: copy data URL
        navigator.clipboard.writeText(node.data.src);
      }
    } else {
      navigator.clipboard.writeText(content);
    }
  };

  if (!isOpen || !node) return null;

  return (
    <div
      className={`
      w-[400px] bg-panel/95 backdrop-blur-xl border-l border-white/5
      flex flex-col h-full shadow-2xl
      animate-slide-in
    `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full shadow-lg"
            style={{ background: getComputedColorValue(color) }}
          />
          <span className="font-semibold text-zinc-100">Edit Node</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/5 rounded-lg transition-all duration-200 text-zinc-400 hover:text-zinc-200"
        >
          <svg
            className="w-5 h-5"
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            className="w-full px-4 py-3 bg-black/30 border border-white/5 rounded-xl text-sm
                       focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20
                       transition-all duration-200 text-zinc-100 placeholder-zinc-600"
            placeholder="Node title..."
          />
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-3">
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((option) => (
              <button
                key={option.name}
                onClick={() => handleColorChange(option.name)}
                className={`
                  w-8 h-8 rounded-lg transition-all duration-200
                  hover:scale-110 hover:shadow-lg
                  ${color === option.name ? "ring-2 ring-white/30 ring-offset-2 ring-offset-panel scale-110" : ""}
                `}
                style={{ background: getComputedColorValue(option.name) }}
                title={option.label}
              />
            ))}
          </div>
        </div>

        {/* Expanded toggle */}
        <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
          <div>
            <label className="text-sm font-medium text-zinc-300">
              Show content on canvas
            </label>
            <p className="text-xs text-zinc-500 mt-0.5">
              Toggle to collapse/expand node
            </p>
          </div>
          <button
            onClick={() => {
              const newExpanded = !isExpanded;
              setIsExpanded(newExpanded);
              onUpdate(node.id, { isExpanded: newExpanded });
            }}
            className={`
              w-12 h-7 rounded-full transition-all duration-300 relative
              ${isExpanded ? "bg-accent shadow-glow-sm" : "bg-zinc-700"}
            `}
          >
            <span
              className={`
                absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-md
                ${isExpanded ? "left-6" : "left-1"}
              `}
            />
          </button>
        </div>

        {/* Edit Mode toggle - only for groups */}
        {node.type === "group" && (
          <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
            <div>
              <label className="text-sm font-medium text-zinc-300">
                Edit Mode
              </label>
              <p className="text-xs text-zinc-500 mt-0.5">
                Unlock to select/move nodes inside
              </p>
            </div>
            <button
              onClick={() => {
                const newEditMode = !isEditMode;
                setIsEditMode(newEditMode);
                window.dispatchEvent(
                  new CustomEvent("toggleGroupEditMode", {
                    detail: { id: node.id, isEditMode: newEditMode },
                  }),
                );
              }}
              className={`
                w-12 h-7 rounded-full transition-all duration-300 relative
                ${isEditMode ? "bg-amber-500 shadow-glow-sm" : "bg-zinc-700"}
              `}
            >
              <span
                className={`
                  absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-md
                  ${isEditMode ? "left-6" : "left-1"}
                `}
              />
            </button>
          </div>
        )}

        {/* Template Editor */}
        {node.type === "template" && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-zinc-400">
                Template
              </label>
              <span className="text-xs text-zinc-500">
                Use {"{{param}}"} for variables
              </span>
            </div>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              onBlur={handleSave}
              className="flex-1 min-h-[200px] px-4 py-3 bg-black/30 border border-white/5 rounded-xl
                         text-sm font-mono focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20
                         transition-all duration-200 resize-none custom-scrollbar text-zinc-300 placeholder-zinc-600"
              placeholder="Take the first image on Row {{row}} Column {{column}} - {{description}}"
            />
            <p className="mt-2 text-xs text-zinc-500">
              Parameters will be extracted automatically from {"{{name}}"}{" "}
              placeholders
            </p>
          </div>
        )}

        {/* Content Editor */}
        {node.type === "prompt" && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-zinc-400">
                Content
              </label>
              <div className="flex gap-1 p-1 bg-black/30 rounded-lg">
                <button
                  onClick={() => setShowPreview(false)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-all duration-200 ${
                    !showPreview
                      ? "bg-accent text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowPreview(true)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-all duration-200 ${
                    showPreview
                      ? "bg-accent text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>

            {showPreview ? (
              <div className="flex-1 min-h-[300px] p-4 bg-black/30 border border-white/5 rounded-xl overflow-y-auto markdown-content text-sm custom-scrollbar">
                <ReactMarkdown>{content || "*No content*"}</ReactMarkdown>
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={handleSave}
                className="flex-1 min-h-[300px] px-4 py-3 bg-black/30 border border-white/5 rounded-xl
                           text-sm font-mono focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20
                           transition-all duration-200 resize-none custom-scrollbar text-zinc-300 placeholder-zinc-600"
                placeholder="# Your prompt here&#10;&#10;Use **markdown** for formatting..."
              />
            )}
          </div>
        )}

        {/* Image Editor */}
        {node.type === "image" && (
          <>
            {/* Image Preview */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Preview
              </label>
              <div className="relative aspect-video bg-black/30 rounded-xl overflow-hidden border border-white/5">
                <img
                  src={node.data.src}
                  alt={title}
                  className="w-full h-full object-contain"
                  style={{ opacity }}
                />
              </div>
              {node.data.originalName && (
                <p className="mt-2 text-xs text-zinc-500 truncate">
                  {node.data.originalName}
                </p>
              )}
            </div>

            {/* Attachment Settings */}
            <div className="p-4 bg-black/20 rounded-xl border border-white/5 space-y-4">
              <label className="text-sm font-medium text-zinc-300 block">
                Attachment
              </label>

              {/* Attach To Dropdown */}
              <div>
                <label className="text-xs text-zinc-500 block mb-1">
                  Attach to Node
                </label>
                <select
                  value={attachedTo || ""}
                  onChange={(e) => {
                    const newAttachedTo = e.target.value || null;
                    setAttachedTo(newAttachedTo);
                    onUpdate(node.id, { attachedTo: newAttachedTo });
                  }}
                  className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-accent/50"
                >
                  <option value="">None (Standalone)</option>
                  {allNodes
                    .filter((n) => n.id !== node.id && n.type !== "image")
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.data.title || n.id}
                      </option>
                    ))}
                </select>
              </div>

              {/* Anchor Point */}
              {attachedTo && (
                <div>
                  <label className="text-xs text-zinc-500 block mb-2">
                    Anchor Point
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      "top-left",
                      "top-right",
                      "bottom-left",
                      "bottom-right",
                      "center",
                    ].map((anchor) => (
                      <button
                        key={anchor}
                        onClick={() => {
                          setAnchorPoint(anchor);
                          onUpdate(node.id, { anchorPoint: anchor });
                        }}
                        className={`px-2 py-1.5 text-xs rounded-lg transition-all duration-200 ${
                          anchorPoint === anchor
                            ? "bg-accent text-white"
                            : "bg-white/5 text-zinc-400 hover:bg-white/10"
                        }`}
                      >
                        {anchor.replace("-", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Display Options */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-zinc-400">
                Display Options
              </label>

              {/* Opacity Slider */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 w-16">Opacity</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={opacity * 100}
                  onChange={(e) => {
                    const newOpacity = e.target.value / 100;
                    setOpacity(newOpacity);
                    onUpdate(node.id, { opacity: newOpacity });
                  }}
                  className="flex-1 accent-violet-500"
                />
                <span className="text-xs text-zinc-400 w-10">
                  {Math.round(opacity * 100)}%
                </span>
              </div>

              {/* Show Border Toggle */}
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                <span className="text-sm text-zinc-400">Show Border</span>
                <button
                  onClick={() => {
                    const newShowBorder = !showBorder;
                    setShowBorder(newShowBorder);
                    onUpdate(node.id, { showBorder: newShowBorder });
                  }}
                  className={`
                    w-12 h-7 rounded-full transition-all duration-300 relative
                    ${showBorder ? "bg-accent shadow-glow-sm" : "bg-zinc-700"}
                  `}
                >
                  <span
                    className={`
                      absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-md
                      ${showBorder ? "left-6" : "left-1"}
                    `}
                  />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-5 border-t border-white/5 flex gap-3">
        <button
          onClick={handleCopyAll}
          className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium
                     transition-all duration-200 flex items-center justify-center gap-2 text-zinc-300"
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
          {node?.type === "template"
            ? "Copy Template"
            : node?.type === "image"
              ? "Copy Image"
              : "Copy Content"}
        </button>
        <button
          onClick={handleDelete}
          className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300
                     rounded-xl text-sm font-medium transition-all duration-200"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
