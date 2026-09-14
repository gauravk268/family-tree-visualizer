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
    // 1. Primary descendant tree
    const primary = layoutHierarchy(tree, 0, 0, dx, dy, true, false);
    allNodes.push(...primary.nodes);
    allLinks.push(...primary.links);

    // 2. In-Law Ancestor Trees (e.g. Dasai Sahu & Indrayani Kuwar for Vinay Kumar)
    if (inLawTrees && inLawTrees.length > 0) {
      const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
      for (const n of allNodes) {
        if (n.spouseId) nodeMap.set(n.spouseId, n);
      }

      for (const inLaw of inLawTrees) {
        const spousePillNode = nodeMap.get(String(inLaw.childId));
        computeSubtreeWidth(inLaw.tree, dx);
        const inLawWidth = inLaw.tree._subtreeWidth;

        let inLawX = 0;
        let inLawY = 0;

        if (spousePillNode) {
          // Desired Y is one generation tier directly above the spouse's pill
          inLawY = Math.max(0, spousePillNode.y - NODE_HEIGHT - dy);
          const idealX = spousePillNode.spouseCenterX - inLawWidth / 2;

          // Find nodes on the same Y tier (within vertical span of a node card)
          const nodesAtY = allNodes.filter((n) => Math.abs(n.y - inLawY) < NODE_HEIGHT);

          // 1. Check if ideal centered position has zero collision
          let idealCollides = false;
          for (const n of nodesAtY) {
            if (idealX < n.x + n.width + dx && idealX + inLawWidth + dx > n.x) {
              idealCollides = true;
              break;
            }
          }

          if (!idealCollides) {
            inLawX = idealX;
          } else {
            // 2. Ideal collides (e.g. spouse pill is beneath a sibling's pill).
            // Check candidate positions immediately adjacent to each node on this tier (in-between gaps).
            const candidates = [];
            for (const n of nodesAtY) {
              candidates.push(n.x + n.width + dx);
              candidates.push(n.x - inLawWidth - dx);
            }

            let bestX = null;
            let minDistance = Infinity;

            for (const candX of candidates) {
              let collides = false;
              for (const n of nodesAtY) {
                if (candX < n.x + n.width + dx && candX + inLawWidth + dx > n.x) {
                  collides = true;
                  break;
                }
              }
              if (!collides) {
                const dist = Math.abs(candX + inLawWidth / 2 - spousePillNode.spouseCenterX);
                if (dist < minDistance) {
                  minDistance = dist;
                  bestX = candX;
                }
              }
            }

            // 3. If no internal gap fits the subtree width + gap, place at the right edge
            if (bestX !== null) {
              inLawX = bestX;
            } else {
              let rightmostX = 0;
              for (const n of allNodes) {
                rightmostX = Math.max(rightmostX, n.x + n.width);
              }
              inLawX = rightmostX + Math.max(dx * 2, 100);
            }
          }
        } else {
          let rightmostX = 0;
          for (const n of allNodes) {
            rightmostX = Math.max(rightmostX, n.x + n.width);
          }
          inLawX = rightmostX + Math.max(dx * 2, 100);
          inLawY = 0;
        }

        const inLawRes = layoutHierarchy(inLaw.tree, inLawX, inLawY, dx, dy, false, true);
        allNodes.push(...inLawRes.nodes);
        allLinks.push(...inLawRes.links);
      }
    }

    // 3. Any additional disconnected family trees / remaining entities
    if (allTrees && allTrees.length > 0) {
      const renderedIdSet = new Set();
      for (const n of allNodes) {
        renderedIdSet.add(n.id);
        if (n.spouseId) renderedIdSet.add(n.spouseId);
      }

      let rightEdge = 0;
      for (const n of allNodes) {
        rightEdge = Math.max(rightEdge, n.x + n.width);
      }
      let currentX = rightEdge + Math.max(dx * 2, 100);

      for (const extraTree of allTrees) {
        if (renderedIdSet.has(String(extraTree.id))) continue;
        const res = layoutHierarchy(extraTree, currentX, 0, dx, dy, false, true);
        allNodes.push(...res.nodes);
        allLinks.push(...res.links);
        currentX += res.width + Math.max(dx * 2, 80);
      }
    }
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
