"use client";

import { useState, useEffect, useCallback } from "react";
import { Bookmark, Check, Plus, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BoardItem {
  id: string;
  name: string;
  color: string;
  adCount: number;
}

interface SaveToBoardDropdownProps {
  adId: string;
  onSaved?: () => void;
}

export default function SaveToBoardDropdown({ adId, onSaved }: SaveToBoardDropdownProps) {
  const [open, setOpen] = useState(false);
  const [boards, setBoards] = useState<BoardItem[]>([]);
  const [savedBoardIds, setSavedBoardIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  const isSaved = savedBoardIds.size > 0;

  const fetchBoards = useCallback(async () => {
    try {
      const res = await fetch("/api/boards");
      const data = await res.json();
      setBoards(
        (data.boards || []).map((b: { id: string; name: string; color: string; adCount: number }) => ({
          id: b.id,
          name: b.name,
          color: b.color,
          adCount: b.adCount,
        }))
      );
    } catch { /* ignore */ }
  }, []);

  const checkSavedStatus = useCallback(async () => {
    if (!boards.length) return;
    try {
      const checks = await Promise.all(
        boards.map(async (b) => {
          const res = await fetch(`/api/boards/${b.id}/ads`);
          const data = await res.json();
          const isSaved = (data.savedAds || []).some(
            (sa: { adId: string }) => sa.adId === adId
          );
          return { boardId: b.id, isSaved };
        })
      );
      const saved = new Set<string>();
      checks.forEach((c) => { if (c.isSaved) saved.add(c.boardId); });
      setSavedBoardIds(saved);
    } catch { /* ignore */ }
  }, [boards, adId]);

  useEffect(() => {
    if (open) {
      fetchBoards();
    }
  }, [open, fetchBoards]);

  useEffect(() => {
    if (open && boards.length > 0) {
      checkSavedStatus();
    }
  }, [open, boards, checkSavedStatus]);

  const toggleSave = async (boardId: string) => {
    setLoading(true);
    try {
      if (savedBoardIds.has(boardId)) {
        const res = await fetch(`/api/boards/${boardId}/ads`);
        const data = await res.json();
        const savedAd = (data.savedAds || []).find(
          (sa: { id: string; adId: string }) => sa.adId === adId
        );
        if (savedAd) {
          await fetch(`/api/boards/${boardId}/ads/${savedAd.id}`, { method: "DELETE" });
          setSavedBoardIds((prev) => { const next = new Set(prev); next.delete(boardId); return next; });
        }
      } else {
        await fetch(`/api/boards/${boardId}/ads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adId }),
        });
        setSavedBoardIds((prev) => new Set(prev).add(boardId));
      }
      onSaved?.();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const createBoard = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (data.board) {
        await fetch(`/api/boards/${data.board.id}/ads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adId }),
        });
        setNewName("");
        setCreating(false);
        await fetchBoards();
        setSavedBoardIds((prev) => new Set(prev).add(data.board.id));
        onSaved?.();
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={(v) => { setOpen(v); if (!v) setCreating(false); }}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 rounded-full ${isSaved ? "text-amber-400 hover:text-amber-300" : "text-gray-400 hover:text-white"}`}
          title="Save to board"
          onClick={(e) => e.stopPropagation()}
        >
          <Bookmark
            className="h-4 w-4"
            fill={isSaved ? "currentColor" : "none"}
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-56 bg-[#1a1a2e] border border-white/10 text-white shadow-xl"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
          Save to Board
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />

        {boards.length === 0 && !creating && (
          <div className="px-3 py-3 text-sm text-gray-500 text-center">
            No boards yet
          </div>
        )}

        {boards.map((b) => (
          <DropdownMenuItem
            key={b.id}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/10 focus:bg-white/10 rounded"
            onSelect={(e) => { e.preventDefault(); toggleSave(b.id); }}
            disabled={loading}
          >
            <span
              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: b.color }}
            />
            <span className="flex-1 text-sm text-white truncate">{b.name}</span>
            <span className="text-xs text-gray-500">{b.adCount}</span>
            {savedBoardIds.has(b.id) && (
              <Check className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" strokeWidth={3} />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator className="bg-white/10" />

        {creating ? (
          <div
            className="flex items-center gap-1.5 px-2 py-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Board name..."
              className="h-7 text-sm bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus-visible:ring-1 focus-visible:ring-violet-500"
              autoFocus
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") createBoard();
                if (e.key === "Escape") { setCreating(false); setNewName(""); }
              }}
            />
            <Button
              size="sm"
              className="h-7 px-2 text-xs bg-violet-600 hover:bg-violet-500 text-white flex-shrink-0"
              onClick={createBoard}
              disabled={loading || !newName.trim()}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
            </Button>
          </div>
        ) : (
          <DropdownMenuItem
            className="flex items-center gap-2 px-3 py-2 cursor-pointer text-violet-400 hover:text-violet-300 hover:bg-white/10 focus:bg-white/10 rounded"
            onSelect={(e) => { e.preventDefault(); setCreating(true); }}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="text-sm">New Board</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
