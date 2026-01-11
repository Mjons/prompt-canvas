# Image Nodes Feature Idea

## Overview
Add support for images on the canvas board with the ability to attach them to nodes.

## Core Concepts

### Image Sources
- Upload from local files
- Paste from clipboard
- Drag and drop onto canvas
- URL references

### Image Attachment Modes
1. **Standalone Image Node** - Image exists as its own node type on the canvas
2. **Attached to Node** - Image linked/anchored to an existing node
3. **Embedded in Node** - Image displayed within a node's content area

### Attachment Behavior
- Images follow their parent node when moved
- Optional offset positioning relative to parent
- Configurable anchor points (top, bottom, left, right, corners)
- Detach option to convert back to standalone

## Potential Node Properties
```
{
  type: "image",
  src: string,        // file path, data URL, or external URL
  width: number,
  height: number,
  attachedTo: nodeId | null,
  anchorPoint: "top" | "bottom" | "left" | "right" | "center",
  offset: { x: number, y: number }
}
```

## Use Cases
- Reference images for prompts
- Visual context for node content
- Mood boards and inspiration gathering
- Diagram annotations
- Screenshot attachments for documentation

## Open Questions
- [ ] Max file size / resolution limits?
- [ ] Store images embedded (base64) or as file references?
- [ ] Support for image manipulation (crop, resize, rotate)?
- [ ] Multiple images per node?
- [ ] Image-to-image connections?

## Implementation Considerations
- Canvas rendering performance with many images
- Memory management for large images
- Persistence format (JSON size if embedding base64)
- Thumbnail generation for performance
