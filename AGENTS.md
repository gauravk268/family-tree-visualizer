# AGENTS.md — Connection Sphere & Family Tree Visualizer

> **Purpose**: This document serves as the master project brief, technical reference, architecture guide, and continuation roadmap for AI agents and human developers working on this codebase.

---

## 1. Project Overview & Context

- **Project**: Connection Sphere & Family Tree Visualizer  
- **Root Directory**: `./`  
- **Web App Subdirectory**: `./family-tree-visualizer`  
- **Tech Stack**: React 18, Vite 6, Tailwind CSS v4, D3.js (v7), Lucide React, PapaParse  
- **Dev Server**: `http://localhost:5173/` (`npm run dev` in `family-tree-visualizer`)

### Core Features
1. **Interactive SVG Canvas**: Fluid D3 zoom/pan, smooth animated camera transitions, auto-fit, and grid backdrop.
2. **Spouse Capsule ("Pill") Grouping**: Married couples or partners are bundled into a cohesive dual-avatar horizontal pill capsule with gender-specific color theming (`#6366f1` Indigo for male, `#ec4899` Rose for female).
3. **Orthogonal Routing**: Clean 90° parent-to-child links that prevent overlapping with node cards.
4. **Isolated Root Family View vs. Full Forest ("Show All")**:
   - Selecting an individual root entity anchors the canvas exclusively to that entity's family tree.
   - Selecting `🌐 None (Show All Vertices & In-Laws)` or clicking "Show All" renders all disconnected trees and singleton individuals across the entire dataset.
5. **Bidirectional Lineage Finder**: BFS shortest-path search tracing relationship chains between any two entities with simultaneous edge and vertex glowing amber highlights (`#eab308`).
6. **Retina PNG & Seniority-Indented CSV Exports**:
   - PNG export rendered with high pixel ratio directly from SVG.
   - CSV export shifted to the right based on generational seniority (`Level_0`, `Level_1`, etc.).

---

## 2. File & Directory Layout

```
FamilyTree/
├── entities.csv                    # Root CSV: 29 real entity records
├── relationships.csv               # Root CSV: 47 relationship records
├── connection_sphere_csv_1.py      # Python CLI fallback using NetworkX
├── connection_sphere_visualizer_1.html # Legacy single-file HTML/Vis.js prototype
├── AGENTS.md                       # This file: AI agent onboarding & continuation guide
│
└── family-tree-visualizer/          # Production React application
    ├── README.md                   # Comprehensive user & developer documentation
    ├── package.json                # Dependencies & scripts
    ├── vite.config.js              # Vite + React + Tailwind v4 config
    ├── index.html                  # HTML entry point
    └── src/
        ├── main.jsx                # React DOM mount point
        ├── App.jsx                 # Master application controller, state, exports
        ├── index.css               # Tailwind directives & global resets
        ├── components/
        │   ├── TreeCanvas.jsx      # SVG engine, D3 zoom, nodes, pills, orthogonal links
        │   ├── ControlPanel.jsx    # Left sidebar: Root dropdown, filters, gap slider, lineage finder
        │   ├── DetailsSidebar.jsx  # Collapsible right drawer: Person profile, connections, metadata
        │   └── FileUploadZone.jsx  # Drag-and-drop CSV modal with auto-detection
        ├── data/
        │   └── sampleData.js       # Built-in fallback entities & relationships
        └── utils/
            ├── dataUtils.js        # CSV parser/exporter, spouse pairing, tree builders, BFS pathfinder
            └── layoutEngine.js     # Hierarchy layout calculation, collision avoidance, normalization
```

---

## 3. Data Schema & Contracts

### A. Entities (`entities.csv` & `sampleData.js`)
Header: `id,name,birth_date,gender,city,occupation,contact_number`
- `id`: String or numeric unique identifier (always cast to `String` internally).
- `name`: Full display name.
- `gender`: `"male"` | `"female"` | `""` (sets card/avatar accent colors).
- `birth_date`: Optional date string (e.g. `YYYY-MM-DD`).
- `city`: Optional location string.
- `occupation`: Optional job/profession string.
- `contact_number`: Optional phone string.
*(Note: `type` column was intentionally removed from this schema).*

### B. Relationships (`relationships.csv` & `sampleData.js`)
Header: `source_id,target_id,relation,since,company,relation_type`
- `source_id`: Source entity ID.
- `target_id`: Target entity ID.
- `relation`: `PARENT`, `SPOUSE`, `PARTNER`, `FRIEND`, `COLLEAGUE`, `SIBLING`, etc.
  - `PARENT`: `source_id` is the parent, `target_id` is the child.
  - `SPOUSE` / `PARTNER`: Couples rendered into a single combined pill capsule.
  - Social relations (`FRIEND`, `COLLEAGUE`, etc.): Rendered as dashed overlay cross-links.
- `since`: Optional start year/date.
- `company`: Optional company attribute.
- `relation_type`: Sub-classification (e.g. `biological`).
*(Note: `closeness` column was intentionally removed from this schema).*

---

## 4. Key Architectural Mechanisms

### A. Spouse Capsule ("Pill") Grouping
- In `dataUtils.js:findSpousePairs()`, bidirectional spouse pairings are computed: `spouseMap.get(id) => partnerId`.
- In `buildFamilyTree()`, when a node has a spouse, children from **both** partners are combined (`myChildren ∪ spouseChildren`).
- In `TreeCanvas.jsx:SpousePill`:
  - Capsule dimension: `340px` wide × `90px` high.
  - Dual clipping paths render the left half for `entity` and right half for `spouse`.
  - Orthogonal links targeting the child drop from the bottom-center of the parent's card/pill.

