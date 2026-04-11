"use client";
import React, { useState, useCallback } from "react";
import FileExplorer from "@/components/FileExplorer";
import { TreeNode } from "@/types";
import { formatBytes, formatDate } from "@/lib/tree";

// ── File-type icon map ────────────────────────────────────────────────────────
function getFileIcon(name: string, type: "file" | "folder"): { icon: string; color: string; label: string } {
  if (type === "folder") return { icon: "📁", color: "#f0c040", label: "Folder" };
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, { icon: string; color: string; label: string }> = {
    ts:   { icon: "🔷", color: "#5a9fd4", label: "TypeScript" },
    tsx:  { icon: "🔷", color: "#5a9fd4", label: "TypeScript JSX" },
    js:   { icon: "🟡", color: "#c8b030", label: "JavaScript" },
    jsx:  { icon: "🟡", color: "#c8b030", label: "JavaScript JSX" },
    css:  { icon: "🎨", color: "#d070a0", label: "Stylesheet" },
    json: { icon: "📋", color: "#60b060", label: "JSON Data" },
    md:   { icon: "📝", color: "#9080c0", label: "Markdown" },
    sh:   { icon: "⚙️", color: "#d08040", label: "Shell Script" },
    svg:  { icon: "🖼", color: "#40b0a0", label: "SVG Image" },
    png:  { icon: "🖼", color: "#d06060", label: "PNG Image" },
    jpg:  { icon: "🖼", color: "#d06060", label: "JPEG Image" },
    jpeg: { icon: "🖼", color: "#d06060", label: "JPEG Image" },
    gif:  { icon: "🖼", color: "#d06060", label: "GIF Image" },
    pdf:  { icon: "📄", color: "#e07050", label: "PDF Document" },
    xlsx: { icon: "📊", color: "#40a860", label: "Excel Spreadsheet" },
    csv:  { icon: "📊", color: "#50b870", label: "CSV Data" },
    py:   { icon: "🐍", color: "#4080c0", label: "Python Source" },
    rs:   { icon: "🦀", color: "#c05030", label: "Rust Source" },
    go:   { icon: "🐹", color: "#40a0c0", label: "Go Source" },
    txt:  { icon: "📃", color: "#a8c840", label: "Text File" },
    log:  { icon: "📜", color: "#7a6018", label: "Log File" },
    zip:  { icon: "🗜", color: "#a060c0", label: "Archive" },
  };
  return map[ext] ?? { icon: "📄", color: "#a8c8f0", label: "File" };
}

