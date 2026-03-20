"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Check, X as XIcon, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import VideoPlayerModal from "../components/VideoPlayerModal";

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
  videoUrl: string | null;
  videoFormat: string | null;
  adLibraryUrl: string;
  durationSeconds: number | null;
  impressionsUpper: string | null;
}

interface SharedPatterns {
  sameHookType: boolean;
  hookType: string | null;
  sameAngle: boolean;
  angle: string | null;
  sameFramework: boolean;
  framework: string | null;
  sameCreativePattern: boolean;
  creativePattern: string | null;
  averageLongevity: number;
  averageAdScore: number;
  averageDuration: number;
  durationRange: { min: number; max: number };
  commonKeywords: string[];
  verdict: string;
}

function PatternItem({
  match,
  label,
  value,
}: {
  match: boolean;
  label: string;
  value: string;
}) {
  return (
    <div
      className={`p-3 rounded-lg border text-sm ${
        match
          ? "bg-emerald-500/10 border-emerald-500/20"
          : "bg-amber-500/10 border-amber-500/20"
      }`}
    >
      <div className="flex items-center gap-1.5 font-medium mb-1">
        {match ? (
          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        ) : (
          <XIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        )}
        <span>{label}</span>
      </div>
      <span className="text-muted-foreground text-xs leading-snug">{value}</span>
    </div>
  );
}

function scoreVariant(s: number): "default" | "secondary" | "destructive" {
  if (s >= 7) return "default";
  if (s >= 5) return "secondary";
  return "destructive";
}

function scoreBadgeClass(s: number): string {
  if (s >= 7) return "bg-emerald-500 text-white hover:bg-emerald-500";
  if (s >= 5) return "bg-amber-500 text-white hover:bg-amber-500";
  return "bg-red-500 text-white hover:bg-red-500";
}

