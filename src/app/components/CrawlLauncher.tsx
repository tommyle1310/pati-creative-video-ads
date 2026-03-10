"use client";

import { useState, type FormEvent } from "react";
import styles from "./CrawlLauncher.module.css";

interface Props {
  onCrawlStarted: (jobId: string) => void;
  disabled?: boolean;
}

const MARKETS = [
  { code: "US", label: "🇺🇸 United States", flag: "🇺🇸" },
  { code: "UK", label: "🇬🇧 United Kingdom", flag: "🇬🇧" },
  { code: "AU", label: "🇦🇺 Australia", flag: "🇦🇺" },
];

export default function CrawlLauncher({ onCrawlStarted, disabled }: Props) {
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(["US"]);
  const [mode, setMode] = useState<"demo" | "full">("demo");
  const [keyword, setKeyword] = useState("creatine gummies");
  const [loading, setLoading] = useState(false);

  const toggleMarket = (code: string) => {
    setSelectedMarkets((prev) =>
      prev.includes(code)
        ? prev.filter((m) => m !== code)
        : [...prev, code]
    );
  };

  const estimatedAds = mode === "demo" ? 30 : selectedMarkets.length * 5 * 20;
  const estimatedCost = mode === "demo" ? "~$1.10" : `~$${(estimatedAds * 0.036).toFixed(2)}`;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (selectedMarkets.length === 0 || disabled) return;

    setLoading(true);
    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markets: selectedMarkets,
          keyword,
          mode,
          yourBrand: "FusiForce",
        }),
      });
      const data = await res.json();
      if (data.jobId) {
        onCrawlStarted(data.jobId);
      }
    } catch (err) {
      console.error("Failed to start crawl:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.launcher} onSubmit={handleSubmit}>
      {/* Markets */}
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Markets</label>
        <div className={styles.marketGrid}>
          {MARKETS.map((m) => (
            <button
              key={m.code}
              type="button"
              className={`${styles.marketBtn} ${
                selectedMarkets.includes(m.code) ? styles.marketActive : ""
              }`}
              onClick={() => toggleMarket(m.code)}
            >
              <span className={styles.flag}>{m.flag}</span>
              <span>{m.code}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Keyword */}
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Keyword</label>
        <input
          type="text"
          className={styles.input}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="creatine gummies"
        />
      </div>

      {/* Mode */}
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Mode</label>
        <div className={styles.modeToggle}>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === "demo" ? styles.modeActive : ""}`}
            onClick={() => setMode("demo")}
          >
            <span className={styles.modeIcon}>⚡</span>
            <div>
              <strong>Demo</strong>
              <span>30 ads · ~$1.10</span>
            </div>
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === "full" ? styles.modeActive : ""}`}
            onClick={() => setMode("full")}
          >
            <span className={styles.modeIcon}>🚀</span>
            <div>
              <strong>Full</strong>
              <span>300 ads · ~$10.86</span>
            </div>
          </button>
        </div>
      </div>

      {/* Estimate */}
      <div className={styles.estimate}>
        <div className={styles.estimateRow}>
          <span>Estimated ads</span>
          <span className={styles.estimateValue}>{estimatedAds}</span>
        </div>
        <div className={styles.estimateRow}>
          <span>Estimated cost</span>
          <span className={styles.estimateValue}>{estimatedCost}</span>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        className={styles.submitBtn}
        disabled={disabled || loading || selectedMarkets.length === 0}
      >
        {loading ? (
          <span className={styles.spinner} />
        ) : (
          <>🔬 Start Crawl</>
        )}
      </button>
    </form>
  );
}
