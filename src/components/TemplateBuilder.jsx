import React, { useState, useMemo } from "react";
import { getComputedColorValue } from "./PromptNode";

const COLOR_OPTIONS = [
  { name: "cyan", label: "Cyan" },
  { name: "purple", label: "Purple" },
  { name: "blue", label: "Blue" },
  { name: "green", label: "Green" },
  { name: "yellow", label: "Yellow" },
  { name: "orange", label: "Orange" },
  { name: "pink", label: "Pink" },
];

// Extract {{param}} placeholders from template
function extractParams(template) {
  const regex = /\{\{(\w+)\}\}/g;
  const params = [];
  let match;
  while ((match = regex.exec(template)) !== null) {
    if (!params.includes(match[1])) {
      params.push(match[1]);
    }
  }
  return params;
}

// Preset templates for quick start
const PRESET_TEMPLATES = [
  {
    name: "Image Reference",
    template:
      "Take the first image on Row {{row}} Column {{column}} - {{description}}",
  },
  {
    name: "Character Description",
    template:
      "A {{age}} year old {{gender}} with {{hair_color}} hair and {{eye_color}} eyes, wearing {{clothing}}",
  },
  {
    name: "Scene Setup",
    template:
      "{{time_of_day}} in {{location}}, the atmosphere is {{mood}}, with {{weather}} weather",
  },
  {
    name: "Action Prompt",
    template:
      "{{subject}} is {{action}} while {{secondary_action}}, in the style of {{style}}",
  },
  {
    name: "Custom",
    template: "",
  },
];

export default function TemplateBuilder({ isOpen, onClose, onSave }) {
  const [title, setTitle] = useState("New Template");
  const [template, setTemplate] = useState("");
  const [color, setColor] = useState("cyan");
  const [defaultValues, setDefaultValues] = useState({});
  const [selectedPreset, setSelectedPreset] = useState(null);

  // Extract parameters from template
  const params = useMemo(() => extractParams(template), [template]);

  // Generate preview
  const preview = useMemo(() => {
    let result = template;
    params.forEach((param) => {
      const value = defaultValues[param] || `{{${param}}}`;
      result = result.replace(new RegExp(`\\{\\{${param}\\}\\}`, "g"), value);
    });
    return result;
  }, [template, params, defaultValues]);

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset.name);
    setTemplate(preset.template);
    setDefaultValues({});
    if (preset.name !== "Custom") {
      setTitle(preset.name);
    }
  };

  const handleDefaultValueChange = (param, value) => {
    setDefaultValues((prev) => ({ ...prev, [param]: value }));
  };

  const handleSave = () => {
    onSave({
      title,
      template,
      color,
      values: defaultValues,
    });
    // Reset form
    setTitle("New Template");
    setTemplate("");
    setColor("cyan");
    setDefaultValues({});
    setSelectedPreset(null);
    onClose();
  };

  const handleClose = () => {
    setTitle("New Template");
    setTemplate("");
    setColor("cyan");
    setDefaultValues({});
    setSelectedPreset(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-panel border border-white/10 rounded-2xl shadow-2xl w-[600px] max-h-[85vh] overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded"
              style={{ background: getComputedColorValue(color) }}
            />
            <span className="font-semibold text-zinc-100">
              Template Builder
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-all text-zinc-400 hover:text-zinc-200"
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Preset Templates */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-3">
              Start from a preset
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_TEMPLATES.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePresetSelect(preset)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-all duration-200 ${
                    selectedPreset === preset.name
                      ? "bg-accent/20 border-accent/50 text-accent"
                      : "bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20"
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Template Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-sm
                         focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20
                         transition-all text-zinc-100 placeholder-zinc-600"
              placeholder="Give your template a name..."
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-3">
              Color
            </label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.name}
                  onClick={() => setColor(option.name)}
                  className={`w-8 h-8 rounded-lg transition-all duration-200 hover:scale-110 ${
                    color === option.name
                      ? "ring-2 ring-white/30 ring-offset-2 ring-offset-panel scale-110"
                      : ""
                  }`}
                  style={{ background: getComputedColorValue(option.name) }}
                  title={option.label}
                />
              ))}
            </div>
          </div>

          {/* Template String */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-zinc-400">
                Template String
              </label>
              <span className="text-xs text-zinc-500">
                Use {"{{paramName}}"} for variables
              </span>
            </div>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full h-32 px-4 py-3 bg-black/30 border border-white/10 rounded-xl
                         text-sm font-mono focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20
                         transition-all resize-none custom-scrollbar text-zinc-300 placeholder-zinc-600"
              placeholder="Enter your template with {{parameters}} here..."
            />
          </div>

          {/* Extracted Parameters */}
          {params.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-3">
                Parameters ({params.length})
              </label>
              <div className="space-y-2">
                {params.map((param) => (
                  <div
                    key={param}
                    className="flex items-center gap-3 p-3 bg-black/20 border border-white/5 rounded-lg"
                  >
                    <span
                      className="px-2 py-1 text-xs font-mono rounded"
                      style={{
                        background: getComputedColorValue(color) + "20",
                        color: getComputedColorValue(color),
                      }}
                    >
                      {`{{${param}}}`}
                    </span>
                    <input
                      type="text"
                      value={defaultValues[param] || ""}
                      onChange={(e) =>
                        handleDefaultValueChange(param, e.target.value)
                      }
                      className="flex-1 px-3 py-1.5 bg-black/30 border border-white/10 rounded-md text-sm
                                 focus:outline-none focus:border-accent/50
                                 text-zinc-300 placeholder-zinc-600"
                      placeholder={`Default value for ${param} (optional)`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {template && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Preview
              </label>
              <div className="p-4 bg-black/30 border border-white/10 rounded-xl">
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {preview || (
                    <span className="text-zinc-600 italic">
                      Your generated prompt will appear here...
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium
                       transition-all text-zinc-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!template.trim()}
            className="px-6 py-2.5 bg-accent hover:bg-accent/80 disabled:bg-zinc-700 disabled:cursor-not-allowed
                       rounded-xl text-sm font-medium transition-all text-white shadow-lg shadow-accent/20"
          >
            Create Template
          </button>
        </div>
      </div>
    </div>
  );
}