// ── Detail Panel ──────────────────────────────────────────────────────────────
function DetailPanel({ node }: { node: TreeNode }) {
  const { icon, color, label } = getFileIcon(node.name, node.type);
  const ext = node.name.split(".").pop()?.toUpperCase() ?? "";
  const isFolder = node.type === "folder";

  return (
    <div className="slide-in" style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Large icon + name header */}
      <div style={{
        padding: "28px 28px 20px",
        background: "linear-gradient(180deg, rgba(74,159,221,0.08) 0%, transparent 100%)",
        borderBottom: "1px solid rgba(80,120,180,0.25)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "14px",
      }}>
        {/* Icon with glow */}
        <div style={{
          fontSize: "56px", lineHeight: 1,
          filter: `drop-shadow(0 0 16px ${color}80)`,
          animation: "pulseGlow 2.5s ease-in-out infinite",
        }}>
          {icon}
        </div>

        {/* Type badge */}
        <div style={{
          background: `linear-gradient(135deg, ${color}30, ${color}15)`,
          border: `1px solid ${color}60`,
          borderRadius: "3px",
          padding: "2px 10px",
          fontSize: "10px",
          letterSpacing: "0.12em",
          color: color,
          textTransform: "uppercase",
          fontWeight: 600,
        }}>
          {label}
        </div>

        {/* Name */}
        <div style={{
          textAlign: "center",
          fontSize: "14px",
          fontWeight: 600,
          color: "#e8eef8",
          wordBreak: "break-all",
          lineHeight: 1.4,
          maxWidth: "100%",
        }}>
          {node.name}
        </div>

        {/* Orphan warning */}
        {node.isOrphan && (
          <div style={{
            background: "rgba(224,80,64,0.15)",
            border: "1px solid rgba(224,80,64,0.5)",
            borderRadius: "3px",
            padding: "3px 10px",
            fontSize: "10px",
            color: "#e05040",
            letterSpacing: "0.08em",
          }}>
            ⚠ ORPHANED NODE — PARENT MISSING
          </div>
        )}
      </div>

      {/* Properties grid */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
        {/* Properties section */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{
            fontSize: "10px",
            letterSpacing: "0.12em",
            color: "var(--win-text-muted)",
            textTransform: "uppercase",
            marginBottom: "10px",
            paddingBottom: "6px",
            borderBottom: "1px solid rgba(80,120,180,0.2)",
          }}>
            Properties
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            {[
              { label: "Type", value: label + (isFolder ? "" : ` (.${ext})`), color: color },
              { label: "Node ID", value: node.id, mono: true },
              node.size !== undefined ? { label: "Size", value: formatBytes(node.size), highlight: true } : null,
              node.modifiedAt !== undefined ? { label: "Modified", value: formatDate(node.modifiedAt) } : null,
              { label: "Depth", value: `Level ${node.depth}${node.depth === 0 ? " (root)" : ""}` },
              { label: "Children", value: isFolder ? `${node.children.length} item${node.children.length !== 1 ? "s" : ""}` : "—" },
              { label: "Status", value: node.isOrphan ? "Orphaned" : "Active", danger: node.isOrphan },
            ].filter(Boolean).map((row: any, i) => (
              <div key={i} style={{
                display: "flex",
                padding: "7px 10px",
                borderRadius: "3px",
                background: i % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent",
                alignItems: "flex-start",
                gap: "10px",
                transition: "background 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(74,159,221,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent")}
              >
                <span style={{ fontSize: "11px", color: "var(--win-text-dim)", minWidth: "70px", flexShrink: 0 }}>
                  {row.label}
                </span>
                <span style={{
                  fontSize: "11px",
                  fontFamily: row.mono ? "'Share Tech Mono', monospace" : "inherit",
                  color: row.danger ? "#e05040" : row.highlight ? "#79c8ff" : row.color ?? "var(--win-text)",
                  wordBreak: "break-all",
                  flex: 1,
                }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Folder children preview */}
        {isFolder && node.children.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{
              fontSize: "10px",
              letterSpacing: "0.12em",
              color: "var(--win-text-muted)",
              textTransform: "uppercase",
              marginBottom: "10px",
              paddingBottom: "6px",
              borderBottom: "1px solid rgba(80,120,180,0.2)",
            }}>
              Contents ({node.children.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {node.children.slice(0, 8).map((child, i) => {
                const ci = getFileIcon(child.name, child.type);
                return (
                  <div key={child.id} className="slide-up" style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "5px 8px",
                    borderRadius: "3px",
                    background: "rgba(255,255,255,0.02)",
                    animationDelay: `${i * 0.03}s`,
                    opacity: 0,
                    animation: `slideInUp 0.2s cubic-bezier(.22,1,.36,1) ${i * 0.04}s forwards`,
                  }}>
                    <span style={{ fontSize: "14px" }}>{ci.icon}</span>
                    <span style={{ fontSize: "11px", color: ci.color, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {child.name}
                    </span>
                    {child.type === "file" && child.size !== undefined && (
                      <span style={{ fontSize: "10px", color: "var(--win-text-muted)", flexShrink: 0 }}>
                        {formatBytes(child.size)}
                      </span>
                    )}
                  </div>
                );
              })}
              {node.children.length > 8 && (
                <div style={{ padding: "4px 8px", fontSize: "11px", color: "var(--win-text-muted)", textAlign: "center" }}>
                  +{node.children.length - 8} more items...
                </div>
              )}
            </div>
          </div>
        )}

        {/* File size bar for files */}
        {!isFolder && node.size !== undefined && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{
              fontSize: "10px",
              letterSpacing: "0.12em",
              color: "var(--win-text-muted)",
              textTransform: "uppercase",
              marginBottom: "10px",
              paddingBottom: "6px",
              borderBottom: "1px solid rgba(80,120,180,0.2)",
            }}>
              Size Indicator
            </div>
            <div style={{ padding: "0 4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "11px" }}>
                <span style={{ color: "var(--win-text-dim)" }}>0 B</span>
                <span style={{ color: "#79c8ff", fontWeight: 600 }}>{formatBytes(node.size)}</span>
                <span style={{ color: "var(--win-text-dim)" }}>10 MB</span>
              </div>
              <div style={{ height: "6px", background: "rgba(0,0,0,0.4)", borderRadius: "3px", border: "1px solid rgba(80,120,180,0.2)", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(100, (node.size / 10_000_000) * 100)}%`,
                  background: `linear-gradient(90deg, ${color}80, ${color})`,
                  borderRadius: "3px",
                  boxShadow: `0 0 8px ${color}80`,
                  animation: "progressFill 0.6s cubic-bezier(.22,1,.36,1) forwards",
                }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyDetail() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "100%", gap: "16px", color: "var(--win-text-muted)",
    }}>
      <div style={{ fontSize: "52px", opacity: 0.3, filter: "grayscale(1)" }}>📂</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "13px", color: "var(--win-text-dim)", marginBottom: "6px" }}>No item selected</div>
        <div style={{ fontSize: "11px", color: "var(--win-text-muted)" }}>
          Click a file or folder in the<br />sidebar to view its details
        </div>
      </div>
      <div style={{
        marginTop: "8px",
        padding: "8px 16px",
        background: "rgba(74,159,221,0.06)",
        border: "1px solid rgba(74,159,221,0.2)",
        borderRadius: "4px",
        fontSize: "10px",
        color: "rgba(74,159,221,0.6)",
        letterSpacing: "0.06em",
      }}>
        FS-EXPLORER — FILESYSTEM BROWSER
      </div>
    </div>
  );
}

// ── Win7-style title bar dots ─────────────────────────────────────────────────
function TitleBar({ title }: { title: string }) {
  return (
    <div style={{
      flexShrink: 0,
      height: "32px",
      background: "linear-gradient(180deg, #2a3f6b 0%, #1a2a4a 45%, #0f1e3a 100%)",
      borderBottom: "1px solid rgba(80,120,180,0.5)",
      display: "flex",
      alignItems: "center",
      padding: "0 10px",
      gap: "8px",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
    }}>
      {/* Win7-style traffic dots */}
      <span style={{ width: 12, height: 12, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #ff7a7a, #c83030)", border: "1px solid rgba(0,0,0,0.3)", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
      <span style={{ width: 12, height: 12, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #ffd060, #c89010)", border: "1px solid rgba(0,0,0,0.3)", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
      <span style={{ width: 12, height: 12, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #60d860, #208830)", border: "1px solid rgba(0,0,0,0.3)", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
      <span style={{
        marginLeft: "6px",
        fontSize: "12px",
        color: "rgba(200,220,255,0.8)",
        fontWeight: 600,
        letterSpacing: "0.04em",
        textShadow: "0 1px 2px rgba(0,0,0,0.6)",
        flex: 1,
        textAlign: "center",
      }}>
        {title}
      </span>
      <span style={{ fontSize: "11px", color: "rgba(140,170,220,0.5)", fontFamily: "'Share Tech Mono', monospace" }}>
        {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  );
}

// ── Resizable Divider ─────────────────────────────────────────────────────────
const MIN_SIDEBAR = 180;
const MAX_SIDEBAR = 640;

function ResizeDivider({ onDrag }: { onDrag: (dx: number) => void }) {
  const dragging = React.useRef(false);
  const lastX = React.useRef(0);
  const [active, setActive] = React.useState(false);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    lastX.current = e.clientX;
    setActive(true);
    e.preventDefault();
  };

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastX.current;
      lastX.current = e.clientX;
      onDrag(dx);
    };
    const onUp = () => {
      dragging.current = false;
      setActive(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onDrag]);

  return (
    <div
      onMouseDown={onMouseDown}
      title="Drag to resize"
      style={{
        width: "5px",
        flexShrink: 0,
        cursor: "col-resize",
        position: "relative",
        zIndex: 10,
        background: active
          ? "rgba(74,159,221,0.5)"
          : "rgba(80,120,180,0.18)",
        transition: "background 0.15s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(74,159,221,0.35)"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "rgba(80,120,180,0.18)"; }}
    >
      {/* Grip dots */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "3px",
        pointerEvents: "none",
      }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{
            width: "3px", height: "3px", borderRadius: "50%",
            background: active ? "rgba(121,200,255,0.9)" : "rgba(100,150,220,0.4)",
            transition: "background 0.15s",
          }} />
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(340);
  const [collapsed, setCollapsed] = useState(false);
  const prevWidth = React.useRef(340);

  const handleSelect = useCallback((node: TreeNode | null) => {
    setSelectedNode(node);
  }, []);

  const handleDrag = useCallback((dx: number) => {
    setSidebarWidth(w => Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, w + dx)));
    setCollapsed(false);
  }, []);

  const toggleCollapse = useCallback(() => {
    if (collapsed) {
      setSidebarWidth(prevWidth.current);
      setCollapsed(false);
    } else {
      prevWidth.current = sidebarWidth;
      setSidebarWidth(0);
      setCollapsed(true);
    }
  }, [collapsed, sidebarWidth]);

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      overflow: "hidden",
      padding: "12px",
      gap: "10px",
    }}>
      {/* Main window frame */}
      <div style={{
        display: "flex",
        flex: 1,
        overflow: "hidden",
        borderRadius: "6px",
        border: "1px solid rgba(80,120,180,0.5)",
        boxShadow: "0 12px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)",
        background: "rgba(12,18,35,0.97)",
        position: "relative",
      }}>
        {/* Sidebar */}
        <aside style={{
          width: collapsed ? 0 : `${sidebarWidth}px`,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRight: collapsed ? "none" : "none",
          background: "rgba(10,15,30,0.95)",
          transition: collapsed ? "width 0.22s cubic-bezier(.22,1,.36,1)" : "none",
          minWidth: 0,
        }}>
          <TitleBar title="File Explorer" />
          <div style={{ flex: 1, overflow: "hidden", minWidth: `${MIN_SIDEBAR}px` }}>
            <FileExplorer onSelectNode={handleSelect} />
          </div>
        </aside>

        {/* Resize divider (hidden when collapsed) */}
        {!collapsed && <ResizeDivider onDrag={handleDrag} />}

        {/* Collapse/expand toggle tab */}
        <div
          onClick={toggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            position: "absolute",
            left: collapsed ? "0px" : `${sidebarWidth + 5}px`,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 20,
            width: "14px",
            height: "44px",
            background: "linear-gradient(180deg, rgba(60,100,180,0.7) 0%, rgba(30,60,130,0.7) 100%)",
            border: "1px solid rgba(80,130,220,0.5)",
            borderLeft: collapsed ? "1px solid rgba(80,130,220,0.5)" : "none",
            borderRadius: collapsed ? "0 4px 4px 0" : "0 4px 4px 0",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(140,190,255,0.8)",
            fontSize: "9px",
            boxShadow: "2px 0 8px rgba(0,0,0,0.4)",
            transition: "left 0.22s cubic-bezier(.22,1,.36,1), background 0.15s",
            userSelect: "none",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "linear-gradient(180deg, rgba(80,130,220,0.85) 0%, rgba(50,90,180,0.85) 100%)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(180deg, rgba(60,100,180,0.7) 0%, rgba(30,60,130,0.7) 100%)"; }}
        >
          {collapsed ? "▶" : "◀"}
        </div>

        {/* Detail panel */}
        <main style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "rgba(14,20,38,0.97)",
        }}>
          <TitleBar title={selectedNode ? selectedNode.name : "Details"} />
          <div style={{ flex: 1, overflow: "hidden" }}>
            {selectedNode ? <DetailPanel node={selectedNode} /> : <EmptyDetail />}
          </div>
        </main>
      </div>
    </div>
  );
}
