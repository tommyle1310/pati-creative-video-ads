"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import VideoPlayerModal from "./VideoPlayerModal";
import SaveToBoardDropdown from "./SaveToBoardDropdown";
import BriefGenerateModal from "./BriefGenerateModal";

interface SelectedAd {
  id: string;
  rank: number;
  selectionReason: string;
  isUnderexploitedArchetype: boolean;
  underexploitedNote: string | null;
  brand: string;
  region: string;
  adScore: number;
  longevityDays: number;
  adIterationCount: number | null;
  hookType: string;
  creativePattern: string;
  primaryAngle: string;
  frameworkName: string;
  hook: string;
  concept: string;
  scriptBreakdown: string;
  visual: string;
  psychology: string;
  cta: string;
  keyTakeaways: string;
  productionFormula: string;
  adLibraryUrl: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  videoFormat: string | null;
  landingPageUrl: string;
  impressionsUpper: string | null;
  pageName: string | null;
  status: string;
}

interface SelectionMeta {
  totalInDb: number;
  totalEligible: number;
  requested: number;
  returned: number;
  marketsRepresented: string[];
  patternsRepresented: string[];
  exclusionsApplied: number;
}

interface TopWinnersResponse {
  selectedAds: SelectedAd[];
  selectionMeta: SelectionMeta;
  error?: string;
}

// Collapsible section for long text fields
function FieldBlock({ label, content }: { label: string; content: string }) {
  const [open, setOpen] = useState(false);
  if (!content) return null;
  const preview = content.slice(0, 180);
  const isLong = content.length > 180;

  return (
    <div className="mb-3">
      <button
        className="flex items-center justify-between w-full text-left text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-white transition-colors py-1 gap-2"
        onClick={() => setOpen(!open)}
      >
        <span>{label}</span>
        {isLong && (
          <span className="text-gray-500 text-base leading-none">
            {open ? "▾" : "▸"}
          </span>
        )}
      </button>
      <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap mt-1">
        {open || !isLong ? content : `${preview}...`}
      </div>
    </div>
  );
}

const PATTERN_COLORS: Record<string, string> = {
  "Problem-First UGC": "bg-violet-600",
  "Result-First Scroll Stop": "bg-amber-500",
  "Curiosity Gap": "bg-cyan-600",
  "Social Proof Cascade": "bg-pink-500",
  "Comparison/Versus": "bg-emerald-600",
  "Authority Demo": "bg-blue-600",
  Unclassifiable: "bg-slate-500",
};

function PatternBadge({ pattern }: { pattern: string }) {
  const colorClass = PATTERN_COLORS[pattern] ?? "bg-slate-500";
  return (
    <Badge className={`${colorClass} text-white border-0 text-xs font-medium`}>
      {pattern}
    </Badge>
  );
}

