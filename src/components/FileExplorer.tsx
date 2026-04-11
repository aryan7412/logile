"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { FixedSizeList as List } from "react-window";
import { TreeNode, ExpandState } from "@/types";
import { FlatNode } from "@/types";
import {
  buildTree, flattenVisible, search, removeNode, renameNode,
  moveNode, getAllFolderIds, formatDate, formatBytes,
} from "@/lib/tree";
import TreeNodeRow from "./TreeNodeRow";

const ROW_HEIGHT = 26;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface Props {
  onSelectNode?: (node: TreeNode | null) => void;
}

export default function FileExplorer({ onSelectNode }: Props) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const nodeMapRef = useRef<Map<string, TreeNode>>(new Map());
  const parentMapRef = useRef<Map<string, string | null>>(new Map());

  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadPhase, setLoadPhase] = useState("INIT");
  const [totalNodes, setTotalNodes] = useState(0);

  const [expandState, setExpandState] = useState<ExpandState>({});
  const [preFilterExpand, setPreFilterExpand] = useState<ExpandState | null>(null);

  const [inputValue, setInputValue] = useState("");
  const filterQuery = useDebounce(inputValue, 200);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);

  const [bootLines, setBootLines] = useState<string[]>([]);
  const [bootDone, setBootDone] = useState(false);

  // Boot sequence
  useEffect(() => {
    const lines = [
      "Windows File System Explorer",
      "Initializing kernel modules...",
      "Loading NTFS driver...",
      "Mounting filesystem...",
      "Ready.",
    ];
    let i = 0;
    const iv = setInterval(() => {
      if (i < lines.length) setBootLines((p) => [...p, lines[i++]]);
      else { clearInterval(iv); setTimeout(() => setBootDone(true), 200); }
    }, 90);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!bootDone) return;
    setLoadPhase("Fetching data..."); setLoadProgress(5);
    fetch("/datasheet.json")
      .then((r) => r.json())
      .then((flat: FlatNode[]) => {
        setTotalNodes(flat.length);
        setLoadPhase("Parsing nodes..."); setLoadProgress(35);
        setTimeout(() => {
          setLoadPhase("Building index..."); setLoadProgress(60);
          setTimeout(() => {
            const { roots, nodeMap, parentMap } = buildTree(flat);
            nodeMapRef.current = nodeMap;
            parentMapRef.current = parentMap;
            setLoadPhase("Mounting filesystem..."); setLoadProgress(90);
            setTimeout(() => {
              setTree(roots);
              setLoadProgress(100);
              setTimeout(() => setLoading(false), 200);
            }, 80);
          }, 50);
        }, 50);
      });
  }, [bootDone]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const { matchedIds, visibleIds } = useMemo(() => {
    if (!filterQuery) return { matchedIds: new Set<string>(), visibleIds: new Set<string>() };
    return search(nodeMapRef.current, parentMapRef.current, filterQuery);
  }, [filterQuery]);

  const effectiveExpand = useMemo((): ExpandState => {
    if (!filterQuery) return expandState;
    return expandState;
  }, [filterQuery, expandState]);

  const visibleRows = useMemo(
    () => flattenVisible(tree, effectiveExpand, filterQuery ? visibleIds : undefined),
    [tree, effectiveExpand, filterQuery, visibleIds]
  );

  const handleInputChange = useCallback((q: string) => {
    if (q && !inputValue) setPreFilterExpand({ ...expandState });
    if (!q && preFilterExpand !== null) {
      setExpandState(preFilterExpand);
      setPreFilterExpand(null);
    }
    setInputValue(q);
  }, [inputValue, expandState, preFilterExpand]);

  const handleToggle = useCallback((id: string) => {
    setExpandState((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleExpandAll = useCallback(() => {
    const ids = getAllFolderIds(tree);
    const s: ExpandState = {};
    for (const id of ids) s[id] = true;
    setExpandState(s);
  }, [tree]);

  const handleCollapseAll = useCallback(() => setExpandState({}), []);

  const handleRename = useCallback((id: string, newName: string) => {
    setTree((prev) => renameNode(prev, id, newName));
    const node = nodeMapRef.current.get(id);
    if (node) nodeMapRef.current.set(id, { ...node, name: newName });
  }, []);

  const handleDelete = useCallback((id: string) => {
    setTree((prev) => {
      const { tree: next, removed } = removeNode(prev, id);
      setTotalNodes((n) => n - removed);
      return next;
    });
    if (selectedId === id) {
      setSelectedId(null);
      onSelectNode?.(null);
    }
    const queue = [id];
    while (queue.length) {
      const cur = queue.shift()!;
      const node = nodeMapRef.current.get(cur);
      if (node) {
        for (const child of node.children) queue.push(child.id);
        nodeMapRef.current.delete(cur);
        parentMapRef.current.delete(cur);
      }
    }
  }, [selectedId, onSelectNode]);

  const handleDragStart = useCallback((id: string) => setDraggingId(id), []);

  const handleDrop = useCallback((targetId: string) => {
    if (!draggingId) return;
    setTree((prev) => {
      const result = moveNode(prev, draggingId, targetId);
      if (!result) { alert("Cannot move a folder into itself or a descendant."); return prev; }
      parentMapRef.current.set(draggingId, targetId);
      return result;
    });
    setDraggingId(null);
  }, [draggingId]);

  useEffect(() => {
    const h = () => setDraggingId(null);
    document.addEventListener("dragend", h);
    return () => document.removeEventListener("dragend", h);
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    const node = nodeMapRef.current.get(id) ?? null;
    onSelectNode?.(node);
  }, [onSelectNode]);

  const selectedNode = useMemo(
    () => selectedId ? nodeMapRef.current.get(selectedId) ?? null : null,
    [selectedId, tree]
  );

  // ── Boot screen ───────────────────────────────────────────────────────────
  if (!bootDone) {
    return (
      <div style={{
        height: "100%", padding: "20px 16px", display: "flex", flexDirection: "column", gap: "6px",
        background: "#000818", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px",
      }}>
        <div style={{ color: "#4a9fdd", marginBottom: "8px", fontSize: "13px", letterSpacing: "0.06em" }}>
          FS-EXPLORER
        </div>
        {bootLines.map((line, i) => (
          <div key={i} className="fade-in" style={{ color: i === bootLines.length - 1 ? "#79c8ff" : "#4a6888", animationDelay: `${i * 0.05}s`, opacity: 0 }}>
            {line}
          </div>
        ))}
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(2px)}to{opacity:1;transform:none}}`}</style>
      </div>
    );
  }

  if (loading) {
    const filled = Math.round(loadProgress * 0.38);
    const bar = "█".repeat(filled) + "░".repeat(38 - filled);
    return (
      <div style={{
        height: "100%", padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px",
        background: "#000818", fontFamily: "'Share Tech Mono', monospace", fontSize: "12px",
      }}>
        <div style={{ color: "#4a9fdd", fontSize: "14px", letterSpacing: "0.08em" }}>Loading Filesystem</div>
        <div style={{ color: "#4a6888" }}>{loadPhase}</div>
        {/* Win7-style progress bar */}
        <div style={{
          height: "20px",
          background: "rgba(0,0,0,0.5)",
          border: "1px solid rgba(80,120,180,0.4)",
          borderRadius: "3px",
          overflow: "hidden",
          position: "relative",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            width: `${loadProgress}%`,
            background: "linear-gradient(180deg, #5ab0f0 0%, #2a70c0 45%, #1a50a0 50%, #3a80d0 100%)",
            transition: "width 0.2s ease",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "11px", color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.8)",
          }}>
            {loadProgress}%
          </div>
        </div>
        {totalNodes > 0 && (
          <div style={{ color: "#2a4a68", fontSize: "11px" }}>
            {totalNodes.toLocaleString()} nodes detected
          </div>
        )}
      </div>
    );
  }

  const matchCount = matchedIds.size;
  const btnStyle: React.CSSProperties = {
    background: "linear-gradient(180deg, rgba(60,90,150,0.5) 0%, rgba(30,50,100,0.5) 100%)",
    border: "1px solid rgba(80,120,180,0.4)",
    borderRadius: "3px",
    color: "rgba(180,210,255,0.8)",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "11px",
    padding: "3px 10px",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
    transition: "all 0.12s",
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "#080d1e", color: "#c8d8f0",
      fontFamily: "'Segoe UI', Tahoma, sans-serif", fontSize: "12px",
    }}>

      {/* Search bar */}
      <div style={{ flexShrink: 0, padding: "6px 8px", borderBottom: "1px solid rgba(80,120,180,0.25)", background: "rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "rgba(100,140,200,0.6)", flexShrink: 0 }}>🔍</span>
          <input
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search files and folders..."
            style={{
              flex: 1,
              background: "rgba(0,10,30,0.6)",
              border: "1px solid rgba(80,120,180,0.4)",
              borderRadius: "3px",
              color: "#c8d8f0",
              fontFamily: "inherit",
              fontSize: "12px",
              padding: "4px 8px",
              outline: "none",
              boxShadow: inputValue ? "0 0 0 2px rgba(74,159,221,0.25), inset 0 1px 3px rgba(0,0,0,0.4)" : "inset 0 1px 3px rgba(0,0,0,0.4)",
              transition: "box-shadow 0.15s",
            }}
          />
          {inputValue && (
            <button onClick={() => handleInputChange("")} style={{ ...btnStyle, padding: "3px 8px", fontSize: "10px" }}>✕</button>
          )}
        </div>
        {filterQuery && (
          <div style={{ marginTop: "4px", fontSize: "10px", color: matchCount > 0 ? "#4a9fdd" : "#e05040", paddingLeft: "4px" }}>
            {matchCount > 0 ? `${matchCount.toLocaleString()} results` : "No results found"}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div style={{ flexShrink: 0, padding: "4px 8px", borderBottom: "1px solid rgba(80,120,180,0.2)", display: "flex", gap: "4px", alignItems: "center", background: "rgba(0,0,0,0.15)" }}>
        <button onClick={handleExpandAll} style={btnStyle}
          onMouseEnter={e => { e.currentTarget.style.background = "linear-gradient(180deg, rgba(80,120,200,0.6) 0%, rgba(50,80,160,0.6) 100%)"; e.currentTarget.style.borderColor = "rgba(120,170,255,0.6)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(180deg, rgba(60,90,150,0.5) 0%, rgba(30,50,100,0.5) 100%)"; e.currentTarget.style.borderColor = "rgba(80,120,180,0.4)"; }}
        >▸ Expand All</button>
        <button onClick={handleCollapseAll} style={btnStyle}
          onMouseEnter={e => { e.currentTarget.style.background = "linear-gradient(180deg, rgba(80,120,200,0.6) 0%, rgba(50,80,160,0.6) 100%)"; e.currentTarget.style.borderColor = "rgba(120,170,255,0.6)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(180deg, rgba(60,90,150,0.5) 0%, rgba(30,50,100,0.5) 100%)"; e.currentTarget.style.borderColor = "rgba(80,120,180,0.4)"; }}
        >▾ Collapse</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: "10px", color: "rgba(100,140,200,0.5)", fontFamily: "'Share Tech Mono', monospace" }}>
          {visibleRows.length.toLocaleString()}/{totalNodes.toLocaleString()}
        </span>
        {draggingId && <span style={{ color: "#f0c040", fontSize: "10px" }}>Moving...</span>}
      </div>

      {/* Column headers */}
      <div style={{
        flexShrink: 0, padding: "3px 8px", borderBottom: "1px solid rgba(80,120,180,0.2)",
        background: "rgba(0,0,0,0.25)", color: "rgba(100,140,200,0.5)", fontSize: "10px",
        display: "flex", letterSpacing: "0.06em", textTransform: "uppercase",
      }}>
        <span style={{ flex: 1 }}>Name</span>
        <span style={{ minWidth: "50px", textAlign: "right", marginRight: "4px" }}>Size</span>
      </div>

      {/* Virtual tree */}
      <div ref={containerRef} style={{ flex: 1, overflow: "hidden" }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); setDraggingId(null); }}
      >
        {visibleRows.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(80,120,180,0.4)", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "28px", opacity: 0.4 }}>📂</div>
            <div style={{ fontSize: "12px" }}>{filterQuery ? "No matches found" : "Empty filesystem"}</div>
          </div>
        ) : (
          <List height={containerHeight} itemCount={visibleRows.length} itemSize={ROW_HEIGHT} width="100%">
            {({ index, style }) => (
              <TreeNodeRow
                node={visibleRows[index]}
                style={style}
                expandState={effectiveExpand}
                filterQuery={filterQuery}
                matchedIds={matchedIds}
                onToggle={handleToggle}
                onRename={handleRename}
                onDelete={handleDelete}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                draggingId={draggingId}
                selectedId={selectedId}
                onSelect={handleSelect}
              />
            )}
          </List>
        )}
      </div>

      {/* Status bar */}
      <div style={{
        flexShrink: 0, borderTop: "1px solid rgba(80,120,180,0.2)",
        background: "rgba(0,0,0,0.35)", padding: "3px 8px", fontSize: "10px",
        color: "rgba(100,140,200,0.5)", display: "flex", gap: "12px", alignItems: "center",
      }}>
        <span style={{ color: "#f0c040" }}>📁</span><span>Folder</span>
        <span style={{ color: "#a8c8f0" }}>📄</span><span>File</span>
        {selectedNode && (
          <span style={{ marginLeft: "auto", color: "rgba(140,180,240,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "140px" }}>
            {selectedNode.name}
          </span>
        )}
      </div>
    </div>
  );
}
