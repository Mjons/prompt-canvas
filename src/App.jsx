import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";

import PromptNode, { getComputedColorValue } from "./components/PromptNode.jsx";
import GroupNode from "./components/GroupNode.jsx";
import TemplateNode from "./components/TemplateNode.jsx";
import ImageNode from "./components/ImageNode.jsx";
import Sidebar from "./components/Sidebar.jsx";
import CustomEdge from "./components/CustomEdge.jsx";
import TemplateBuilder from "./components/TemplateBuilder.jsx";
import { processImageFile, calculateAnchorPosition } from "./utils/imageHandler.js";

const nodeTypes = {
  prompt: PromptNode,
  group: GroupNode,
  template: TemplateNode,
  image: ImageNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

const STORAGE_KEY = "prompt-canvas-sheets";

const defaultNodes = [
  {
    id: "welcome",
    type: "prompt",
    position: { x: 250, y: 100 },
    style: { width: 280, height: 180 },
    data: {
      title: "Welcome",
      content:
        "# Prompt Canvas\n\nDouble-click to edit. Connect nodes to show flow.\n\n**Tips:**\n- Right-click canvas to add nodes\n- Drag from handles to connect\n- Drag nodes onto groups to organize\n- Click collapsed groups to expand",
      isExpanded: true,
      color: "purple",
    },
  },
];

const defaultEdges = [];

const createDefaultSheet = (id, name) => ({
  id,
  name,
  nodes: id === "sheet-1" ? defaultNodes : [],
  edges: id === "sheet-1" ? defaultEdges : [],
});

// Load sheets from localStorage
function loadSheetsFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.sheets && data.sheets.length > 0) {
        return {
          sheets: data.sheets,
          activeSheetId: data.activeSheetId || data.sheets[0].id,
        };
      }
    }
  } catch (e) {
    console.warn("Failed to load from localStorage:", e);
  }
  return {
    sheets: [createDefaultSheet("sheet-1", "Sheet 1")],
    activeSheetId: "sheet-1",
  };
}

// Save sheets to localStorage
function saveSheetsToStorage(sheets, activeSheetId) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sheets, activeSheetId }),
    );
  } catch (e) {
    console.warn("Failed to save to localStorage:", e);
  }
}

