"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { TreeNode as TNode } from "@/types";
import { formatBytes } from "@/lib/tree";

interface TreeNodeProps {
  node: TNode;
  style: React.CSSProperties;
  expandState: Record<string, boolean>;
  filterQuery: string;
  matchedIds: Set<string>;
  onToggle: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
  onDrop: (targetId: string) => void;
  draggingId: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ background: "rgba(74,159,221,0.35)", color: "#79c8ff", borderRadius: "2px", padding: "0 1px" }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}

function getFileIcon(name: string, type: "file" | "folder", isExpanded: boolean): { icon: string; color: string } {
  if (type === "folder") return { icon: isExpanded ? "📂" : "📁", color: "#f0c040" };
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, { icon: string; color: string }> = {
    ts:   { icon: "🔷", color: "#5a9fd4" },
    tsx:  { icon: "🔷", color: "#5a9fd4" },
    js:   { icon: "🟡", color: "#c8b030" },
    jsx:  { icon: "🟡", color: "#c8b030" },
    css:  { icon: "🎨", color: "#d070a0" },
    json: { icon: "📋", color: "#60b060" },
    md:   { icon: "📝", color: "#9080c0" },
    sh:   { icon: "⚙️", color: "#d08040" },
    svg:  { icon: "🖼", color: "#40b0a0" },
    png:  { icon: "🖼", color: "#d06060" },
    jpg:  { icon: "🖼", color: "#d06060" },
    jpeg: { icon: "🖼", color: "#d06060" },
    gif:  { icon: "🖼", color: "#d06060" },
    pdf:  { icon: "📄", color: "#e07050" },
    xlsx: { icon: "📊", color: "#40a860" },
    csv:  { icon: "📊", color: "#50b870" },
    py:   { icon: "🐍", color: "#4080c0" },
    rs:   { icon: "🦀", color: "#c05030" },
    go:   { icon: "🐹", color: "#40a0c0" },
    txt:  { icon: "📃", color: "#a8c840" },
    log:  { icon: "📜", color: "#7a6018" },
    zip:  { icon: "🗜", color: "#a060c0" },
  };
  return map[ext] ?? { icon: "📄", color: "#a8c8f0" };
}

