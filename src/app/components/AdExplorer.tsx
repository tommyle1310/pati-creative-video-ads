"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import VideoPlayerModal from "./VideoPlayerModal";
import SaveToBoardDropdown from "./SaveToBoardDropdown";
import BriefGenerateModal from "./BriefGenerateModal";

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
  frameworkName: string;
  hook: string;
  concept: string;
  scriptBreakdown: string;
  visual: string;
  psychology: string;
  cta: string;
  keyTakeaways: string;
  productionFormula: string;
  adLibraryId: string;
  adLibraryUrl: string;
  videoUrl: string | null;
  landingPageUrl: string;
  durationSeconds: number | null;
  videoFormat: string | null;
  impressionsUpper: string | null;
  pageName: string | null;
  status: string;
}

interface FiltersState {
  region: string;
  brand: string;
  creativePattern: string;
  minLongevity: string;
  minIterations: string;
  minScore: string;
  sort: string;
  order: string;
}

interface FilterOptions {
  regions: string[];
  patterns: string[];
  brands: string[];
}

const PATTERN_CLASSES: Record<string, string> = {
  "Problem-First UGC": "bg-violet-600",
  "Result-First Scroll Stop": "bg-amber-500",
  "Curiosity Gap": "bg-cyan-600",
  "Social Proof Cascade": "bg-pink-500",
  "Comparison/Versus": "bg-emerald-600",
  "Authority Demo": "bg-blue-600",
  Unclassifiable: "bg-slate-500",
};

const selectClass =
  "h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent [&>option]:bg-[#1a1a2e] [&>option]:text-white";

function FieldBlock({ label, content }: { label: string; content: string }) {
  const [open, setOpen] = useState(false);
  if (!content) return null;
  const preview = content.slice(0, 200);
  const isLong = content.length > 200;

  return (
    <div className="border-t border-white/5 pt-3 mt-3 first:mt-0 first:pt-0 first:border-0">
      <button
        className="flex w-full items-center justify-between text-left group mb-1"
        onClick={() => setOpen(!open)}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-violet-400 group-hover:text-violet-300 transition-colors">
          {label}
        </span>
        {isLong && (
          <span className="text-gray-500 text-xs ml-2 flex-shrink-0">
            {open ? "▾" : "▸"}
          </span>
        )}
      </button>
      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
        {open || !isLong ? content : `${preview}...`}
      </p>
    </div>
  );
}

