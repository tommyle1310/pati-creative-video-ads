"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import VideoPlayerModal from "../../components/VideoPlayerModal";

interface AdRecord {
  id: string;
  brand: string;
  region: string;
  adScore: number;
  longevityDays: number;
  adIterationCount: number | null;
  hookType: string;
  creativePattern: string;
  primaryAngle: string;
  hook: string;
  concept: string;
  videoUrl: string | null;
  videoFormat: string | null;
  adLibraryUrl: string;
  landingPageUrl: string;
  durationSeconds: number | null;
  impressionsUpper: string | null;
  pageName: string | null;
  spendLower: string | null;
  spendUpper: string | null;
}

interface SavedAdItem {
  id: string;
  adId: string;
  notes: string | null;
  savedAt: string;
  ad: AdRecord;
}

interface BoardDetail {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  savedAds: SavedAdItem[];
}

function scoreBgClass(s: number): string {
  if (s >= 7) return "bg-emerald-500";
  if (s >= 5) return "bg-amber-500";
  return "bg-red-500";
}

export default function BoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;

  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"savedAt" | "adScore" | "longevityDays">("savedAt");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");
  const [videoModal, setVideoModal] = useState<{
    url: string;
    title: string;
    format?: string | null;
    meta?: { brand?: string; market?: string; adScore?: number; longevityDays?: number; hookType?: string };
  } | null>(null);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}`);
      if (!res.ok) { router.push("/saved"); return; }
      const data = await res.json();
      setBoard(data.board);
    } catch { router.push("/saved"); }
    setLoading(false);
  }, [boardId, router]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  const sortedAds = board?.savedAds
    ? [...board.savedAds].sort((a, b) => {
        if (sortBy === "savedAt") return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
        if (sortBy === "adScore") return b.ad.adScore - a.ad.adScore;
        return b.ad.longevityDays - a.ad.longevityDays;
      })
    : [];

  const saveNotes = async (savedAdId: string) => {
    try {
      await fetch(`/api/boards/${boardId}/ads/${savedAdId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesText || null }),
      });
      setEditingNotes(null);
      fetchBoard();
    } catch { /* ignore */ }
  };

  const removeAd = async (savedAdId: string) => {
    if (!confirm("Remove this ad from the board?")) return;
    try {
      await fetch(`/api/boards/${boardId}/ads/${savedAdId}`, { method: "DELETE" });
      fetchBoard();
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <p className="text-sm text-muted-foreground">Loading board...</p>
      </div>
    );
  }
  if (!board) return null;

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/saved")}
        className="mb-6 -ml-2 text-muted-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        All Boards
      </Button>

      {/* Board header */}
      <header className="mb-8">
        <div className="h-1 rounded-full mb-4 w-16" style={{ background: board.color }} />
        <h1 className="text-2xl font-bold text-foreground">{board.name}</h1>
        {board.description && (
          <p className="text-sm text-muted-foreground mt-1">{board.description}</p>
        )}
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            {sortedAds.length} ad{sortedAds.length !== 1 ? "s" : ""} saved
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm rounded-md border border-input bg-background px-3 py-1.5 shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="savedAt">Newest first</option>
            <option value="adScore">Highest AdScore</option>
            <option value="longevityDays">Longest running</option>
          </select>
        </div>
      </header>

      {/* Ad list */}
      {sortedAds.length === 0 ? (
        <div className="text-center text-muted-foreground py-16 border border-dashed rounded-lg">
          <p className="text-sm">No ads saved to this board yet. Use the bookmark button on any ad card to save here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAds.map((sa) => (
            <Card key={sa.id} className="overflow-hidden">
              {/* Main row */}
              <div className="flex items-center gap-4 p-4">
                {/* Score badge */}
                <div className={`flex-shrink-0 w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-lg ${scoreBgClass(sa.ad.adScore)}`}>
                  {sa.ad.adScore.toFixed(1)}
                </div>

                {/* Ad info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <strong className="text-sm font-semibold text-foreground">{sa.ad.brand}</strong>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-medium">
                      {sa.ad.region}
                    </span>
                    {sa.ad.hookType && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {sa.ad.hookType}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                    <span>{sa.ad.longevityDays}d active</span>
                    <span>{sa.ad.adIterationCount ?? "?"} iterations</span>
                    {sa.ad.durationSeconds && <span>{Math.round(sa.ad.durationSeconds)}s</span>}
                    {sa.ad.impressionsUpper && (
                      <span>~{parseInt(sa.ad.impressionsUpper).toLocaleString()} imp</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {sa.ad.videoUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVideoModal({
                        url: sa.ad.videoUrl!,
                        title: `${sa.ad.brand} — ${sa.ad.hookType || "Ad"}`,
                        format: sa.ad.videoFormat,
                        meta: {
                          brand: sa.ad.brand,
                          market: sa.ad.region,
                          adScore: sa.ad.adScore,
                          longevityDays: sa.ad.longevityDays,
                          hookType: sa.ad.hookType,
                        },
                      })}
                    >
                      Watch
                    </Button>
                  )}
                  {sa.ad.adLibraryUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={sa.ad.adLibraryUrl} target="_blank" rel="noopener noreferrer">
                        Ad Library
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAd(sa.id)}
                    title="Remove from board"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Notes section */}
              <div className="border-t px-4 py-3 bg-muted/30">
                {editingNotes === sa.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      placeholder="Add your notes..."
                      rows={3}
                      autoFocus
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveNotes(sa.id)}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingNotes(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingNotes(sa.id); setNotesText(sa.notes || ""); }}
                    className="text-xs text-left w-full text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {sa.notes ? sa.notes : "Add notes..."}
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Video player modal */}
      {videoModal && (
        <VideoPlayerModal
          videoUrl={videoModal.url}
          adTitle={videoModal.title}
          videoFormat={videoModal.format}
          metadata={videoModal.meta}
          isOpen={true}
          onClose={() => setVideoModal(null)}
        />
      )}
    </div>
  );
}
