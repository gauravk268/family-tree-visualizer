import { FAMILY_RELATIONS, SOCIAL_RELATIONS } from "../data/sampleData.js";

/**
 * Parse CSV text into an array of objects using header row as keys.
 * Handles quoted fields and trims whitespace.
 */
export function parseCSVText(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const headers = splitCSVLine(lines[0]).map((h) => h.trim().replace(/^["']|["']$/g, ""));
  return lines.slice(1).map((line) => {
    const vals = splitCSVLine(line).map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = vals[i] || "";
    });
    return obj;
  });
}

function splitCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * Auto-detect whether parsed CSV data is entities or relationships.
 * Returns "entities" | "relationships" | "unknown"
 */
export function detectCSVType(headers) {
  const h = new Set(headers.map((k) => k.toLowerCase().trim()));
  if (h.has("source_id") && h.has("target_id")) return "relationships";
  if (h.has("id") && h.has("name")) return "entities";
  return "unknown";
}

/**
 * Read a File object and return parsed CSV data + detected type.
 */
export function readCSVFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const data = parseCSVText(text);
        if (data.length === 0) {
          resolve({ data: [], type: "unknown", filename: file.name });
          return;
        }
        const headers = Object.keys(data[0]);
        const type = detectCSVType(headers);
        resolve({ data, type, filename: file.name });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Filter relationships by category: "all" | "family" | "social"
 */
export function filterRelationships(relationships, filterMode) {
  if (filterMode === "all") return relationships;
  return relationships.filter((r) => {
    const rel = (r.relation || "").toUpperCase();
    if (filterMode === "family") return FAMILY_RELATIONS.has(rel);
    if (filterMode === "social") return SOCIAL_RELATIONS.has(rel);
    return true;
  });
}

/**
 * Find spouse pairs from relationships.
 * Returns a Map<entityId, spouseEntityId>
 */
export function findSpousePairs(relationships) {
  const spouseMap = new Map();
  for (const r of relationships) {
    const rel = (r.relation || "").toUpperCase();
    if (rel === "SPOUSE" || rel === "PARTNER") {
      // Only pair if neither is already paired (first spouse wins)
      if (!spouseMap.has(r.source_id) && !spouseMap.has(r.target_id)) {
        spouseMap.set(r.source_id, r.target_id);
        spouseMap.set(r.target_id, r.source_id);
      }
    }
  }
  return spouseMap;
}

/**
 * Build a hierarchical tree from entities and relationships, rooted at `rootId`.
 * Uses PARENT relationships to build parent→child links.
 * Spouse pairs are grouped together as compound nodes.
 */
export function buildFamilyTree(entities, relationships, rootId, spouseMap, stopAtIds = new Set()) {
  const entityMap = new Map(entities.map((e) => [String(e.id), e]));

  // Build parent→children adjacency from PARENT relations
  // source_id is parent, target_id is child
  const childrenOf = new Map();
  for (const r of relationships) {
    const rel = (r.relation || "").toUpperCase();
    if (rel === "PARENT") {
      const parentId = String(r.source_id);
      const childId = String(r.target_id);
      if (!childrenOf.has(parentId)) childrenOf.set(parentId, new Set());
      childrenOf.get(parentId).add(childId);
    }
  }

  // BFS from root to build tree (avoiding duplicate children)
  const visited = new Set();
  const processedChildren = new Set();

  function buildNode(id) {
    const sIdStr = String(id);
    if (visited.has(sIdStr)) return null;
    if (stopAtIds && stopAtIds.has(sIdStr)) return null;
    visited.add(sIdStr);

    const entity = entityMap.get(sIdStr);
    if (!entity) return null;

    const spouseId = spouseMap.get(sIdStr);
    let spouseEntity = null;
    if (spouseId && entityMap.has(spouseId) && !visited.has(spouseId) && (!stopAtIds || !stopAtIds.has(String(spouseId)))) {
      visited.add(String(spouseId));
      spouseEntity = entityMap.get(spouseId);
    }

    // Merge children from both partners
    const myChildren = childrenOf.get(sIdStr) || new Set();
    const spouseChildren = spouseId ? (childrenOf.get(spouseId) || new Set()) : new Set();
    const allChildIds = new Set([...myChildren, ...spouseChildren]);

    const childNodes = [];
    for (const childId of allChildIds) {
      const childStr = String(childId);
      if (!processedChildren.has(childStr) && (!stopAtIds || !stopAtIds.has(childStr))) {
        processedChildren.add(childStr);
        const childNode = buildNode(childStr);
        if (childNode) childNodes.push(childNode);
      }
    }

    // Sort children for consistent layout
    childNodes.sort((a, b) => {
      const nameA = a.entity?.name || "";
      const nameB = b.entity?.name || "";
      return nameA.localeCompare(nameB);
    });

    return {
      id: sIdStr,
      entity,
      spouse: spouseEntity,
      children: childNodes,
    };
  }

  return buildNode(String(rootId));
}

/**
 * Build forest of all family trees across all entities, ensuring NO entity or relationship is missed.
 * Finds roots of all disconnected component trees and singletons.
 */
export function buildAllForestTrees(entities, relationships, spouseMap) {
  const entityMap = new Map(entities.map((e) => [String(e.id), e]));

  // Build parent-child mapping
  const childrenOf = new Map();
  const parentsOf = new Map();

  for (const r of relationships) {
    const rel = (r.relation || "").toUpperCase();
    if (rel === "PARENT") {
      const p = String(r.source_id);
      const c = String(r.target_id);
      if (!childrenOf.has(p)) childrenOf.set(p, new Set());
      if (!parentsOf.has(c)) parentsOf.set(c, new Set());
      childrenOf.get(p).add(c);
      parentsOf.get(c).add(p);
    }
  }

  // Find candidate roots: people who have NO parents in the dataset
  const candidateRoots = [];
  const processed = new Set();

  for (const e of entities) {
    const eid = String(e.id);
    const hasParents = parentsOf.has(eid) && parentsOf.get(eid).size > 0;
    if (!hasParents) {
      // Check if spouse was already picked as root
      const sId = spouseMap.get(eid);
      if (!processed.has(eid) && (!sId || !processed.has(sId))) {
        candidateRoots.push(eid);
        processed.add(eid);
        if (sId) processed.add(sId);
      }
    }
  }

  // Any remaining entities not covered by candidate roots
  for (const e of entities) {
    const eid = String(e.id);
    const sId = spouseMap.get(eid);
    if (!processed.has(eid) && (!sId || !processed.has(sId))) {
      candidateRoots.push(eid);
      processed.add(eid);
      if (sId) processed.add(sId);
    }
  }

  // Build tree for each candidate root
  const allTrees = [];
  const globalVisited = new Set();

  for (const rId of candidateRoots) {
    if (globalVisited.has(rId)) continue;
    const t = buildFamilyTree(entities, relationships, rId, spouseMap);
    if (t) {
      allTrees.push(t);
      // Mark all nodes in this tree as visited
      const mark = (n) => {
        if (!n) return;
        globalVisited.add(String(n.id));
        if (n.spouse) globalVisited.add(String(n.spouse.id));
        if (n.children) n.children.forEach(mark);
      };
      mark(t);
    }
  }

  return allTrees;
}

/**
 * For a given tree, detect all spouses in pills whose parents are defined in relationships.csv
 * but not present in the primary tree.
 * Returns array of { tree: inLawRootTree, childId: spouseId }
 */
export function findInLawAncestorTrees(primaryTree, entities, relationships, spouseMap) {
  if (!primaryTree) return [];

  const renderedInPrimary = new Set();
  const spousePillIds = new Map(); // spouseId -> spouseEntity

  function collect(node) {
    if (!node) return;
    renderedInPrimary.add(String(node.id));
    if (node.spouse) {
      renderedInPrimary.add(String(node.spouse.id));
      spousePillIds.set(String(node.spouse.id), node.spouse);
    }
    if (node.children) node.children.forEach(collect);
  }
  collect(primaryTree);

  // Parents map
  const parentsOf = new Map();
  for (const r of relationships) {
    const rel = (r.relation || "").toUpperCase();
    if (rel === "PARENT") {
      const p = String(r.source_id);
      const c = String(r.target_id);
      if (!parentsOf.has(c)) parentsOf.set(c, new Set());
      parentsOf.get(c).add(p);
    }
  }

  const inLawTrees = [];
  const handledSpouseIds = new Set();

  for (const [spouseId] of spousePillIds.entries()) {
    if (handledSpouseIds.has(spouseId)) continue;
    const parents = parentsOf.get(spouseId);
    if (!parents || parents.size === 0) continue;

    // Check if any parent is NOT in the primary tree
    let unrenderedParentId = null;
    for (const pId of parents) {
      if (!renderedInPrimary.has(pId)) {
        unrenderedParentId = pId;
        break;
      }
    }

    if (unrenderedParentId) {
      handledSpouseIds.add(spouseId);
      // Find the apex ancestor of this parent
      let current = unrenderedParentId;
      const seen = new Set([current]);
      while (parentsOf.has(current) && parentsOf.get(current).size > 0) {
        const nextP = Array.from(parentsOf.get(current))[0];
        if (seen.has(nextP)) break;
        seen.add(nextP);
        current = nextP;
      }

      // If this apex has a spouse, pick the primary spouse ID if married
      const sId = spouseMap.get(current);
      const rootId = (sId && Number(sId) < Number(current)) ? sId : current;

      // Pass renderedInPrimary as stopAtIds so the in-law tree stops before duplicating the spouse or children
      const inLawTree = buildFamilyTree(entities, relationships, rootId, spouseMap, renderedInPrimary);
      if (inLawTree) {
        inLawTrees.push({
          tree: inLawTree,
          childId: spouseId,
        });
      }
    }
  }

  return inLawTrees;
}

/**
 * BFS shortest path between two nodes (undirected graph).
 * Returns an array of { id, relation } where relation is the edge label
 * used to reach that node (null for the source node).
 * Returns null if no path exists.
 */
export function findPath(relationships, sourceId, targetId) {
  const adj = new Map();
  for (const r of relationships) {
    const s = String(r.source_id);
    const t = String(r.target_id);
    if (!adj.has(s)) adj.set(s, []);
    if (!adj.has(t)) adj.set(t, []);
    adj.get(s).push({ neighbor: t, relation: r.relation });
    adj.get(t).push({ neighbor: s, relation: r.relation });
  }

  const src = String(sourceId);
  const tgt = String(targetId);
  if (src === tgt) return [{ id: src, relation: null }];

  // Each queue entry: array of { id, relation }
  const queue = [[{ id: src, relation: null }]];
  const visited = new Set([src]);

  while (queue.length > 0) {
    const path = queue.shift();
    const curr = path[path.length - 1].id;

    for (const { neighbor, relation } of adj.get(curr) || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        const newPath = [...path, { id: neighbor, relation }];
        if (neighbor === tgt) return newPath;
        queue.push(newPath);
      }
    }
  }
  return null;
}

