"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import VideoPlayerModal from "../components/VideoPlayerModal";
import SaveToBoardDropdown from "../components/SaveToBoardDropdown";

interface TrendingAd {
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
  videoUrl: string | null;
  videoFormat: string | null;
  adLibraryUrl: string;
  durationSeconds: number | null;
  impressionsUpper: string | null;
  pageName: string | null;
  trendingScore: number;
}

const MARKETS = ["ALL", "US", "UK", "AU"];
const PERIODS = ["7d", "30d", "90d", "all"];

function adScoreClasses(s: number): string {
  if (s >= 7) return "bg-green-500 text-white";
  if (s >= 5) return "bg-amber-500 text-white";
  return "bg-red-500 text-white";
}

export default function TrendingPage() {
  const [ads, setAds] = useState<TrendingAd[]>([]);
  const [hookTypes, setHookTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [market, setMarket] = useState("ALL");
  const [period, setPeriod] = useState("all");
  const [minLongevity, setMinLongevity] = useState("14");
  const [hookType, setHookType] = useState("");

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

  const fetchTrending = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "50",
        market,
        minLongevity,
        period,
      });
      if (hookType) params.set("hookType", hookType);

      const res = await fetch(`/api/trending?${params}`);
      const data = await res.json();
      setAds(data.ads || []);
      if (data.hookTypes) setHookTypes(data.hookTypes);
    } catch {
      setAds([]);
    }
    setLoading(false);
  }, [market, period, minLongevity, hookType]);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Trending Ads</h1>
        <p className="text-muted-foreground mt-1">
          Top performing video ads across all brands and markets
        </p>
      </header>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-6">
          {/* Market */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Market
            </span>
            <div className="flex gap-1.5">
              {MARKETS.map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={market === m ? "default" : "outline"}
                  onClick={() => setMarket(m)}
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>

          {/* Period */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Period
            </span>
            <div className="flex gap-1.5">
              {PERIODS.map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={period === p ? "default" : "outline"}
                  onClick={() => setPeriod(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>

          {/* Min Longevity */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Min Longevity
            </span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={minLongevity}
                onChange={(e) => setMinLongevity(e.target.value)}
                min="0"
                className="w-20 h-8 text-sm"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </div>

          {/* Hook Type */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Hook Type
            </span>
            <select
              value={hookType}
              onChange={(e) => setHookType(e.target.value)}
              className="bg-transparent border border-input rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All types</option>
              {hookTypes.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="text-center text-muted-foreground py-16">
          Loading trending ads...
        </div>
      ) : ads.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          No trending ads match your filters. Try reducing the minimum longevity.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {ads.map((ad, i) => (
            <Card key={ad.id} className="flex overflow-hidden">
              {/* Rank */}
              <div className="min-w-[52px] flex items-center justify-center bg-muted/50 border-r text-lg font-bold text-muted-foreground">
                #{i + 1}
              </div>

              {/* Card body */}
              <div className="flex-1 p-4 flex flex-col gap-3">
                {/* Top row: info + scores */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1.5">
                    {/* Title row */}
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{ad.brand}</span>
                      <Badge variant="secondary">{ad.region}</Badge>
                    </div>
                    {/* Metrics */}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Longevity</span>
                        <span className="font-medium">
                          {ad.longevityDays}d{ad.longevityDays > 60 ? " 🔥" : ""}
                        </span>
                      </span>
                      <span className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Impressions</span>
                        <span className="font-medium">
                          {ad.impressionsUpper
                            ? `~${parseInt(ad.impressionsUpper).toLocaleString()}`
                            : "N/A"}
                        </span>
                      </span>
                      <span className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Iterations</span>
                        <span className="font-medium">{ad.adIterationCount ?? "?"}</span>
                      </span>
                      <span className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Duration</span>
                        <span className="font-medium">
                          {ad.durationSeconds
                            ? `${Math.round(ad.durationSeconds)}s`
                            : "N/A"}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Score badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Trending score */}
                    <div className="flex items-center h-full rounded-md bg-amber-100 text-amber-800 px-3 py-1.5 min-w-[56px]">
                      <span className="text-base font-bold leading-none">
                        {ad.trendingScore.toFixed(1)}
                      </span>
                      <span className="text-[10px] font-medium mt-0.5">Trending</span>
                    </div>
                    {/* Ad score */}
                    <div
                      className={`flex items-center justify-center rounded-md px-3 py-1.5 text-base font-bold min-w-[48px] ${adScoreClasses(ad.adScore)}`}
                    >
                      {ad.adScore.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {ad.hookType && (
                    <Badge variant="outline">{ad.hookType}</Badge>
                  )}
                  {ad.primaryAngle && (
                    <Badge variant="outline">{ad.primaryAngle}</Badge>
                  )}
                  {ad.creativePattern && (
                    <Badge variant="secondary">{ad.creativePattern}</Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {ad.videoUrl && (
                    <Button
                      size="sm"
                      variant="default"
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
                      Watch
                    </Button>
                  )}
                  <SaveToBoardDropdown adId={ad.id} />
                  {ad.adLibraryUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={ad.adLibraryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ad Library
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

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
