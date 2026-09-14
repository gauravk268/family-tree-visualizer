import { useRef, useEffect, useCallback, useState } from "react";
import * as d3 from "d3";
import { RELATION_COLORS } from "../data/sampleData";

/**
 * TreeCanvas - SVG-based family tree renderer with D3 zoom/pan.
 * Renders spouse pairs as gender-colored "pill" capsules.
 * All parent→child links are orthogonal (straight lines with 90° turns).
 * Spouse-lineage links route to the spouse (right) side of pills.
 */
export default function TreeCanvas({
  layout,
  socialEdges,
  spouseLineageLinks,
  entities,
  selectedId,
  rootId,
  onSelectNode,
  lineagePath,
}) {
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const zoomRef = useRef(null);
  const [initialFitted, setInitialFitted] = useState(false);
  const prevLayoutRef = useRef(null);
  const prevRootIdRef = useRef(rootId);

  // Initialize D3 zoom
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zoom = d3.zoom()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    return () => {
      svg.on(".zoom", null);
    };
  }, []);

  // Fit view when layout changes or smooth focus shift when rootId changes
  useEffect(() => {
    if (!svgRef.current || !zoomRef.current || !layout || layout.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const svgEl = svgRef.current;
    const w = svgEl.clientWidth;
    const h = svgEl.clientHeight;

    // Check if root entity focus shifted
    if (rootId && prevRootIdRef.current !== rootId) {
      prevRootIdRef.current = rootId;
      const targetNode = layout.nodes.find(
        (n) => n.id === String(rootId) || (n.spouse && String(n.spouse.id) === String(rootId))
      );

      if (targetNode) {
        const focusX = targetNode.centerX;
        const focusY = targetNode.centerY;
        const targetScale = 0.95;
        const tx = w / 2 - focusX * targetScale;
        const ty = h / 2 - focusY * targetScale;
        const transform = d3.zoomIdentity.translate(tx, ty).scale(targetScale);
        svg.transition().duration(800).ease(d3.easeCubicOut).call(zoomRef.current.transform, transform);
        return;
      }
    }
    prevRootIdRef.current = rootId;

    const layoutKey = layout.nodes.map(n => n.id).join(",") + "|" + layout.nodes.length;
    if (prevLayoutRef.current === layoutKey && initialFitted) return;
    prevLayoutRef.current = layoutKey;

    const padding = 80;
    const scaleX = (w - padding * 2) / layout.width;
    const scaleY = (h - padding * 2) / layout.height;
    const scale = Math.min(scaleX, scaleY, 1.0);

    const tx = (w - layout.width * scale) / 2;
    const ty = (h - layout.height * scale) / 2;

    const transform = d3.zoomIdentity.translate(tx, ty).scale(scale);
    svg.transition().duration(600).call(zoomRef.current.transform, transform);
    setInitialFitted(true);
  }, [layout, initialFitted, rootId]);

  const handleZoomIn = useCallback(() => {
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(zoomRef.current.scaleBy, 1.3);
  }, []);

  const handleZoomOut = useCallback(() => {
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(zoomRef.current.scaleBy, 0.7);
  }, []);

  const handleResetView = useCallback(() => {
    if (!svgRef.current || !zoomRef.current || !layout) return;
    setInitialFitted(false);
    const svg = d3.select(svgRef.current);
    const svgEl = svgRef.current;
    const w = svgEl.clientWidth;
    const h = svgEl.clientHeight;
    const padding = 80;

    const scaleX = (w - padding * 2) / layout.width;
    const scaleY = (h - padding * 2) / layout.height;
    const scale = Math.min(scaleX, scaleY, 1.0);

    const tx = (w - layout.width * scale) / 2;
    const ty = (h - layout.height * scale) / 2;

    const transform = d3.zoomIdentity.translate(tx, ty).scale(scale);
    svg.transition().duration(500).call(zoomRef.current.transform, transform);
  }, [layout]);

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <svg
        id="tree-svg-canvas"
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ background: "radial-gradient(ellipse at center, #1e293b 0%, #0f172a 70%)" }}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" opacity="0.5" />
          </pattern>
          <filter id="card-shadow" x="-10%" y="-10%" width="130%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.4" />
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        <g ref={gRef}>
          {/* ── Compute lineage edges set for O(1) matching ── */}
          {(() => {
            const lineageEdgeSet = new Set();
            if (lineagePath && lineagePath.length > 1) {
              for (let idx = 0; idx < lineagePath.length - 1; idx++) {
                const u = String(lineagePath[idx].id);
                const v = String(lineagePath[idx + 1].id);
                lineageEdgeSet.add(`${u}--${v}`);
                lineageEdgeSet.add(`${v}--${u}`);
              }
            }

            const checkLineageEdge = (sId, tId) => {
              if (!sId || !tId) return false;
              return lineageEdgeSet.has(`${sId}--${tId}`);
            };

            return (
              <>
                {/* ── Tree links (parent → entity side) ── */}
                {layout?.links?.map((link, i) => {
                  const isLineage = checkLineageEdge(link.sourceId, link.targetId);
                  return (
                    <OrthogonalLink
                      key={`link-${i}`}
                      link={link}
                      stroke={isLineage ? "#eab308" : "#6366f1"}
                      isLineage={isLineage}
                    />
                  );
                })}

                {/* ── Spouse lineage / in-law links (in-law parents → spouse side) ── */}
                {spouseLineageLinks?.map((link, i) => {
                  const isLineage = checkLineageEdge(link.sourceId, link.targetId);
                  return (
                    <OrthogonalLink
                      key={`spouse-link-${i}`}
                      link={link}
                      stroke={isLineage ? "#eab308" : "#f472b6"}
                      isLineage={isLineage}
                      isDashed={true}
                    />
                  );
                })}

                {/* ── Social / non-tree edges ── */}
                {socialEdges?.map((edge, i) => {
                  const sourceNode = layout?.nodes?.find(n => n.id === String(edge.source_id) || (n.spouse && String(n.spouse.id) === String(edge.source_id)));
                  const targetNode = layout?.nodes?.find(n => n.id === String(edge.target_id) || (n.spouse && String(n.spouse.id) === String(edge.target_id)));
                  if (!sourceNode || !targetNode) return null;
                  const isLineage = checkLineageEdge(String(edge.source_id), String(edge.target_id));
                  const relColor = isLineage ? "#eab308" : (RELATION_COLORS[(edge.relation || "").toUpperCase()] || RELATION_COLORS.DEFAULT);
                  return (
                    <g key={`social-${i}`}>
                      <line
                        x1={sourceNode.centerX} y1={sourceNode.centerY}
                        x2={targetNode.centerX} y2={targetNode.centerY}
                        stroke={relColor}
                        strokeWidth={isLineage ? 3 : 1.5}
                        strokeDasharray={isLineage ? "none" : "6 4"}
                        opacity={isLineage ? 0.9 : 0.5}
                      />
                      <text
                        x={(sourceNode.centerX + targetNode.centerX) / 2}
                        y={(sourceNode.centerY + targetNode.centerY) / 2 - 6}
                        textAnchor="middle" fill={relColor} fontSize={isLineage ? "10" : "9"} fontWeight="700" opacity={isLineage ? "1" : "0.7"}
                      >
                        {edge.relation}
                      </text>
                    </g>
                  );
                })}
              </>
            );
          })()}

          {/* ── Nodes ── */}
          {(() => {
            const lineageSet = new Set(lineagePath ? lineagePath.map((p) => String(p.id)) : []);
            return layout?.nodes?.map((node) => {
              const isSelected = selectedId === node.id || (node.spouse && selectedId === String(node.spouse.id));
              const isLineage = lineageSet.has(String(node.id)) || (node.spouse && lineageSet.has(String(node.spouse.id)));
              return (
                <TreeNode
                  key={node.id}
                  node={node}
                  isSelected={isSelected}
                  isLineage={isLineage}
                  onClick={() => onSelectNode(node)}
                />
              );
            });
          })()}
        </g>
      </svg>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-10">
        <button onClick={handleZoomIn} className="w-9 h-9 bg-slate-900/90 border border-slate-700 hover:bg-slate-800 text-slate-200 rounded-lg flex items-center justify-center text-lg font-bold shadow-lg transition">+</button>
        <button onClick={handleZoomOut} className="w-9 h-9 bg-slate-900/90 border border-slate-700 hover:bg-slate-800 text-slate-200 rounded-lg flex items-center justify-center text-lg font-bold shadow-lg transition">−</button>
        <button onClick={handleResetView} className="w-9 h-9 bg-slate-900/90 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-lg flex items-center justify-center text-[10px] font-bold shadow-lg transition" title="Reset View">FIT</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════ */

