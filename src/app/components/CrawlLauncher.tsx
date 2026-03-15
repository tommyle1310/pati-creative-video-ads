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
  const [keyword, setKeyword] = useState("creatine gummies");
  const [loading, setLoading] = useState(false);

  const toggleMarket = (code: string) => {
    setSelectedMarkets((prev) =>
      prev.includes(code)
        ? prev.filter((m) => m !== code)
        : [...prev, code]
    );
  };

  // Dynamic discovery: ~10 brands auto-discovered per market
  const BRANDS_PER_MARKET = 10;
  const estimatedBrands = selectedMarkets.length * BRANDS_PER_MARKET;
  const estimatedAds = estimatedBrands * 5; // 5 ads per brand
  const estimatedCost = `~$${(estimatedAds * 0.036).toFixed(2)}`;

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

      {/* Estimate */}
      <div className={styles.estimate}>
        <div className={styles.estimateRow}>
          <span>Brands</span>
          <span className={styles.estimateValue}>~{estimatedBrands} ({selectedMarkets.join(", ")}) auto-discovered</span>
        </div>
        <div className={styles.estimateRow}>
          <span>Ads per brand</span>
          <span className={styles.estimateValue}>5</span>
        </div>
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
