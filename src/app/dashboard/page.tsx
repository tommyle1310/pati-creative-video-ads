"use client";

import { useState, useCallback, useEffect } from "react";
import CrawlLauncher from "../components/CrawlLauncher";
import CrawlProgress from "../components/CrawlProgress";
import TopWinners from "../components/TopWinners";
import styles from "./dashboard.module.css";

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

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🔬</span>
            <div>
              <h1 className={styles.title}>Project Antigravity</h1>
              <p className={styles.subtitle}>
                Bulk-First Ad Intelligence · FusiForce / Wellness Nest
              </p>
            </div>
          </div>
          <div className={styles.headerStats}>
            <div className={styles.statPill}>
              <span className={styles.statDot} style={{ background: "#00c896" }} />
              <span>System Ready</span>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Launch Panel */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>
              <span className={styles.emoji}>🚀</span> Launch Crawl
            </h2>
            <p>Select markets and start the bulk-first pipeline (1 Apify call/market → filter → rank → analyze top ads)</p>
          </div>
          <CrawlLauncher
            onCrawlStarted={handleCrawlStarted}
            disabled={!!activeJob}
          />
        </section>

        {/* Progress Panel */}
        {activeJob && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>
                <span className={styles.emoji}>⚡</span> Live Progress
              </h2>
            </div>
            <CrawlProgress
              jobId={activeJob.jobId}
              onComplete={handleJobComplete}
              onProgress={handleProgress}
              onStop={handleStopCrawl}
            />
          </section>
        )}

        {/* Intelligence Data Panel */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>
              <span className={styles.emoji}>📊</span> Intelligence Data
            </h2>
            <p>
              {dbInfo
                ? `${dbInfo.totalAdsInDb} ads analyzed across ${dbInfo.dbRegions.join(", ") || "—"} — all data in one Google Sheet, no duplicates`
                : "All crawled data syncs to Google Sheets automatically"}
            </p>
          </div>
          <div className={styles.exportGrid}>
            {dbInfo?.sheetUrl ? (
              <>
                <a
                  href={dbInfo.sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.sheetLink}
                >
                  <span className={styles.sheetIcon}>📊</span>
                  <div>
                    <strong>Open Google Sheet</strong>
                    <span className={styles.sheetMeta}>
                      {dbInfo.totalAdsInDb} records · {dbInfo.dbRegions.join(", ") || "All"} · 5 tabs
                    </span>
                  </div>
                </a>
                <button
                  onClick={handleResync}
                  disabled={resyncStatus === "syncing"}
                  className={styles.resyncBtn}
                >
                  <span className={styles.resyncIcon}>
                    {resyncStatus === "syncing" ? "⏳" : resyncStatus === "done" ? "✅" : resyncStatus === "error" ? "❌" : "🔄"}
                  </span>
                  <div>
                    <strong>
                      {resyncStatus === "syncing" ? "Syncing..." : resyncStatus === "done" ? "Synced!" : resyncStatus === "error" ? "Failed" : "Re-sync Sheet"}
                    </strong>
                    <span className={styles.sheetMeta}>
                      {resyncMessage || "Push all DB records to Google Sheet"}
                    </span>
                  </div>
                </button>
              </>
            ) : (
              <div className={styles.emptyState}>
                <p>No data yet. Launch a crawl to get started.</p>
              </div>
            )}
            {completedJobs.length > 0 && (
              <div className={styles.completedList}>
                <span className={styles.completedLabel}>
                  {completedJobs.length} completed crawl{completedJobs.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Top Winners — AI Curation */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>
              <span className={styles.emoji}>🏆</span> Top Winners Intelligence
            </h2>
            <p>Select top N ads by AdScore with brand, pattern, and market diversity constraints</p>
          </div>
          <TopWinners />
        </section>

        {/* Strategic Summary / Top 5 Winners */}
        {summary && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>
                <span className={styles.emoji}>🏆</span> Strategic Summary
              </h2>
              <button
                className={styles.toggleBtn}
                onClick={() => setShowSummary(!showSummary)}
              >
                {showSummary ? "Hide Details" : "Show Details"}
              </button>
            </div>
            {!showSummary ? (
              <div className={styles.summaryPreview}>
                <p className={styles.summaryText}>
                  {summary.dominantPatterns.slice(0, 200)}
                  {summary.dominantPatterns.length > 200 ? "..." : ""}
                </p>
                <button
                  className={styles.showMoreBtn}
                  onClick={() => setShowSummary(true)}
                >
                  View Full Analysis
                </button>
              </div>
            ) : (
              <div className={styles.summaryFull}>
                {[
                  { title: "Dominant Patterns", content: summary.dominantPatterns },
                  { title: "Top 5 Winners", content: summary.top5Analysis },
                  { title: "Market Insights", content: summary.marketInsights },
                  { title: "Strategic Recommendation", content: summary.strategicRecommendation },
                  { title: "Competitor Ranking", content: summary.competitorRanking },
                ].map((s) => (
                  <div key={s.title} className={styles.summaryBlock}>
                    <h3 className={styles.summaryBlockTitle}>{s.title}</h3>
                    <p className={styles.summaryBlockContent}>{s.content}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Pipeline Flow */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>
              <span className={styles.emoji}>🔧</span> How It Works
            </h2>
            <p>Data picks the winners. AI describes them. Humans decide what to build.</p>
          </div>

          {/* Top-level visual flow: 3 icons with dashed arrows */}
          <div className={styles.pipelineFlow}>
            <div className={styles.pipelineStep}>
              <div className={styles.stepIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <h3 className={styles.stepTitle}>Crawl</h3>
            </div>
            <div className={styles.pipelineArrow}>
              <svg viewBox="0 0 80 40" fill="none"><path d="M0 35 Q40 -10 80 35" stroke="currentColor" strokeWidth="2" strokeDasharray="5 4" fill="none" /><path d="M74 28 L80 35 L72 37" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div className={styles.pipelineStep}>
              <div className={styles.stepIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
              </div>
              <h3 className={styles.stepTitle}>Filter &amp; Analyze</h3>
            </div>
            <div className={styles.pipelineArrow}>
              <svg viewBox="0 0 80 40" fill="none"><path d="M0 35 Q40 -10 80 35" stroke="currentColor" strokeWidth="2" strokeDasharray="5 4" fill="none" /><path d="M74 28 L80 35 L72 37" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div className={styles.pipelineStep}>
              <div className={styles.stepIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <path d="M3 9h18" />
                  <path d="M9 3v18" />
                </svg>
              </div>
              <h3 className={styles.stepTitle}>Deliver</h3>
            </div>
          </div>

          {/* Detailed breakdown grid */}
          <div className={styles.pipelineDetail}>
            {/* Column 1: Crawl */}
            <div className={styles.detailColumn}>
              <div className={styles.detailCard}>
                <div className={styles.detailBadge} style={{ background: "#7c3aed" }}>Phase 1</div>
                <h4>Bulk Crawl (Apify)</h4>
                <ul className={styles.detailList}>
                  <li>1 Apify call per market (3 max, ~10 min)</li>
                  <li>Returns ~100-200 video ads per market</li>
                  <li>Video only — no images, no carousels</li>
                  <li>Active ads only (still running = still paying)</li>
                  <li>Delta crawl — skips ads already in DB</li>
                </ul>
                <div className={styles.detailCost}>~$0.005/ad</div>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailBadge} style={{ background: "#6366f1" }}>Phase 2</div>
                <h4>Metadata Filter</h4>
                <ul className={styles.detailList}>
                  <li>Keyword check: &quot;creatine&quot;, &quot;gummies&quot;, &quot;gummy&quot;</li>
                  <li>Exclude: protein powder, pre-workout, whey</li>
                  <li>Require non-empty page_name (brand identity)</li>
                  <li>Instant, free — no AI needed</li>
                </ul>
                <div className={styles.detailCost}>Free</div>
              </div>
            </div>

            {/* Column 2: Rank & Analyze */}
            <div className={styles.detailColumn}>
              <div className={styles.detailCard}>
                <div className={styles.detailBadge} style={{ background: "#0563c1" }}>Phase 3</div>
                <h4>Group by Brand</h4>
                <ul className={styles.detailList}>
                  <li>Cluster ads by page_name (auto-discovered)</li>
                  <li>Sort brands by ad count (most active first)</li>
                  <li>Top 20 brands, top 5 ads per brand</li>
                  <li>Fallback brands if &lt;5 discovered</li>
                </ul>
                <div className={styles.detailCost}>Free</div>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailBadge} style={{ background: "#ec4899" }}>Phase 4</div>
                <h4>Pre-Rank (Data Signals)</h4>
                <ul className={styles.detailList}>
                  <li>Longevity 40% — days running (90+ = ROI signal)</li>
                  <li>Impressions 25% — Meta scales winners</li>
                  <li>Iterations 25% — brand duplicating = proven</li>
                  <li>Duration 10% — longer = more engagement</li>
                </ul>
                <div className={styles.detailCost}>No AI opinions</div>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailBadge} style={{ background: "#00c896" }}>Phase 5</div>
                <h4>Sonnet Forensic Analysis</h4>
                <ul className={styles.detailList}>
                  <li>8 fields: hook, concept, script, visual, psychology, CTA, takeaways, formula</li>
                  <li>Classifies: hook type, creative pattern, framework</li>
                  <li>Runs on top-ranked ads only (best ads first)</li>
                  <li>Never scores quality — classification only</li>
                </ul>
                <div className={styles.detailCost}>~$0.03/ad</div>
              </div>
            </div>

            {/* Column 3: Deliver */}
            <div className={styles.detailColumn}>
              <div className={styles.detailCard}>
                <div className={styles.detailBadge} style={{ background: "#059669" }}>Tab 1</div>
                <h4>Ad Intelligence Records</h4>
                <ul className={styles.detailList}>
                  <li>32 columns per ad, sorted by AdScore</li>
                  <li>Top 5 highlighted green</li>
                  <li>Hyperlinked ad &amp; landing page URLs</li>
                </ul>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailBadge} style={{ background: "#0891b2" }}>Tab 2-3</div>
                <h4>Formulas &amp; Takeaways</h4>
                <ul className={styles.detailList}>
                  <li>Ready-to-shoot 5-phase production briefs</li>
                  <li>STEAL / KAIZEN / UPGRADE per ad</li>
                  <li>Filterable by hook type &amp; pattern</li>
                </ul>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailBadge} style={{ background: "#d97706" }}>Tab 5</div>
                <h4>Strategic Summary</h4>
                <ul className={styles.detailList}>
                  <li>Dominant creative patterns with counts</li>
                  <li>Top winners analysis per market</li>
                  <li>Actionable recommendations for FusiForce</li>
                  <li>Competitor ranking</li>
                </ul>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailBadge} style={{ background: "#64748b" }}>Storage</div>
                <h4>Persistence</h4>
                <ul className={styles.detailList}>
                  <li>Neon PostgreSQL — source of truth</li>
                  <li>Delta crawl — skips ads already in DB</li>
                  <li>Incremental sync after each brand</li>
                  <li>Google Sheet auto-sync on complete</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