/** Orthogonal link: straight down → 90° horizontal → straight down */
function OrthogonalLink({ link, stroke = "#6366f1", isLineage = false, isDashed = false }) {
  const { sourceX, sourceY, targetX, targetY } = link;
  const midY = sourceY + (targetY - sourceY) * 0.5;
  const path = `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;

  return (
    <g>
      {/* Background shadow/track */}
      <path
        d={path}
        fill="none"
        stroke={isLineage ? "#713f12" : "#334155"}
        strokeWidth={isLineage ? 4 : 2}
        opacity={isLineage ? 0.9 : 0.6}
        strokeLinejoin="round"
        strokeDasharray={isDashed && !isLineage ? "5 3" : "none"}
      />
      {/* Active colored path */}
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={isLineage ? 2.5 : 1.5}
        opacity={isLineage ? 1 : 0.65}
        strokeLinejoin="round"
        strokeDasharray={isDashed && !isLineage ? "5 3" : "none"}
      />
      {/* Arrow marker / circle at target end */}
      <circle
        cx={targetX}
        cy={targetY}
        r={isLineage ? 4 : 3}
        fill={stroke}
        opacity={isLineage ? 1 : 0.8}
      />
    </g>
  );
}

function TreeNode({ node, isSelected, isLineage, onClick }) {
  const { x, y, width, height, entity, spouse, isRoot } = node;
  if (spouse) {
    return <SpousePill x={x} y={y} width={width} height={height} entity={entity} spouse={spouse} isRoot={isRoot} isSelected={isSelected} isLineage={isLineage} onClick={onClick} />;
  }
  return <SingleCard x={x} y={y} width={width} height={height} entity={entity} isRoot={isRoot} isSelected={isSelected} isLineage={isLineage} onClick={onClick} />;
}

/* ─── Single-entity card ─── */

function SingleCard({ x, y, width, height, entity, isRoot, isSelected, isLineage, onClick }) {
  const genderColor = entity.gender === "female" ? "#ec4899" : "#6366f1";
  const borderColor = isSelected ? "#a855f7" : isLineage ? "#eab308" : isRoot ? "#f59e0b" : genderColor;
  const bgColor = isSelected ? "#2e1065" : isLineage ? "#362b08" : "#0f172a";

  return (
    <g onClick={onClick} className="cursor-pointer">
      {/* Card with full gender-colored border on all 4 sides */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={12}
        fill={bgColor}
        stroke={borderColor}
        strokeWidth={isSelected || isLineage ? 3 : 2.5}
        filter="url(#card-shadow)"
      />

      {/* Avatar */}
      <circle cx={x + 30} cy={y + height / 2 + 4} r={16} fill={`${genderColor}22`} stroke={genderColor} strokeWidth={1.5} />
      <text x={x + 30} y={y + height / 2 + 9} textAnchor="middle" fill={genderColor} fontSize="11" fontWeight="700" fontFamily="'Inter', system-ui, sans-serif">
        {entity.name?.substring(0, 2).toUpperCase() || "?"}
      </text>

      {/* Name + subtitle */}
      <text x={x + 56} y={y + height / 2 + 1} fill="#f1f5f9" fontSize="12" fontWeight="600" fontFamily="'Inter', system-ui, sans-serif">{truncate(entity.name, 14)}</text>
      <text x={x + 56} y={y + height / 2 + 16} fill="#64748b" fontSize="9" fontFamily="'Inter', system-ui, sans-serif">{truncate(entity.occupation || entity.city || `#${entity.id}`, 18)}</text>

      {/* Gender icon */}
      <text x={x + width - 18} y={y + 20} fill={genderColor} fontSize="12" textAnchor="middle" opacity={0.7}>
        {entity.gender === "female" ? "♀" : "♂"}
      </text>

      {isLineage && (
        <g>
          <circle cx={x + width - 14} cy={y + height - 14} r={4.5} fill="#eab308" />
        </g>
      )}

      {isRoot && <RootBadge cx={x + width - 25} cy={y + height - 13} />}
    </g>
  );
}