### B. View Modes & In-Law Separation
- **Root Selected View** (`rootId != ""`):
  - In `layoutEngine.js`, when a root entity is selected, **only** that primary tree hierarchy is laid out.
  - In-law ancestor trees (e.g. parents of a spouse who marry into the family) are excluded from the main canvas to maintain a clean, uncluttered visual.
- **No-Root / Show All Mode** (`rootId == ""`):
  - In `buildAllForestTrees(entities, relationships, spouseMap)`, roots of all disjoint family components are gathered.
  - Passing `globalVisited` prevents duplicate rendering of married descendants.
  - Lays out all trees horizontally with spacing `dx * 2`.

### C. Lineage Finder (BFS Shortest Path)
- In `dataUtils.js:findPath(sourceId, targetId, entities, relationships)`:
  - Builds an undirected graph considering both `PARENT` (up/down) and `SPOUSE` edges.
  - Runs BFS to find the shortest path between Person A and Person B.
  - Returns `{ found: true, path: [{ id, relation }, ...] }`.
- In `TreeCanvas.jsx`:
  - Highlights vertices in `lineagePath` with glowing golden borders (`#eab308`).
  - Highlights connecting edges (`isLineage === true`) in thick golden paths with high opacity.

### D. Export Mechanisms
- **Retina PNG Export** (`App.jsx:handleExportPNG`):
  - Clones the `<svg>` node, inlines computed styles and dimensions.
  - Draws onto an offscreen `<canvas>` at `devicePixelRatio: 2` (or 3) and triggers a PNG download.
- **Seniority Hierarchical CSV** (`dataUtils.js:exportHierarchyCSV`):
  - Traverses the tree depth-first starting from root.
  - Prefixes indentation columns `Level_0`, `Level_1`, `Level_2`, ... where the entity name is placed into the column matching their generational depth.

---

## 5. Development History & What Was Solved

1. **Initial Scaffold**: React 18 + Vite + Tailwind v4 + D3.js.
2. **Missing CSV Rows**: Fixed trailing rows in CSV files that had missing fields or unquoted values.
3. **Lineage Finder Edge Highlights**: Enhanced from vertex-only highlights to both vertex and edge glowing amber highlights.
4. **Right Panel Collapse**: Added smooth collapse toggle (`<` / `>`) for `DetailsSidebar` to maximize canvas space.
5. **In-Law Branch Spatial Layout**: Replaced rightmost-infinity placement with nearest-slot candidate detection between sibling branches.
6. **Separation of In-Laws on Root Selection**: Made root-anchored views show strictly that family tree, reserving multi-tree rendering for "Show All" mode.
7. **Schema Cleanup**: Removed deprecated `type` and `closeness` columns across all CSVs, JS scripts, and Python utilities.
8. **Privacy in Documentation**: Replaced real personal names with generic placeholder names (`Alex Smith`, `Emma Smith`, etc.) in `README.md`.

---

## 6. Commands to Run & Verify

### Start Development Server
```bash
cd ./family-tree-visualizer
npm run dev
# Running on http://localhost:5173/
```

### Production Build Verification
```bash
cd ./family-tree-visualizer
npx vite build
```

### Headless Layout Verification (ESM Script)
```bash
cd ./family-tree-visualizer
node --input-type=module -e '
import { DEFAULT_ENTITIES, DEFAULT_RELATIONSHIPS } from "./src/data/sampleData.js";
import { buildFamilyTree, findSpousePairs } from "./src/utils/dataUtils.js";
import { computeTreeLayout } from "./src/utils/layoutEngine.js";

const spouseMap = findSpousePairs(DEFAULT_RELATIONSHIPS);
const tree = buildFamilyTree(DEFAULT_ENTITIES, DEFAULT_RELATIONSHIPS, "1", spouseMap);
const layout = computeTreeLayout(tree, [], [], 50, 140, false);
console.log("Nodes:", layout.nodes.length, "Links:", layout.links.length);
'
```

---

## 7. Immediate Roadmap & Extension Opportunities

When resuming work, here are potential directions and user requests to keep in mind:

1. **Interactive In-Law Peek / Toggle**:
   - An optional toggle in the control panel or a badge on spouse pills (e.g. *"Show In-Laws (2)"*) allowing users to dynamically expand a spouse's parents on-demand within the root view without switching to full "Show All" mode.
2. **Dynamic Drag-and-Drop Node Repositioning**:
   - D3 drag behavior for individual nodes or whole subtrees to let users manually adjust subtree spacing.
3. **Advanced Filtering**:
   - Filter by generation depth (e.g. limit tree view to 2 generations).
   - Search bar in `ControlPanel` to filter and jump the camera directly to a specific person.
4. **Editable Tree & Node Creation**:
   - In-app modal or form to add a new child/spouse directly from the UI and export the updated `entities.csv` and `relationships.csv`.
5. **Mobile Responsiveness**:
   - Fine-tune sidebars to act as slide-over sheets on small screen viewports (`< 768px`).

---
*Maintained for Antigravity AI Agents & Developers. Update this file whenever core contracts or architectures evolve.*
