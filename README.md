# 🌳 Connection Sphere & Extended Family Tree Visualizer

An interactive, high-performance **Connection Sphere & Extended Family Tree Visualizer** built using **React 18**, **Tailwind CSS v4**, and **D3.js**. 

It dynamically maps multi-generational family trees and extended social graphs from CSV files, renders married pairs in gender-coded **Spouse Pill capsules**, traces lineages across graph hops with **edge & vertex highlighting**, and exports trees to **Seniority-Indented Hierarchical CSVs** and **High-Resolution PNGs**.

---

## 📸 Core Highlights & Features

| Feature | Description |
| :--- | :--- |
| **📁 Dual CSV Upload & Auto-Detection** | Unified drag-and-drop zone accepting both `entities.csv` and `relationships.csv` simultaneously. Inspects headers automatically to assign entities vs relationships without manual tagging. |
| **💊 3-Sided Gender-Coded Spouse Pills** | Married pairs render as a single horizontal pill capsule with a center divider line and heart icon. Male halves get blue borders (`#6366f1`) and female halves get pink borders (`#ec4899`) on their respective 3 sides. |
| **📐 Orthogonal 90° Right-Angle Connectors** | All generational hierarchy connections route with straight lines and clean 90-degree turns (no wavy overlapping curves). |
| **🧬 Dual-Lineage Spouse Tracks** | Spouses who belong to external parent branches receive dedicated lineage routes entering the spouse side of the pill. |
| **🔍 Interactive Lineage Path Finder** | Select any two entities (**Person A** and **Person B**) to compute the shortest relationship path. Highlights all participating **vertices AND edges** in glowing amber across the visual canvas with step-by-step hops breakdown and a **Reset** button. |
| **🎯 Dynamic Focal Root Selection** | Select any person in the graph to immediately re-anchor the generational hierarchy around them as the root node. |
| **↔️ Real-Time Node Gap Slider** | Interactive slider to scale horizontal vertex distance (20px to 120px) on the fly with zero overlap. |
| **🎛️ Relationship Filtering** | Toggle between **All Relations**, **Family Only** (`PARENT`, `CHILD`, `SPOUSE`, `SIBLING`), and **Social Only** (`FRIEND`, `COLLEAGUE`, `NEIGHBOR`). Dynamically recalculates layout geometry. |
| **📊 Seniority-Indented CSV Export** | Generates a structured CSV where people are shifted into indented columns (`Level_0`, `Level_1`, `Level_2`, ...) based on generational seniority from the selected root. |
| **🖼️ High-Resolution PNG Export** | One-click export that rasterizes the complete SVG tree into a high-DPI (2× retina) PNG image. |
| **📋 Collapsible Details Sidebar** | Expandable/collapsible right-side inspector displaying phone, location, occupation, gender, spouse information, and all direct connections with color-coded badges. |
| **🔎 D3 Pan & Zoom Canvas** | Infinite pan and scroll-wheel zoom with floating **+**, **−**, and **FIT** recenter controls. |
| **⚡ Built-in Out-of-the-Box Sample Data** | Ships pre-loaded with a 26-entity, 4-generation family dataset so the app works immediately upon first launch. |

---

## 🛠️ Tech Stack & Dependencies

