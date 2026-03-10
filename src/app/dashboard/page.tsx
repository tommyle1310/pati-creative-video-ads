"use client";

import { useState, useCallback, useEffect } from "react";
import CrawlLauncher from "../components/CrawlLauncher";
import CrawlProgress from "../components/CrawlProgress";
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

export default function DashboardPage() {
  const [activeJob, setActiveJob] = useState<CrawlStatus | null>(null);
  const [completedJobs, setCompletedJobs] = useState<string[]>([]);
  const [dbInfo, setDbInfo] = useState<DbInfo | null>(null);
  const [liveAdsProcessed, setLiveAdsProcessed] = useState(0);
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
    setLiveAdsProcessed(0);
  }, []);

  const handleJobComplete = useCallback((jobId: string) => {
    setCompletedJobs((prev) =>
      prev.includes(jobId) ? prev : [...prev, jobId]
    );
    setActiveJob(null);
    setLiveAdsProcessed(0);
    // Refresh DB info after job completes to get updated counts
    setTimeout(refreshDbInfo, 2000);
  }, [refreshDbInfo]);

  const handleProgress = useCallback((adsProcessed: number) => {
    setLiveAdsProcessed(adsProcessed);
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
                Ad Intelligence Crawler · FusiForce / Wellness Nest
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
            <p>Select markets, mode, and start the pipeline</p>
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
                ? `${dbInfo.totalAdsInDb + liveAdsProcessed} ads analyzed across ${dbInfo.dbRegions.join(", ") || "—"} — all data in one Google Sheet, no duplicates${liveAdsProcessed > 0 ? ` (+${liveAdsProcessed} syncing)` : ""}`
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
                      {dbInfo.totalAdsInDb + liveAdsProcessed} records{liveAdsProcessed > 0 ? ` (+${liveAdsProcessed} syncing)` : ""} · {dbInfo.dbRegions.join(", ") || "All"} · 4 tabs
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

        {/* Pipeline Overview */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>
              <span className={styles.emoji}>🔧</span> Pipeline Architecture
            </h2>
          </div>
          <div className={styles.pipelineCards}>
            {[
              {
                stage: "0",
                title: "Competitor Scoring",
                desc: "Meta Ad Library → Score brands on 4 criteria → Top 5 per market",
                color: "#7c3aed",
              },
              {
                stage: "1",
                title: "Metadata + OCR Gate",
                desc: "Text check + Tesseract first-frame → Fast reject (~$0)",
                color: "#0563c1",
              },
              {
                stage: "2",
                title: "AI Pre-Screen",
                desc: "Whisper + Claude Haiku binary check (~$0.0002/ad)",
                color: "#f59e0b",
              },
              {
                stage: "3",
                title: "Full Analysis",
                desc: "Claude Sonnet 9-field forensic breakdown (~$0.03/ad)",
                color: "#00c896",
              },
            ].map((s) => (
              <div key={s.stage} className={styles.pipelineCard}>
                <div
                  className={styles.pipelineStage}
                  style={{ background: s.color }}
                >
                  {s.stage}
                </div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
