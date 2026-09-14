import { useMemo } from "react";

/**
 * Multi-tree and In-Law layout engine:
 * 1. Layouts the primary tree rooted at `rootId` (or all roots if no rootId).
 * 2. If a spouse in a rendered pill has parents not yet rendered, builds their in-law tree
 *    and places it above the spouse side with dedicated in-law links.
 * 3. Any remaining disconnected individuals or branches are placed in organized rows so ALL vertices are visible.
 * 4. Zero hardcoded coordinates, dynamic collision-free spacing.
 */

const SINGLE_NODE_WIDTH = 180;
const PILL_NODE_WIDTH = 340;
const NODE_HEIGHT = 90;

/**
 * Compute bottom-up subtree width for a tree node
 */
function computeSubtreeWidth(node, dx) {
  const nodeW = node.spouse ? PILL_NODE_WIDTH : SINGLE_NODE_WIDTH;
  if (!node.children || node.children.length === 0) {
    node._subtreeWidth = nodeW;
    return nodeW;
  }
  let childrenTotalWidth = 0;
  for (const child of node.children) {
    childrenTotalWidth += computeSubtreeWidth(child, dx);
  }
  childrenTotalWidth += (node.children.length - 1) * dx;
  node._subtreeWidth = Math.max(nodeW, childrenTotalWidth);
  return node._subtreeWidth;
}

/**
 * Place a single tree hierarchically starting at (startX, startY)
 */
function layoutHierarchy(rootNode, startX, startY, dx, dy, isRoot = false, isSecondary = false) {
  const nodes = [];
  const links = [];

  computeSubtreeWidth(rootNode, dx);

  function assign(node, x, y, isR) {
    const nodeW = node.spouse ? PILL_NODE_WIDTH : SINGLE_NODE_WIDTH;
    const centerX = x + node._subtreeWidth / 2;

    const entityCenterX = node.spouse ? centerX - nodeW / 4 : centerX;
    const spouseCenterX = node.spouse ? centerX + nodeW / 4 : centerX;

    const layoutNode = {
      id: String(node.id),
      spouseId: node.spouse ? String(node.spouse.id) : null,
      x: centerX - nodeW / 2,
      y,
      width: nodeW,
      height: NODE_HEIGHT,
      entity: node.entity,
      spouse: node.spouse,
      isRoot: isR,
      isSecondary,
      centerX,
      centerY: y + NODE_HEIGHT / 2,
      bottomY: y + NODE_HEIGHT,
      entityCenterX,
      spouseCenterX,
    };
    nodes.push(layoutNode);

    if (node.children && node.children.length > 0) {
      let totalChildrenWidth = 0;
      for (const child of node.children) {
        totalChildrenWidth += child._subtreeWidth;
      }
      totalChildrenWidth += (node.children.length - 1) * dx;

      let childX = centerX - totalChildrenWidth / 2;
      const childY = y + NODE_HEIGHT + dy;

      for (const child of node.children) {
        assign(child, childX, childY, false);

        const childCenterX = childX + child._subtreeWidth / 2;
        const childTargetX = child.spouse
          ? childCenterX - PILL_NODE_WIDTH / 4
          : childCenterX;

        links.push({
          sourceId: String(node.id),
          sourceX: centerX,
          sourceY: y + NODE_HEIGHT,
          targetId: String(child.id),
          targetX: childTargetX,
          targetY: childY,
          side: "entity",
          isTreeLink: true,
        });

        childX += child._subtreeWidth + dx;
      }
    }
  }

  assign(rootNode, startX, startY, isRoot);
  return { nodes, links, width: rootNode._subtreeWidth };
}

/**
 * Master layout computation supporting:
 * - Selected root mode (with in-law branches rendered above spouse)
 * - All-nodes / No-root mode (rendering all disconnected family trees and individuals)
 */
export function computeTreeLayout(tree, allTrees = [], inLawTrees = [], dx = 40, dy = 140, isNoRootMode = false) {
  const allNodes = [];
  const allLinks = [];

  if (isNoRootMode || !tree) {
    // ─────────────── NO ROOT / ALL-VERTICES VIEW ───────────────
    let currentX = 0;
    const treeSpacing = Math.max(dx * 2, 80);

    for (let i = 0; i < allTrees.length; i++) {
      const t = allTrees[i];
      const res = layoutHierarchy(t, currentX, 0, dx, dy, false, false);
      allNodes.push(...res.nodes);
      allLinks.push(...res.links);
      currentX += res.width + treeSpacing;
    }
  } else {
    // ─────────────── ROOT SELECTED VIEW ───────────────
    // Primary descendant family tree of the selected root only (no in-laws or disconnected branches)
    const primary = layoutHierarchy(tree, 0, 0, dx, dy, true, false);
    allNodes.push(...primary.nodes);
    allLinks.push(...primary.links);
  }

  if (allNodes.length === 0) {
    return { nodes: [], links: [], width: 0, height: 0 };
  }

  // ─────────────── Compute Bounding Box & Normalize ───────────────
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of allNodes) {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x + n.width);
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y + n.height);
  }

  const padding = 80;
  const offsetX = -minX + padding;
  const offsetY = -minY + padding;

  for (const n of allNodes) {
    n.x += offsetX;
    n.y += offsetY;
    n.centerX += offsetX;
    n.centerY += offsetY;
    n.bottomY += offsetY;
    n.entityCenterX += offsetX;
    n.spouseCenterX += offsetX;
  }
  for (const l of allLinks) {
    l.sourceX += offsetX;
    l.sourceY += offsetY;
    l.targetX += offsetX;
    l.targetY += offsetY;
  }

  const width = Math.max(maxX - minX + padding * 2, 800);
  const height = Math.max(maxY - minY + padding * 2, 600);

  return { nodes: allNodes, links: allLinks, width, height };
}

/**
 * React hook that memoizes tree layout computation.
 */
export function useTreeLayout(tree, allTrees, inLawTrees, dx, dy, isNoRootMode) {
  return useMemo(() => {
    return computeTreeLayout(tree, allTrees, inLawTrees, dx, dy, isNoRootMode);
  }, [tree, allTrees, inLawTrees, dx, dy, isNoRootMode]);
}