- **Frontend Framework:** [React 18](https://react.dev/)
- **Build Tool:** [Vite 6](https://vitejs.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with `@tailwindcss/vite`
- **Visualization & Graph Engine:** [D3.js v7](https://d3js.org/) (`d3-zoom`, `d3-selection`, `d3-hierarchy`, `d3-transition`)
- **Iconography:** [Lucide React](https://lucide.dev/)
- **CSV Parsing:** [PapaParse](https://www.papaparse.com/) + Native robust RFC 4180 streaming fallback

---

## 📋 Prerequisites

Before setting up the project, make sure you have the following installed on your system:
- **Node.js**: `v18.0.0` or higher (Recommended: `v20.x` LTS)
- **npm**: `v9.0.0` or higher (or `pnpm` / `yarn`)

Verify your installation:
```bash
node -v
npm -v
```

---

## 🚀 Quick Start & Installation

### 1. Navigate to the project directory
```bash
cd family-tree-visualizer
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start the Vite development server
```bash
npm run dev
```

The app will start instantly. Open your browser and navigate to:
```
http://localhost:5173/
```

### 4. Build for production
To build optimized, production-ready static assets:
```bash
npm run build
```
The output will be created inside the `dist/` directory.

To preview the production build locally:
```bash
npm run preview
```

---

## 📂 Project Structure

```
family-tree-visualizer/
├── index.html                      # HTML entry point (Inter font & meta)
├── package.json                    # Project dependencies and npm scripts
├── vite.config.js                  # Vite configuration with React & Tailwind plugins
├── public/                         # Static public assets
└── src/
    ├── main.jsx                    # React root entry
    ├── App.jsx                     # Core application orchestrator & state manager
    ├── index.css                   # Global styles & Tailwind v4 directives
    │
    ├── components/
    │   ├── ControlPanel.jsx        # Left sidebar: Root selector, filters, gap slider, lineage finder
    │   ├── DetailsSidebar.jsx      # Collapsible right sidebar: Person profile & connections
    │   ├── FileUploadZone.jsx      # Multi-file drag-and-drop CSV importer with auto-detection
    │   └── TreeCanvas.jsx          # SVG rendering engine: Orthogonal links, pill capsules, D3 zoom
    │
    ├── data/
    │   └── sampleData.js           # Default 26-entity multi-generational fallback dataset
    │
    └── utils/
        ├── dataUtils.js            # CSV parsing, graph BFS shortest-path, hierarchical CSV exporter
        └── layoutEngine.js         # Dynamic spatial layout engine with subtree-width calculations
```

---

## 📄 CSV Data Format & Schema

You can import your own data anytime using the **"Import CSVs"** button. The application automatically detects which file is which based on the column headers.

### 1. `entities.csv`
Defines individual people in the graph.

| Column | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String / Number | **Yes** | Unique entity identifier | `1`, `p1`, `USR_101` |
| `name` | String | **Yes** | Full name | `Alex Smith` |
| `gender` | String | No | Gender (`male`, `female`, `other`) — sets node accent color | `male` |
| `occupation` | String | No | Job title / occupation | `Software Engineer` |
| `city` | String | No | Current city or location | `New York` |
| `contact_number`| String | No | Phone or contact number | `+1-555-0191` |
| `birth_date` | String | No | Date of birth (`YYYY-MM-DD`) | `1985-11-03` |

#### Sample `entities.csv`:
```csv
id,name,birth_date,gender,city,occupation,contact_number
1,Alex Smith,1955-04-12,male,New York,Engineer,+1-555-0101
2,Emma Smith,1958-08-23,female,New York,Doctor,+1-555-0102
3,Liam Smith,1985-11-03,male,Boston,Designer,+1-555-0103
4,Noah Smith,1984-02-15,male,Boston,Product Manager,+1-555-0104
5,Olivia Smith,1990-06-20,female,Chicago,Software Engineer,+1-555-0105
6,Sophia Miller,,female,Boston,Architect,+1-555-0106
```

---

### 2. `relationships.csv`
Defines connections between entities.

| Column | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `source_id` | String / Number | **Yes** | ID of the source entity | `1` |
| `target_id` | String / Number | **Yes** | ID of the target entity | `3` |
| `relation` | String | **Yes** | Relationship type | `PARENT`, `SPOUSE`, `FRIEND`, etc. |
| `since` | String / Year | No | Starting year or date | `1980` |
| `relation_type` | String | No | Additional sub-classification | `biological` |

#### Key Relationship Rules:
- **`PARENT`**: `source_id` is parent, `target_id` is child.
- **`SPOUSE`** or **`PARTNER`**: Renders `source_id` and `target_id` combined into a **single horizontal Spouse Pill capsule**.
- **`FRIEND` / `COLLEAGUE` / `SIBLING`**: Rendered as non-hierarchical dashed cross-links with relation tags.

#### Sample `relationships.csv`:
```csv
source_id,target_id,relation,since,relation_type
1,2,SPOUSE,1980,
1,3,PARENT,,biological
2,3,PARENT,,biological
1,4,PARENT,,biological
2,4,PARENT,,biological
3,6,SPOUSE,,
3,4,FRIEND,2010,
```

---

## 💡 How to Use the Application

### 1. Uploading Custom CSVs
1. Click **"Import CSVs"** in the top-left toolbar.
2. Drag & drop or browse to select **both** your `entities.csv` and `relationships.csv` files together.
3. The upload modal displays green confirmation checkmarks with record counts once auto-detection succeeds.
4. Click **"Parse & Layout Graph"** to render your dataset.

### 2. Tracing Lineage Between Two People
1. Open the **Lineage Finder** panel on the left sidebar.
2. Select **Person A** from the first dropdown.
3. Select **Person B** from the second dropdown.
4. Click **"Trace Lineage"**:
   - The shortest relationship chain displays step-by-step with arrows and relationship labels (`PARENT`, `SPOUSE`, etc.).
   - On the visual canvas, all participating cards/pills light up with **amber borders and glowing markers**.
   - All connecting path lines light up in **thick golden-amber lines**.
5. Click **"Reset"** to clear the search and return the graph to normal.

### 3. Re-Anchoring the Tree Root
- In the **Root Entity** dropdown, select any person.
- The layout engine instantly recomputes parent-child trees and positions the selected person at the apex.

### 4. Exporting Data
- **Export CSV**: Click **"Export CSV"** in the top navigation bar. It exports the tree rooted at the selected entity with generational seniority columns (`Level_0`, `Level_1`, `Level_2`, ...).
- **Save PNG**: Click **"Save PNG"** to capture the visual tree as a retina-quality image download (`family_tree_<RootName>.png`).

### 5. Inspecting Profiles
- Click any single card or either side of a spouse pill to view their full details (contact, location, occupation, and all direct connections) in the right sidebar.
- Click the collapse arrow (`>`) on the right sidebar header to minimize the panel to a sleek vertical bar when you want maximum canvas room.

---

## 🎨 Relationship Color Code Reference

| Type | Color | Hex Code | Visual Style |
| :--- | :--- | :--- | :--- |
| **Male Card / Pill Half** | Indigo / Blue | `#6366f1` | Solid border / 3-sided pill half |
| **Female Card / Pill Half** | Pink / Rose | `#ec4899` | Solid border / 3-sided pill half |
| **Parent → Child** | Rose / Crimson | `#f43f5e` | Solid 90° orthogonal connector |
| **Spouse Lineage** | Pink | `#ec4899` | Orthogonal connector to spouse half |
| **Active Lineage Path** | Amber / Gold | `#eab308` | Thick highlighted edges & glow vertices |
| **Friend** | Amber | `#f59e0b` | Dashed link with tag |
| **Colleague** | Sky Blue | `#38bdf8` | Dashed link with tag |
| **Sibling** | Emerald Green | `#34d399` | Dashed link with tag |

---

## 📜 License

MIT License — Feel free to use, modify, and extend this project for your personal and commercial needs.