export default function TreeNodeRow({
  node, style, expandState, filterQuery, matchedIds,
  onToggle, onRename, onDelete, onDragStart, onDrop,
  draggingId, selectedId, onSelect,
}: TreeNodeProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.name);
  const [isDragOver, setIsDragOver] = useState(false);
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isExpanded = expandState[node.id] ?? false;
  const isMatched = matchedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const isDragging = draggingId === node.id;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) setEditValue(node.name);
  }, [node.name, editing]);

  const commitRename = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== node.name) onRename(node.id, trimmed);
    else setEditValue(node.name);
    setEditing(false);
  }, [editValue, node.id, node.name, onRename]);

  const indent = node.depth * 16;
  const { icon, color: iconColor } = getFileIcon(node.name, node.type, isExpanded);

  // Win7 Aero selection/hover backgrounds
  let bg = "transparent";
  let borderLeft = "2px solid transparent";
  if (isDragOver) {
    bg = "rgba(74,159,221,0.22)";
    borderLeft = "2px solid rgba(74,159,221,0.8)";
  } else if (isSelected) {
    bg = "linear-gradient(90deg, rgba(74,159,221,0.22) 0%, rgba(74,159,221,0.1) 100%)";
    borderLeft = "2px solid rgba(74,159,221,0.85)";
  } else if (isMatched && filterQuery) {
    bg = "rgba(74,159,221,0.08)";
  } else if (hovered) {
    bg = "rgba(255,255,255,0.04)";
  }

  return (
    <div
      style={{
        ...style,
        opacity: isDragging ? 0.35 : 1,
        background: bg,
        borderLeft,
        cursor: "pointer",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        paddingLeft: `${indent + 6}px`,
        paddingRight: "6px",
        gap: "5px",
        fontFamily: "'Segoe UI', Tahoma, sans-serif",
        fontSize: "12px",
        boxSizing: "border-box",
        transition: "background 0.1s",
      }}
      onClick={() => { onSelect(node.id); if (node.type === "folder") onToggle(node.id); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      draggable
      onDragStart={(e) => { e.stopPropagation(); onDragStart(node.id); }}
      onDragOver={(e) => {
        if (node.type === "folder" && draggingId !== node.id) {
          e.preventDefault(); e.stopPropagation(); setIsDragOver(true);
        }
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault(); e.stopPropagation();
        setIsDragOver(false);
        if (node.type === "folder") onDrop(node.id);
      }}
    >
      {/* Expand chevron */}
      <span style={{ color: "rgba(100,140,200,0.4)", flexShrink: 0, width: "12px", fontSize: "9px", textAlign: "center" }}>
        {node.type === "folder" ? (isExpanded ? "▼" : "▶") : ""}
      </span>

      {/* Icon */}
      <span style={{ fontSize: "13px", flexShrink: 0, lineHeight: 1 }}>{icon}</span>

      {/* Name */}
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitRename(); }
              if (e.key === "Escape") { setEditValue(node.name); setEditing(false); }
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#000a20",
              border: "1px solid rgba(74,159,221,0.8)",
              borderRadius: "2px",
              color: "#79c8ff",
              fontFamily: "inherit",
              fontSize: "inherit",
              padding: "0 4px",
              outline: "none",
              width: "100%",
              boxSizing: "border-box",
              boxShadow: "0 0 0 2px rgba(74,159,221,0.2)",
            }}
          />
        ) : (
          <span
            style={{
              color: node.isOrphan ? "#e05040" : isSelected ? "#c8e8ff" : node.type === "folder" ? "#e8d090" : "#b8ccec",
              fontWeight: node.type === "folder" ? 500 : 400,
            }}
            title={node.name}
          >
            {highlightMatch(node.name, filterQuery)}
          </span>
        )}
      </span>

      {/* Badges */}
      <span style={{ flexShrink: 0, display: "flex", gap: "4px", alignItems: "center" }}>
        {node.isOrphan && (
          <span style={{
            color: "#e05040", fontSize: "9px",
            border: "1px solid rgba(224,80,64,0.5)",
            borderRadius: "2px",
            padding: "0 3px", letterSpacing: "0.04em",
            background: "rgba(224,80,64,0.1)",
          }}>⚠</span>
        )}
        {node.type === "file" && node.size !== undefined && (
          <span style={{
            color: "rgba(100,140,200,0.45)",
            fontSize: "10px",
            minWidth: "42px",
            textAlign: "right",
            fontFamily: "'Share Tech Mono', monospace",
          }}>
            {formatBytes(node.size)}
          </span>
        )}
      </span>

      {/* Hover actions */}
      {hovered && !editing && (
        <span style={{ flexShrink: 0, display: "flex", gap: "2px" }} onClick={(e) => e.stopPropagation()}>
          <button
            title="Rename"
            onClick={() => { setEditValue(node.name); setEditing(true); }}
            style={{
              background: "rgba(60,90,160,0.4)",
              border: "1px solid rgba(80,120,200,0.4)",
              borderRadius: "2px",
              color: "rgba(160,200,255,0.7)",
              cursor: "pointer",
              fontSize: "10px",
              padding: "1px 5px",
              transition: "all 0.1s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#79c8ff"; e.currentTarget.style.borderColor = "rgba(74,159,221,0.7)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(160,200,255,0.7)"; e.currentTarget.style.borderColor = "rgba(80,120,200,0.4)"; }}
          >✎</button>
          <button
            title="Delete"
            onClick={() => {
              if (window.confirm(`Delete "${node.name}"${node.type === "folder" ? " and all its contents" : ""}?`))
                onDelete(node.id);
            }}
            style={{
              background: "rgba(160,40,30,0.3)",
              border: "1px solid rgba(200,60,50,0.4)",
              borderRadius: "2px",
              color: "rgba(220,120,100,0.7)",
              cursor: "pointer",
              fontSize: "10px",
              padding: "1px 5px",
              transition: "all 0.1s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#ff7060"; e.currentTarget.style.borderColor = "rgba(224,80,64,0.8)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(220,120,100,0.7)"; e.currentTarget.style.borderColor = "rgba(200,60,50,0.4)"; }}
          >✕</button>
        </span>
      )}
    </div>
  );
}
