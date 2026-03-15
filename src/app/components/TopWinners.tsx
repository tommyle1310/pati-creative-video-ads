"use client";

import { useState, useCallback } from "react";
import styles from "./TopWinners.module.css";

interface SelectedAd {
  rank: number;
  selectionReason: string;
  isUnderexploitedArchetype: boolean;
  underexploitedNote: string | null;
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
  adLibraryUrl: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  videoFormat: string | null;
  landingPageUrl: string;
  impressionsUpper: string | null;
  pageName: string | null;
  status: string;
}

interface SelectionMeta {
  totalInDb: number;
  totalEligible: number;
  requested: number;
  returned: number;
  marketsRepresented: string[];
  patternsRepresented: string[];
  exclusionsApplied: number;
}

interface TopWinnersResponse {
  selectedAds: SelectedAd[];
  selectionMeta: SelectionMeta;
  error?: string;
}

// Collapsible section for long text fields
function FieldBlock({ label, content }: { label: string; content: string }) {
  const [open, setOpen] = useState(false);
  if (!content) return null;
  const preview = content.slice(0, 180);
  const isLong = content.length > 180;

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

function PatternBadge({ pattern }: { pattern: string }) {
  const colors: Record<string, string> = {
    "Problem-First UGC": "#7c3aed",
    "Result-First Scroll Stop": "#f59e0b",
    "Curiosity Gap": "#0891b2",
    "Social Proof Cascade": "#ec4899",
    "Comparison/Versus": "#059669",
    "Authority Demo": "#0563c1",
    Unclassifiable: "#64748b",
  };
  return (
    <span
      className={styles.patternBadge}
      style={{ background: colors[pattern] || "#64748b" }}
    >
      {pattern}
    </span>
  );
}

export default function TopWinners() {
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TopWinnersResponse | null>(null);
  const [error, setError] = useState("");
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const fetchWinners = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/top-winners?n=${count}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to fetch");
        return;
      }
      setData(json);
      setExpandedCard(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [count]);

  return (
    <div>
      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.sliderGroup}>
          <label className={styles.sliderLabel}>
            Top <span className={styles.countValue}>{count}</span> Winners
          </label>
          <input
            type="range"
            min={3}
            max={20}
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value))}
            className={styles.slider}
          />
          <div className={styles.sliderMarks}>
            <span>3</span>
            <span>10</span>
            <span>20</span>
          </div>
        </div>
        <button
          onClick={fetchWinners}
          disabled={loading}
          className={styles.analyzeBtn}
        >
          {loading ? (
            <>
              <span className={styles.spinner} /> Analyzing...
            </>
          ) : (
            <>
              <span className={styles.btnIcon}>🏆</span> Find Top {count}{" "}
              Winners
            </>
          )}
        </button>
      </div>

      {error && <div className={styles.errorMsg}>{error}</div>}

      {/* Selection Meta */}
      {data && (
        <div className={styles.metaBar}>
          <span>
            {data.selectionMeta.returned} selected from{" "}
            {data.selectionMeta.totalEligible} eligible (
            {data.selectionMeta.totalInDb} total in DB)
          </span>
          <span className={styles.metaDivider}>·</span>
          <span>
            Markets: {data.selectionMeta.marketsRepresented.join(", ") || "—"}
          </span>
          <span className={styles.metaDivider}>·</span>
          <span>
            Patterns: {data.selectionMeta.patternsRepresented.length} types
          </span>
          {data.selectionMeta.exclusionsApplied > 0 && (
            <>
              <span className={styles.metaDivider}>·</span>
              <span>
                {data.selectionMeta.exclusionsApplied} excluded (too new / no
                data)
              </span>
            </>
          )}
        </div>
      )}

      {/* Winner Cards */}
      {data?.selectedAds.map((ad) => (
        <div
          key={ad.adLibraryUrl}
          className={`${styles.winnerCard} ${ad.rank <= 3 ? styles.goldCard : ""} ${ad.isUnderexploitedArchetype ? styles.moatCard : ""}`}
        >
          {/* Card Header */}
          <div
            className={styles.cardHeader}
            onClick={() =>
              setExpandedCard(expandedCard === ad.rank ? null : ad.rank)
            }
          >
            <div className={styles.rankBadge}>#{ad.rank}</div>
            <div className={styles.cardHeaderInfo}>
              <div className={styles.cardTitle}>
                <strong>{ad.brand}</strong>
                <span className={styles.regionTag}>{ad.region}</span>
                <PatternBadge pattern={ad.creativePattern} />
                {ad.isUnderexploitedArchetype && (
                  <span className={styles.moatTag}>MOAT OPPORTUNITY</span>
                )}
              </div>
              <div className={styles.cardSubtitle}>
                {ad.selectionReason}
              </div>
            </div>
            <div className={styles.scoreGroup}>
              <div className={styles.adScoreBig}>
                {ad.adScore.toFixed(1)}
              </div>
              <div className={styles.scoreLabel}>AdScore</div>
            </div>
            <span className={styles.expandIcon}>
              {expandedCard === ad.rank ? "▾" : "▸"}
            </span>
          </div>

          {/* Quick Stats Row (always visible) */}
          <div className={styles.quickStats}>
            <div className={styles.stat}>
              <span className={styles.statKey}>Longevity</span>
              <span className={styles.statVal}>{ad.longevityDays}d</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statKey}>Iterations</span>
              <span className={styles.statVal}>
                {ad.adIterationCount ?? "—"}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statKey}>Duration</span>
              <span className={styles.statVal}>
                {ad.durationSeconds ? `${Math.round(ad.durationSeconds)}s` : "—"}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statKey}>Format</span>
              <span className={styles.statVal}>{ad.videoFormat || "—"}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statKey}>Hook Type</span>
              <span className={styles.statVal}>{ad.hookType || "—"}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statKey}>Framework</span>
              <span className={styles.statVal}>
                {ad.frameworkName || "—"}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statKey}>Angle</span>
              <span className={styles.statVal}>
                {ad.primaryAngle || "—"}
              </span>
            </div>
            {ad.impressionsUpper && (
              <div className={styles.stat}>
                <span className={styles.statKey}>Impressions</span>
                <span className={styles.statVal}>
                  {parseInt(ad.impressionsUpper).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Links Row */}
          <div className={styles.linksRow}>
            {ad.adLibraryUrl && (
              <a
                href={ad.adLibraryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.adLink}
              >
                View Ad
              </a>
            )}
            {ad.videoUrl && (
              <a
                href={ad.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.adLink}
              >
                Watch Video
              </a>
            )}
            {ad.landingPageUrl && (
              <a
                href={ad.landingPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.adLink}
              >
                Landing Page
              </a>
            )}
          </div>

          {/* Expanded Detail */}
          {expandedCard === ad.rank && (
            <div className={styles.cardBody}>
              {ad.isUnderexploitedArchetype && ad.underexploitedNote && (
                <div className={styles.moatNote}>
                  <strong>Why this is a moat opportunity:</strong>{" "}
                  {ad.underexploitedNote}
                </div>
              )}

              <FieldBlock label="Hook Analysis" content={ad.hook} />
              <FieldBlock label="Concept / Big Idea" content={ad.concept} />
              <FieldBlock
                label="Script Breakdown"
                content={ad.scriptBreakdown}
              />
              <FieldBlock label="Visual Roll" content={ad.visual} />
              <FieldBlock
                label="Consumer Psychology"
                content={ad.psychology}
              />
              <FieldBlock label="CTA Analysis" content={ad.cta} />
              <FieldBlock label="Key Takeaways (STEAL / KAIZEN / UPGRADE)" content={ad.keyTakeaways} />
              <FieldBlock
                label="Production Formula (Ready-to-Shoot)"
                content={ad.productionFormula}
              />
            </div>
          )}
        </div>
      ))}

      {data && data.selectedAds.length === 0 && (
        <div className={styles.emptyState}>
          <p>No eligible winners found. Crawl more ads or lower the threshold.</p>
        </div>
      )}
    </div>
  );
}
