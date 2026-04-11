import { FlatNode, TreeNode } from "@/types";

export type ExpandState = Record<string, boolean>;

// ─── Build ────────────────────────────────────────────────────────────────────

export function buildTree(flat: FlatNode[]): {
  roots: TreeNode[];
  nodeMap: Map<string, TreeNode>;
  parentMap: Map<string, string | null>; // id → parentId (for fast ancestor walk)
} {
  const nodeMap = new Map<string, TreeNode>();
  const parentMap = new Map<string, string | null>();
  const allIds = new Set(flat.map((n) => n.id));

  for (const node of flat) {
    nodeMap.set(node.id, {
      ...node,
      parent_id: node.parentId ?? null,
      children: [],
      isOrphan: false,
      depth: 0,
    });
    parentMap.set(node.id, node.parentId ?? null);
  }

  const roots: TreeNode[] = [];
  const orphans: TreeNode[] = [];

  for (const node of flat) {
    const treeNode = nodeMap.get(node.id)!;
    const pid = node.parentId ?? null;
    if (pid === null) {
      roots.push(treeNode);
    } else if (allIds.has(pid)) {
      nodeMap.get(pid)!.children.push(treeNode);
    } else {
      treeNode.isOrphan = true;
      orphans.push(treeNode);
    }
  }

  function markOrphans(node: TreeNode) {
    node.isOrphan = true;
    for (const child of node.children) markOrphans(child);
  }
  for (const o of orphans) markOrphans(o);

  function assignDepth(node: TreeNode, depth: number) {
    node.depth = depth;
    for (const child of node.children) assignDepth(child, depth + 1);
  }
  for (const r of roots) assignDepth(r, 0);
  for (const o of orphans) assignDepth(o, 0);

  function sortChildren(node: TreeNode) {
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const child of node.children) sortChildren(child);
  }
  for (const r of roots) sortChildren(r);
  for (const o of orphans) sortChildren(o);

  return { roots: [...roots, ...orphans], nodeMap, parentMap };
}

// ─── Search (fast) ────────────────────────────────────────────────────────────
//
// Strategy: iterate the flat nodeMap (O(n)), find matches, then walk parent
// pointers upward (O(depth)) to collect ancestors. No recursive tree walk,
// no array allocation per node.

export function search(
  nodeMap: Map<string, TreeNode>,
  parentMap: Map<string, string | null>,
  query: string
): { matchedIds: Set<string>; visibleIds: Set<string> } {
  const q = query.toLowerCase();
  const matchedIds = new Set<string>();
  const visibleIds = new Set<string>();

  for (const [id, node] of nodeMap) {
    if (node.name.toLowerCase().includes(q)) {
      matchedIds.add(id);
      visibleIds.add(id);
      // Walk up parent chain
      let pid = parentMap.get(id) ?? null;
      while (pid !== null) {
        if (visibleIds.has(pid)) break; // already processed this ancestor chain
        visibleIds.add(pid);
        pid = parentMap.get(pid) ?? null;
      }
    }
  }

  return { matchedIds, visibleIds };
}

// ─── Flatten visible rows for virtual list ────────────────────────────────────
//
// When filtering: only include nodes whose id is in visibleIds.
// When not filtering: walk expand state normally.

export function flattenVisible(
  nodes: TreeNode[],
  expandState: ExpandState,
  visibleIds?: Set<string>
): TreeNode[] {
  const rows: TreeNode[] = [];

  function walk(node: TreeNode) {
    if (visibleIds && !visibleIds.has(node.id)) return;
    rows.push(node);
    if (node.type === "folder") {
      const expanded = visibleIds ? true : expandState[node.id];
      if (expanded) {
        for (const child of node.children) walk(child);
      }
    }
  }

  for (const node of nodes) walk(node);
  return rows;
}

// ─── Mutation helpers ─────────────────────────────────────────────────────────

export function collectDescendantIds(node: TreeNode): Set<string> {
  const ids = new Set<string>();
  function walk(n: TreeNode) {
    ids.add(n.id);
    for (const child of n.children) walk(child);
  }
  walk(node);
  return ids;
}

export function findNode(nodes: TreeNode[], id: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return null;
}

export function removeNode(nodes: TreeNode[], id: string): { tree: TreeNode[]; removed: number } {
  let removed = 0;
  function walk(ns: TreeNode[]): TreeNode[] {
    const out: TreeNode[] = [];
    for (const n of ns) {
      if (n.id === id) {
        // Count this node + all descendants
        removed = collectDescendantIds(n).size;
      } else {
        out.push({ ...n, children: walk(n.children) });
      }
    }
    return out;
  }
  return { tree: walk(nodes), removed };
}

export function renameNode(nodes: TreeNode[], id: string, newName: string): TreeNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, name: newName };
    return { ...n, children: renameNode(n.children, id, newName) };
  });
}

export function moveNode(
  nodes: TreeNode[],
  nodeId: string,
  targetId: string
): TreeNode[] | null {
  const movingNode = findNode(nodes, nodeId);
  if (!movingNode) return null;
  const descendants = collectDescendantIds(movingNode);
  if (descendants.has(targetId)) return null;

  // Remove from current position
  const { tree: withoutNode } = removeNode(nodes, nodeId);

  // Insert into target
  function insert(ns: TreeNode[]): TreeNode[] {
    return ns.map((n) => {
      if (n.id === targetId && n.type === "folder") {
        const updatedNode: TreeNode = { ...movingNode!, parent_id: targetId };
        const newChildren = [...n.children, updatedNode];
        newChildren.sort((a, b) => {
          if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        return { ...n, children: newChildren };
      }
      return { ...n, children: insert(n.children) };
    });
  }

  return insert(withoutNode);
}

export function getAllFolderIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];
  function walk(ns: TreeNode[]) {
    for (const n of ns) {
      if (n.type === "folder") { ids.push(n.id); walk(n.children); }
    }
  }
  walk(nodes);
  return ids;
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}G`;
}

export function formatDate(ms: number): string {
  const d = new Date(ms);
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const hr = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${d.getFullYear()}-${mo}-${da} ${hr}:${mi}`;
}