/**
 * Generate Hierarchical CSV where entities are shifted to the right based on seniority (generation depth).
 * Generation 0 is senior-most (root), and subsequent generations are indented by prepending empty columns.
 */
export function exportHierarchyCSV(tree) {
  if (!tree) return "";

  // 1. Traverse tree and gather records with their generation level (seniority depth)
  const rows = [];
  let maxGeneration = 0;

  function traverse(node, generation) {
    if (!node) return;
    if (generation > maxGeneration) {
      maxGeneration = generation;
    }

    // Add main entity
    rows.push({
      generation,
      role: generation === 0 ? "Root" : "Descendant",
      entity: node.entity,
    });

    // Add spouse if present
    if (node.spouse) {
      rows.push({
        generation,
        role: "Spouse",
        entity: node.spouse,
      });
    }

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        traverse(child, generation + 1);
      }
    }
  }

  traverse(tree, 0);

  // 2. Build headers with indent columns based on maxGeneration
  // Headers: Gen_0_Indent, Gen_1_Indent, ..., Generation, Role, ID, Name, Gender, Occupation, City, Contact
  const indentHeaders = [];
  for (let i = 0; i <= maxGeneration; i++) {
    indentHeaders.push(`Level_${i}`);
  }

  const baseHeaders = ["Generation", "Role", "ID", "Name", "Gender", "Occupation", "City", "Contact"];
  const allHeaders = [...indentHeaders, ...baseHeaders];

  const csvLines = [];
  csvLines.push(allHeaders.map((h) => `"${h}"`).join(","));

  // 3. Populate rows: place name in the indentation column corresponding to its generation
  for (const r of rows) {
    const e = r.entity || {};
    const indentCells = [];
    for (let i = 0; i <= maxGeneration; i++) {
      if (i === r.generation) {
        indentCells.push(`"${(e.name || "").replace(/"/g, '""')}"`);
      } else {
        indentCells.push('""');
      }
    }

    const dataCells = [
      `"Gen ${r.generation}"`,
      `"${r.role}"`,
      `"${e.id || ""}"`,
      `"${(e.name || "").replace(/"/g, '""')}"`,
      `"${e.gender || ""}"`,
      `"${(e.occupation || "").replace(/"/g, '""')}"`,
      `"${(e.city || "").replace(/"/g, '""')}"`,
      `"${e.contact_number || ""}"`,
    ];

    csvLines.push([...indentCells, ...dataCells].join(","));
  }

  return csvLines.join("\n");
}