export default function TopWinners() {
  const router = useRouter();
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TopWinnersResponse | null>(null);
  const [error, setError] = useState("");
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [briefModal, setBriefModal] = useState(false);
  const [videoModal, setVideoModal] = useState<{
    url: string;
    title: string;
    format?: string | null;
    meta?: {
      brand?: string;
      market?: string;
      adScore?: number;
      longevityDays?: number;
      hookType?: string;
    };
  } | null>(null);

  const fetchWinners = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/top-winners?n=${count}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to fetch");
        return;
      }
      setData(json);
      setExpandedCard(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [count]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleCompare = () => {
    const ids = Array.from(selectedIds).slice(0, 3);
    router.push(`/compare?ids=${ids.join(",")}`);
  };

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 mb-5">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <label className="text-sm font-medium text-gray-300">
            Top{" "}
            <span className="text-white font-bold tabular-nums">{count}</span>{" "}
            Winners
          </label>
          <input
            type="range"
            min={3}
            max={50}
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-violet-500"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>3</span>
            <span>25</span>
            <span>50</span>
          </div>
        </div>
        <Button
          onClick={fetchWinners}
          disabled={loading}
          className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 shrink-0"
        >
          {loading ? (
            <>
              <span className="mr-2 h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
              Analyzing...
            </>
          ) : (
            <>
              <span className="mr-1.5">🏆</span>
              Find Top {count} Winners
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {/* Selection Meta */}
      {data && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mb-5 px-1">
          <span>
            <span className="text-white font-medium">
              {data.selectionMeta.returned}
            </span>{" "}
            selected from{" "}
            <span className="text-white font-medium">
              {data.selectionMeta.totalEligible}
            </span>{" "}
            eligible ({data.selectionMeta.totalInDb} total in DB)
          </span>
          <span className="text-gray-600">·</span>
          <span>
            Markets:{" "}
            <span className="text-gray-300">
              {data.selectionMeta.marketsRepresented.join(", ") || "—"}
            </span>
          </span>
          <span className="text-gray-600">·</span>
          <span>
            Patterns:{" "}
            <span className="text-gray-300">
              {data.selectionMeta.patternsRepresented.length} types
            </span>
          </span>
          {data.selectionMeta.exclusionsApplied > 0 && (
            <>
              <span className="text-gray-600">·</span>
              <span>
                {data.selectionMeta.exclusionsApplied} excluded (too new / no
                data)
              </span>
            </>
          )}
        </div>
      )}

      {/* Winner Cards */}
      <div className="flex flex-col gap-3">
        {data?.selectedAds.map((ad) => {
          const isGold = ad.rank <= 3;
          const isMoat = ad.isUnderexploitedArchetype;
          const ringClass = isGold
            ? "ring-1 ring-amber-500/30"
            : isMoat
            ? "ring-1 ring-emerald-500/30"
            : "";

          return (
            <Card
              key={ad.adLibraryUrl}
              className={`bg-[#12122a] border overflow-hidden ${
                selectedIds.has(ad.id)
                  ? "border-violet-500/60 ring-1 ring-violet-500/30"
                  : `border-white/10 ${ringClass}`
              }`}
            >
              {/* Card Header */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() =>
                  setExpandedCard(expandedCard === ad.rank ? null : ad.rank)
                }
              >
                {/* Selection checkbox */}
                <div
                  className="flex items-center flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={selectedIds.has(ad.id)}
                    onCheckedChange={() => toggleSelect(ad.id)}
                    className="border-white/20 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                  />
                </div>

                {/* Rank */}
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-sm font-bold text-gray-300">
                  #{ad.rank}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="font-semibold text-white text-sm">
                      {ad.brand}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] border-white/20 text-gray-400 font-medium px-1.5 py-0"
                    >
                      {ad.region}
                    </Badge>
                    <PatternBadge pattern={ad.creativePattern} />
                    {isMoat && (
                      <Badge className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold px-1.5 py-0">
                        MOAT OPPORTUNITY
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {ad.selectionReason}
                  </div>
                </div>

                {/* Score */}
                <div className="flex-shrink-0 text-center">
                  <div className="text-xl font-bold text-white tabular-nums">
                    {ad.adScore.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                    AdScore
                  </div>
                </div>

                {/* Expand chevron */}
                <span className="text-gray-500 text-base flex-shrink-0">
                  {expandedCard === ad.rank ? "▾" : "▸"}
                </span>
              </div>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-px bg-white/5 border-t border-white/5">
                {[
                  { key: "Longevity", val: `${ad.longevityDays}d` },
                  {
                    key: "Iterations",
                    val: ad.adIterationCount ?? "—",
                  },
                  {
                    key: "Duration",
                    val: ad.durationSeconds
                      ? `${Math.round(ad.durationSeconds)}s`
                      : "—",
                  },
                  { key: "Format", val: ad.videoFormat || "—" },
                  { key: "Hook Type", val: ad.hookType || "—" },
                  { key: "Framework", val: ad.frameworkName || "—" },
                  { key: "Angle", val: ad.primaryAngle || "—" },
                  ...(ad.impressionsUpper
                    ? [
                        {
                          key: "Impressions",
                          val: parseInt(
                            ad.impressionsUpper
                          ).toLocaleString(),
                        },
                      ]
                    : []),
                ].map(({ key, val }) => (
                  <div
                    key={key}
                    className="flex flex-col items-center justify-center py-2 px-1 bg-[#12122a]"
                  >
                    <span className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">
                      {key}
                    </span>
                    <span className="text-xs font-medium text-gray-200 truncate max-w-full text-center">
                      {val}
                    </span>
                  </div>
                ))}
              </div>

              {/* Links Row */}
              <div
                className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-t border-white/5"
                onClick={(e) => e.stopPropagation()}
              >
                {ad.adLibraryUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-white/20 text-gray-300 hover:text-white hover:bg-white/10 bg-transparent"
                    asChild
                  >
                    <a
                      href={ad.adLibraryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Ad
                    </a>
                  </Button>
                )}
                {ad.videoUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-white/20 text-gray-300 hover:text-white hover:bg-white/10 bg-transparent"
                    onClick={() =>
                      setVideoModal({
                        url: ad.videoUrl!,
                        title: `${ad.brand} — ${ad.hookType || "Ad"}`,
                        format: ad.videoFormat,
                        meta: {
                          brand: ad.brand,
                          market: ad.region,
                          adScore: ad.adScore,
                          longevityDays: ad.longevityDays,
                          hookType: ad.hookType,
                        },
                      })
                    }
                  >
                    Watch Video
                  </Button>
                )}
                {ad.landingPageUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-white/20 text-gray-300 hover:text-white hover:bg-white/10 bg-transparent"
                    asChild
                  >
                    <a
                      href={ad.landingPageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Landing Page
                    </a>
                  </Button>
                )}
                <SaveToBoardDropdown adId={ad.id} />
              </div>

              {/* Expanded Detail */}
              {expandedCard === ad.rank && (
                <div className="px-4 pb-4 pt-2 border-t border-white/5">
                  {isMoat && ad.underexploitedNote && (
                    <div className="mb-4 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm px-3 py-2">
                      <strong className="font-semibold">
                        Why this is a moat opportunity:
                      </strong>{" "}
                      {ad.underexploitedNote}
                    </div>
                  )}

                  <FieldBlock label="Hook Analysis" content={ad.hook} />
                  <FieldBlock
                    label="Concept / Big Idea"
                    content={ad.concept}
                  />
                  <FieldBlock
                    label="Script Breakdown"
                    content={ad.scriptBreakdown}
                  />
                  <FieldBlock label="Visual Roll" content={ad.visual} />
                  <FieldBlock
                    label="Consumer Psychology"
                    content={ad.psychology}
                  />
                  <FieldBlock label="CTA Analysis" content={ad.cta} />
                  <FieldBlock
                    label="Key Takeaways (STEAL / KAIZEN / UPGRADE)"
                    content={ad.keyTakeaways}
                  />
                  <FieldBlock
                    label="Production Formula (Ready-to-Shoot)"
                    content={ad.productionFormula}
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {data && data.selectedAds.length === 0 && (
        <div className="text-center py-12 text-gray-500 text-sm">
          No eligible winners found. Crawl more ads or lower the threshold.
        </div>
      )}

      {/* Video Player Modal */}
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

      {/* Brief Generate Modal */}
      <BriefGenerateModal
        adIds={Array.from(selectedIds)}
        isOpen={briefModal}
        onClose={() => setBriefModal(false)}
      />

      {/* Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-[#1a1a2e]/95 backdrop-blur-lg border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <span className="text-sm text-gray-300 font-medium mr-1">
            {selectedIds.size} selected
          </span>

          <Button
            size="sm"
            onClick={handleCompare}
            disabled={selectedIds.size < 2 || selectedIds.size > 3}
            className="bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40"
          >
            Compare {selectedIds.size >= 2 && selectedIds.size <= 3 ? `(${selectedIds.size})` : ""}
          </Button>

          <Button
            size="sm"
            onClick={() => setBriefModal(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white"
          >
            Generate Brief
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="text-gray-400 hover:text-white hover:bg-white/10"
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
