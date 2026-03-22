"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Image as ImageIcon,
  Video,
  Search,
  Loader2,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AssetFolderTree, type FolderNode } from "./AssetFolderTree";

interface Asset {
  id: string;
  type: string;
  url: string;
  name: string;
  folderId: string | null;
  folder: { id: string; name: string; parentId: string | null } | null;
  createdAt: string;
}

interface AssetPickerProps {
  open: boolean;
  onClose: () => void;
  type: "image" | "video";
  onSelect: (url: string) => void;
}

export function AssetPicker({
  open,
  onClose,
  type,
  onSelect,
}: AssetPickerProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", type);
      if (selectedFolderId) params.set("folderId", selectedFolderId);
      if (search) params.set("search", search);
      params.set("limit", "50");

      const res = await fetch(`/api/studio/assets?${params}`);
      const data = await res.json();
      setAssets(data.assets || []);
      setTotal(data.total || 0);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [type, selectedFolderId, search]);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/studio/folders");
      const data = await res.json();
      setFolders(data.tree || []);
    } catch {
      setFolders([]);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchFolders();
      fetchAssets();
    }
  }, [open, fetchFolders, fetchAssets]);

  function handleSelect(url: string) {
    onSelect(url);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === "image" ? (
              <ImageIcon size={18} />
            ) : (
              <Video size={18} />
            )}
            Select Saved {type === "image" ? "Image" : "Video"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Folder sidebar */}
          <div className="w-48 shrink-0 border-r border-border pr-3 overflow-y-auto">
            <AssetFolderTree
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelect={setSelectedFolderId}
            />
          </div>

          {/* Asset grid */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search */}
            <div className="relative mb-3">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${type}s...`}
                className="pl-8"
              />
            </div>

            <p className="text-[10px] text-muted-foreground mb-2">
              {total} {type}s found
            </p>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-muted-foreground" />
                </div>
              ) : assets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No saved {type}s found
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {assets.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => handleSelect(asset.url)}
                      className="border border-border rounded-lg overflow-hidden hover:border-emerald-500 transition-colors group text-left"
                    >
                      {asset.type === "image" ? (
                        <img
                          src={asset.url}
                          alt={asset.name}
                          className="w-full h-24 object-cover"
                        />
                      ) : (
                        <video
                          src={asset.url}
                          className="w-full h-24 object-cover"
                          muted
                        />
                      )}
                      <div className="p-1.5">
                        <p className="text-[10px] font-medium truncate">
                          {asset.name}
                        </p>
                        {asset.folder && (
                          <p className="text-[9px] text-muted-foreground truncate">
                            /{asset.folder.name}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
