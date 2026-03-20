"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface BoardPreview {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  adCount: number;
  previewAds: { brand: string; videoUrl: string | null; thumbnailUrl: string | null }[];
  createdAt: string;
}

const PRESET_COLORS = ["#7F77DD", "#ef4444", "#f59e0b", "#00c896", "#0563c1", "#ec4899", "#7c3aed", "#64748b"];
const PRESET_ICONS = ["bookmark", "flame", "target", "zap", "trophy", "star", "eye", "lightbulb"];

const iconMap: Record<string, string> = {
  bookmark: "\u{1F516}", flame: "\u{1F525}", target: "\u{1F3AF}",
  zap: "\u{26A1}", trophy: "\u{1F3C6}", star: "\u{2B50}",
  eye: "\u{1F441}", lightbulb: "\u{1F4A1}",
};

export default function SavedPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<BoardPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [newIcon, setNewIcon] = useState(PRESET_ICONS[0]);

  const fetchBoards = useCallback(async () => {
    try {
      const res = await fetch("/api/boards");
      const data = await res.json();
      setBoards(data.boards || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBoards(); }, [fetchBoards]);

  const createBoard = async () => {
    if (!newName.trim()) return;
    try {
      await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDesc || null, color: newColor, icon: newIcon }),
      });
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
      fetchBoards();
    } catch { /* ignore */ }
  };

  const deleteBoard = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this board? All saved ads in it will be removed.")) return;
    try {
      await fetch(`/api/boards/${id}`, { method: "DELETE" });
      fetchBoards();
    } catch { /* ignore */ }
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Header */}
      <header className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bookmark className="w-6 h-6" />
            Saved Boards
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Organize competitor ads into themed collections</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          New Board
        </Button>
      </header>

      {/* Create Board Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Name</label>
              <Input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Disgust Hooks, US Market Winners"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") createBoard(); }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Description (optional)</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What is this board for?"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${newColor === c ? "ring-2 ring-offset-2 ring-ring scale-110" : "hover:scale-105"}`}
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Icon</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_ICONS.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setNewIcon(ic)}
                    className={`w-9 h-9 rounded-md text-base flex items-center justify-center transition-all border ${
                      newIcon === ic
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border bg-background hover:bg-accent"
                    }`}
                  >
                    {iconMap[ic] || ic}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createBoard} disabled={!newName.trim()}>Create Board</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Board Grid */}
      {loading ? (
        <div className="text-center text-muted-foreground py-16 text-sm">Loading boards...</div>
      ) : boards.length === 0 ? (
        <div className="text-center text-muted-foreground py-16 border border-dashed rounded-lg">
          <p className="text-sm">No boards yet. Create one to start saving competitor ads.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {boards.map((b) => (
            <Card
              key={b.id}
              className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
              onClick={() => router.push(`/saved/${b.id}`)}
            >
              {/* Colored top strip */}
              <div className="h-1" style={{ background: b.color }} />

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl leading-none">{iconMap[b.icon] || "\u{1F516}"}</span>
                  <button
                    onClick={(e) => deleteBoard(b.id, e)}
                    title="Delete board"
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="font-semibold text-foreground text-sm leading-tight mb-1">{b.name}</h3>
                {b.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{b.description}</p>
                )}

                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                    {b.adCount} ad{b.adCount !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(b.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