/* ─── Spouse "Pill" capsule with gender-differentiated halves ─── */

function SpousePill({ x, y, width, height, entity, spouse, isRoot, isSelected, isLineage, onClick }) {
  const halfW = width / 2;
  const entityColor = entity.gender === "female" ? "#ec4899" : "#6366f1";
  const spouseColor = spouse.gender === "female" ? "#ec4899" : "#6366f1";
  const sw = isSelected || isLineage ? 3 : 2.5;
  const entityBorder = isSelected ? "#a855f7" : isLineage ? "#eab308" : isRoot ? "#f59e0b" : entityColor;
  const spouseBorder = isSelected ? "#a855f7" : isLineage ? "#eab308" : isRoot ? "#f59e0b" : spouseColor;

  return (
    <g onClick={onClick} className="cursor-pointer">
      <defs>
        {/* Clip left half — entity's 3 sides (left + top-left + bottom-left) */}
        <clipPath id={`pill-left-${entity.id}`}>
          <rect x={x - 4} y={y - 4} width={halfW + 4} height={height + 8} />
        </clipPath>
        {/* Clip right half — spouse's 3 sides (right + top-right + bottom-right) */}
        <clipPath id={`pill-right-${entity.id}`}>
          <rect x={x + halfW} y={y - 4} width={halfW + 4} height={height + 8} />
        </clipPath>
      </defs>

      {/* Pill background */}
      <rect
        x={x} y={y} width={width} height={height} rx={height / 2}
        fill={isSelected ? "#2e1065" : isLineage ? "#2e240a" : "#0f172a"}
        filter="url(#card-shadow)"
      />

      {/* Entity gender border — left 3 sides */}
      <rect
        x={x} y={y} width={width} height={height} rx={height / 2}
        fill="none" stroke={entityBorder}
        strokeWidth={sw}
        clipPath={`url(#pill-left-${entity.id})`}
      />

      {/* Spouse gender border — right 3 sides */}
      <rect
        x={x} y={y} width={width} height={height} rx={height / 2}
        fill="none" stroke={spouseBorder}
        strokeWidth={sw}
        clipPath={`url(#pill-right-${entity.id})`}
      />

      {/* Center divider (dashed) */}
      <line x1={x + halfW} y1={y + 12} x2={x + halfW} y2={y + height - 12} stroke="#334155" strokeWidth={1} strokeDasharray="3 3" />
      {/* Heart icon */}
      <text x={x + halfW} y={y + height / 2 + 4} textAnchor="middle" fill="#ec4899" fontSize="10" opacity={0.6}>♥</text>

      {/* Left person (entity) */}
      <PersonInPill entity={entity} labelX={x + 14} cy={y + height / 2} color={entityColor} side="left" />

      {/* Right person (spouse) */}
      <PersonInPill entity={spouse} labelX={x + halfW + 14} cy={y + height / 2} color={spouseColor} side="right" />

      {isRoot && <RootBadge cx={x + width / 2} cy={y + height - 11} />}
    </g>
  );
}