export default function AdExplorer() {
  const router = useRouter();
  const [ads, setAds] = useState<AdRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [briefModal, setBriefModal] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    regions: [],
    patterns: [],
    brands: [],
  });
  const [filters, setFilters] = useState<FiltersState>({
    region: "",
    brand: "",
    creativePattern: "",
    minLongevity: "",
    minIterations: "",
    minScore: "",
    sort: "adScore",
    order: "desc",
  });
  const [page, setPage] = useState(0);
  const pageSize = 20;
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

  const fetchAds = useCallback(
    async (pageNum: number = 0) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.region) params.set("region", filters.region);
        if (filters.brand) params.set("brand", filters.brand);
        if (filters.creativePattern)
          params.set("creativePattern", filters.creativePattern);
        if (filters.minLongevity)
          params.set("minLongevity", filters.minLongevity);
        if (filters.minIterations)
          params.set("minIterations", filters.minIterations);
        if (filters.minScore) params.set("minScore", filters.minScore);
        params.set("sort", filters.sort);
        params.set("order", filters.order);
        params.set("limit", String(pageSize));
        params.set("offset", String(pageNum * pageSize));

        const res = await fetch(`/api/ads?${params}`);
        const data = await res.json();
        setAds(data.ads || []);
        setTotal(data.total || 0);
        if (data.filters) setFilterOptions(data.filters);
      } catch {
        setAds([]);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  // Load on mount
  useEffect(() => {
    fetchAds(0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    setPage(0);
    fetchAds(0);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchAds(newPage);
  };

  const updateFilter = (key: keyof FiltersState, val: string) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

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

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <Card className="p-4 bg-[#1a1a2e] border-white/10">
        <div className="flex flex-wrap gap-4">
          {/* Market */}
          <div className="flex flex-col gap-1.5 min-w-[100px]">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Market
            </label>
            <select
              value={filters.region}
              onChange={(e) => updateFilter("region", e.target.value)}
              className={selectClass}
            >
              <option value="">All</option>
              {filterOptions.regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Pattern */}
          <div className="flex flex-col gap-1.5 min-w-[180px]">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Pattern
            </label>
            <select
              value={filters.creativePattern}
              onChange={(e) => updateFilter("creativePattern", e.target.value)}
              className={selectClass}
            >
              <option value="">All</option>
              {filterOptions.patterns.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Brand */}
          <div className="flex flex-col gap-1.5 min-w-[160px]">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Brand
            </label>
            <Input
              type="text"
              value={filters.brand}
              onChange={(e) => updateFilter("brand", e.target.value)}
              placeholder="Search brand..."
              className="h-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-violet-500"
            />
          </div>

          {/* Min Longevity */}
          <div className="flex flex-col gap-1.5 w-[100px]">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Min Longevity
            </label>
            <Input
              type="number"
              value={filters.minLongevity}
              onChange={(e) => updateFilter("minLongevity", e.target.value)}
              placeholder="0"
              min="0"
              className="h-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-violet-500"
            />
          </div>

          {/* Min Iterations */}
          <div className="flex flex-col gap-1.5 w-[100px]">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Min Iterations
            </label>
            <Input
              type="number"
              value={filters.minIterations}
              onChange={(e) => updateFilter("minIterations", e.target.value)}
              placeholder="0"
              min="0"
              className="h-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-violet-500"
            />
          </div>

          {/* Min Score */}
          <div className="flex flex-col gap-1.5 w-[90px]">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Min Score
            </label>
            <Input
              type="number"
              value={filters.minScore}
              onChange={(e) => updateFilter("minScore", e.target.value)}
              placeholder="0"
              min="0"
              max="10"
              step="0.5"
              className="h-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-violet-500"
            />
          </div>

          {/* Sort By */}
          <div className="flex flex-col gap-1.5 min-w-[130px]">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Sort By
            </label>
            <select
              value={filters.sort}
              onChange={(e) => updateFilter("sort", e.target.value)}
              className={selectClass}
            >
              <option value="adScore">AdScore</option>
              <option value="longevityDays">Longevity</option>
              <option value="adIterationCount">Iterations</option>
              <option value="durationSeconds">Duration</option>
              <option value="brand">Brand</option>
            </select>
          </div>

          {/* Order */}
          <div className="flex flex-col gap-1.5 min-w-[130px]">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Order
            </label>
            <select
              value={filters.order}
              onChange={(e) => updateFilter("order", e.target.value)}
              className={selectClass}
            >
              <option value="desc">Highest First</option>
              <option value="asc">Lowest First</option>
            </select>
          </div>

          {/* Search Button — self-align to bottom */}
          <div className="flex flex-col justify-end">
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="h-9 bg-violet-600 hover:bg-violet-500 text-white px-5"
            >
              {loading ? "Loading..." : `Search (${total} results)`}
            </Button>
          </div>
        </div>
      </Card>

      {/* Results */}
      <div className="space-y-3">
        {ads.map((ad) => (
          <Card
            key={ad.id}
            className={`bg-[#1a1a2e] border transition overflow-hidden ${
              selectedIds.has(ad.id)
                ? "border-violet-500/60 ring-1 ring-violet-500/30"
                : "border-white/10 hover:border-border"
            }`}
          >
            {/* Ad Header */}
            <div
              className="flex items-start gap-3 p-4 cursor-pointer select-none"
              onClick={() =>
                setExpandedCard(expandedCard === ad.id ? null : ad.id)
              }
            >
              {/* Selection checkbox */}
              <div
                className="flex items-center pt-1 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={selectedIds.has(ad.id)}
                  onCheckedChange={() => toggleSelect(ad.id)}
                  className="border-white/20 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                />
              </div>
              {/* Score pill */}
              <div className="flex flex-col items-center justify-center bg-white/5 rounded-lg px-3 py-2 min-w-[56px] flex-shrink-0">
                <span className="text-lg font-bold text-white leading-none">
                  {ad.adScore.toFixed(1)}
                </span>
                <span className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wide">
                  score
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <strong className="text-white font-semibold truncate">
                    {ad.brand}
                  </strong>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 border-white/20 text-gray-300 bg-white/5"
                  >
                    {ad.region}
                  </Badge>
                  {ad.creativePattern && (
                    <Badge
                      className={`text-[10px] px-1.5 py-0 text-white border-0 ${
                        PATTERN_CLASSES[ad.creativePattern] ?? "bg-slate-500"
                      }`}
                    >
                      {ad.creativePattern}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate">
                  {ad.longevityDays}d longevity · {ad.adIterationCount ?? "—"}{" "}
                  iterations
                  {ad.durationSeconds
                    ? ` · ${Math.round(ad.durationSeconds)}s`
                    : ""}
                  {ad.hookType ? ` · ${ad.hookType.slice(0, 40)}` : ""}
                </p>
              </div>

              {/* Action buttons */}
              <div
                className="flex items-center gap-1 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {ad.adLibraryUrl && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                  >
                    <a
                      href={ad.adLibraryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ad
                    </a>
                  </Button>
                )}
                {ad.videoUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
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
                    Video
                  </Button>
                )}
                <SaveToBoardDropdown adId={ad.id} />
              </div>

              {/* Expand chevron */}
              <span className="text-gray-500 text-sm flex-shrink-0 mt-0.5">
                {expandedCard === ad.id ? "▾" : "▸"}
              </span>
            </div>

            {/* Expanded body */}
            {expandedCard === ad.id && (
              <div className="px-4 pb-5 border-t border-white/5 pt-4">
                <FieldBlock label="Hook Analysis" content={ad.hook} />
                <FieldBlock label="Concept" content={ad.concept} />
                <FieldBlock label="Script Breakdown" content={ad.scriptBreakdown} />
                <FieldBlock label="Visual" content={ad.visual} />
                <FieldBlock label="Psychology" content={ad.psychology} />
                <FieldBlock label="CTA" content={ad.cta} />
                <FieldBlock label="Key Takeaways" content={ad.keyTakeaways} />
                <FieldBlock label="Production Formula" content={ad.productionFormula} />
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-4 justify-center py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 0}
            className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            Prev
          </Button>
          <span className="text-sm text-gray-400">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages - 1}
            className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            Next
          </Button>
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
