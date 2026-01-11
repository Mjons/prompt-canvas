# Prompt Canvas - Unity Port Guide

## Executive Summary

This document outlines the comprehensive strategy for porting Prompt Canvas from its current React/React Flow implementation to Unity. The port will enable native desktop performance, potential 3D visualization, and opens doors for VR/AR prompt building experiences.

---

## Table of Contents

1. [Current Architecture Analysis](#current-architecture-analysis)
2. [Unity Architecture Design](#unity-architecture-design)
3. [Core Systems Mapping](#core-systems-mapping)
4. [Data Models & Serialization](#data-models--serialization)
5. [UI Implementation Strategy](#ui-implementation-strategy)
6. [Node System Implementation](#node-system-implementation)
7. [Edge/Connection System](#edgeconnection-system)
8. [Feature Parity Checklist](#feature-parity-checklist)
9. [Development Phases](#development-phases)
10. [Third-Party Options](#third-party-options)
11. [Performance Considerations](#performance-considerations)
12. [Future Enhancements](#future-enhancements)

---

## Current Architecture Analysis

### Tech Stack (React)

| Component   | Technology                                   | Purpose                 |
| ----------- | -------------------------------------------- | ----------------------- |
| Framework   | React 18                                     | Component-based UI      |
| Node Graph  | React Flow                                   | Node/edge visualization |
| Styling     | Tailwind CSS                                 | Utility-first styling   |
| State       | React Hooks (useState, useCallback, useMemo) | State management        |
| Persistence | localStorage                                 | Browser storage         |
| Build       | Vite                                         | Development/bundling    |

### Component Structure

```
src/
├── App.jsx                 # Main orchestrator, sheet management
├── components/
│   ├── PromptNode.jsx      # Basic prompt node
│   ├── TemplateNode.jsx    # Parameterized template node
│   ├── GroupNode.jsx       # Container for grouping nodes
│   ├── CustomEdge.jsx      # Connection lines with controls
│   ├── TemplateBuilder.jsx # Modal for creating templates
│   └── Sidebar.jsx         # Node editing panel
```

### Key Features

- **Multi-sheet canvas** - Multiple workspaces with tab switching
- **Three node types** - Prompt, Template, Group
- **Smart edge routing** - Bezier curves with collision avoidance
- **Node operations** - Resize, collapse, duplicate, delete, color
- **Template system** - `{{param}}` syntax with live preview
- **Branching paths** - Active/inactive edges for variant management
- **Copy Path** - Export active path as combined prompt
- **Auto-layout** - Graph-aware node organization
- **Persistence** - Auto-save to localStorage

---

## Unity Architecture Design

### Recommended Pattern: MVVM (Model-View-ViewModel)

```
PromptCanvas/
├── Scripts/
│   ├── Models/
│   │   ├── NodeData.cs
│   │   ├── EdgeData.cs
│   │   ├── SheetData.cs
│   │   └── CanvasState.cs
│   ├── ViewModels/
│   │   ├── NodeViewModel.cs
│   │   ├── EdgeViewModel.cs
│   │   ├── CanvasViewModel.cs
│   │   └── SheetViewModel.cs
│   ├── Views/
│   │   ├── NodeView.cs
│   │   ├── EdgeView.cs
│   │   ├── CanvasView.cs
│   │   └── UI/
│   │       ├── ToolbarView.cs
│   │       ├── SheetTabsView.cs
│   │       ├── SidebarView.cs
│   │       └── ContextMenuView.cs
│   ├── Systems/
│   │   ├── NodeManager.cs
│   │   ├── EdgeManager.cs
│   │   ├── SelectionManager.cs
│   │   ├── DragDropManager.cs
│   │   ├── LayoutManager.cs
│   │   └── PersistenceManager.cs
│   ├── ScriptableObjects/
│   │   ├── NodeColorPalette.cs
│   │   ├── CanvasSettings.cs
│   │   └── PresetTemplates.cs
│   └── Utilities/
│       ├── BezierCurve.cs
│       ├── GraphTraversal.cs
│       └── TemplateParser.cs
├── Prefabs/
│   ├── Nodes/
│   │   ├── PromptNode.prefab
│   │   ├── TemplateNode.prefab
│   │   └── GroupNode.prefab
│   ├── Edge.prefab
│   └── UI/
├── Resources/
│   └── DefaultData/
└── Editor/
    └── PromptCanvasEditorWindow.cs (optional)
```

### Unity Package Dependencies

```json
{
  "dependencies": {
    "com.unity.textmeshpro": "3.0.6",
    "com.unity.inputsystem": "1.7.0",
    "com.unity.vectorgraphics": "2.0.0-preview.24"
  }
}
```

---

## Core Systems Mapping

### React to Unity Mapping

| React Concept | Unity Equivalent               | Notes                                |
| ------------- | ------------------------------ | ------------------------------------ |
| `useState`    | C# fields + events             | Use `[SerializeField]` for inspector |
| `useCallback` | C# methods                     | Cache delegates if needed            |
| `useMemo`     | Computed properties            | Use lazy evaluation                  |
| `useEffect`   | `Start()`, `Update()`, Events  | Subscribe/unsubscribe pattern        |
| `useRef`      | Direct references              | Store in class fields                |
| Props         | Method parameters / Properties | Pass data explicitly                 |
| Context       | Singleton / ServiceLocator     | Dependency injection                 |
| Custom Events | C# events / UnityEvents        | `Action<T>` or `UnityEvent<T>`       |

### Event System Design

```csharp
// EventBus.cs - Central event system
public static class CanvasEvents
{
    // Node events
    public static event Action<NodeData> OnNodeCreated;
    public static event Action<string> OnNodeDeleted;
    public static event Action<string, NodeData> OnNodeUpdated;
    public static event Action<string, bool> OnNodeExpandToggled;
    public static event Action<string> OnNodeDuplicated;

    // Edge events
    public static event Action<EdgeData> OnEdgeCreated;
    public static event Action<string> OnEdgeDeleted;
    public static event Action<string, bool> OnEdgeActiveToggled;

    // Selection events
    public static event Action<string> OnNodeSelected;
    public static event Action<string> OnEdgeSelected;
    public static event Action OnSelectionCleared;

    // Sheet events
    public static event Action<string> OnSheetSwitched;
    public static event Action<SheetData> OnSheetCreated;
    public static event Action<string> OnSheetDeleted;

    // Canvas events
    public static event Action OnLayoutRequested;
    public static event Action<bool> OnExpandCollapseAll;
    public static event Action OnCopyPathRequested;
}
```

---

## Data Models & Serialization

### Core Data Classes

```csharp
// NodeData.cs
[System.Serializable]
public class NodeData
{
    public string id;
    public NodeType type;
    public Vector2 position;
    public Vector2 size;
    public string title;
    public string content;
    public string template;
    public SerializableDictionary<string, string> templateValues;
    public NodeColor color;
    public bool isExpanded;
    public string parentGroupId;

    public enum NodeType { Prompt, Template, Group }
    public enum NodeColor { Purple, Blue, Cyan, Green, Yellow, Orange, Pink, Red, Slate }
}

// EdgeData.cs
[System.Serializable]
public class EdgeData
{
    public string id;
    public string sourceNodeId;
    public string targetNodeId;
    public NodeColor color;
    public bool isActive;
}

// SheetData.cs
[System.Serializable]
public class SheetData
{
    public string id;
    public string name;
    public List<NodeData> nodes;
    public List<EdgeData> edges;
}

// CanvasState.cs
[System.Serializable]
public class CanvasState
{
    public List<SheetData> sheets;
    public string activeSheetId;
    public int version;
}
```

### Serialization Strategy

```csharp
// PersistenceManager.cs
public class PersistenceManager : MonoBehaviour
{
    private const string SAVE_KEY = "prompt_canvas_state";
    private const string SAVE_PATH = "PromptCanvas/saves/";

    public void SaveToPlayerPrefs(CanvasState state)
    {
        string json = JsonUtility.ToJson(state, true);
        PlayerPrefs.SetString(SAVE_KEY, json);
        PlayerPrefs.Save();
    }

    public CanvasState LoadFromPlayerPrefs()
    {
        if (PlayerPrefs.HasKey(SAVE_KEY))
        {
            string json = PlayerPrefs.GetString(SAVE_KEY);
            return JsonUtility.FromJson<CanvasState>(json);
        }
        return CreateDefaultState();
    }

    public void ExportToFile(CanvasState state, string filename)
    {
        string json = JsonUtility.ToJson(state, true);
        string path = Path.Combine(Application.persistentDataPath, SAVE_PATH, filename);
        Directory.CreateDirectory(Path.GetDirectoryName(path));
        File.WriteAllText(path, json);
    }

    public CanvasState ImportFromFile(string path)
    {
        if (File.Exists(path))
        {
            string json = File.ReadAllText(path);
            return JsonUtility.FromJson<CanvasState>(json);
        }
        return null;
    }
}
```

---

## UI Implementation Strategy

### Option A: Unity UI (uGUI) - Recommended for 2D

```csharp
// NodeView.cs - uGUI Implementation
public class NodeView : MonoBehaviour, IDragHandler, IPointerClickHandler, IResizeHandler
{
    [Header("References")]
    [SerializeField] private RectTransform rectTransform;
    [SerializeField] private Image backgroundImage;
    [SerializeField] private Image accentBar;
    [SerializeField] private TMP_Text titleText;
    [SerializeField] private TMP_Text contentText;
    [SerializeField] private GameObject expandedContent;
    [SerializeField] private GameObject collapsedContent;
    [SerializeField] private Button copyButton;
    [SerializeField] private Button duplicateButton;
    [SerializeField] private Button collapseButton;
    [SerializeField] private Button deleteButton;

    [Header("Connection Points")]
    [SerializeField] private ConnectionHandle inputHandle;
    [SerializeField] private ConnectionHandle outputHandle;

    [Header("Resize Handles")]
    [SerializeField] private ResizeHandle[] resizeHandles;

    private NodeData _data;
    private NodeViewModel _viewModel;

    public void Initialize(NodeData data, NodeViewModel viewModel)
    {
        _data = data;
        _viewModel = viewModel;
        UpdateView();
    }

    public void UpdateView()
    {
        titleText.text = _data.title;
        contentText.text = _data.content;
        ApplyColorScheme(_data.color);
        SetExpanded(_data.isExpanded);
        rectTransform.anchoredPosition = _data.position;
        rectTransform.sizeDelta = _data.size;
    }

    private void ApplyColorScheme(NodeColor color)
    {
        var palette = NodeColorPalette.Instance;
        var scheme = palette.GetScheme(color);
        backgroundImage.color = scheme.backgroundColor;
        accentBar.color = scheme.accentColor;
        titleText.color = scheme.textColor;
    }

    public void OnDrag(PointerEventData eventData)
    {
        rectTransform.anchoredPosition += eventData.delta / transform.lossyScale.x;
        _viewModel.UpdatePosition(rectTransform.anchoredPosition);
    }

    public void OnPointerClick(PointerEventData eventData)
    {
        if (eventData.clickCount == 2)
        {
            // Open edit mode
            _viewModel.RequestEdit();
        }
        else
        {
            _viewModel.Select();
        }
    }
}
```

### Option B: UI Toolkit (USS/UXML) - Modern Alternative

```xml
<!-- NodeView.uxml -->
<ui:UXML xmlns:ui="UnityEngine.UIElements">
    <ui:VisualElement class="node" name="node-container">
        <ui:VisualElement class="node__accent-bar"/>
        <ui:VisualElement class="node__header">
            <ui:VisualElement class="node__color-dot"/>
            <ui:Label class="node__title" name="title"/>
            <ui:VisualElement class="node__actions">
                <ui:Button class="node__btn" name="copy-btn"/>
                <ui:Button class="node__btn" name="duplicate-btn"/>
                <ui:Button class="node__btn" name="collapse-btn"/>
                <ui:Button class="node__btn node__btn--danger" name="delete-btn"/>
            </ui:VisualElement>
        </ui:VisualElement>
        <ui:VisualElement class="node__content" name="content">
            <ui:Label class="node__text" name="content-text"/>
        </ui:VisualElement>
        <ui:VisualElement class="node__handle node__handle--input" name="input-handle"/>
        <ui:VisualElement class="node__handle node__handle--output" name="output-handle"/>
    </ui:VisualElement>
</ui:UXML>
```

```css
/* NodeStyles.uss */
.node {
  position: absolute;
  background-color: rgba(24, 24, 27, 0.95);
  border-radius: 12px;
  border-width: 1px;
  border-color: rgba(255, 255, 255, 0.05);
  min-width: 200px;
  min-height: 100px;
}

.node--selected {
  border-color: rgba(139, 92, 246, 0.5);
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
}

.node__accent-bar {
  position: absolute;
  top: 0;
  left: 16px;
  right: 16px;
  height: 2px;
  background-color: var(--node-accent-color);
  border-radius: 1px;
}

.node__header {
  flex-direction: row;
  align-items: center;
  padding: 8px 12px;
}

.node__handle {
  position: absolute;
  width: 16px;
  height: 16px;
  background-color: var(--node-accent-color);
  border-radius: 8px;
  border-width: 3px;
  border-color: #09090b;
}

.node__handle--input {
  top: -8px;
  left: 50%;
  translate: -50% 0;
}

.node__handle--output {
  bottom: -8px;
  left: 50%;
  translate: -50% 0;
}
```

---

## Node System Implementation

### Node Manager

```csharp
// NodeManager.cs
public class NodeManager : MonoBehaviour
{
    [SerializeField] private Transform nodeContainer;
    [SerializeField] private NodeView promptNodePrefab;
    [SerializeField] private TemplateNodeView templateNodePrefab;
    [SerializeField] private GroupNodeView groupNodePrefab;

    private Dictionary<string, NodeView> _nodeViews = new();
    private SheetData _currentSheet;

    public void LoadSheet(SheetData sheet)
    {
        ClearAllNodes();
        _currentSheet = sheet;

        foreach (var nodeData in sheet.nodes)
        {
            CreateNodeView(nodeData);
        }
    }

    public NodeView CreateNode(NodeData.NodeType type, Vector2 position, NodeColor color)
    {
        var data = new NodeData
        {
            id = GenerateId(),
            type = type,
            position = position,
            size = GetDefaultSize(type),
            title = GetDefaultTitle(type),
            content = "",
            color = color,
            isExpanded = true
        };

        _currentSheet.nodes.Add(data);
        var view = CreateNodeView(data);

        CanvasEvents.OnNodeCreated?.Invoke(data);
        return view;
    }

    private NodeView CreateNodeView(NodeData data)
    {
        NodeView prefab = data.type switch
        {
            NodeData.NodeType.Prompt => promptNodePrefab,
            NodeData.NodeType.Template => templateNodePrefab,
            NodeData.NodeType.Group => groupNodePrefab,
            _ => promptNodePrefab
        };

        var instance = Instantiate(prefab, nodeContainer);
        var viewModel = new NodeViewModel(data, this);
        instance.Initialize(data, viewModel);
        _nodeViews[data.id] = instance;

        return instance;
    }

    public void DuplicateNode(string nodeId)
    {
        if (!_nodeViews.TryGetValue(nodeId, out var originalView))
            return;

        var originalData = _currentSheet.nodes.Find(n => n.id == nodeId);
        if (originalData == null) return;

        var newData = CloneNodeData(originalData);
        newData.id = GenerateId();
        newData.position += new Vector2(50, 50);
        newData.color = GetRandomDifferentColor(originalData.color);

        _currentSheet.nodes.Add(newData);
        CreateNodeView(newData);

        // Duplicate connected edges
        DuplicateEdgesForNode(originalData.id, newData.id);

        CanvasEvents.OnNodeDuplicated?.Invoke(newData.id);
    }

    public void DeleteNode(string nodeId)
    {
        if (_nodeViews.TryGetValue(nodeId, out var view))
        {
            Destroy(view.gameObject);
            _nodeViews.Remove(nodeId);
        }

        _currentSheet.nodes.RemoveAll(n => n.id == nodeId);
        CanvasEvents.OnNodeDeleted?.Invoke(nodeId);
    }

    private string GenerateId() => $"node-{System.DateTime.Now.Ticks}";
}
```

### Template Node with Parameter System

```csharp
// TemplateNodeView.cs
public class TemplateNodeView : NodeView
{
    [SerializeField] private Transform parameterContainer;
    [SerializeField] private ParameterField parameterFieldPrefab;
    [SerializeField] private TMP_Text previewText;

    private List<ParameterField> _parameterFields = new();
    private TemplateNodeData _templateData;

    public override void Initialize(NodeData data, NodeViewModel viewModel)
    {
        base.Initialize(data, viewModel);
        _templateData = data as TemplateNodeData;
        ParseAndDisplayParameters();
    }

    private void ParseAndDisplayParameters()
    {
        // Clear existing fields
        foreach (var field in _parameterFields)
            Destroy(field.gameObject);
        _parameterFields.Clear();

        // Parse {{param}} patterns
        var parameters = TemplateParser.ExtractParameters(_templateData.template);

        foreach (var param in parameters)
        {
            var field = Instantiate(parameterFieldPrefab, parameterContainer);
            field.Initialize(param, _templateData.templateValues.GetValueOrDefault(param, ""));
            field.OnValueChanged += (value) => OnParameterChanged(param, value);
            _parameterFields.Add(field);
        }

        UpdatePreview();
    }

    private void OnParameterChanged(string param, string value)
    {
        _templateData.templateValues[param] = value;
        UpdatePreview();
    }

    private void UpdatePreview()
    {
        previewText.text = TemplateParser.GeneratePrompt(
            _templateData.template,
            _templateData.templateValues
        );
    }
}

// TemplateParser.cs
public static class TemplateParser
{
    private static readonly Regex ParamRegex = new(@"\{\{(\w+)\}\}", RegexOptions.Compiled);

    public static List<string> ExtractParameters(string template)
    {
        var parameters = new List<string>();
        var matches = ParamRegex.Matches(template);

        foreach (Match match in matches)
        {
            var param = match.Groups[1].Value;
            if (!parameters.Contains(param))
                parameters.Add(param);
        }

        return parameters;
    }

    public static string GeneratePrompt(string template, Dictionary<string, string> values)
    {
        return ParamRegex.Replace(template, match =>
        {
            var param = match.Groups[1].Value;
            return values.TryGetValue(param, out var value) && !string.IsNullOrEmpty(value)
                ? value
                : param; // Return param name without braces if no value
        });
    }
}
```

---

## Edge/Connection System

### Edge Rendering with Line Renderer

```csharp
// EdgeView.cs
public class EdgeView : MonoBehaviour
{
    [SerializeField] private LineRenderer lineRenderer;
    [SerializeField] private GameObject activeIndicator;
    [SerializeField] private Button toggleButton;
    [SerializeField] private Button deleteButton;

    private EdgeData _data;
    private NodeView _sourceNode;
    private NodeView _targetNode;

    private const int CURVE_SEGMENTS = 30;

    public void Initialize(EdgeData data, NodeView source, NodeView target)
    {
        _data = data;
        _sourceNode = source;
        _targetNode = target;

        UpdateVisuals();
        UpdatePath();
    }

    private void Update()
    {
        // Update path if nodes moved
        if (_sourceNode != null && _targetNode != null)
        {
            UpdatePath();
        }
    }

    private void UpdatePath()
    {
        Vector2 sourcePos = _sourceNode.OutputHandlePosition;
        Vector2 targetPos = _targetNode.InputHandlePosition;

        var points = CalculateSmartPath(sourcePos, targetPos);
        lineRenderer.positionCount = points.Length;
        lineRenderer.SetPositions(points.Select(p => (Vector3)p).ToArray());
    }

    private Vector3[] CalculateSmartPath(Vector2 source, Vector2 target)
    {
        var points = new List<Vector3>();

        float deltaY = target.y - source.y;
        bool isBackward = deltaY < 0;

        if (isBackward)
        {
            // Route around the side for backward connections
            return CalculateBackwardPath(source, target);
        }
        else
        {
            // Standard bezier curve
            return CalculateBezierPath(source, target);
        }
    }

    private Vector3[] CalculateBezierPath(Vector2 start, Vector2 end)
    {
        var points = new Vector3[CURVE_SEGMENTS];
        float distance = Vector2.Distance(start, end);
        float curvature = Mathf.Min(distance * 0.25f, 60f);

        Vector2 control1 = start + Vector2.down * curvature;
        Vector2 control2 = end + Vector2.up * curvature;

        for (int i = 0; i < CURVE_SEGMENTS; i++)
        {
            float t = i / (float)(CURVE_SEGMENTS - 1);
            points[i] = CalculateBezierPoint(t, start, control1, control2, end);
        }

        return points;
    }

    private Vector3 CalculateBezierPoint(float t, Vector2 p0, Vector2 p1, Vector2 p2, Vector2 p3)
    {
        float u = 1 - t;
        float tt = t * t;
        float uu = u * u;
        float uuu = uu * u;
        float ttt = tt * t;

        Vector2 point = uuu * p0;
        point += 3 * uu * t * p1;
        point += 3 * u * tt * p2;
        point += ttt * p3;

        return point;
    }

    private void UpdateVisuals()
    {
        var color = NodeColorPalette.Instance.GetAccentColor(_data.color);

        if (_data.isActive)
        {
            lineRenderer.startColor = color;
            lineRenderer.endColor = color;
            lineRenderer.widthMultiplier = 3f;
            // Solid line
            lineRenderer.material.SetFloat("_DashSize", 0);
        }
        else
        {
            var grayColor = new Color(0.3f, 0.3f, 0.35f, 0.5f);
            lineRenderer.startColor = grayColor;
            lineRenderer.endColor = grayColor;
            lineRenderer.widthMultiplier = 2f;
            // Dashed line
            lineRenderer.material.SetFloat("_DashSize", 0.1f);
        }

        activeIndicator.SetActive(_data.isActive);
    }

    public void ToggleActive()
    {
        // Deactivate siblings, activate this one
        CanvasEvents.OnEdgeActiveToggled?.Invoke(_data.id, true);
    }
}
```

### Edge Manager with Branching Logic

```csharp
// EdgeManager.cs
public class EdgeManager : MonoBehaviour
{
    [SerializeField] private EdgeView edgePrefab;
    [SerializeField] private Transform edgeContainer;

    private Dictionary<string, EdgeView> _edgeViews = new();
    private NodeManager _nodeManager;
    private SheetData _currentSheet;

    public void Initialize(NodeManager nodeManager)
    {
        _nodeManager = nodeManager;
        CanvasEvents.OnEdgeActiveToggled += HandleEdgeActiveToggled;
    }

    public void CreateEdge(string sourceId, string targetId)
    {
        var sourceNode = _nodeManager.GetNodeView(sourceId);
        var targetNode = _nodeManager.GetNodeView(targetId);

        if (sourceNode == null || targetNode == null) return;

        var data = new EdgeData
        {
            id = $"edge-{System.DateTime.Now.Ticks}",
            sourceNodeId = sourceId,
            targetNodeId = targetId,
            color = sourceNode.Data.color,
            isActive = true
        };

        _currentSheet.edges.Add(data);

        var view = Instantiate(edgePrefab, edgeContainer);
        view.Initialize(data, sourceNode, targetNode);
        _edgeViews[data.id] = view;

        CanvasEvents.OnEdgeCreated?.Invoke(data);
    }

    private void HandleEdgeActiveToggled(string edgeId, bool makeActive)
    {
        var edge = _currentSheet.edges.Find(e => e.id == edgeId);
        if (edge == null) return;

        // Deactivate all edges to the same target
        var siblingsToSameTarget = _currentSheet.edges
            .Where(e => e.targetNodeId == edge.targetNodeId)
            .ToList();

        foreach (var sibling in siblingsToSameTarget)
        {
            sibling.isActive = (sibling.id == edgeId);
            if (_edgeViews.TryGetValue(sibling.id, out var view))
            {
                view.UpdateVisuals();
            }
        }
    }

    public List<NodeData> GetActivePathNodes()
    {
        var activeEdges = _currentSheet.edges.Where(e => e.isActive).ToList();

        // Build adjacency from active edges
        var adjacency = new Dictionary<string, List<string>>();
        var hasIncoming = new HashSet<string>();

        foreach (var edge in activeEdges)
        {
            if (!adjacency.ContainsKey(edge.sourceNodeId))
                adjacency[edge.sourceNodeId] = new List<string>();
            adjacency[edge.sourceNodeId].Add(edge.targetNodeId);
            hasIncoming.Add(edge.targetNodeId);
        }

        // Find roots
        var roots = _currentSheet.nodes
            .Where(n => n.type != NodeData.NodeType.Group)
            .Where(n => !hasIncoming.Contains(n.id))
            .Where(n => adjacency.ContainsKey(n.id))
            .ToList();

        // BFS traversal
        var result = new List<NodeData>();
        var visited = new HashSet<string>();
        var queue = new Queue<string>(roots.Select(r => r.id));

        while (queue.Count > 0)
        {
            var nodeId = queue.Dequeue();
            if (visited.Contains(nodeId)) continue;
            visited.Add(nodeId);

            var node = _currentSheet.nodes.Find(n => n.id == nodeId);
            if (node != null && node.type != NodeData.NodeType.Group)
            {
                result.Add(node);
            }

            if (adjacency.TryGetValue(nodeId, out var targets))
            {
                foreach (var target in targets)
                {
                    if (!visited.Contains(target))
                        queue.Enqueue(target);
                }
            }
        }

        return result;
    }
}
```

---

## Feature Parity Checklist

### Core Features

| Feature              | React Implementation  | Unity Implementation            | Priority |
| -------------------- | --------------------- | ------------------------------- | -------- |
| Create prompt node   | `addNode("prompt")`   | `NodeManager.CreateNode()`      | P0       |
| Create template node | `addNode("template")` | `NodeManager.CreateNode()`      | P0       |
| Create group node    | `addNode("group")`    | `NodeManager.CreateNode()`      | P1       |
| Delete node          | `deleteNode(id)`      | `NodeManager.DeleteNode()`      | P0       |
| Duplicate node       | `duplicateNode(id)`   | `NodeManager.DuplicateNode()`   | P0       |
| Move node (drag)     | `onNodeDragStop`      | `IDragHandler`                  | P0       |
| Resize node          | `NodeResizer`         | `ResizeHandle` component        | P1       |
| Collapse/expand      | `toggleNodeExpand`    | `NodeView.SetExpanded()`        | P0       |
| Node color           | `data.color`          | `NodeColorPalette`              | P0       |
| Connect nodes        | `onConnect`           | `EdgeManager.CreateEdge()`      | P0       |
| Delete edge          | `handleDelete`        | `EdgeManager.DeleteEdge()`      | P0       |
| Active/inactive edge | `edge.data.active`    | `EdgeData.isActive`             | P1       |
| Smart edge routing   | `getSmartPath()`      | `EdgeView.CalculateSmartPath()` | P1       |

### Template Features

| Feature                | React                 | Unity                                | Priority |
| ---------------------- | --------------------- | ------------------------------------ | -------- |
| Parse `{{param}}`      | `extractParams()`     | `TemplateParser.ExtractParameters()` | P0       |
| Parameter inputs       | Input fields in node  | `ParameterField` components          | P0       |
| Live preview           | `generatePrompt()`    | `TemplateParser.GeneratePrompt()`    | P0       |
| Template builder modal | `TemplateBuilder.jsx` | `TemplateBuilderWindow`              | P1       |
| Preset templates       | `PRESET_TEMPLATES`    | `PresetTemplates` ScriptableObject   | P2       |

### Sheet Management

| Feature         | React             | Unity                        | Priority |
| --------------- | ----------------- | ---------------------------- | -------- |
| Multiple sheets | `sheets` state    | `List<SheetData>`            | P0       |
| Switch sheets   | `switchSheet()`   | `SheetManager.SwitchSheet()` | P0       |
| Add sheet       | `addSheet()`      | `SheetManager.AddSheet()`    | P0       |
| Delete sheet    | `deleteSheet()`   | `SheetManager.DeleteSheet()` | P1       |
| Rename sheet    | `renameSheet()`   | `SheetManager.RenameSheet()` | P1       |
| Sheet tabs UI   | Tab bar component | `SheetTabsView`              | P0       |

### Canvas Operations

| Feature             | React                 | Unity                                 | Priority |
| ------------------- | --------------------- | ------------------------------------- | -------- |
| Auto-layout         | `toggleAllExpanded()` | `LayoutManager.AutoLayout()`          | P1       |
| Expand/collapse all | `toggleAllExpanded()` | `LayoutManager.ExpandCollapseAll()`   | P1       |
| Copy path           | `copyAllConnected()`  | `ClipboardManager.CopyPath()`         | P0       |
| Export JSON         | `exportCanvas()`      | `PersistenceManager.ExportToFile()`   | P1       |
| Import JSON         | `importCanvas()`      | `PersistenceManager.ImportFromFile()` | P1       |
| Clear canvas        | `clearCanvas()`       | `SheetManager.ClearCurrentSheet()`    | P1       |
| Context menu        | Right-click menu      | `ContextMenuView`                     | P1       |
| Fit view            | `fitView()`           | Camera positioning                    | P2       |

### UI Components

| Feature         | React               | Unity              | Priority |
| --------------- | ------------------- | ------------------ | -------- |
| Toolbar         | Top buttons         | `ToolbarView`      | P0       |
| Sidebar editor  | `Sidebar.jsx`       | `SidebarView`      | P1       |
| Minimap         | `MiniMap`           | Custom minimap     | P2       |
| Grid background | `Background`        | Grid shader/sprite | P2       |
| Zoom/pan        | React Flow built-in | Camera controls    | P0       |

---

## Development Phases

### Phase 1: Foundation (2-3 weeks)

**Goals:** Basic node creation and manipulation

- [ ] Project setup with folder structure
- [ ] Data models and serialization
- [ ] Basic NodeView with drag support
- [ ] Basic EdgeView with line renderer
- [ ] NodeManager and EdgeManager
- [ ] Simple persistence (PlayerPrefs)
- [ ] Single sheet functionality

**Deliverable:** Can create, move, connect, and delete nodes

### Phase 2: Core Features (2-3 weeks)

**Goals:** Feature parity for essential functionality

- [ ] All three node types (Prompt, Template, Group)
- [ ] Template parameter system
- [ ] Node resize functionality
- [ ] Collapse/expand nodes
- [ ] Color system with palette
- [ ] Copy Path functionality
- [ ] Smart edge routing

**Deliverable:** Fully functional single-sheet prompt builder

### Phase 3: Multi-Sheet & Polish (1-2 weeks)

**Goals:** Complete feature parity

- [ ] Multi-sheet management
- [ ] Sheet tabs UI
- [ ] Active/inactive edge branching
- [ ] Auto-layout system
- [ ] Expand/collapse all
- [ ] Export/Import JSON files
- [ ] Context menus

**Deliverable:** Complete feature parity with React version

### Phase 4: Unity Enhancements (Optional, 2+ weeks)

**Goals:** Leverage Unity capabilities

- [ ] 3D node visualization option
- [ ] VR/AR support
- [ ] Undo/redo system
- [ ] Multi-select with box selection
- [ ] Copy/paste nodes
- [ ] Keyboard shortcuts
- [ ] Themes/skins
- [ ] Plugin system for custom nodes

---

## Third-Party Options

### Node Graph Libraries

| Library                    | Pros                             | Cons                            | Recommendation        |
| -------------------------- | -------------------------------- | ------------------------------- | --------------------- |
| **xNode**                  | Simple, lightweight, open source | Limited styling, editor-focused | Good for prototyping  |
| **NodeCanvas**             | Full-featured, visual scripting  | Expensive ($95), overkill       | Not recommended       |
| **GraphView (UI Toolkit)** | Built into Unity, modern         | Editor-only, complex            | For editor tools only |
| **Custom Implementation**  | Full control, exact features     | More development time           | **Recommended**       |

### UI Libraries

| Library                   | Use Case                               |
| ------------------------- | -------------------------------------- |
| **DOTween**               | Smooth animations for node transitions |
| **TextMeshPro**           | Rich text rendering (included)         |
| **Unity Vector Graphics** | SVG icons and scalable graphics        |

---

## Performance Considerations

### Optimization Strategies

```csharp
// Object pooling for nodes
public class NodePool : MonoBehaviour
{
    private Queue<NodeView> _pool = new();

    public NodeView Get(NodeData.NodeType type)
    {
        if (_pool.Count > 0)
        {
            var node = _pool.Dequeue();
            node.gameObject.SetActive(true);
            return node;
        }
        return Instantiate(GetPrefab(type));
    }

    public void Return(NodeView node)
    {
        node.gameObject.SetActive(false);
        _pool.Enqueue(node);
    }
}

// Culling off-screen nodes
public class ViewportCuller : MonoBehaviour
{
    private Camera _camera;
    private List<NodeView> _allNodes;

    private void Update()
    {
        var viewportBounds = GetViewportBounds();
        foreach (var node in _allNodes)
        {
            bool isVisible = viewportBounds.Intersects(node.Bounds);
            node.SetRenderingEnabled(isVisible);
        }
    }
}

// Batch edge updates
public class EdgeBatcher : MonoBehaviour
{
    private bool _needsUpdate;
    private List<EdgeView> _dirtyEdges = new();

    public void MarkDirty(EdgeView edge)
    {
        if (!_dirtyEdges.Contains(edge))
            _dirtyEdges.Add(edge);
        _needsUpdate = true;
    }

    private void LateUpdate()
    {
        if (_needsUpdate)
        {
            foreach (var edge in _dirtyEdges)
                edge.UpdatePath();
            _dirtyEdges.Clear();
            _needsUpdate = false;
        }
    }
}
```

### Memory Management

- Use object pooling for frequently created/destroyed objects
- Implement LOD for complex nodes at distance
- Lazy load node content when expanded
- Compress serialized data for large canvases
- Use sprite atlases for UI icons

### Target Performance

| Metric                | Target                |
| --------------------- | --------------------- |
| Nodes on screen       | 100+ at 60fps         |
| Total nodes per sheet | 500+                  |
| Edge updates          | Batched, max 30/frame |
| Save/load time        | < 500ms for 500 nodes |
| Memory per node       | < 50KB                |

---

## Future Enhancements

### Unity-Exclusive Features

1. **3D Canvas Mode**
   - Nodes as 3D cards in space
   - Z-depth for visual hierarchy
   - Orbital camera navigation

2. **VR Prompt Building**
   - Hand tracking for node manipulation
   - Spatial arrangement of prompt chains
   - Voice input for content

3. **AR Overlay**
   - Project canvas onto physical surfaces
   - Collaborative editing in shared space

4. **AI Integration**
   - Direct API calls to LLMs
   - Live prompt testing
   - Suggestion system for parameters

5. **Advanced Collaboration**
   - Real-time multiplayer editing
   - Version control integration
   - Comments and annotations

6. **Extended Node Types**
   - Image prompt nodes with preview
   - API endpoint nodes
   - Conditional logic nodes
   - Variable/reference nodes

---

## Appendix: Code Snippets

### Color Palette ScriptableObject

```csharp
[CreateAssetMenu(fileName = "NodeColorPalette", menuName = "PromptCanvas/Color Palette")]
public class NodeColorPalette : ScriptableObject
{
    public static NodeColorPalette Instance { get; private set; }

    [System.Serializable]
    public class ColorScheme
    {
        public NodeColor colorType;
        public Color backgroundColor;
        public Color borderColor;
        public Color accentColor;
        public Color textColor;
    }

    public List<ColorScheme> schemes;

    private void OnEnable()
    {
        Instance = this;
    }

    public ColorScheme GetScheme(NodeColor color)
    {
        return schemes.Find(s => s.colorType == color) ?? schemes[0];
    }

    public Color GetAccentColor(NodeColor color)
    {
        return GetScheme(color).accentColor;
    }
}
```

### Input Handling

```csharp
public class CanvasInputHandler : MonoBehaviour
{
    [SerializeField] private Camera canvasCamera;
    [SerializeField] private float zoomSpeed = 0.1f;
    [SerializeField] private float panSpeed = 1f;

    private Vector3 _lastMousePosition;
    private bool _isPanning;

    private void Update()
    {
        HandleZoom();
        HandlePan();
        HandleContextMenu();
    }

    private void HandleZoom()
    {
        float scroll = Input.mouseScrollDelta.y;
        if (Mathf.Abs(scroll) > 0.01f)
        {
            float newSize = canvasCamera.orthographicSize - scroll * zoomSpeed;
            canvasCamera.orthographicSize = Mathf.Clamp(newSize, 2f, 50f);
        }
    }

    private void HandlePan()
    {
        if (Input.GetMouseButtonDown(2) || (Input.GetMouseButtonDown(0) && Input.GetKey(KeyCode.Space)))
        {
            _isPanning = true;
            _lastMousePosition = Input.mousePosition;
        }

        if (Input.GetMouseButtonUp(2) || Input.GetMouseButtonUp(0))
        {
            _isPanning = false;
        }

        if (_isPanning)
        {
            Vector3 delta = Input.mousePosition - _lastMousePosition;
            canvasCamera.transform.position -= delta * panSpeed * Time.deltaTime;
            _lastMousePosition = Input.mousePosition;
        }
    }

    private void HandleContextMenu()
    {
        if (Input.GetMouseButtonDown(1))
        {
            Vector2 worldPos = canvasCamera.ScreenToWorldPoint(Input.mousePosition);
            CanvasEvents.OnContextMenuRequested?.Invoke(worldPos, Input.mousePosition);
        }
    }
}
```

---

## Conclusion

This port guide provides a comprehensive roadmap for recreating Prompt Canvas in Unity. The recommended approach is:

1. **Start with custom implementation** rather than third-party node libraries for maximum control
2. **Use uGUI for 2D** (simpler) or **UI Toolkit for modern approach** (steeper learning curve)
3. **Follow MVVM pattern** for clean separation of concerns
4. **Implement in phases** starting with core functionality
5. **Leverage Unity's strengths** for future 3D/VR enhancements

The estimated total development time for full feature parity is **5-8 weeks** for an experienced Unity developer, with additional time for Unity-exclusive enhancements.
