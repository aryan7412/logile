export interface FlatNode {
  id: string;
  name: string;
  type: "file" | "folder";
  parentId: string | null;
  size?: number;
  modifiedAt?: number;
}

export interface TreeNode {
  id: string;
  name: string;
  type: "file" | "folder";
  parent_id: string | null;
  size?: number;
  modifiedAt?: number;
  children: TreeNode[];
  isOrphan: boolean;
  depth: number;
}

export type ExpandState = Record<string, boolean>;
