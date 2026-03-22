"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen } from "lucide-react";

export interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  children: FolderNode[];
  _count: { assets: number };
}

interface AssetFolderTreeProps {
  folders: FolderNode[];
  selectedFolderId: string | null;
  onSelect: (folderId: string | null) => void;
}

export function AssetFolderTree({
  folders,
  selectedFolderId,
  onSelect,
}: AssetFolderTreeProps) {
  return (
    <div className="space-y-0.5">
      <button
        onClick={() => onSelect(null)}
        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors ${
          selectedFolderId === null
            ? "bg-emerald-500/10 text-emerald-400"
            : "text-muted-foreground hover:bg-muted"
        }`}
      >
        <FolderOpen size={14} />
        <span>All Assets</span>
      </button>
      <button
        onClick={() => onSelect("root")}
        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors ${
          selectedFolderId === "root"
            ? "bg-emerald-500/10 text-emerald-400"
            : "text-muted-foreground hover:bg-muted"
        }`}
      >
        <Folder size={14} />
        <span>Unfiled</span>
      </button>
      {folders.map((folder) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          depth={0}
          selectedFolderId={selectedFolderId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function FolderItem({
  folder,
  depth,
  selectedFolderId,
  onSelect,
}: {
  folder: FolderNode;
  depth: number;
  selectedFolderId: string | null;
  onSelect: (folderId: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = folder.children.length > 0;
  const isSelected = selectedFolderId === folder.id;

  return (
    <div>
      <div
        className={`flex items-center gap-1 rounded text-xs transition-colors ${
          isSelected
            ? "bg-emerald-500/10 text-emerald-400"
            : "text-muted-foreground hover:bg-muted"
        }`}
        style={{ paddingLeft: `${(depth + 1) * 12}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 shrink-0"
          >
            {expanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <button
          onClick={() => onSelect(folder.id)}
          className="flex-1 flex items-center gap-1.5 py-1.5 text-left"
        >
          <Folder size={14} />
          <span className="truncate">{folder.name}</span>
          {folder._count.assets > 0 && (
            <span className="text-[10px] text-muted-foreground ml-auto">
              {folder._count.assets}
            </span>
          )}
        </button>
      </div>
      {expanded &&
        folder.children.map((child) => (
          <FolderItem
            key={child.id}
            folder={child}
            depth={depth + 1}
            selectedFolderId={selectedFolderId}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}
