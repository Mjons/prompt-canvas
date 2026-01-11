# Prompt Canvas

A visual node-based prompt organization tool. Think ComfyUI but for prompt workflows.

## Quick Start

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

## Usage

- **Right-click** on canvas to add nodes (Prompt or Group)
- **Click** a node to edit in sidebar
- **Drag** from handles to connect nodes
- **Copy icon** on nodes copies content to clipboard
- **Export** saves your canvas to JSON
- **Import** loads a saved canvas

## Node Types

### Prompt Node (Orange)
Your main prompt containers. Support markdown formatting.

### Group Node (Blue)
Visual grouping for related concepts. Drag near prompt nodes to organize.

## Keyboard Shortcuts

- `Delete` / `Backspace` - Delete selected node
- Mouse wheel - Zoom
- Click + drag canvas - Pan

## File Structure

```
prompt-canvas/
├── src/
│   ├── components/
│   │   ├── PromptNode.jsx   # Main prompt container
│   │   ├── GroupNode.jsx    # Grouping node
│   │   └── Sidebar.jsx      # Edit panel
│   ├── App.jsx              # Main canvas
│   ├── main.jsx             # Entry point
│   └── index.css            # Styles
├── index.html
└── package.json
```

## Export Format

JSON structure:
```json
{
  "nodes": [...],
  "edges": [...],
  "exportedAt": "2024-01-09T..."
}
```

---

Built for rapid prompt workflow organization.
