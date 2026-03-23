"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Trash2, StickyNote, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BriefItem {
  id: string;
  targetProduct: string;
  targetMarket: string;
  basedOnAdIds: string[];
  briefJson: { briefTitle?: string };
  notes: string | null;
  createdAt: string;
}

export default function BriefsPage() {
  const router = useRouter();
  const [briefs, setBriefs] = useState<BriefItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchBriefs = async () => {
    try {
      const res = await fetch("/api/briefs");
      const data = await res.json();
      setBriefs(data.briefs || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchBriefs(); }, []);

  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus();
  }, [editingId]);

  const deleteBrief = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this brief? This cannot be undone.")) return;
    try {
      await fetch(`/api/briefs/${id}`, { method: "DELETE" });
      setBriefs((prev) => prev.filter((b) => b.id !== id));
    } catch { /* ignore */ }
  };

  const startEditNote = (id: string, currentNote: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditValue(currentNote || "");
  };

  const saveNote = async (id: string) => {
    const trimmed = editValue.trim();
    try {
      await fetch(`/api/briefs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: trimmed || null }),
      });
      setBriefs((prev) =>
        prev.map((b) => (b.id === id ? { ...b, notes: trimmed || null } : b))
      );
    } catch { /* ignore */ }
    setEditingId(null);
  };

  const handleNoteKeyDown = (id: string, e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveNote(id);
    if (e.key === "Escape") setEditingId(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Creative Briefs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-generated creative briefs based on winning competitor ads
        </p>
      </header>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading briefs...</div>
      ) : briefs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>No briefs generated yet. Click &quot;Generate Brief&quot; on any ad to create one.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {briefs.map((b) => (
            <Card
              key={b.id}
              className="relative flex items-center gap-4 px-5 py-4 cursor-pointer hover:border-border/80 transition-colors"
              onClick={() => router.push(`/briefs/${b.id}`)}
            >
              {/* Note badge — editable */}
              {editingId === b.id ? (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveNote(b.id)}
                    onKeyDown={(e) => handleNoteKeyDown(b.id, e)}
                    placeholder="Add a note..."
                    className="px-2.5 py-0.5 text-[11px] bg-background border border-green-700 rounded-full outline-none text-foreground w-56 text-center"
                  />
                </div>
              ) : b.notes ? (
                <Badge
                  variant="outline"
                  className="absolute top-0 left-1/2 border-green-700 -translate-x-1/2 -translate-y-1/2 max-w-[70%] truncate text-[10px] gap-1 px-2 py-0.5 cursor-text hover:bg-green-500/10 transition-colors"
                  onClick={(e) => startEditNote(b.id, b.notes, e)}
                >
                  <StickyNote className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{b.notes}</span>
                  <Pencil className="h-2 w-2 shrink-0 ml-0.5 opacity-50" />
                </Badge>
              ) : (
                <button
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:!opacity-100 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  onClick={(e) => startEditNote(b.id, null, e)}
                  title="Add note"
                >
                  <Badge
                    variant="outline"
                    className="border-dashed border-muted-foreground/40 text-[10px] gap-1 px-2 py-0.5"
                  >
                    <StickyNote className="h-2.5 w-2.5" />
                    Add note
                  </Badge>
                </button>
              )}

              <Badge variant="default" className="shrink-0">
                {b.targetProduct}
              </Badge>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {b.briefJson?.briefTitle || "Untitled Brief"}
                </h3>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span>{b.targetMarket} market</span>
                  <span>Based on {b.basedOnAdIds.length} ad{b.basedOnAdIds.length > 1 ? "s" : ""}</span>
                  <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <button
                onClick={(e) => deleteBrief(b.id, e)}
                title="Delete brief"
                className="shrink-0 p-1.5 rounded-sm text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
