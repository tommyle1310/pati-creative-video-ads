"use client";

import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FolderOption {
  id: string;
  name: string;
  parentId: string | null;
}

interface SaveAssetButtonProps {
  type: "image" | "video";
  url: string;
  defaultName: string;
  metadata?: Record<string, unknown>;
}

export function SaveAssetButton({
  type,
  url,
  defaultName,
  metadata,
}: SaveAssetButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [folderId, setFolderId] = useState<string>("");
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    if (open) {
      setName(defaultName);
      fetch("/api/studio/folders")
        .then((r) => r.json())
        .then((data) => setFolders(data.folders || []))
        .catch(() => {});
    }
  }, [open, defaultName]);

  function getFolderPath(id: string): string {
    const parts: string[] = [];
    let current = folders.find((f) => f.id === id);
    while (current) {
      parts.unshift(current.name);
      current = folders.find((f) => f.id === current!.parentId);
    }
    return parts.length ? `/${parts.join("/")}` : "/";
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch("/api/studio/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: folderId || null,
        }),
      });
      if (!res.ok) return;
      const { folder } = await res.json();
      setFolders((prev) => [...prev, folder]);
      setFolderId(folder.id);
      setNewFolderName("");
    } catch {
      // ignore
    }
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/studio/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          url,
          name: name.trim(),
          folderId: folderId || null,
          metadata,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setOpen(false);
    } catch {
      alert("Failed to save asset");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1 bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        title="Save to library"
      >
        <Save size={10} className="text-white" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save {type} to Library</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Asset name..."
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Folder</label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm mt-1"
              >
                <option value="">/ (Root)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {getFolderPath(f.id)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="New folder name..."
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
              >
                Create
              </Button>
            </div>

            {type === "image" && (
              <img
                src={url}
                alt="Preview"
                className="h-20 rounded border border-border"
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || saving}>
              {saving && <Loader2 size={14} className="animate-spin mr-1" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