function Flow() {
  // Load initial sheets state from localStorage
  const initialSheets = useMemo(() => loadSheetsFromStorage(), []);

  const [sheets, setSheets] = useState(initialSheets.sheets);
  const [activeSheetId, setActiveSheetId] = useState(
    initialSheets.activeSheetId,
  );
  const [editingSheetId, setEditingSheetId] = useState(null);

  // Get active sheet
  const activeSheet = useMemo(
    () => sheets.find((s) => s.id === activeSheetId) || sheets[0],
    [sheets, activeSheetId],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(
    activeSheet?.nodes || [],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    activeSheet?.edges || [],
  );
  const [selectedNode, setSelectedNode] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [templateBuilderOpen, setTemplateBuilderOpen] = useState(false);
  const [allExpanded, setAllExpanded] = useState(true);
  const reactFlowWrapper = useRef(null);
  const imageInputRef = useRef(null);
  const pendingImagePosition = useRef(null);
  const { project, getIntersectingNodes, fitView } = useReactFlow();

  // Sync nodes/edges when switching sheets
  useEffect(() => {
    if (activeSheet) {
      // Strip extent property from nodes so they can be freely dragged out of groups
      const nodesWithoutExtent = (activeSheet.nodes || []).map((node) => {
        const { extent, ...rest } = node;
        return rest;
      });
      setNodes(nodesWithoutExtent);
      setEdges(activeSheet.edges || []);
    }
  }, [activeSheetId, activeSheet, setNodes, setEdges]);

  // Update sheet data when nodes/edges change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSheets((currentSheets) =>
        currentSheets.map((sheet) =>
          sheet.id === activeSheetId ? { ...sheet, nodes, edges } : sheet,
        ),
      );
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [nodes, edges, activeSheetId]);

  // Auto-save sheets to localStorage with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveSheetsToStorage(sheets, activeSheetId);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [sheets, activeSheetId]);

  // Sheet management functions
  const addSheet = useCallback(() => {
    const newId = `sheet-${Date.now()}`;
    const newSheet = createDefaultSheet(newId, `Sheet ${sheets.length + 1}`);
    newSheet.nodes = []; // Empty for new sheets
    newSheet.edges = [];
    setSheets((prev) => [...prev, newSheet]);
    setActiveSheetId(newId);
  }, [sheets.length]);

  const deleteSheet = useCallback(
    (sheetId) => {
      if (sheets.length <= 1) return; // Keep at least one sheet
      const newSheets = sheets.filter((s) => s.id !== sheetId);
      setSheets(newSheets);
      if (activeSheetId === sheetId) {
        setActiveSheetId(newSheets[0].id);
      }
    },
    [sheets, activeSheetId],
  );

  const renameSheet = useCallback((sheetId, newName) => {
    setSheets((prev) =>
      prev.map((s) => (s.id === sheetId ? { ...s, name: newName } : s)),
    );
    setEditingSheetId(null);
  }, []);

  const switchSheet = useCallback((sheetId) => {
    setActiveSheetId(sheetId);
    setSelectedNode(null);
    setSidebarOpen(false);
  }, []);

  // Compute child nodes for each group and identify path roots
  const nodesWithChildren = useMemo(() => {
    const childrenByGroup = {};

    // Collect children for each group
    nodes.forEach((node) => {
      if (node.parentNode) {
        if (!childrenByGroup[node.parentNode]) {
          childrenByGroup[node.parentNode] = [];
        }
        childrenByGroup[node.parentNode].push(node);
      }
    });

    // Compute path roots (nodes with outgoing edges but no incoming edges)
    const hasOutgoing = new Set(edges.map((e) => e.source));
    const hasIncoming = new Set(edges.map((e) => e.target));
    const pathRoots = new Set(
      [...hasOutgoing].filter((id) => !hasIncoming.has(id))
    );

    // Update group nodes with their children data and handle visibility
    return nodes.map((node) => {
      const isPathRoot = pathRoots.has(node.id) && node.type !== "group";

      if (node.type === "group") {
        const children = childrenByGroup[node.id] || [];
        const isEditMode = node.data?.isEditMode;
        return {
          ...node,
          // Disable dragging the group when in edit mode
          draggable: !isEditMode,
          selectable: !isEditMode,
          zIndex: isEditMode ? -1 : 0,
          style: {
            ...node.style,
            zIndex: isEditMode ? -1 : 0,
          },
          data: {
            ...node.data,
            childNodes: children,
          },
        };
      }
      // Handle child nodes - visibility and edit mode
      if (node.parentNode) {
        const parentGroup = nodes.find((n) => n.id === node.parentNode);
        if (parentGroup && !parentGroup.data?.isExpanded) {
          return {
            ...node,
            hidden: true,
            data: { ...node.data, isPathRoot },
          };
        }
        // When parent is in edit mode, raise zIndex so children are clickable/draggable
        const isParentInEditMode = parentGroup?.data?.isEditMode === true;
        if (isParentInEditMode) {
          return {
            ...node,
            hidden: false,
            zIndex: 1000,
            draggable: true,
            selectable: true,
            style: {
              ...node.style,
              zIndex: 1000,
            },
            data: { ...node.data, isPathRoot },
          };
        }
        return {
          ...node,
          hidden: false,
          data: { ...node.data, isPathRoot },
        };
      }
      return {
        ...node,
        data: { ...node.data, isPathRoot },
      };
    });
  }, [nodes, edges]);

  // Event listeners
  useEffect(() => {
    const handleToggleExpand = (event) => {
      const { id, isExpanded } = event.detail;
      setNodes((nds) =>
        nds.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, isExpanded } }
            : node,
        ),
      );
    };

    const handleToggleGroupExpand = (event) => {
      const { id, isExpanded } = event.detail;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: { ...node.data, isExpanded },
              // Set size when expanding
              ...(isExpanded ? { style: { width: 450, height: 350 } } : {}),
            };
          }
          return node;
        }),
      );
    };

    const handleDeleteNode = (event) => {
      const { id } = event.detail;
      deleteNode(id);
    };

    const handleUngroupNodes = (event) => {
      const { groupId } = event.detail;
      ungroupNodes(groupId);
    };

    const handleUpdateTemplateValues = (event) => {
      const { id, paramName, value } = event.detail;
      setNodes((nds) =>
        nds.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  values: { ...node.data.values, [paramName]: value },
                },
              }
            : node,
        ),
      );
    };

    const handleDuplicateNode = (event) => {
      const { id } = event.detail;
      duplicateNode(id);
    };

    const handleToggleGroupEditMode = (event) => {
      const { id, isEditMode } = event.detail;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: { ...node.data, isEditMode },
            };
          }
          return node;
        }),
      );
    };

    window.addEventListener("toggleNodeExpand", handleToggleExpand);
    window.addEventListener("toggleGroupExpand", handleToggleGroupExpand);
    window.addEventListener("deleteNode", handleDeleteNode);
    window.addEventListener("ungroupNodes", handleUngroupNodes);
    window.addEventListener("updateTemplateValues", handleUpdateTemplateValues);
    window.addEventListener("duplicateNode", handleDuplicateNode);
    window.addEventListener("toggleGroupEditMode", handleToggleGroupEditMode);

    return () => {
      window.removeEventListener("toggleNodeExpand", handleToggleExpand);
      window.removeEventListener("toggleGroupExpand", handleToggleGroupExpand);
      window.removeEventListener("deleteNode", handleDeleteNode);
      window.removeEventListener("ungroupNodes", handleUngroupNodes);
      window.removeEventListener(
        "updateTemplateValues",
        handleUpdateTemplateValues,
      );
      window.removeEventListener("duplicateNode", handleDuplicateNode);
      window.removeEventListener(
        "toggleGroupEditMode",
        handleToggleGroupEditMode,
      );
    };
  }, [setNodes]);

  const ungroupNodes = useCallback(
    (groupId) => {
      setNodes((nds) => {
        const groupNode = nds.find((n) => n.id === groupId);
        if (!groupNode) return nds;

        return nds.map((node) => {
          if (node.parentNode === groupId) {
            // Calculate absolute position
            const absoluteX = groupNode.position.x + node.position.x;
            const absoluteY = groupNode.position.y + node.position.y;
            const { parentNode: _, extent: __, hidden: ___, ...rest } = node;
            return {
              ...rest,
              position: { x: absoluteX, y: absoluteY },
            };
          }
          return node;
        });
      });
    },
    [setNodes],
  );

  // Color options for random selection
  const colorOptions = [
    "purple",
    "blue",
    "cyan",
    "green",
    "yellow",
    "orange",
    "pink",
  ];

  const duplicateNode = useCallback(
    (nodeId) => {
      const newNodeId = `node-${Date.now()}`;
      let newColor = "purple";

      setNodes((currentNodes) => {
        const originalNode = currentNodes.find((n) => n.id === nodeId);
        if (!originalNode) return currentNodes;

        // Pick a random different color
        const currentColor = originalNode.data?.color || "purple";
        const availableColors = colorOptions.filter((c) => c !== currentColor);
        newColor =
          availableColors[Math.floor(Math.random() * availableColors.length)];

        const newNode = {
          ...originalNode,
          id: newNodeId,
          position: {
            x: originalNode.position.x + 50,
            y: originalNode.position.y + 50,
          },
          data: {
            ...originalNode.data,
            color: newColor,
          },
          selected: false,
        };

        return [...currentNodes, newNode];
      });

      // Duplicate edges connected to original node
      setEdges((currentEdges) => {
        const newEdges = currentEdges
          .filter((e) => e.source === nodeId || e.target === nodeId)
          .map((e) => ({
            ...e,
            id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            source: e.source === nodeId ? newNodeId : e.source,
            target: e.target === nodeId ? newNodeId : e.target,
            data: { ...e.data, color: newColor },
          }));

        return [...currentEdges, ...newEdges];
      });
    },
    [setNodes, setEdges],
  );

  // Toggle expand/collapse all nodes and auto-layout
  const toggleAllExpanded = useCallback(() => {
    const newExpanded = !allExpanded;
    setAllExpanded(newExpanded);

    setNodes((currentNodes) => {
      // First, update all nodes' expanded state
      const updatedNodes = currentNodes.map((node) => {
        if (node.type === "group") {
          return {
            ...node,
            data: { ...node.data, isExpanded: newExpanded },
            ...(newExpanded ? { style: { width: 450, height: 350 } } : {}),
          };
        }
        return {
          ...node,
          data: { ...node.data, isExpanded: newExpanded },
        };
      });

      // Separate child nodes (inside groups) from regular nodes
      const nonChildNodes = updatedNodes.filter(
        (n) => !n.parentNode && n.type !== "group",
      );
      const groupNodes = updatedNodes.filter((n) => n.type === "group");
      const childNodes = updatedNodes.filter((n) => n.parentNode);

      // Build graph structure from edges
      const outgoing = {}; // nodeId -> [targetIds]
      const incoming = {}; // nodeId -> [sourceIds]

      edges.forEach((edge) => {
        if (!outgoing[edge.source]) outgoing[edge.source] = [];
        outgoing[edge.source].push(edge.target);
        if (!incoming[edge.target]) incoming[edge.target] = [];
        incoming[edge.target].push(edge.source);
      });

      // Find root nodes (no incoming edges)
      const roots = nonChildNodes.filter(
        (n) => !incoming[n.id] || incoming[n.id].length === 0,
      );

      // BFS to organize nodes into rows
      const rows = [];
      const visited = new Set();
      const nodeToRow = {};

      // Start with roots
      if (roots.length > 0) {
        rows.push(roots.map((n) => n.id));
        roots.forEach((n) => {
          visited.add(n.id);
          nodeToRow[n.id] = 0;
        });
      }

      // Process level by level
      let currentRow = 0;
      while (currentRow < rows.length) {
        const nextRowNodes = [];

        rows[currentRow].forEach((nodeId) => {
          const targets = outgoing[nodeId] || [];
          targets.forEach((targetId) => {
            if (!visited.has(targetId)) {
              // Check if all sources of this target have been visited
              const sources = incoming[targetId] || [];
              const allSourcesVisited = sources.every((s) => visited.has(s));

              if (allSourcesVisited) {
                visited.add(targetId);
                nextRowNodes.push(targetId);
                nodeToRow[targetId] = currentRow + 1;
              }
            }
          });
        });

        if (nextRowNodes.length > 0) {
          rows.push(nextRowNodes);
        }
        currentRow++;
      }

      // Add any unvisited nodes (disconnected) to their own rows
      nonChildNodes.forEach((node) => {
        if (!visited.has(node.id)) {
          rows.push([node.id]);
          nodeToRow[node.id] = rows.length - 1;
        }
      });

      // Calculate node dimensions
      const getNodeSize = (node) => {
        if (!newExpanded) {
          return { width: 200, height: 50 };
        }
        if (node.type === "group") return { width: 450, height: 350 };
        if (node.type === "template") return { width: 320, height: 220 };
        return { width: 280, height: 180 };
      };

      // Layout nodes by row
      const verticalPadding = newExpanded ? 80 : 40;
      const horizontalPadding = newExpanded ? 40 : 20;
      const nodeMap = {};
      nonChildNodes.forEach((n) => (nodeMap[n.id] = n));

      let currentY = 100;
      const positionedNodes = [];

      rows.forEach((rowNodeIds) => {
        const rowNodes = rowNodeIds.map((id) => nodeMap[id]).filter(Boolean);
        if (rowNodes.length === 0) return;

        // Calculate row dimensions
        let totalWidth = 0;
        let maxHeight = 0;
        const sizes = rowNodes.map((node) => {
          const size = getNodeSize(node);
          totalWidth += size.width;
          maxHeight = Math.max(maxHeight, size.height);
          return size;
        });
        totalWidth += (rowNodes.length - 1) * horizontalPadding;

        // Center the row
        let currentX = 250 - totalWidth / 2;

        rowNodes.forEach((node, index) => {
          const size = sizes[index];
          positionedNodes.push({
            ...node,
            position: { x: currentX, y: currentY },
            ...(newExpanded && node.type !== "group"
              ? { style: { width: size.width, height: size.height } }
              : {}),
          });
          currentX += size.width + horizontalPadding;
        });

        currentY += maxHeight + verticalPadding;
      });

      // Position group nodes below
      groupNodes.forEach((node) => {
        const size = getNodeSize(node);
        positionedNodes.push({
          ...node,
          position: { x: 250 - size.width / 2, y: currentY },
        });
        currentY += size.height + verticalPadding;
      });

      return [...positionedNodes, ...childNodes];
    });

    // Fit view after layout with a small delay
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 300 });
    }, 50);
  }, [allExpanded, setNodes, edges, fitView]);

  const onConnect = useCallback(
    (params) => {
      const sourceNode = nodes.find((n) => n.id === params.source);
      const edgeColor = sourceNode?.data?.color || "purple";

      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "custom",
            data: { color: edgeColor },
          },
          eds,
        ),
      );
    },
    [setEdges, nodes],
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setSidebarOpen(true);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSidebarOpen(false);
    setContextMenu(null);
  }, []);

  const onPaneContextMenu = useCallback((event) => {
    event.preventDefault();
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      flowX: event.clientX - bounds.left,
      flowY: event.clientY - bounds.top,
    });
  }, []);

  // Handle node drag stop - for grouping and ungrouping
  const onNodeDragStop = useCallback(
    (event, node) => {
      // Don't allow groups to be nested
      if (node.type === "group") return;

      // If node is already in a group, check if it should be ungrouped
      if (node.parentNode) {
        const parentGroup = nodes.find((n) => n.id === node.parentNode);
        if (!parentGroup) return;

        // Get group dimensions
        const groupWidth = parentGroup.width || parentGroup.style?.width || 300;
        const groupHeight =
          parentGroup.height || parentGroup.style?.height || 200;

        // Check if node is dragged outside the group bounds
        // Position is relative to parent, so negative means left/above the group
        const outsideLeft = node.position.x < -50;
        const outsideRight = node.position.x > groupWidth + 20;
        const outsideTop = node.position.y < -50;
        const outsideBottom = node.position.y > groupHeight + 20;

        if (outsideLeft || outsideRight || outsideTop || outsideBottom) {
          // Ungroup this specific node
          const absoluteX = parentGroup.position.x + node.position.x;
          const absoluteY = parentGroup.position.y + node.position.y;

          setNodes((nds) =>
            nds.map((n) => {
              if (n.id === node.id) {
                const {
                  parentNode: _,
                  extent: __,
                  expandParent: ___,
                  ...rest
                } = n;
                return {
                  ...rest,
                  position: { x: absoluteX, y: absoluteY },
                };
              }
              return n;
            }),
          );
        }
        return;
      }

      // Find intersecting group nodes for ungrouped nodes
      const intersectingNodes = getIntersectingNodes(node).filter(
        (n) => n.type === "group" && n.id !== node.id,
      );

      if (intersectingNodes.length > 0) {
        const groupNode = intersectingNodes[0];

        // Auto-expand the group if it's collapsed
        if (!groupNode.data?.isExpanded) {
          setNodes((nds) =>
            nds.map((n) => {
              if (n.id === groupNode.id) {
                return {
                  ...n,
                  data: { ...n.data, isExpanded: true },
                  style: { width: 450, height: 350 },
                };
              }
              return n;
            }),
          );
        }

        // Calculate relative position within the group
        const relativeX = Math.max(20, node.position.x - groupNode.position.x);
        const relativeY = Math.max(60, node.position.y - groupNode.position.y);

        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === node.id) {
              return {
                ...n,
                position: { x: relativeX, y: relativeY },
                parentNode: groupNode.id,
                expandParent: true,
              };
            }
            return n;
          }),
        );
      }
    },
    [getIntersectingNodes, setNodes, nodes],
  );

  const addNode = useCallback(
    (type = "prompt", color = "purple") => {
      if (!contextMenu) return;

      const position = project({
        x: contextMenu.flowX,
        y: contextMenu.flowY,
      });

      const nodeConfigs = {
        prompt: {
          data: {
            title: "New Prompt",
            content: "Your prompt here...",
            isExpanded: true,
            color,
          },
          style: { width: 240, height: 140 },
        },
        template: {
          data: {
            title: "Template",
            template:
              "Take the first image on Row {{row}} Column {{column}} - {{description}}",
            values: {},
            isExpanded: true,
            color,
          },
          style: { width: 320, height: 220 },
        },
        group: {
          data: {
            title: "New Group",
            content: "",
            isExpanded: false,
            color,
            childNodes: [],
          },
        },
      };

      const config = nodeConfigs[type] || nodeConfigs.prompt;
      const newNode = {
        id: `node-${Date.now()}`,
        type,
        position,
        data: config.data,
        ...(config.style ? { style: config.style } : {}),
      };

      setNodes((nds) => [...nds, newNode]);
      setContextMenu(null);
    },
    [project, contextMenu, setNodes],
  );

  // Create template from builder
  const createTemplateFromBuilder = useCallback(
    (templateData) => {
      const position = contextMenu
        ? project({ x: contextMenu.flowX, y: contextMenu.flowY })
        : { x: 300, y: 200 };

      const newNode = {
        id: `node-${Date.now()}`,
        type: "template",
        position,
        style: { width: 320, height: 220 },
        data: {
          title: templateData.title,
          template: templateData.template,
          values: templateData.values || {},
          isExpanded: true,
          color: templateData.color || "cyan",
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setContextMenu(null);
    },
    [project, contextMenu, setNodes],
  );

  // Handle image upload and create image node
  const handleImageUpload = useCallback(
    async (file, position) => {
      try {
        const imageData = await processImageFile(file);

        const flowPosition = position
          ? project({ x: position.flowX, y: position.flowY })
          : { x: 300, y: 200 };

        // Calculate initial size maintaining aspect ratio
        const maxWidth = 300;
        const maxHeight = 300;
        let width = imageData.width;
        let height = imageData.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        const newNode = {
          id: `node-${Date.now()}`,
          type: "image",
          position: flowPosition,
          style: { width: Math.max(150, width + 24), height: Math.max(150, height + 60) },
          data: {
            title: imageData.originalName || "Image",
            src: imageData.src,
            thumbnail: imageData.thumbnail,
            originalName: imageData.originalName,
            width: imageData.width,
            height: imageData.height,
            aspectRatio: imageData.aspectRatio,
            isExpanded: true,
            color: "purple",
            opacity: 1,
            showBorder: true,
            attachedTo: null,
            anchorPoint: "top-right",
            offset: { x: 0, y: 0 },
          },
        };

        setNodes((nds) => [...nds, newNode]);
        setContextMenu(null);
      } catch (error) {
        console.error("Failed to process image:", error);
        alert(error.message || "Failed to process image");
      }
    },
    [project, setNodes],
  );

  // Trigger image file input
  const triggerImageUpload = useCallback(() => {
    // Store the position before opening file dialog (context menu will close)
    pendingImagePosition.current = contextMenu
      ? { flowX: contextMenu.flowX, flowY: contextMenu.flowY }
      : null;
    if (imageInputRef.current) {
      imageInputRef.current.click();
    }
  }, [contextMenu]);

  // Handle file input change
  const handleImageInputChange = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (file) {
        handleImageUpload(file, pendingImagePosition.current);
      }
      event.target.value = "";
      pendingImagePosition.current = null;
    },
    [handleImageUpload],
  );

  // Paste handler for clipboard images
  useEffect(() => {
    const handlePaste = async (event) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          event.preventDefault();
          const file = item.getAsFile();
          if (file) {
            // Get center of viewport
            const bounds = reactFlowWrapper.current?.getBoundingClientRect();
            if (bounds) {
              await handleImageUpload(file, {
                flowX: bounds.width / 2,
                flowY: bounds.height / 2,
              });
            }
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleImageUpload]);

  // Drag and drop handlers for images
  const onDrop = useCallback(
    async (event) => {
      event.preventDefault();
      const files = event.dataTransfer?.files;

      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith("image/")) {
          const bounds = reactFlowWrapper.current?.getBoundingClientRect();
          if (bounds) {
            await handleImageUpload(file, {
              flowX: event.clientX - bounds.left,
              flowY: event.clientY - bounds.top,
            });
          }
        }
      }
    },
    [handleImageUpload],
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  // Sync attached image positions when parent nodes move
  useEffect(() => {
    setNodes((currentNodes) => {
      const attachedImages = currentNodes.filter(
        (n) => n.type === "image" && n.data?.attachedTo
      );

      if (attachedImages.length === 0) return currentNodes;

      let hasChanges = false;
      const updatedNodes = currentNodes.map((node) => {
        if (node.type === "image" && node.data?.attachedTo) {
          const parent = currentNodes.find((n) => n.id === node.data.attachedTo);
          if (!parent) {
            // Parent was deleted, detach the image
            hasChanges = true;
            return {
              ...node,
              data: { ...node.data, attachedTo: null },
            };
          }

          const anchorPos = calculateAnchorPosition(parent, node.data.anchorPoint);
          const newX = anchorPos.x + (node.data.offset?.x || 0);
          const newY = anchorPos.y + (node.data.offset?.y || 0);

          if (
            Math.abs(node.position.x - newX) > 1 ||
            Math.abs(node.position.y - newY) > 1
          ) {
            hasChanges = true;
            return {
              ...node,
              position: { x: newX, y: newY },
            };
          }
        }
        return node;
      });

      return hasChanges ? updatedNodes : currentNodes;
    });
  }, [nodes.filter((n) => !n.data?.attachedTo).map((n) => `${n.id}-${n.position.x}-${n.position.y}`).join(",")]);

  const updateNodeData = useCallback(
    (nodeId, newData) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...newData } }
            : node,
        ),
      );
      if (newData.color) {
        setEdges((eds) =>
          eds.map((edge) =>
            edge.source === nodeId
              ? { ...edge, data: { ...edge.data, color: newData.color } }
              : edge,
          ),
        );
      }
      if (selectedNode && selectedNode.id === nodeId) {
        setSelectedNode((prev) => ({
          ...prev,
          data: { ...prev.data, ...newData },
        }));
      }
    },
    [setNodes, setEdges, selectedNode],
  );

  const deleteNode = useCallback(
    (nodeId) => {
      setNodes((nds) => {
        const nodeToDelete = nds.find((n) => n.id === nodeId);
        if (!nodeToDelete) return nds.filter((node) => node.id !== nodeId);

        return nds
          .filter((node) => node.id !== nodeId)
          .map((node) => {
            if (node.parentNode === nodeId) {
              const absoluteX = nodeToDelete.position.x + node.position.x;
              const absoluteY = nodeToDelete.position.y + node.position.y;
              const { parentNode: _, extent: __, hidden: ___, ...rest } = node;
              return {
                ...rest,
                position: { x: absoluteX, y: absoluteY },
              };
            }
            return node;
          });
      });

      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      );

      if (selectedNode && selectedNode.id === nodeId) {
        setSelectedNode(null);
        setSidebarOpen(false);
      }
    },
    [setNodes, setEdges, selectedNode],
  );

  const exportCanvas = useCallback(() => {
    const data = {
      nodes,
      edges,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prompt-canvas-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const importCanvas = useCallback(
    (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.nodes) setNodes(data.nodes);
          if (data.edges) setEdges(data.edges);
        } catch (err) {
          alert("Invalid JSON file");
        }
      };
      reader.readAsText(file);
      event.target.value = "";
    },
    [setNodes, setEdges],
  );

  const clearCanvas = useCallback(() => {
    if (
      window.confirm(
        "Clear this sheet? This will remove all nodes from the current sheet.",
      )
    ) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
      setSidebarOpen(false);
    }
  }, [setNodes, setEdges]);

  // Master copy - traverses connected nodes and combines their content
  const [copied, setCopied] = useState(false);

  const copyAllConnected = useCallback(() => {
    // Filter to only active edges (active !== false means active)
    const activeEdges = edges.filter((e) => e.data?.active !== false);

    // Build adjacency list from ACTIVE edges only
    const adjacency = {};
    activeEdges.forEach((edge) => {
      if (!adjacency[edge.source]) adjacency[edge.source] = [];
      adjacency[edge.source].push(edge.target);
    });

    // Find nodes that have incoming active edges
    const hasIncomingActive = new Set(activeEdges.map((e) => e.target));

    // Find nodes that have outgoing active edges
    const hasOutgoingActive = new Set(activeEdges.map((e) => e.source));

    // Root nodes: have outgoing active edges but no incoming active edges
    const roots = nodes.filter(
      (n) =>
        n.type !== "group" &&
        hasOutgoingActive.has(n.id) &&
        !hasIncomingActive.has(n.id),
    );

    // If no roots with outgoing edges, there's no active path
    if (roots.length === 0 && activeEdges.length === 0) {
      return; // Nothing to copy
    }

    // BFS to collect nodes in order, following only active edges
    const visited = new Set();
    const orderedNodes = [];
    const queue = [...roots.map((n) => n.id)];

    while (queue.length > 0) {
      const nodeId = queue.shift();
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = nodes.find((n) => n.id === nodeId);
      if (node && node.type !== "group") {
        orderedNodes.push(node);
      }

      // Add connected nodes via ACTIVE edges to queue
      const connected = adjacency[nodeId] || [];
      connected.forEach((targetId) => {
        if (!visited.has(targetId)) {
          queue.push(targetId);
        }
      });
    }

    // Only nodes on the active path are included

    // Generate combined prompt (body text only, no titles)
    const combinedPrompt = orderedNodes
      .map((node) => {
        if (node.type === "template") {
          // For template nodes, generate the filled prompt (no braces in output)
          const template = node.data?.template || "";
          const values = node.data?.values || {};
          return template.replace(
            /\{\{(\w+)\}\}/g,
            (_, key) => values[key] || key,
          );
        } else {
          return node.data?.content || "";
        }
      })
      .filter((content) => content.trim())
      .join("\n\n");

    navigator.clipboard.writeText(combinedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [nodes, edges]);

  // Copy path starting from a specific node
  const copyPathFromNode = useCallback(
    (startNodeId) => {
      // Filter to only active edges
      const activeEdges = edges.filter((e) => e.data?.active !== false);

      // Build adjacency list from active edges
      const adjacency = {};
      activeEdges.forEach((edge) => {
        if (!adjacency[edge.source]) adjacency[edge.source] = [];
        adjacency[edge.source].push(edge.target);
      });

      // BFS to collect nodes in order, starting from the specified node
      const visited = new Set();
      const orderedNodes = [];
      const queue = [startNodeId];

      while (queue.length > 0) {
        const nodeId = queue.shift();
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);

        const node = nodes.find((n) => n.id === nodeId);
        if (node && node.type !== "group") {
          orderedNodes.push(node);
        }

        // Add connected nodes via active edges to queue
        const connected = adjacency[nodeId] || [];
        connected.forEach((targetId) => {
          if (!visited.has(targetId)) {
            queue.push(targetId);
          }
        });
      }

      // Generate combined prompt
      const combinedPrompt = orderedNodes
        .map((node) => {
          if (node.type === "template") {
            const template = node.data?.template || "";
            const values = node.data?.values || {};
            return template.replace(
              /\{\{(\w+)\}\}/g,
              (_, key) => values[key] || key
            );
          } else {
            return node.data?.content || "";
          }
        })
        .filter((content) => content.trim())
        .join("\n\n");

      if (combinedPrompt) {
        navigator.clipboard.writeText(combinedPrompt);
      }
    },
    [nodes, edges]
  );

  // Event listener for copying path from a specific node
  useEffect(() => {
    const handleCopyPathFromNode = (event) => {
      const { id } = event.detail;
      copyPathFromNode(id);
    };

    window.addEventListener("copyPathFromNode", handleCopyPathFromNode);
    return () => {
      window.removeEventListener("copyPathFromNode", handleCopyPathFromNode);
    };
  }, [copyPathFromNode]);

  return (
    <div className="w-screen h-screen flex bg-canvas">
      <div
          className="flex-1 relative"
          ref={reactFlowWrapper}
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
        <ReactFlow
          nodes={nodesWithChildren}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onNodeDragStop={onNodeDragStop}
          onPaneClick={onPaneClick}
          onPaneContextMenu={onPaneContextMenu}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: "custom" }}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
          deleteKeyCode={["Backspace", "Delete"]}
          connectionLineStyle={{ stroke: "#a78bfa", strokeWidth: 3 }}
          connectionLineType="bezier"
          connectionRadius={30}
          edgesReconnectable
          onReconnect={(oldEdge, newConnection) => {
            setEdges((eds) =>
              eds.map((e) =>
                e.id === oldEdge.id
                  ? {
                      ...e,
                      source: newConnection.source,
                      target: newConnection.target,
                    }
                  : e,
              ),
            );
          }}
        >
          <Background color="#1f1f23" gap={20} size={1} />
          <Controls className="!bg-panel !border-white/5 !rounded-xl !shadow-lg" />
          <MiniMap
            nodeColor={(node) =>
              getComputedColorValue(node.data?.color || "purple")
            }
            maskColor="rgba(9, 9, 11, 0.85)"
            className="!bg-panel !border-white/5 !rounded-xl"
          />
        </ReactFlow>

        {/* Top toolbar */}
        <div className="absolute top-4 left-4 flex gap-2">
          <button
            onClick={exportCanvas}
            className="px-4 py-2.5 bg-panel/80 backdrop-blur-sm border border-white/5 rounded-xl
                       text-sm font-medium hover:bg-panel-hover hover:border-white/10
                       transition-all duration-200 flex items-center gap-2 text-zinc-300 shadow-lg"
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Export
          </button>
          <label
            className="px-4 py-2.5 bg-panel/80 backdrop-blur-sm border border-white/5 rounded-xl
                            text-sm font-medium hover:bg-panel-hover hover:border-white/10
                            transition-all duration-200 cursor-pointer flex items-center gap-2 text-zinc-300 shadow-lg"
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Import
            <input
              type="file"
              accept=".json"
              onChange={importCanvas}
              className="hidden"
            />
          </label>
          <button
            onClick={toggleAllExpanded}
            className="px-4 py-2.5 bg-panel/80 backdrop-blur-sm border border-white/5 rounded-xl
                       text-sm font-medium hover:bg-panel-hover hover:border-white/10
                       transition-all duration-200 flex items-center gap-2 text-zinc-300 shadow-lg"
            title={allExpanded ? "Collapse all nodes" : "Expand all nodes"}
          >
            <svg
              className={`w-4 h-4 transition-transform ${allExpanded ? "" : "rotate-180"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
            {allExpanded ? "Collapse" : "Expand"}
          </button>
          <button
            onClick={clearCanvas}
            className="px-4 py-2.5 bg-panel/80 backdrop-blur-sm border border-white/5 rounded-xl
                       text-sm font-medium hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400
                       transition-all duration-200 flex items-center gap-2 text-zinc-400 shadow-lg"
            title="Clear canvas and start fresh"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Clear
          </button>
          <button
            onClick={copyAllConnected}
            className={`px-4 py-2.5 backdrop-blur-sm border rounded-xl
                       text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg
                       ${
                         copied
                           ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                           : "bg-accent/20 border-accent/30 text-accent hover:bg-accent/30"
                       }`}
            title="Copy content from nodes on the active path"
          >
            {copied ? (
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
                  d="M5 13l4 4L19 7"
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
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            )}
            {copied ? "Copied!" : "Copy Path"}
          </button>
        </div>

        {/* Logo */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse-soft" />
          <span className="text-zinc-500 text-sm font-medium tracking-wider">
            PROMPT CANVAS
          </span>
        </div>

        {/* Sheet Tabs */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-panel/90 backdrop-blur-sm border border-white/10 rounded-xl p-1.5 shadow-lg">
          {sheets.map((sheet) => (
            <div key={sheet.id} className="relative group">
              {editingSheetId === sheet.id ? (
                <input
                  type="text"
                  defaultValue={sheet.name}
                  autoFocus
                  className="px-3 py-1.5 text-sm bg-black/30 border border-accent/50 rounded-lg text-zinc-200 w-24 focus:outline-none"
                  onBlur={(e) =>
                    renameSheet(sheet.id, e.target.value || sheet.name)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      renameSheet(sheet.id, e.target.value || sheet.name);
                    } else if (e.key === "Escape") {
                      setEditingSheetId(null);
                    }
                  }}
                />
              ) : (
                <button
                  onClick={() => switchSheet(sheet.id)}
                  onDoubleClick={() => setEditingSheetId(sheet.id)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                    activeSheetId === sheet.id
                      ? "bg-accent/20 text-accent border border-accent/30"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                  }`}
                >
                  {sheet.name}
                </button>
              )}
              {sheets.length > 1 && activeSheetId === sheet.id && (
                <button
                  onClick={() => deleteSheet(sheet.id)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete sheet"
                >
                  <svg
                    className="w-2.5 h-2.5 text-white"
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
          ))}
          <button
            onClick={addSheet}
            className="px-2 py-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-white/5 rounded-lg transition-all duration-200"
            title="Add new sheet"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="absolute bg-panel/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-2 z-50 min-w-[200px] animate-scale-in"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Add Node
            </div>
            <button
              onClick={() => addNode("prompt", "purple")}
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-white/5 flex items-center gap-3 text-zinc-300 transition-colors"
            >
              <span className="w-3 h-3 rounded-full bg-violet-500 shadow-lg"></span>
              Prompt Node
            </button>
            <button
              onClick={() => addNode("prompt", "blue")}
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-white/5 flex items-center gap-3 text-zinc-300 transition-colors"
            >
              <span className="w-3 h-3 rounded-full bg-blue-500 shadow-lg"></span>
              Prompt (Blue)
            </button>
            <button
              onClick={() => addNode("prompt", "green")}
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-white/5 flex items-center gap-3 text-zinc-300 transition-colors"
            >
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg"></span>
              Prompt (Green)
            </button>
            <button
              onClick={() => addNode("prompt", "orange")}
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-white/5 flex items-center gap-3 text-zinc-300 transition-colors"
            >
              <span className="w-3 h-3 rounded-full bg-orange-500 shadow-lg"></span>
              Prompt (Orange)
            </button>
            <div className="h-px bg-white/5 my-2" />
            <button
              onClick={() => addNode("template", "cyan")}
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-white/5 flex items-center gap-3 text-zinc-300 transition-colors"
            >
              <span className="w-3 h-3 rounded bg-cyan-500 shadow-lg"></span>
              Quick Template
            </button>
            <button
              onClick={() => {
                setTemplateBuilderOpen(true);
              }}
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-white/5 flex items-center gap-3 text-zinc-300 transition-colors"
            >
              <svg
                className="w-3 h-3 text-cyan-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Template Builder...
            </button>
            <div className="h-px bg-white/5 my-2" />
            <button
              onClick={() => addNode("group", "blue")}
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-white/5 flex items-center gap-3 text-zinc-300 transition-colors"
            >
              <span className="w-3 h-3 rounded-sm bg-blue-500 shadow-lg"></span>
              Group Node
            </button>
            <div className="h-px bg-white/5 my-2" />
            <div className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Media
            </div>
            <button
              onClick={triggerImageUpload}
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-white/5 flex items-center gap-3 text-zinc-300 transition-colors"
            >
              <svg
                className="w-3 h-3 text-violet-400"
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
              Upload Image
            </button>
          </div>
        )}

        {/* Hidden file input for image upload */}
        <input
          type="file"
          ref={imageInputRef}
          accept="image/*"
          onChange={handleImageInputChange}
          className="hidden"
        />
      </div>

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        node={selectedNode}
        onClose={() => {
          setSidebarOpen(false);
          setSelectedNode(null);
        }}
        onUpdate={updateNodeData}
        onDelete={deleteNode}
        allNodes={nodes}
      />

      {/* Template Builder Modal */}
      <TemplateBuilder
        isOpen={templateBuilderOpen}
        onClose={() => setTemplateBuilderOpen(false)}
        onSave={createTemplateFromBuilder}
      />
    </div>
  );
}

function App() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}

export default App;
