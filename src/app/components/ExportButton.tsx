"use client";

import { useState } from "react";
import styles from "./ExportButton.module.css";

interface Props {
  jobId: string;
  label?: string;
}

export default function ExportButton({ jobId, label }: Props) {
  const [downloading, setDownloading] = useState(false);

  const handleExport = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/export?jobId=${jobId}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `antigravity-intelligence-${jobId}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        console.error("Export failed:", await res.text());
      }
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      className={styles.exportBtn}
      onClick={handleExport}
      disabled={downloading}
    >
      {downloading ? (
        <span className={styles.spinner} />
      ) : (
        <span className={styles.icon}>📊</span>
      )}
      <span>{label || `Export Job ${jobId.slice(0, 8)}`}</span>
    </button>
  );
}
