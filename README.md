# FS-Explorer — Vintage Terminal Edition

Hierarchical filesystem explorer. Handles 1,000,000 nodes via lazy JSON
loading + virtual scrolling (react-window v1). Amber phosphor CRT aesthetic.

## Features
- All nodes from flat JSON parsed into tree via O(n) Map pass
- Virtual scrolling — only ~25 rows rendered at a time regardless of tree size
- Fast search: iterates flat nodeMap + walks parent pointers (no tree recursion)
- Debounced input (200ms) so search doesn't fire on every keystroke  
- Match highlighting with inline <span> (spec §4.5)
- Expand/Collapse All, per-folder toggle
- Filter auto-expands ancestor paths; clearing restores prior expand state
- Inline rename (Enter=commit, Escape=cancel, click-away=commit)
- Delete with confirmation (files: exact node; folders: node + all descendants)
- Drag-and-drop move (invalid moves blocked: no moving into self/descendants)
- Orphan node detection + badge
- File type sigils: [DIR] [TS ] [JS ] [CSS] [IMG] etc.
- Selected node info bar: name, size, modified date, type, orphan flag

## Setup

1. Copy your datasheet.json into public/:
   cp /path/to/datasheet.json public/datasheet.json

2. npm install

3. npm run dev

4. Open http://localhost:3000

## Notes
- Uses react-window@1.8.10 (pinned). Do NOT upgrade to v2 — it has a
  completely different API that removes FixedSizeList.
- datasheet.json must match shape: { id, parentId, name, type, size?, modifiedAt? }
