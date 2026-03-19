"use client";

import { useState, useCallback, useEffect } from "react";
import styles from "./AdExplorer.module.css";

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
  scriptBreakdown: string;
  visual: string;
  psychology: string;
  cta: string;
  keyTakeaways: string;
  productionFormula: string;
  adLibraryId: string;
  adLibraryUrl: string;
  videoUrl: string | null;
  landingPageUrl: string;
  durationSeconds: number | null;
  videoFormat: string | null;
  impressionsUpper: string | null;
  pageName: string | null;
  status: string;
}

interface FiltersState {
  region: string;
  brand: string;
  creativePattern: string;
  minLongevity: string;
  minIterations: string;
  minScore: string;
  sort: string;
  order: string;
}

interface FilterOptions {
  regions: string[];
  patterns: string[];
  brands: string[];
}

function FieldBlock({ label, content }: { label: string; content: string }) {
  const [open, setOpen] = useState(false);
  if (!content) return null;
  const preview = content.slice(0, 200);
  const isLong = content.length > 200;

  return (
    <div className={styles.fieldBlock}>
      <button className={styles.fieldLabel} onClick={() => setOpen(!open)}>
        <span>{label}</span>
        {isLong && <span className={styles.chevron}>{open ? "▾" : "▸"}</span>}
      </button>
      <div className={styles.fieldContent}>
        {open || !isLong ? content : `${preview}...`}
      </div>
    </div>
  );
}

