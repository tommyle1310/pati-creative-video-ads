"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./CrawlProgress.module.css";

interface Props {
  jobId: string;
  onComplete: (jobId: string) => void;
  onProgress?: (adsProcessed: number) => void;
  onStop?: () => void;
}

interface ProgressData {
  status: string;
  progress: number;
  adsProcessed: number;
  adsTotal: number;
  currentBrand?: string;
  currentRegion?: string;
  currentStage?: number;
}

const STAGE_LABELS: Record<number, string> = {
  0: "Competitor Scoring",
  1: "Metadata + OCR Gate",
  2: "AI Pre-Screen (Haiku)",
  3: "Full Analysis (Sonnet)",
};

export default function CrawlProgress({ jobId, onComplete, onProgress, onStop }: Props) {
  const [data, setData] = useState<ProgressData>({
    status: "queued",
    progress: 0,
    adsProcessed: 0,
    adsTotal: 0,
  });
  const [stopping, setStopping] = useState(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/crawl?jobId=${jobId}`);
      const json = await res.json();
      setData(json);
      if (onProgress && json.adsProcessed) {
        onProgress(json.adsProcessed);
      }
      if (json.status === "complete" || json.status === "failed") {
        onComplete(jobId);
      }
    } catch {
      /* retry next tick */
    }
  }, [jobId, onComplete, onProgress]);

  useEffect(() => {
    const interval = setInterval(poll, 2000);
    poll();
    return () => clearInterval(interval);
  }, [poll]);

  const handleStop = async () => {
    setStopping(true);
    try {
      await fetch(`/api/crawl?jobId=${jobId}`, { method: "DELETE" });
      // Don't call onStop() — keep polling until backend finishes
      // final persist and transitions status from 'stopping' to 'complete'.
    } catch {
      /* ignore */
    }
  };

  const statusEmoji: Record<string, string> = {
    queued: "\u23F3",
    scoring: "\uD83D\uDCCA",
    crawling: "\uD83D\uDD0D",
    analysing: "\uD83E\uDDE0",
    stopping: "\uD83D\uDCBE",
    building_excel: "\uD83D\uDCCB",
    complete: "\u2705",
    failed: "\u274C",
  };

  const isRunning = !["complete", "failed"].includes(data.status);

  return (
    <div className={styles.progress}>
      {/* Activity Feed Header */}
      <div className={styles.feedHeader}>
        <div className={styles.statusPill}>
          <span className={styles.statusDot} data-status={data.status} />
          <span className={styles.statusText}>
            {statusEmoji[data.status] || "\u2699\uFE0F"}{" "}
            {data.status === "queued" && "Queued"}
            {data.status === "scoring" && "Scoring Competitors"}
            {data.status === "crawling" && "Crawling Ads"}
            {data.status === "analysing" && "AI Analysis"}
            {data.status === "stopping" && "Saving Data..."}
            {data.status === "building_excel" && "Building Output"}
            {data.status === "complete" && "Complete"}
            {data.status === "failed" && "Failed"}
          </span>
        </div>
        {isRunning && onStop && (
          <button
            className={styles.stopBtn}
            onClick={handleStop}
            disabled={stopping}
          >
            {stopping ? "Stopping..." : "Stop Crawl"}
          </button>
        )}
      </div>

      {/* Activity Feed */}
      <div className={styles.feed}>
        {/* Ads Counter */}
        <div className={styles.feedRow}>
          <span className={styles.feedIcon}>{"\uD83D\uDCE6"}</span>
          <span className={styles.feedLabel}>Ads Processed</span>
          <span className={styles.feedValue}>
            {data.adsProcessed} / {data.adsTotal || "\u2014"}
          </span>
        </div>

        {/* Current Brand */}
        {data.currentBrand && (
          <div className={styles.feedRow}>
            <span className={styles.feedIcon}>{"\uD83C\uDFAF"}</span>
            <span className={styles.feedLabel}>Brand</span>
            <span className={styles.feedValue}>{data.currentBrand}</span>
          </div>
        )}

        {/* Current Region */}
        {data.currentRegion && (
          <div className={styles.feedRow}>
            <span className={styles.feedIcon}>{"\uD83C\uDF0D"}</span>
            <span className={styles.feedLabel}>Region</span>
            <span className={styles.feedValue}>{data.currentRegion}</span>
          </div>
        )}

        {/* Current Stage */}
        {data.currentStage !== undefined && (
          <div className={styles.feedRow}>
            <span className={styles.feedIcon}>{"\u2699\uFE0F"}</span>
            <span className={styles.feedLabel}>Stage</span>
            <span className={styles.feedValue}>
              {STAGE_LABELS[data.currentStage] || `Stage ${data.currentStage}`}
            </span>
          </div>
        )}
      </div>

      {/* Subtle progress indicator (thin line, not a bar) */}
      {isRunning && (
        <div className={styles.progressLine}>
          <div
            className={styles.progressLineFill}
            style={{ width: `${data.progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