function PersonInPill({ entity, cy, labelX, color, side }) {
  // Left person: gender icon at the far right of their half
  // Right person: gender icon at the far left of their half (near divider), away from the curve
  const iconX = side === "right" ? labelX + 2 : labelX + halfPillW() - 22;

  return (
    <g>
      {/* Avatar circle */}
      <circle cx={labelX + 14} cy={cy - 4} r={12} fill={`${color}18`} stroke={color} strokeWidth={1} />
      <text x={labelX + 14} y={cy} textAnchor="middle" fill={color} fontSize="9" fontWeight="700" fontFamily="'Inter', system-ui, sans-serif">
        {entity.name?.substring(0, 2).toUpperCase() || "?"}
      </text>

      {/* Name */}
      <text x={labelX + 34} y={cy - 6} fill="#f1f5f9" fontSize="10" fontWeight="600" fontFamily="'Inter', system-ui, sans-serif">{truncate(entity.name, 11)}</text>
      {/* Sub text */}
      <text x={labelX + 34} y={cy + 8} fill="#64748b" fontSize="8" fontFamily="'Inter', system-ui, sans-serif">{truncate(entity.occupation || entity.city || "", 12)}</text>

      {/* Gender icon */}
      <text x={iconX} y={cy - 18} fill={color} fontSize="10" textAnchor="middle" opacity={0.6}>
        {entity.gender === "female" ? "♀" : "♂"}
      </text>
    </g>
  );
}

function halfPillW() { return 170; } // PILL_NODE_WIDTH / 2

function RootBadge({ cx, cy }) {
  return (
    <g>
      <rect x={cx - 17} y={cy - 7} width={34} height={14} rx={7} fill="#f59e0b" opacity={0.2} />
      <text x={cx} y={cy + 3} textAnchor="middle" fill="#f59e0b" fontSize="7" fontWeight="700">ROOT</text>
    </g>
  );
}

function truncate(str, max) {
  if (!str) return "";
  return str.length > max ? str.substring(0, max - 1) + "…" : str;
}
