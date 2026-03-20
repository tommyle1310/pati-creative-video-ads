"use client";

import { useState, useCallback, useEffect } from "react";
import CrawlLauncher from "../components/CrawlLauncher";
import CrawlProgress from "../components/CrawlProgress";
import TopWinners from "../components/TopWinners";
import AdExplorer from "../components/AdExplorer";
import AdAnalyzer from "../components/AdAnalyzer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Rocket, Zap, BarChart3, RefreshCw, ExternalLink } from "lucide-react";

interface CrawlStatus {
  jobId: string;
  status: string;
  progress: number;
  adsProcessed: number;
  adsTotal: number;
  currentBrand?: string;
  currentRegion?: string;
}

interface DbInfo {
  sheetUrl: string;
  totalAdsInDb: number;
  dbRegions: string[];
}

interface StrategicSummary {
  dominantPatterns: string;
  top5Analysis: string;
  marketInsights: string;
  strategicRecommendation: string;
  competitorRanking: string;
}

export default function DashboardPage() {
  const [activeJob, setActiveJob] = useState<CrawlStatus | null>(null);
  const [completedJobs, setCompletedJobs] = useState<string[]>([]);
  const [dbInfo, setDbInfo] = useState<DbInfo | null>(null);
  const [summary, setSummary] = useState<StrategicSummary | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [resyncStatus, setResyncStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [resyncMessage, setResyncMessage] = useState("");

  const refreshDbInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/crawl");
      const data = await res.json();
      if (data.jobs) {
        const completed = data.jobs
          .filter((j: { status: string }) => j.status === "complete")
          .map((j: { jobId: string }) => j.jobId);
        setCompletedJobs((prev) => {
          const merged = new Set([...prev, ...completed]);
          return Array.from(merged);
        });
      }
      if (data.sheetUrl) {
        setDbInfo({
          sheetUrl: data.sheetUrl,
          totalAdsInDb: data.totalAdsInDb || 0,
          dbRegions: data.dbRegions || [],
        });
      }
      if (data.strategicSummary) {
        setSummary(data.strategicSummary);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Load on mount + poll every 15s while a crawl is active
  useEffect(() => {
    refreshDbInfo();
  }, [refreshDbInfo]);

  useEffect(() => {
    if (!activeJob) return;
    const interval = setInterval(refreshDbInfo, 15000);
    return () => clearInterval(interval);
  }, [activeJob, refreshDbInfo]);

  const handleCrawlStarted = useCallback((jobId: string) => {
    setActiveJob({
      jobId,
      status: "queued",
      progress: 0,
      adsProcessed: 0,
      adsTotal: 0,
    });
  }, []);

  const handleJobComplete = useCallback(async (jobId: string) => {
    setCompletedJobs((prev) =>
      prev.includes(jobId) ? prev : [...prev, jobId]
    );
    setActiveJob(null);
    // Backend close handler already finished persist before setting 'complete',
    // so DB is up-to-date. Refresh counts and auto-resync GSheet.
    await refreshDbInfo();
    try {
      setResyncStatus("syncing");
      const res = await fetch("/api/resync", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setResyncStatus("done");
        setResyncMessage(`Synced ${data.recordCount} records`);
        refreshDbInfo();
      } else {
        setResyncStatus("error");
        setResyncMessage(data.error || "Auto-resync failed");
      }
    } catch {
      setResyncStatus("error");
      setResyncMessage("Auto-resync failed");
    }
    setTimeout(() => { setResyncStatus("idle"); setResyncMessage(""); }, 5000);
  }, [refreshDbInfo]);

  const handleProgress = useCallback((_adsProcessed: number) => {
    // Progress is shown in CrawlProgress component directly.
    // DB count in Intelligence Data panel refreshes via polling.
  }, []);

  // handleStopCrawl is now a no-op: CrawlProgress keeps polling after stop.
  // Backend transitions from 'stopping' → 'complete' after final persist,
  // then CrawlProgress calls onComplete → handleJobComplete handles resync.
  const handleStopCrawl = useCallback(() => {
    // Intentionally empty — don't reset activeJob or liveAdsProcessed.
    // CrawlProgress stays mounted, keeps polling, shows "Saving Data..." status.
  }, []);

  const handleResync = useCallback(async () => {
    setResyncStatus("syncing");
    setResyncMessage("");
    try {
      const res = await fetch("/api/resync", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setResyncStatus("done");
        setResyncMessage(`Synced ${data.recordCount} records`);
        refreshDbInfo();
      } else {
        setResyncStatus("error");
        setResyncMessage(data.error || "Resync failed");
      }
    } catch {
      setResyncStatus("error");
      setResyncMessage("Network error");
    }
    // Reset status after 5s
    setTimeout(() => { setResyncStatus("idle"); setResyncMessage(""); }, 5000);
  }, [refreshDbInfo]);

  const resyncIcon =
    resyncStatus === "syncing" ? "⏳" :
    resyncStatus === "done" ? "✅" :
    resyncStatus === "error" ? "❌" : null;

  const resyncLabel =
    resyncStatus === "syncing" ? "Syncing..." :
    resyncStatus === "done" ? "Synced!" :
    resyncStatus === "error" ? "Failed" : "Re-sync Sheet";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <span className="text-[28px] drop-shadow-[0_0_12px_rgba(0,200,150,0.4)]">🔬</span>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-emerald-400 bg-clip-text text-transparent">
                Project Antigravity
              </h1>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                Bulk-First Ad Intelligence · FusiForce / Wellness Nest
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-border/40 text-xs text-muted-foreground font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              System Ready
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8 flex flex-col gap-8">
        {/* Launch Panel */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Rocket className="w-5 h-5 text-emerald-400" />
              Launch Crawl
            </CardTitle>
            <CardDescription>
              Select markets and start the bulk-first pipeline (1 Apify call/market → filter → rank → analyze top ads)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CrawlLauncher
              onCrawlStarted={handleCrawlStarted}
              disabled={!!activeJob}
            />
          </CardContent>
        </Card>

        {/* Progress Panel */}
        {activeJob && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Zap className="w-5 h-5 text-yellow-400" />
                Live Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CrawlProgress
                jobId={activeJob.jobId}
                onComplete={handleJobComplete}
                onProgress={handleProgress}
                onStop={handleStopCrawl}
              />
            </CardContent>
          </Card>
        )}

        {/* Intelligence Data Panel */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Intelligence Data
            </CardTitle>
            <CardDescription>
              {dbInfo
                ? `${dbInfo.totalAdsInDb} ads analyzed across ${dbInfo.dbRegions.join(", ") || "—"} — all data in one Google Sheet, no duplicates`
                : "All crawled data syncs to Google Sheets automatically"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              {dbInfo?.sheetUrl ? (
                <>
                  {/* Sheet link card */}
                  <a
                    href={dbInfo.sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3.5 px-6 py-4 rounded-md bg-gradient-to-br from-emerald-500/[0.08] to-blue-600/[0.08] border border-emerald-500/25 text-foreground no-underline transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,200,150,0.15)] hover:border-emerald-500/50 cursor-pointer"
                  >
                    <span className="text-[28px]">📊</span>
                    <div>
                      <strong className="block text-sm font-semibold mb-0.5">Open Google Sheet</strong>
                      <span className="block text-xs text-muted-foreground">
                        {dbInfo.totalAdsInDb} records · {dbInfo.dbRegions.join(", ") || "All"} · 5 tabs
                      </span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground ml-1" />
                  </a>

                  {/* Resync button */}
                  <button
                    onClick={handleResync}
                    disabled={resyncStatus === "syncing"}
                    className="flex items-center gap-3.5 px-6 py-4 rounded-md bg-gradient-to-br from-violet-600/[0.08] to-amber-500/[0.08] border border-violet-600/25 text-foreground cursor-pointer transition-all duration-150 font-[inherit] text-left hover:not-disabled:-translate-y-0.5 hover:not-disabled:shadow-[0_4px_20px_rgba(124,58,237,0.15)] hover:not-disabled:border-violet-600/50 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="text-[28px]">
                      {resyncIcon ?? <RefreshCw className="w-7 h-7 text-muted-foreground" />}
                    </span>
                    <div>
                      <strong className="block text-sm font-semibold mb-0.5">{resyncLabel}</strong>
                      <span className="block text-xs text-muted-foreground">
                        {resyncMessage || "Push all DB records to Google Sheet"}
                      </span>
                    </div>
                  </button>
                </>
              ) : (
                <div className="w-full py-8 text-center text-sm text-muted-foreground border border-dashed border-border/50 rounded-md">
                  No data yet. Launch a crawl to get started.
                </div>
              )}
              {completedJobs.length > 0 && (
                <div className="flex items-center px-4 py-2">
                  <span className="text-xs text-muted-foreground">
                    {completedJobs.length} completed crawl{completedJobs.length > 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Winners */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              🏆 Top Winners Intelligence
            </CardTitle>
            <CardDescription>
              Select top N ads by AdScore with brand, pattern, and market diversity constraints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TopWinners />
          </CardContent>
        </Card>

        {/* Ad Explorer */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              🔍 Ad Explorer
            </CardTitle>
            <CardDescription>
              Filter by longevity, iterations, pattern, market — sort by any metric
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdExplorer />
          </CardContent>
        </Card>

        {/* Single Ad Analyzer */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              🧬 Analyze Single Ad
            </CardTitle>
            <CardDescription>
              Paste a Meta Ad Library URL, video URL, or upload a video — get full forensic analysis + transcript
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdAnalyzer />
          </CardContent>
        </Card>

        {/* Strategic Summary */}
        {summary && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex flex-col space-y-1.5">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    🏆 Strategic Summary
                  </CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSummary(!showSummary)}
                >
                  {showSummary ? "Hide Details" : "Show Details"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!showSummary ? (
                <div className="p-4 bg-muted/40 rounded-md border border-border/40">
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    {summary.dominantPatterns.slice(0, 200)}
                    {summary.dominantPatterns.length > 200 ? "..." : ""}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/[0.08]"
                    onClick={() => setShowSummary(true)}
                  >
                    View Full Analysis
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {[
                    { title: "Dominant Patterns", content: summary.dominantPatterns },
                    { title: "Top 5 Winners", content: summary.top5Analysis },
                    { title: "Market Insights", content: summary.marketInsights },
                    { title: "Strategic Recommendation", content: summary.strategicRecommendation },
                    { title: "Competitor Ranking", content: summary.competitorRanking },
                  ].map((s) => (
                    <div key={s.title} className="p-4 bg-muted/40 rounded-md border border-border/40">
                      <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                        {s.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-[1.7] whitespace-pre-wrap">
                        {s.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pipeline Flow — How It Works */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              🔧 How It Works
            </CardTitle>
            <CardDescription>
              Data picks the winners. AI describes them. Humans decide what to build.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Top-level visual flow: 3 icons with dashed arrows */}
            <div className="flex items-start justify-center gap-0 py-2">
              {/* Step: Crawl */}
              <div className="flex flex-col items-center text-center flex-1 max-w-[240px] group">
                <div className="w-16 h-16 rounded-[18px] bg-muted border border-border flex items-center justify-center text-emerald-400 mb-3.5 transition-all duration-150 group-hover:-translate-y-0.5 group-hover:shadow-[0_6px_24px_rgba(0,200,150,0.15)] group-hover:border-emerald-400/40">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </div>
                <h3 className="text-[15px] font-bold mb-1.5">Crawl</h3>
              </div>

              {/* Arrow */}
              <div className="flex-[0_0_80px] pt-4 text-muted-foreground opacity-50">
                <svg viewBox="0 0 80 40" fill="none" width="80" height="40">
                  <path d="M0 35 Q40 -10 80 35" stroke="currentColor" strokeWidth="2" strokeDasharray="5 4" fill="none" />
                  <path d="M74 28 L80 35 L72 37" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* Step: Filter & Analyze */}
              <div className="flex flex-col items-center text-center flex-1 max-w-[240px] group">
                <div className="w-16 h-16 rounded-[18px] bg-muted border border-border flex items-center justify-center text-emerald-400 mb-3.5 transition-all duration-150 group-hover:-translate-y-0.5 group-hover:shadow-[0_6px_24px_rgba(0,200,150,0.15)] group-hover:border-emerald-400/40">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                </div>
                <h3 className="text-[15px] font-bold mb-1.5">Filter &amp; Analyze</h3>
              </div>

              {/* Arrow */}
              <div className="flex-[0_0_80px] pt-4 text-muted-foreground opacity-50">
                <svg viewBox="0 0 80 40" fill="none" width="80" height="40">
                  <path d="M0 35 Q40 -10 80 35" stroke="currentColor" strokeWidth="2" strokeDasharray="5 4" fill="none" />
                  <path d="M74 28 L80 35 L72 37" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* Step: Deliver */}
              <div className="flex flex-col items-center text-center flex-1 max-w-[240px] group">
                <div className="w-16 h-16 rounded-[18px] bg-muted border border-border flex items-center justify-center text-emerald-400 mb-3.5 transition-all duration-150 group-hover:-translate-y-0.5 group-hover:shadow-[0_6px_24px_rgba(0,200,150,0.15)] group-hover:border-emerald-400/40">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <path d="M3 9h18" />
                    <path d="M9 3v18" />
                  </svg>
                </div>
                <h3 className="text-[15px] font-bold mb-1.5">Deliver</h3>
              </div>
            </div>

            {/* Detailed breakdown grid */}
            <div className="grid grid-cols-3 gap-4 mt-7 pt-6 border-t border-border/40 max-md:grid-cols-1">
              {/* Column 1: Crawl */}
              <div className="flex flex-col gap-3">
                <div className="bg-muted/50 border border-border/40 rounded-md p-4 transition-colors hover:border-white/10 space-y-1.5">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wide mb-2" style={{ background: "#7c3aed" }}>Phase 1</span>
                  <h4 className="text-sm font-bold mb-2">Bulk Crawl (Apify)</h4>
                  <ul className="space-y-1.5 text-sm list-none p-0 m-0">
                    {["1 Apify call per market (3 max, ~10 min)", "Returns ~100-200 video ads per market", "Video only — no images, no carousels", "Active ads only (still running = still paying)", "Delta crawl — skips ads already in DB"].map((item) => (
                      <li key={item} className="text-[11.5px] text-muted-foreground leading-relaxed pl-3.5 relative before:content-['·'] before:absolute before:left-0.5 before:font-bold before:text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                  <div className="mt-2 pt-2 border-t border-border/40 text-[11px] font-semibold text-emerald-400">~$0.005/ad</div>
                </div>
                <div className="bg-muted/50 border border-border/40 rounded-md p-4 transition-colors hover:border-white/10 space-y-1.5">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wide mb-2" style={{ background: "#6366f1" }}>Phase 2</span>
                  <h4 className="text-sm font-bold mb-2">Metadata Filter</h4>
                  <ul className="space-y-1.5 text-sm list-none p-0 m-0">
                    {["Keyword check: \"creatine\", \"gummies\", \"gummy\"", "Exclude: protein powder, pre-workout, whey", "Require non-empty page_name (brand identity)", "Instant, free — no AI needed"].map((item) => (
                      <li key={item} className="text-[11.5px] text-muted-foreground leading-relaxed pl-3.5 relative before:content-['·'] before:absolute before:left-0.5 before:font-bold before:text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                  <div className="mt-2 pt-2 border-t border-border/40 text-[11px] font-semibold text-emerald-400">Free</div>
                </div>
              </div>

              {/* Column 2: Rank & Analyze */}
              <div className="flex flex-col gap-3">
                <div className="bg-muted/50 border border-border/40 rounded-md p-4 transition-colors hover:border-white/10 space-y-1.5">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wide mb-2" style={{ background: "#0563c1" }}>Phase 3</span>
                  <h4 className="text-sm font-bold mb-2">Group by Brand</h4>
                  <ul className="space-y-1.5 text-sm list-none p-0 m-0">
                    {["Cluster ads by page_name (auto-discovered)", "Sort brands by ad count (most active first)", "Top 20 brands, top 5 ads per brand", "Fallback brands if <5 discovered"].map((item) => (
                      <li key={item} className="text-[11.5px] text-muted-foreground leading-relaxed pl-3.5 relative before:content-['·'] before:absolute before:left-0.5 before:font-bold before:text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                  <div className="mt-2 pt-2 border-t border-border/40 text-[11px] font-semibold text-emerald-400">Free</div>
                </div>
                <div className="bg-muted/50 border border-border/40 rounded-md p-4 transition-colors hover:border-white/10 space-y-1.5">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wide mb-2" style={{ background: "#ec4899" }}>Phase 4</span>
                  <h4 className="text-sm font-bold mb-2">Pre-Rank (Data Signals)</h4>
                  <ul className="space-y-1.5 text-sm list-none p-0 m-0">
                    {["Longevity 40% — days running (90+ = ROI signal)", "Impressions 25% — Meta scales winners", "Iterations 25% — brand duplicating = proven", "Duration 10% — longer = more engagement"].map((item) => (
                      <li key={item} className="text-[11.5px] text-muted-foreground leading-relaxed pl-3.5 relative before:content-['·'] before:absolute before:left-0.5 before:font-bold before:text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                  <div className="mt-2 pt-2 border-t border-border/40 text-[11px] font-semibold text-emerald-400">No AI opinions</div>
                </div>
                <div className="bg-muted/50 border border-border/40 rounded-md p-4 transition-colors hover:border-white/10 space-y-1.5">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wide mb-2" style={{ background: "#00c896" }}>Phase 5</span>
                  <h4 className="text-sm font-bold mb-2">Sonnet Forensic Analysis</h4>
                  <ul className="space-y-1.5 text-sm list-none p-0 m-0">
                    {["8 fields: hook, concept, script, visual, psychology, CTA, takeaways, formula", "Classifies: hook type, creative pattern, framework", "Runs on top-ranked ads only (best ads first)", "Never scores quality — classification only"].map((item) => (
                      <li key={item} className="text-[11.5px] text-muted-foreground leading-relaxed pl-3.5 relative before:content-['·'] before:absolute before:left-0.5 before:font-bold before:text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                  <div className="mt-2 pt-2 border-t border-border/40 text-[11px] font-semibold text-emerald-400">~$0.03/ad</div>
                </div>
              </div>

              {/* Column 3: Deliver */}
              <div className="flex flex-col gap-3">
                <div className="bg-muted/50 border border-border/40 rounded-md p-4 transition-colors hover:border-white/10 space-y-1.5">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wide mb-2" style={{ background: "#059669" }}>Tab 1</span>
                  <h4 className="text-sm font-bold mb-2">Ad Intelligence Records</h4>
                  <ul className="space-y-1.5 text-sm list-none p-0 m-0">
                    {["32 columns per ad, sorted by AdScore", "Top 5 highlighted green", "Hyperlinked ad & landing page URLs"].map((item) => (
                      <li key={item} className="text-[11.5px] text-muted-foreground leading-relaxed pl-3.5 relative before:content-['·'] before:absolute before:left-0.5 before:font-bold before:text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-muted/50 border border-border/40 rounded-md p-4 transition-colors hover:border-white/10 space-y-1.5">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wide mb-2" style={{ background: "#0891b2" }}>Tab 2-3</span>
                  <h4 className="text-sm font-bold mb-2">Formulas &amp; Takeaways</h4>
                  <ul className="space-y-1.5 text-sm list-none p-0 m-0">
                    {["Ready-to-shoot 5-phase production briefs", "STEAL / KAIZEN / UPGRADE per ad", "Filterable by hook type & pattern"].map((item) => (
                      <li key={item} className="text-[11.5px] text-muted-foreground leading-relaxed pl-3.5 relative before:content-['·'] before:absolute before:left-0.5 before:font-bold before:text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-muted/50 border border-border/40 rounded-md p-4 transition-colors hover:border-white/10 space-y-1.5">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wide mb-2" style={{ background: "#d97706" }}>Tab 5</span>
                  <h4 className="text-sm font-bold mb-2">Strategic Summary</h4>
                  <ul className="space-y-1.5 text-sm list-none p-0 m-0">
                    {["Dominant creative patterns with counts", "Top winners analysis per market", "Actionable recommendations for FusiForce", "Competitor ranking"].map((item) => (
                      <li key={item} className="text-[11.5px] text-muted-foreground leading-relaxed pl-3.5 relative before:content-['·'] before:absolute before:left-0.5 before:font-bold before:text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-muted/50 border border-border/40 rounded-md p-4 transition-colors hover:border-white/10 space-y-1.5">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wide mb-2" style={{ background: "#64748b" }}>Storage</span>
                  <h4 className="text-sm font-bold mb-2">Persistence</h4>
                  <ul className="space-y-1.5 text-sm list-none p-0 m-0">
                    {["Neon PostgreSQL — source of truth", "Delta crawl — skips ads already in DB", "Incremental sync after each brand", "Google Sheet auto-sync on complete"].map((item) => (
                      <li key={item} className="text-[11.5px] text-muted-foreground leading-relaxed pl-3.5 relative before:content-['·'] before:absolute before:left-0.5 before:font-bold before:text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
