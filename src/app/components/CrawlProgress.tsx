"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./CrawlProgress.module.css";

interface Props {
  jobId: string;
  onComplete: (jobId: string) => void;
  onProgress?: (adsProcessed: number) => void;
}

interface ProgressData {
  status: string;
  progress: number;
  adsProcessed: number;
  adsTotal: number;
  currentBrand?: string;
  currentRegion?: string;
  phase?: string;
}

export default function CrawlProgress({ jobId, onComplete, onProgress }: Props) {
  const [data, setData] = useState<ProgressData>({
    status: "queued",
    progress: 0,
    adsProcessed: 0,
    adsTotal: 0,
  });

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

  const statusLabel = {
    queued: "⏳ Queued",
    scoring: "📊 Scoring Competitors",
    crawling: "🔍 Crawling Ads",
    analysing: "🧠 AI Analysis",
    building_excel: "📋 Building Excel",
    complete: "✅ Complete",
    failed: "❌ Failed",
  }[data.status] || data.status;

  return (
    <div className={styles.progress}>
      <div className={styles.statusRow}>
        <span className={styles.statusLabel}>{statusLabel}</span>
        <span className={styles.percentage}>{data.progress}%</span>
      </div>

      <div className={styles.bar}>
        <div
          className={styles.barFill}
          style={{ width: `${data.progress}%` }}
        />
      </div>

      <div className={styles.details}>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Ads Processed</span>
          <span className={styles.detailValue}>
            {data.adsProcessed} / {data.adsTotal || "—"}
          </span>
        </div>
        {data.currentBrand && (
          <div className={styles.detail}>
            <span className={styles.detailLabel}>Current Brand</span>
            <span className={styles.detailValue}>{data.currentBrand}</span>
          </div>
        )}
        {data.currentRegion && (
          <div className={styles.detail}>
            <span className={styles.detailLabel}>Region</span>
            <span className={styles.detailValue}>{data.currentRegion}</span>
          </div>
        )}
      </div>
    </div>
  );
}
