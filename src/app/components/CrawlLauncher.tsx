"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  onCrawlStarted: (jobId: string) => void;
  disabled?: boolean;
}

const MARKETS = [
  { code: "US", flag: "🇺🇸" },
  { code: "UK", flag: "🇬🇧" },
  { code: "AU", flag: "🇦🇺" },
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

  const BRANDS_PER_MARKET = 10;
  const estimatedBrands = selectedMarkets.length * BRANDS_PER_MARKET;
  const estimatedAds = estimatedBrands * 5;
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
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      {/* Markets */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Markets
        </label>
        <div className="flex gap-2.5">
          {MARKETS.map((m) => {
            const active = selectedMarkets.includes(m.code);
            return (
              <button
                key={m.code}
                type="button"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-md border text-sm font-medium transition-all cursor-pointer ${
                  active
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : "border-border bg-muted/50 text-muted-foreground hover:border-emerald-500/50 hover:text-foreground"
                }`}
                onClick={() => toggleMarket(m.code)}
              >
                <span className="text-lg">{m.flag}</span>
                <span>{m.code}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Keyword */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Keyword
        </label>
        <Input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="creatine gummies"
          className="max-w-[360px] bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Estimate */}
      <div className="max-w-[360px] p-4 bg-muted/50 rounded-md border border-border/40">
        {[
          { label: "Brands", value: `~${estimatedBrands} (${selectedMarkets.join(", ")}) auto-discovered` },
          { label: "Ads per brand", value: "5" },
          { label: "Estimated ads", value: String(estimatedAds) },
          { label: "Estimated cost", value: estimatedCost },
        ].map((row) => (
          <div key={row.label} className="flex justify-between items-center py-1 text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-semibold text-foreground font-mono text-xs">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={disabled || loading || selectedMarkets.length === 0}
        className="max-w-[240px] bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white font-bold shadow-[0_4px_14px_rgba(0,200,150,0.3)] hover:shadow-[0_6px_20px_rgba(0,200,150,0.4)] hover:-translate-y-0.5 transition-all"
      >
        {loading ? (
          <span className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          "🔬 Start Crawl"
        )}
      </Button>
    </form>
  );
}
