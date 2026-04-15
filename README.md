# FS-Explorer — Windows 7 Dark Edition

A hierarchical filesystem explorer built for scale. Handles 1,000,000+ nodes
via lazy JSON loading and virtual scrolling. Windows 7 Aero dark glass aesthetic
with a fully resizable sidebar and dynamic detail panel.

---

## Features

### Performance
- Flat JSON parsed into tree via a single O(n) Map pass — no recursion on load
- Virtual scrolling (react-window) — only ~25 rows rendered at any time,
  regardless of total node count
- Fast search: iterates flat nodeMap and walks parent pointers upward;
  no recursive tree traversal
- Debounced input (200ms) so search doesn't fire on every keystroke
- Separate nodeMap + parentMap kept in sync for O(1) lookups and O(depth) ancestor walks

### UI / UX
- Windows 7 Aero dark glass theme — deep navy palette, gradient titlebars,
  blue accent highlights, and custom Aero-style scrollbars
- Resizable sidebar — drag the divider left or right to any width (180px–640px)
- Collapsible sidebar — click the ◀ ▶ tab to fully collapse or restore
- Dynamic detail panel — click any file or folder to open an animated detail
  view showing type, size, modified date, depth, children count, and more
- Folder contents preview — shows up to 8 child items with staggered animations
- File size indicator bar — animates on each new file selection
- Boot sequence animation on first load
- Win7-style progress bar during data fetch and parse phases

### Tree Operations
- Expand / Collapse All folders in one click
- Per-folder toggle (click any directory row)
- Filter auto-expands all ancestor paths of matched nodes;
  clearing the filter restores the previous expand state exactly
- Match highlighting — matched substring shown inline with a blue highlight span
- Inline rename — Enter to commit, Escape to cancel, click away to commit
- Delete with confirmation — files: removes exact node;
  folders: removes node and all descendants, updates total count
- Drag-and-drop move — invalid moves are blocked
  (cannot move a folder into itself or any of its descendants)
- Orphan node detection — nodes whose parent ID does not exist in the dataset
  are flagged with a ⚠ badge

---

## Setup

```bash
# 1. Unzip the Datasheet
unzip public/datasheet.json.zip -d public/

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev

# 4. Open in browser
open http://localhost:3000
```

---

## Data Format

Each node in `datasheet.json` must follow this shape:

```json
{
  "id": "123",
  "parentId": "456",
  "name": "my-file.ts",
  "type": "file",
  "size": 4096,
  "modifiedAt": 1774569992997
}
```

| Field        | Type               | Required | Notes                              |
|--------------|--------------------|----------|------------------------------------|
| `id`         | string             | Yes      | Unique node identifier             |
| `parentId`   | string \| null     | Yes      | null for root-level nodes          |
| `name`       | string             | Yes      | Display name including extension   |
| `type`       | "file" \| "folder" | Yes      |                                    |
| `size`       | number             | No       | File size in bytes                 |
| `modifiedAt` | number             | No       | Unix timestamp in milliseconds     |

Nodes whose `parentId` does not match any known `id` are treated as orphans
and rendered with a ⚠ warning badge.

---

## Tech Notes

- **react-window pinned at v1.8.10** — do not upgrade to v2.
  v2 has a completely different API and removes `FixedSizeList`.
- The sidebar width is stored in React state (180px min, 640px max).
  Collapse/expand state persists within the session.
- Search runs on the debounced query against the flat `nodeMap`, not the tree.
  This keeps search O(n) and avoids triggering re-renders on every keystroke.
- All tree mutations (rename, delete, move) update both the `tree` state
  and the `nodeMap` / `parentMap` refs simultaneously to keep them in sync.