export default function AdExplorer() {
  const [ads, setAds] = useState<AdRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    regions: [],
    patterns: [],
    brands: [],
  });
  const [filters, setFilters] = useState<FiltersState>({
    region: "",
    brand: "",
    creativePattern: "",
    minLongevity: "",
    minIterations: "",
    minScore: "",
    sort: "adScore",
    order: "desc",
  });
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const fetchAds = useCallback(async (pageNum: number = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.region) params.set("region", filters.region);
      if (filters.brand) params.set("brand", filters.brand);
      if (filters.creativePattern) params.set("creativePattern", filters.creativePattern);
      if (filters.minLongevity) params.set("minLongevity", filters.minLongevity);
      if (filters.minIterations) params.set("minIterations", filters.minIterations);
      if (filters.minScore) params.set("minScore", filters.minScore);
      params.set("sort", filters.sort);
      params.set("order", filters.order);
      params.set("limit", String(pageSize));
      params.set("offset", String(pageNum * pageSize));

      const res = await fetch(`/api/ads?${params}`);
      const data = await res.json();
      setAds(data.ads || []);
      setTotal(data.total || 0);
      if (data.filters) setFilterOptions(data.filters);
    } catch {
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load on mount
  useEffect(() => {
    fetchAds(0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    setPage(0);
    fetchAds(0);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchAds(newPage);
  };

  const updateFilter = (key: keyof FiltersState, val: string) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const totalPages = Math.ceil(total / pageSize);

  const patternColors: Record<string, string> = {
    "Problem-First UGC": "#7c3aed",
    "Result-First Scroll Stop": "#f59e0b",
    "Curiosity Gap": "#0891b2",
    "Social Proof Cascade": "#ec4899",
    "Comparison/Versus": "#059669",
    "Authority Demo": "#0563c1",
    Unclassifiable: "#64748b",
  };

  return (
    <div>
      {/* Filter Controls */}
      <div className={styles.filterBar}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterGroupLabel}>Market</label>
            <select
              value={filters.region}
              onChange={(e) => updateFilter("region", e.target.value)}
              className={styles.select}
            >
              <option value="">All</option>
              {filterOptions.regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterGroupLabel}>Pattern</label>
            <select
              value={filters.creativePattern}
              onChange={(e) => updateFilter("creativePattern", e.target.value)}
              className={styles.select}
            >
              <option value="">All</option>
              {filterOptions.patterns.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterGroupLabel}>Brand</label>
            <input
              type="text"
              value={filters.brand}
              onChange={(e) => updateFilter("brand", e.target.value)}
              placeholder="Search brand..."
              className={styles.input}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterGroupLabel}>Min Longevity</label>
            <input
              type="number"
              value={filters.minLongevity}
              onChange={(e) => updateFilter("minLongevity", e.target.value)}
              placeholder="0"
              min="0"
              className={styles.inputSmall}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterGroupLabel}>Min Iterations</label>
            <input
              type="number"
              value={filters.minIterations}
              onChange={(e) => updateFilter("minIterations", e.target.value)}
              placeholder="0"
              min="0"
              className={styles.inputSmall}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterGroupLabel}>Min Score</label>
            <input
              type="number"
              value={filters.minScore}
              onChange={(e) => updateFilter("minScore", e.target.value)}
              placeholder="0"
              min="0"
              max="10"
              step="0.5"
              className={styles.inputSmall}
            />
          </div>
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterGroupLabel}>Sort By</label>
            <select
              value={filters.sort}
              onChange={(e) => updateFilter("sort", e.target.value)}
              className={styles.select}
            >
              <option value="adScore">AdScore</option>
              <option value="longevityDays">Longevity</option>
              <option value="adIterationCount">Iterations</option>
              <option value="durationSeconds">Duration</option>
              <option value="brand">Brand</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterGroupLabel}>Order</label>
            <select
              value={filters.order}
              onChange={(e) => updateFilter("order", e.target.value)}
              className={styles.select}
            >
              <option value="desc">Highest First</option>
              <option value="asc">Lowest First</option>
            </select>
          </div>

          <button onClick={handleSearch} disabled={loading} className={styles.searchBtn}>
            {loading ? "Loading..." : `Search (${total} results)`}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className={styles.results}>
        {ads.map((ad) => (
          <div key={ad.id} className={styles.adCard}>
            <div
              className={styles.adHeader}
              onClick={() => setExpandedCard(expandedCard === ad.id ? null : ad.id)}
            >
              <div className={styles.adScore}>
                <span className={styles.scoreNum}>{ad.adScore.toFixed(1)}</span>
                <span className={styles.scoreUnit}>score</span>
              </div>
              <div className={styles.adInfo}>
                <div className={styles.adTitle}>
                  <strong>{ad.brand}</strong>
                  <span className={styles.regionTag}>{ad.region}</span>
                  {ad.creativePattern && (
                    <span
                      className={styles.patternTag}
                      style={{ background: patternColors[ad.creativePattern] || "#64748b" }}
                    >
                      {ad.creativePattern}
                    </span>
                  )}
                </div>
                <div className={styles.adMeta}>
                  {ad.longevityDays}d longevity · {ad.adIterationCount ?? "—"} iterations
                  {ad.durationSeconds ? ` · ${Math.round(ad.durationSeconds)}s` : ""}
                  {ad.hookType ? ` · ${ad.hookType.slice(0, 40)}` : ""}
                </div>
              </div>
              <div className={styles.adLinks}>
                {ad.adLibraryUrl && (
                  <a href={ad.adLibraryUrl} target="_blank" rel="noopener noreferrer"
                    className={styles.linkBtn} onClick={(e) => e.stopPropagation()}>
                    Ad
                  </a>
                )}
                {ad.videoUrl && (
                  <a href={ad.videoUrl} target="_blank" rel="noopener noreferrer"
                    className={styles.linkBtn} onClick={(e) => e.stopPropagation()}>
                    Video
                  </a>
                )}
              </div>
              <span className={styles.expandIcon}>{expandedCard === ad.id ? "▾" : "▸"}</span>
            </div>

            {expandedCard === ad.id && (
              <div className={styles.adBody}>
                <FieldBlock label="Hook Analysis" content={ad.hook} />
                <FieldBlock label="Concept" content={ad.concept} />
                <FieldBlock label="Script Breakdown" content={ad.scriptBreakdown} />
                <FieldBlock label="Visual" content={ad.visual} />
                <FieldBlock label="Psychology" content={ad.psychology} />
                <FieldBlock label="CTA" content={ad.cta} />
                <FieldBlock label="Key Takeaways" content={ad.keyTakeaways} />
                <FieldBlock label="Production Formula" content={ad.productionFormula} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 0}
            className={styles.pageBtn}
          >
            Prev
          </button>
          <span className={styles.pageInfo}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages - 1}
            className={styles.pageBtn}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