function CompareContent() {
  const searchParams = useSearchParams();
  const [ads, setAds] = useState<AdRecord[]>([]);
  const [patterns, setPatterns] = useState<SharedPatterns | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  const ids = searchParams.get("ids") || "";

  const fetchComparison = useCallback(async () => {
    if (!ids) {
      setLoading(false);
      setError("No ad IDs provided. Select 2-3 ads to compare.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/ads/compare?ids=${ids}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to compare");
        return;
      }
      setAds(data.ads || []);
      setPatterns(data.sharedPatterns || null);
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }, [ids]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Analyzing ads...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Compare Ads</h1>

      {/* Shared Pattern Banner */}
      {patterns && (
        <Card className="p-5 mb-6">
          <h2 className="text-base font-semibold mb-3">Shared Patterns</h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <PatternItem
              match={patterns.sameHookType}
              label="Hook Type"
              value={
                patterns.sameHookType
                  ? (patterns.hookType ?? "")
                  : ads.map((a) => a.hookType).join(" vs ")
              }
            />
            <PatternItem
              match={patterns.sameAngle}
              label="Angle"
              value={
                patterns.sameAngle
                  ? (patterns.angle ?? "")
                  : ads.map((a) => a.primaryAngle).join(" vs ")
              }
            />
            <PatternItem
              match={patterns.sameFramework}
              label="Framework"
              value={
                patterns.sameFramework
                  ? (patterns.framework ?? "")
                  : ads.map((a) => a.frameworkName).join(" vs ")
              }
            />
            <PatternItem
              match={patterns.sameCreativePattern}
              label="Creative Pattern"
              value={
                patterns.sameCreativePattern
                  ? (patterns.creativePattern ?? "")
                  : ads.map((a) => a.creativePattern).join(" vs ")
              }
            />
          </div>

          <div className="flex gap-6 text-sm text-muted-foreground mb-3">
            <span>Avg Longevity: {patterns.averageLongevity}d</span>
            <span>Avg AdScore: {patterns.averageAdScore}</span>
            <span>Avg Duration: {patterns.averageDuration}s</span>
          </div>

          {patterns.commonKeywords.length > 0 && (
            <p className="text-sm text-muted-foreground mb-3">
              Common keywords: {patterns.commonKeywords.join(", ")}
            </p>
          )}

          <div className="bg-violet-500/10 border border-violet-500/20 p-4 rounded-lg text-sm">
            <strong className="font-semibold">AI Verdict:</strong>{" "}
            {patterns.verdict}
          </div>
        </Card>
      )}

      {/* Side-by-side columns */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${ads.length}, 1fr)` }}
      >
        {ads.map((ad, i) => (
          <Card key={ad.id} className="p-4">
            {/* Column header */}
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-muted-foreground">
                Ad {i + 1}
              </span>
              <Badge className={scoreBadgeClass(ad.adScore)}>
                {ad.adScore.toFixed(1)}
              </Badge>
            </div>

            {/* Watch button */}
            {ad.videoUrl && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mb-3"
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

            {/* Field rows */}
            <div className="py-2 border-b border-border text-sm flex justify-between gap-2">
              <span className="text-muted-foreground shrink-0">Brand</span>
              <span className="text-right font-medium">{ad.brand}</span>
            </div>
            <div className="py-2 border-b border-border text-sm flex justify-between gap-2">
              <span className="text-muted-foreground shrink-0">Market</span>
              <span className="text-right">{ad.region}</span>
            </div>
            <div
              className={`py-2 border-b border-border text-sm flex justify-between gap-2 ${
                patterns?.sameHookType
                  ? "bg-emerald-500/5 px-2 -mx-2 rounded"
                  : "bg-amber-500/5 px-2 -mx-2 rounded"
              }`}
            >
              <span className="text-muted-foreground shrink-0">Hook Type</span>
              <span className="text-right">{ad.hookType || "N/A"}</span>
            </div>
            <div
              className={`py-2 border-b border-border text-sm flex justify-between gap-2 ${
                patterns?.sameAngle
                  ? "bg-emerald-500/5 px-2 -mx-2 rounded"
                  : "bg-amber-500/5 px-2 -mx-2 rounded"
              }`}
            >
              <span className="text-muted-foreground shrink-0">Angle</span>
              <span className="text-right">{ad.primaryAngle || "N/A"}</span>
            </div>
            <div
              className={`py-2 border-b border-border text-sm flex justify-between gap-2 ${
                patterns?.sameFramework
                  ? "bg-emerald-500/5 px-2 -mx-2 rounded"
                  : "bg-amber-500/5 px-2 -mx-2 rounded"
              }`}
            >
              <span className="text-muted-foreground shrink-0">Framework</span>
              <span className="text-right">{ad.frameworkName || "N/A"}</span>
            </div>
            <div
              className={`py-2 border-b border-border text-sm flex justify-between gap-2 ${
                patterns?.sameCreativePattern
                  ? "bg-emerald-500/5 px-2 -mx-2 rounded"
                  : "bg-amber-500/5 px-2 -mx-2 rounded"
              }`}
            >
              <span className="text-muted-foreground shrink-0">Pattern</span>
              <span className="text-right">{ad.creativePattern || "N/A"}</span>
            </div>
            <div className="py-2 border-b border-border text-sm flex justify-between gap-2">
              <span className="text-muted-foreground shrink-0">Longevity</span>
              <span className="text-right">{ad.longevityDays}d</span>
            </div>
            <div className="py-2 border-b border-border text-sm flex justify-between gap-2">
              <span className="text-muted-foreground shrink-0">Iterations</span>
              <span className="text-right">{ad.adIterationCount ?? "N/A"}</span>
            </div>
            <div className="py-2 border-b border-border text-sm flex justify-between gap-2">
              <span className="text-muted-foreground shrink-0">Duration</span>
              <span className="text-right">
                {ad.durationSeconds ? `${Math.round(ad.durationSeconds)}s` : "N/A"}
              </span>
            </div>
            <div className="py-2 border-b border-border text-sm">
              <div className="text-muted-foreground mb-1">Hook</div>
              <p className="text-xs leading-relaxed line-clamp-4">
                {ad.hook?.slice(0, 200) || "N/A"}
              </p>
            </div>
            <div className="py-2 text-sm">
              <div className="text-muted-foreground mb-1">Concept</div>
              <p className="text-xs leading-relaxed line-clamp-4">
                {ad.concept?.slice(0, 200) || "N/A"}
              </p>
            </div>
          </Card>
        ))}
      </div>

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

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 p-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading comparison...</span>
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
