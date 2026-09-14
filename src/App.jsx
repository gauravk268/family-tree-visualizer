import { useState, useCallback, useMemo } from "react";
import { Network, X, Download, Image, FileSpreadsheet } from "lucide-react";
import ControlPanel from "./components/ControlPanel";
import DetailsSidebar from "./components/DetailsSidebar";
import TreeCanvas from "./components/TreeCanvas";
import FileUploadZone from "./components/FileUploadZone";
import { DEFAULT_ENTITIES, DEFAULT_RELATIONSHIPS } from "./data/sampleData";
import {
  filterRelationships,
  findSpousePairs,
  buildFamilyTree,
  buildAllForestTrees,
  findInLawAncestorTrees,
  findPath,
  exportHierarchyCSV,
} from "./utils/dataUtils";
import { useTreeLayout } from "./utils/layoutEngine";

export default function App() {
  // Data state
  const [entities, setEntities] = useState(DEFAULT_ENTITIES);
  const [relationships, setRelationships] = useState(DEFAULT_RELATIONSHIPS);

  // UI state: rootId can be string ID or "" (meaning Show All Vertices & In-Laws)
  const [rootId, setRootId] = useState("1");
  const [filterMode, setFilterMode] = useState("all"); // "all" | "family" | "social"
  const [nodeGap, setNodeGap] = useState(50);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Filter relationships
  const filteredRelationships = useMemo(
    () => filterRelationships(relationships, filterMode),
    [relationships, filterMode]
  );

  // Find spouse pairs (only from filtered set)
  const spouseMap = useMemo(
    () => findSpousePairs(filteredRelationships),
    [filteredRelationships]
  );

  // Primary tree from root (if rootId is set)
  const tree = useMemo(() => {
    if (!rootId) return null;
    return buildFamilyTree(entities, filteredRelationships, rootId, spouseMap);
  }, [entities, filteredRelationships, rootId, spouseMap]);

  // In-law ancestor trees (e.g. Dasai Sahu & Indrayani Kuwar for spouse Vinay Kumar)
  const inLawTrees = useMemo(() => {
    if (!tree) return [];
    return findInLawAncestorTrees(tree, entities, filteredRelationships, spouseMap);
  }, [tree, entities, filteredRelationships, spouseMap]);

  // Forest of all trees across all entities (used for No-Root mode or disconnected branches)
  const allTrees = useMemo(() => {
    return buildAllForestTrees(entities, filteredRelationships, spouseMap);
  }, [entities, filteredRelationships, spouseMap]);

  // Compute master layout with primary tree, in-law branches, and all trees
  const isNoRootMode = !rootId;
  const layout = useTreeLayout(tree, allTrees, inLawTrees, nodeGap, 140, isNoRootMode);

  // Build spouse lineage links: when a spouse embedded in a pill has parents
  // elsewhere in the tree, draw links from those parents to the spouse (right) side
  const spouseLineageLinks = useMemo(() => {
    if (!layout || layout.nodes.length === 0) return [];
    const nodeById = new Map(layout.nodes.map((n) => [n.id, n]));
    // Map spouseId → pill layout node
    const spouseToNode = new Map();
    for (const n of layout.nodes) {
      if (n.spouseId) {
        spouseToNode.set(n.spouseId, n);
      }
    }

    const result = [];
    for (const r of filteredRelationships) {
      const rel = (r.relation || "").toUpperCase();
      if (rel !== "PARENT") continue;
      const targetId = String(r.target_id);
      const sourceId = String(r.source_id);

      // Is the child a spouse inside a pill?
      if (!spouseToNode.has(targetId)) continue;
      const pillNode = spouseToNode.get(targetId);
      // Is the parent a node in the layout?
      const parentNode = nodeById.get(sourceId);
      if (!parentNode) continue;
      // Skip if the parent IS the pill itself (that parent already owns this pill)
      if (parentNode.id === pillNode.id) continue;

      result.push({
        sourceId: parentNode.id,
        targetId: targetId,
        sourceX: parentNode.centerX,
        sourceY: parentNode.bottomY,
        targetX: pillNode.spouseCenterX,
        targetY: pillNode.y,
        side: "spouse",
      });
    }
    return result;
  }, [filteredRelationships, layout]);

  // Collect social (non-tree) edges for overlay rendering
  const socialEdges = useMemo(() => {
    return filteredRelationships.filter((r) => {
      const rel = (r.relation || "").toUpperCase();
      return rel === "FRIEND" || rel === "COLLEAGUE" || rel === "NEIGHBOR" || rel === "MENTOR" || rel === "ACQUAINTANCE";
    });
  }, [filteredRelationships]);

  // Handle CSV upload
  const handleDataLoaded = useCallback((newEntities, newRelationships) => {
    // Normalize IDs to strings
    const normalizedEntities = newEntities.map((e) => ({
      ...e,
      id: String(e.id),
    }));
    const normalizedRels = newRelationships.map((r) => ({
      ...r,
      source_id: String(r.source_id),
      target_id: String(r.target_id),
    }));
    setEntities(normalizedEntities);
    setRelationships(normalizedRels);
    if (normalizedEntities.length > 0) {
      setRootId(normalizedEntities[0].id);
    }
    setSelectedNode(null);
    setShowUploadModal(false);
  }, []);

  const handleResetData = useCallback(() => {
    setEntities(DEFAULT_ENTITIES);
    setRelationships(DEFAULT_RELATIONSHIPS);
    setRootId("1");
    setFilterMode("all");
    setSelectedNode(null);
    setNodeGap(50);
  }, []);

  const handleSelectNode = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Lineage Finder state
  const [lineageSource, setLineageSource] = useState("");
  const [lineageTarget, setLineageTarget] = useState("");
  const [lineageResult, setLineageResult] = useState(null);

  const handleFindLineage = useCallback(() => {
    if (!lineageSource || !lineageTarget) return;
    const path = findPath(relationships, lineageSource, lineageTarget);
    if (path) {
      setLineageResult({ found: true, path });
    } else {
      setLineageResult({ found: false, path: [] });
    }
  }, [relationships, lineageSource, lineageTarget]);

  const handleClearLineage = useCallback(() => {
    setLineageSource("");
    setLineageTarget("");
    setLineageResult(null);
  }, []);

  // Sidebar Collapsible state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Export CSV based on current root entity
  const handleExportCSV = useCallback(() => {
    if (!tree) return;
    const csvContent = exportHierarchyCSV(tree);
    const rootName = (tree.entity?.name || `root_${rootId}`).replace(/\s+/g, "_");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `family_tree_${rootName}_hierarchical.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [tree, rootId]);

  // Export PNG based on current root entity
  const handleExportPNG = useCallback(() => {
    const svgElement = document.getElementById("tree-svg-canvas");
    if (!svgElement) return;

    const rootName = (tree?.entity?.name || `root_${rootId}`).replace(/\s+/g, "_");
    const svgBounds = svgElement.getBoundingClientRect();
    const width = svgBounds.width || 1200;
    const height = svgBounds.height || 800;

    // Clone svg to inline external styles/attributes for clean rendering
    const clonedSvg = svgElement.cloneNode(true);
    clonedSvg.setAttribute("width", width);
    clonedSvg.setAttribute("height", height);

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const URLObject = window.URL || window.webkitURL || window;
    const blobURL = URLObject.createObjectURL(svgBlob);

    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      // Use device pixel ratio for sharp export
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);

      // Background fill
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(image, 0, 0, width, height);
      URLObject.revokeObjectURL(blobURL);

      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `family_tree_${rootName}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    image.src = blobURL;
  }, [tree, rootId]);

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 px-5 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600/20 text-indigo-400 p-2 rounded-lg border border-indigo-500/30">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white leading-none tracking-tight">
              Connection Sphere
            </h1>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Family Tree & Relationship Visualizer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500 hidden sm:inline">
            Focus:{" "}
            <strong className="text-slate-300 font-semibold">
              {rootId ? (tree?.entity?.name || `#${rootId}`) : "All Vertices & Lineages"}
            </strong>
          </span>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Export Buttons */}
          <button
            onClick={handleExportCSV}
            title="Export hierarchical CSV with seniority indents"
            className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 px-2.5 py-1.5 rounded-lg border border-emerald-500/30 text-xs font-semibold transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportPNG}
            title="Export high-resolution PNG of visual tree"
            className="flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 px-2.5 py-1.5 rounded-lg border border-indigo-500/30 text-xs font-semibold transition"
          >
            <Image className="w-3.5 h-3.5 text-indigo-400" />
            <span>Save PNG</span>
          </button>

          {filterMode !== "all" && (
            <span className="bg-indigo-600/20 text-indigo-300 px-2 py-1 rounded text-[10px] font-semibold border border-indigo-500/30">
              {filterMode === "family" ? "Family Only" : "Social Only"}
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Control Panel */}
        <ControlPanel
          entities={entities}
          rootId={rootId}
          onRootChange={setRootId}
          onResetRoot={() => setRootId("")}
          filterMode={filterMode}
          onFilterChange={setFilterMode}
          nodeGap={nodeGap}
          onGapChange={setNodeGap}
          onUploadClick={() => setShowUploadModal(true)}
          onResetData={handleResetData}
          lineageSource={lineageSource}
          lineageTarget={lineageTarget}
          onSourceChange={setLineageSource}
          onTargetChange={setLineageTarget}
          onFindLineage={handleFindLineage}
          onClearLineage={handleClearLineage}
          lineageResult={lineageResult}
        />

        {/* Center Canvas */}
        <main className="flex-1 relative overflow-hidden">
          {layout && layout.nodes.length > 0 ? (
            <TreeCanvas
              layout={layout}
              socialEdges={socialEdges}
              spouseLineageLinks={spouseLineageLinks}
              entities={entities}
              selectedId={selectedNode?.id || null}
              rootId={rootId}
              onSelectNode={handleSelectNode}
              lineagePath={lineageResult?.found ? lineageResult.path : null}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <Network className="w-16 h-16 mx-auto text-slate-700" />
                <p className="text-sm text-slate-500">
                  No vertices or relations to display.
                </p>
                <p className="text-xs text-slate-600">
                  Try uploading data or resetting the filter.
                </p>
              </div>
            </div>
          )}
        </main>

        {/* Right Details Sidebar */}
        <DetailsSidebar
          entity={selectedNode?.entity || null}
          spouse={selectedNode?.spouse || null}
          relationships={relationships}
          entities={entities}
          onClose={handleCloseDetails}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        />
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                <Network className="w-5 h-5 text-indigo-400" />
                Upload Entities & Relationships
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <FileUploadZone onDataLoaded={handleDataLoaded} />

            <div className="text-center">
              <button
                onClick={() => {
                  handleResetData();
                  setShowUploadModal(false);
                }}
                className="text-xs text-slate-500 hover:text-slate-300 underline transition"
              >
                Or load built-in sample data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
