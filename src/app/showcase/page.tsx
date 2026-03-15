"use client";

import styles from "./showcase.module.css";

/* ══════════════════════════════════════════════════════════════════════════════
   /showcase — Visual diagrams for the Antigravity showcase document.
   Open this page and screenshot each section for the document.
   ══════════════════════════════════════════════════════════════════════════════ */

// ── Sample data for the diagrams ──
const BRAND_DATA = [
  { name: "Create Wellness", count: 23, market: "US", color: "#00c896" },
  { name: "Omni Creatine", count: 18, market: "US", color: "#0563c1" },
  { name: "Bear Balanced", count: 15, market: "US", color: "#7c3aed" },
  { name: "Force Factor", count: 14, market: "US", color: "#ec4899" },
  { name: "Novomins", count: 12, market: "UK", color: "#f59e0b" },
  { name: "Legion Athletics", count: 11, market: "US", color: "#06b6d4" },
  { name: "Bounce Nutrition", count: 9, market: "US", color: "#8b5cf6" },
  { name: "Thurst", count: 8, market: "AU", color: "#10b981" },
  { name: "Animal Pak", count: 7, market: "UK", color: "#f97316" },
  { name: "OVRLOAD", count: 6, market: "US", color: "#64748b" },
  { name: "Momentous", count: 5, market: "US", color: "#6366f1" },
  { name: "Swoly", count: 4, market: "US", color: "#a855f7" },
];

const RANK_DATA = [
  { rank: 1, brand: "Create Wellness", market: "US", longevity: 142, impressions: "3.2M", iterations: 8, duration: "45s", score: 8.7, pattern: "Problem-First UGC", highlight: true },
  { rank: 2, brand: "Omni Creatine", market: "US", longevity: 118, impressions: "2.8M", iterations: 12, duration: "30s", score: 8.4, pattern: "Result-First Scroll Stop", highlight: true },
  { rank: 3, brand: "Bear Balanced", market: "US", longevity: 95, impressions: "1.5M", iterations: 6, duration: "60s", score: 7.9, pattern: "Social Proof Cascade", highlight: true },
  { rank: 4, brand: "Novomins", market: "UK", longevity: 87, impressions: "900K", iterations: 4, duration: "35s", score: 7.2, pattern: "Curiosity Gap", highlight: true },
  { rank: 5, brand: "Force Factor", market: "US", longevity: 76, impressions: "2.1M", iterations: 3, duration: "25s", score: 7.0, pattern: "Authority Demo", highlight: true },
  { rank: 6, brand: "Thurst", market: "AU", longevity: 64, impressions: "420K", iterations: 5, duration: "40s", score: 6.5, pattern: "Comparison/Versus", highlight: false },
  { rank: 7, brand: "Legion Athletics", market: "US", longevity: 52, impressions: "1.1M", iterations: 2, duration: "55s", score: 6.1, pattern: "Problem-First UGC", highlight: false },
  { rank: 8, brand: "Bounce Nutrition", market: "US", longevity: 38, impressions: "680K", iterations: 3, duration: "28s", score: 5.4, pattern: "Result-First Scroll Stop", highlight: false },
];

const COST_DATA = [
  { name: "Claude Sonnet (AI Analysis)", value: 2.25, color: "#7c3aed", percent: 84.6 },
  { name: "Apify (Meta Ad Library)", value: 0.38, color: "#0563c1", percent: 14.3 },
  { name: "Strategic Summary", value: 0.03, color: "#00c896", percent: 1.1 },
];

export default function ShowcasePage() {
  const maxBrandCount = BRAND_DATA[0].count;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div>
          <h1 className={styles.pageTitle}>Project Antigravity — Visual Diagrams</h1>
          <p className={styles.pageSubtitle}>Screenshot each section below for the showcase document</p>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            1. PHILOSOPHY DIAGRAM
            ═══════════════════════════════════════════════════════════ */}
        <section className={styles.diagram} id="core-philosophy">
          <span className={styles.diagramLabel}>Diagram 1</span>
          <h2 className={styles.diagramTitle}>Core Philosophy</h2>
          <p className={styles.diagramDesc}>Three distinct roles — no overlap, no confusion</p>

          <div className={styles.philosophyFlow}>
            {/* DATA */}
            <div className={styles.philosophyNode}>
              <div className={styles.philosophyIconBox}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#00c896" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                </svg>
              </div>
              <div className={styles.philosophyNodeTitle}>Data</div>
              <div className={styles.philosophyNodeRole}>Picks the Winners</div>
              <div className={styles.philosophyTags}>
                <span className={styles.philosophyTag}>Longevity (90+ days)</span>
                <span className={styles.philosophyTag}>Impressions</span>
                <span className={styles.philosophyTag}>Iteration Count</span>
                <span className={styles.philosophyTag}>Duration</span>
              </div>
            </div>

            {/* Arrow */}
            <div className={styles.philosophyArrow}>
              <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                <path d="M0 12H34" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
                <path d="M30 6L38 12L30 18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* AI */}
            <div className={styles.philosophyNode}>
              <div className={styles.philosophyIconBox}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93" />
                  <path d="M8.24 4.47A4 4 0 0 1 12 2" />
                  <path d="M12 6v6" />
                  <circle cx="12" cy="18" r="4" />
                  <path d="M12 22v-4" />
                  <path d="m4.93 4.93 2.83 2.83" />
                  <path d="m16.24 7.76 2.83-2.83" />
                </svg>
              </div>
              <div className={styles.philosophyNodeTitle}>AI</div>
              <div className={styles.philosophyNodeRole}>Describes Them</div>
              <div className={styles.philosophyTags}>
                <span className={styles.philosophyTag}>Hook Type</span>
                <span className={styles.philosophyTag}>Creative Pattern</span>
                <span className={styles.philosophyTag}>Framework</span>
                <span className={styles.philosophyTag}>8-Field Analysis</span>
              </div>
            </div>

            {/* Arrow */}
            <div className={styles.philosophyArrow}>
              <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                <path d="M0 12H34" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
                <path d="M30 6L38 12L30 18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* HUMANS */}
            <div className={styles.philosophyNode}>
              <div className={styles.philosophyIconBox}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className={styles.philosophyNodeTitle}>Humans</div>
              <div className={styles.philosophyNodeRole}>Decide What to Build</div>
              <div className={styles.philosophyTags}>
                <span className={styles.philosophyTag}>Review Top 5</span>
                <span className={styles.philosophyTag}>Watch Videos</span>
                <span className={styles.philosophyTag}>Build Creatives</span>
              </div>
            </div>
          </div>

          <div className={styles.philosophyQuote}>
            &quot;Data picks the winners. AI describes them. Humans decide what to build.&quot;
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            2. PIPELINE FUNNEL
            ═══════════════════════════════════════════════════════════ */}
        <section className={styles.diagram} id="pipeline-funnel">
          <span className={styles.diagramLabel}>Diagram 2</span>
          <h2 className={styles.diagramTitle}>The Pipeline Funnel</h2>
          <p className={styles.diagramDesc}>From 600 raw ads down to the best 75, fully analyzed</p>

          <div className={styles.funnelWrap}>
            {[
              { width: "100%", label: "Bulk Crawl", desc: "3 Apify calls · ~10 min", count: "~600 ads", color: "#7c3aed" },
              { width: "55%", label: "Metadata Filter", desc: "Keyword check · instant · free", count: "~300 ads", color: "#6366f1" },
              { width: "35%", label: "Group by Brand", desc: "Top 20 brands · 5 ads each", count: "~100 ads", color: "#0563c1" },
              { width: "25%", label: "Pre-Rank", desc: "Data signals · no AI · instant", count: "~100 ranked", color: "#ec4899" },
              { width: "18%", label: "Sonnet Analysis", desc: "8-field forensic breakdown", count: "~75 analyzed", color: "#00c896" },
              { width: "10%", label: "Top Winners", desc: "Diversity-constrained", count: "Top 5", color: "#f59e0b" },
            ].map((step, i) => (
              <div key={i}>
                <div className={styles.funnelStep}>
                  <div
                    className={styles.funnelBar}
                    style={{
                      width: step.width,
                      background: `linear-gradient(90deg, ${step.color}, ${step.color}88)`,
                      minWidth: "120px",
                    }}
                  >
                    {step.count}
                    <div className={styles.funnelLabel}>
                      <div className={styles.funnelLabelTitle}>{step.label}</div>
                      <div className={styles.funnelLabelDesc}>{step.desc}</div>
                    </div>
                  </div>
                </div>
                {i < 5 && <div className={styles.funnelArrowDown}>&#x25BC;</div>}
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            3. BRAND GROUPING BAR CHART
            ═══════════════════════════════════════════════════════════ */}
        <section className={styles.diagram} id="brand-discovery">
          <span className={styles.diagramLabel}>Diagram 3</span>
          <h2 className={styles.diagramTitle}>Dynamic Brand Discovery</h2>
          <p className={styles.diagramDesc}>Brands auto-discovered from keyword search, sorted by ad count (most active first)</p>

          <div className={styles.barChart}>
            {BRAND_DATA.map((brand) => (
              <div key={brand.name} className={styles.barRow}>
                <div className={styles.barLabel}>{brand.name}</div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{
                      width: `${(brand.count / maxBrandCount) * 100}%`,
                      background: `linear-gradient(90deg, ${brand.color}, ${brand.color}66)`,
                    }}
                  />
                </div>
                <span className={styles.barMarket}>{brand.market}</span>
                <span className={styles.barCount}>{brand.count}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            4. PRE-RANKING TABLE
            ═══════════════════════════════════════════════════════════ */}
        <section className={styles.diagram} id="pre-ranking">
          <span className={styles.diagramLabel}>Diagram 4</span>
          <h2 className={styles.diagramTitle}>Pre-Ranking — Data-Driven Ad Scoring</h2>
          <p className={styles.diagramDesc}>
            AdScore = Longevity (40%) + Impressions (25%) + Iterations (25%) + Duration (10%) — scored BEFORE any AI runs
          </p>

          <table className={styles.rankTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>Brand</th>
                <th>Market</th>
                <th>Longevity</th>
                <th>Impressions</th>
                <th>Iterations</th>
                <th>Duration</th>
                <th>Pattern</th>
                <th>AdScore</th>
              </tr>
            </thead>
            <tbody>
              {RANK_DATA.map((row) => (
                <tr key={row.rank} className={row.highlight ? styles.highlightRow : undefined}>
                  <td>
                    <span
                      className={styles.rankBadge}
                      style={{
                        background: row.rank <= 3 ? "#00c896" : row.rank <= 5 ? "#f59e0b" : "#374151",
                      }}
                    >
                      {row.rank}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{row.brand}</td>
                  <td><span className={styles.barMarket}>{row.market}</span></td>
                  <td className={styles.metricCell}>{row.longevity}d</td>
                  <td className={styles.metricCell}>{row.impressions}</td>
                  <td className={styles.metricCell}>{row.iterations}x</td>
                  <td className={styles.metricCell}>{row.duration}</td>
                  <td><span className={styles.patternBadge}>{row.pattern}</span></td>
                  <td>
                    <span className={`${styles.scoreCell} ${row.score >= 7.5 ? styles.scoreHigh : row.score >= 6 ? styles.scoreMid : styles.scoreLow}`}>
                      {row.score.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            5. COST BREAKDOWN PIE CHART
            ═══════════════════════════════════════════════════════════ */}
        <section className={styles.diagram} id="cost-breakdown">
          <span className={styles.diagramLabel}>Diagram 5</span>
          <h2 className={styles.diagramTitle}>Cost Per Full Crawl</h2>
          <p className={styles.diagramDesc}>3 markets, ~75 ads fully analyzed — under $3 total</p>

          <div className={styles.costLayout}>
            <div className={styles.pieWrap}>
              <svg className={styles.pieSvg} viewBox="0 0 100 100">
                {/* Sonnet — 84.6% */}
                <circle cx="50" cy="50" r="40" fill="none" stroke="#7c3aed" strokeWidth="18"
                  strokeDasharray={`${84.6 * 2.51} ${(100 - 84.6) * 2.51}`}
                  strokeDashoffset="0" />
                {/* Apify — 14.3% */}
                <circle cx="50" cy="50" r="40" fill="none" stroke="#0563c1" strokeWidth="18"
                  strokeDasharray={`${14.3 * 2.51} ${(100 - 14.3) * 2.51}`}
                  strokeDashoffset={`${-84.6 * 2.51}`} />
                {/* Summary — 1.1% */}
                <circle cx="50" cy="50" r="40" fill="none" stroke="#00c896" strokeWidth="18"
                  strokeDasharray={`${1.1 * 2.51} ${(100 - 1.1) * 2.51}`}
                  strokeDashoffset={`${-(84.6 + 14.3) * 2.51}`} />
              </svg>
              <div className={styles.pieCenter}>
                <div className={styles.pieCenterAmount}>$2.66</div>
                <div className={styles.pieCenterLabel}>per crawl</div>
              </div>
            </div>

            <div className={styles.costLegend}>
              {COST_DATA.map((item) => (
                <div key={item.name} className={styles.costItem}>
                  <span className={styles.costDot} style={{ background: item.color }} />
                  <span className={styles.costName}>{item.name}</span>
                  <span className={styles.costValue}>
                    ${item.value.toFixed(2)}
                    <span className={styles.costPercent}>({item.percent}%)</span>
                  </span>
                </div>
              ))}
              <div className={styles.costItem} style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <span className={styles.costDot} style={{ background: "transparent" }} />
                <span className={styles.costName} style={{ fontWeight: 800, color: "var(--text-primary)" }}>Metadata + Pre-Rank</span>
                <span className={styles.costValue} style={{ color: "var(--accent-green)" }}>$0.00</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            6. ARCHITECTURE DIAGRAM
            ═══════════════════════════════════════════════════════════ */}
        <section className={styles.diagram} id="system-architecture">
          <span className={styles.diagramLabel}>Diagram 6</span>
          <h2 className={styles.diagramTitle}>System Architecture</h2>
          <p className={styles.diagramDesc}>Full data flow from user click to Google Sheet delivery</p>

          <div className={styles.archFlow}>
            {/* User */}
            <div className={styles.archNode} style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
              <div className={styles.archNodeIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="7" r="4" /><path d="M5.5 21a8.38 8.38 0 0 1 13 0" /></svg>
              </div>
              <div className={styles.archNodeTitle}>User clicks &quot;Start Crawl&quot;</div>
              <div className={styles.archNodeDesc}>Selects US / UK / AU markets</div>
            </div>

            <div className={styles.archConnector}>
              <div className={styles.archConnectorLine} />
              <div className={styles.archConnectorArrow}>&#x25BC;</div>
            </div>

            {/* Dashboard */}
            <div className={styles.archNode} style={{ background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.3)" }}>
              <div className={styles.archNodeIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
              </div>
              <div className={styles.archNodeTitle}>Next.js Dashboard</div>
              <div className={styles.archNodeDesc}>POST /api/crawl → spawns Python</div>
            </div>

            <div className={styles.archConnector}>
              <div className={styles.archConnectorLine} />
              <div className={styles.archConnectorArrow}>&#x25BC;</div>
            </div>

            {/* Pipeline */}
            <div className={styles.archPhases}>
              {[
                { label: "1. Bulk Crawl", color: "#7c3aed" },
                { label: "2. Filter", color: "#6366f1" },
                { label: "3. Group", color: "#0563c1" },
                { label: "4. Pre-Rank", color: "#ec4899" },
                { label: "5. AI Analysis", color: "#00c896" },
                { label: "6. Summary", color: "#f59e0b" },
              ].map((p) => (
                <span key={p.label} className={styles.archPhase} style={{ background: p.color }}>{p.label}</span>
              ))}
            </div>

            {/* External services branch */}
            <div className={styles.archConnector}>
              <div className={styles.archConnectorArrow}>&#x25BC;</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>connects to</div>
            </div>

            <div className={styles.archRow} style={{ gap: 16 }}>
              {[
                { icon: "🔍", title: "Apify", desc: "Meta Ad Library", bg: "rgba(5, 99, 193, 0.1)", border: "rgba(5, 99, 193, 0.3)" },
                { icon: "🤖", title: "Claude Sonnet", desc: "Forensic Analysis", bg: "rgba(124, 58, 237, 0.1)", border: "rgba(124, 58, 237, 0.3)" },
                { icon: "🎙️", title: "faster-whisper", desc: "Speech-to-Text", bg: "rgba(236, 72, 153, 0.1)", border: "rgba(236, 72, 153, 0.3)" },
              ].map((svc) => (
                <div key={svc.title} className={styles.archNode} style={{ background: svc.bg, border: `1px solid ${svc.border}`, flex: 1 }}>
                  <div className={styles.archNodeIcon}>{svc.icon}</div>
                  <div className={styles.archNodeTitle}>{svc.title}</div>
                  <div className={styles.archNodeDesc}>{svc.desc}</div>
                </div>
              ))}
            </div>

            <div className={styles.archConnector}>
              <div className={styles.archConnectorLine} />
              <div className={styles.archConnectorArrow}>&#x25BC;</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>saves to</div>
            </div>

            {/* Storage */}
            <div className={styles.archNode} style={{ background: "rgba(14, 165, 233, 0.1)", border: "1px solid rgba(14, 165, 233, 0.3)", width: "100%", maxWidth: 300 }}>
              <div className={styles.archNodeIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" /><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" /></svg>
              </div>
              <div className={styles.archNodeTitle}>Neon PostgreSQL</div>
              <div className={styles.archNodeDesc}>Source of truth · 32-field AdRecord</div>
            </div>

            <div className={styles.archConnector}>
              <div className={styles.archConnectorLine} />
              <div className={styles.archConnectorArrow}>&#x25BC;</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>delivers to</div>
            </div>

            {/* Outputs */}
            <div className={styles.archRow} style={{ gap: 16 }}>
              {[
                { icon: "📊", title: "Google Sheets", desc: "5-tab intelligence file", bg: "rgba(0, 200, 150, 0.1)", border: "rgba(0, 200, 150, 0.3)" },
                { icon: "📋", title: "Excel Backup", desc: ".xlsx with styling", bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.3)" },
                { icon: "🏆", title: "Dashboard", desc: "Top Winners + Summary", bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.3)" },
              ].map((out) => (
                <div key={out.title} className={styles.archNode} style={{ background: out.bg, border: `1px solid ${out.border}`, flex: 1 }}>
                  <div className={styles.archNodeIcon}>{out.icon}</div>
                  <div className={styles.archNodeTitle}>{out.title}</div>
                  <div className={styles.archNodeDesc}>{out.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            7. STRATEGIC SUMMARY MOCK (Dashboard-style)
            ═══════════════════════════════════════════════════════════ */}
        <section className={styles.diagram} id="strategic-summary">
          <span className={styles.diagramLabel}>Diagram 7</span>
          <h2 className={styles.diagramTitle}>Strategic Summary — Dashboard View</h2>
          <p className={styles.diagramDesc}>What the creative team sees after a crawl completes</p>

          <div className={styles.summaryMock}>
            <div className={styles.summaryHeader}>
              <div className={styles.summaryHeaderTitle}>
                <span style={{ fontSize: 22 }}>🏆</span> Strategic Summary — US / UK / AU
              </div>
              <span style={{ fontSize: 12, color: "var(--accent-green)", fontWeight: 600 }}>75 ads analyzed</span>
            </div>

            <div className={styles.summaryGrid}>
              {/* Dominant Patterns */}
              <div className={styles.summaryCard}>
                <div className={`${styles.summaryCardTitle} ${styles.green}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="m18 9-5 5-4-4-3 3" /></svg>
                  Dominant Patterns
                </div>
                {[
                  { name: "Problem-First UGC", count: 28, pct: 37, color: "#00c896" },
                  { name: "Result-First Scroll Stop", count: 19, pct: 25, color: "#7c3aed" },
                  { name: "Curiosity Gap", count: 12, pct: 16, color: "#0563c1" },
                  { name: "Social Proof Cascade", count: 9, pct: 12, color: "#ec4899" },
                  { name: "Authority Demo", count: 5, pct: 7, color: "#f59e0b" },
                  { name: "Comparison/Versus", count: 2, pct: 3, color: "#64748b" },
                ].map((p) => (
                  <div key={p.name} className={styles.patternRow}>
                    <span className={styles.patternName}>{p.name}</span>
                    <div className={styles.patternBarTrack}>
                      <div className={styles.patternBarFill} style={{ width: `${p.pct}%`, background: p.color }} />
                    </div>
                    <span className={styles.patternCount}>{p.count}</span>
                  </div>
                ))}
              </div>

              {/* Top 5 Winners */}
              <div className={styles.summaryCard}>
                <div className={`${styles.summaryCardTitle} ${styles.amber}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7" /><path d="M4 22h16" /><path d="M10 22V8a2 2 0 0 0-2-2H6v0" /><path d="M14 22V8a2 2 0 0 1 2-2h2v0" /><path d="M12 2v6" /></svg>
                  Top 5 Winners by AdScore
                </div>
                {[
                  { rank: 1, brand: "Create Wellness", market: "US", hook: "Problem-Curiosity", score: 8.7, color: "#00c896" },
                  { rank: 2, brand: "Omni Creatine", market: "US", hook: "Before/After Reveal", score: 8.4, color: "#00c896" },
                  { rank: 3, brand: "Bear Balanced", market: "US", hook: "Social Proof Stack", score: 7.9, color: "#00c896" },
                  { rank: 4, brand: "Novomins", market: "UK", hook: "Myth-Buster Open", score: 7.2, color: "#f59e0b" },
                  { rank: 5, brand: "Force Factor", market: "US", hook: "Authority Flex", score: 7.0, color: "#f59e0b" },
                ].map((w) => (
                  <div key={w.rank} className={styles.winnerRow}>
                    <span className={styles.winnerRank} style={{ background: w.rank <= 3 ? "#00c896" : "#f59e0b" }}>
                      {w.rank}
                    </span>
                    <div className={styles.winnerInfo}>
                      <div className={styles.winnerBrand}>{w.brand}</div>
                      <div className={styles.winnerMeta}>{w.market} · {w.hook}</div>
                    </div>
                    <span className={styles.winnerScore}>{w.score}</span>
                  </div>
                ))}
              </div>

              {/* Market Insights */}
              <div className={`${styles.summaryCard} ${styles.summaryCardFull}`}>
                <div className={`${styles.summaryCardTitle} ${styles.blue}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                  Market-Specific Insights
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  {[
                    {
                      market: "US",
                      flag: "🇺🇸",
                      insights: [
                        { text: "Problem-First UGC dominates (42% of top ads)", highlight: "Problem-First UGC" },
                        { text: "Gym-bro positioning wins over wellness angle", highlight: "Gym-bro positioning" },
                        { text: "15-30s duration sweet spot for highest AdScores", highlight: "15-30s" },
                      ],
                    },
                    {
                      market: "UK",
                      flag: "🇬🇧",
                      insights: [
                        { text: "Curiosity Gap hooks outperform US patterns 2:1", highlight: "Curiosity Gap" },
                        { text: "Authority Demo underexploited — only 1 brand uses it", highlight: "underexploited" },
                        { text: "Longer-form (45-60s) content shows stronger longevity", highlight: "45-60s" },
                      ],
                    },
                    {
                      market: "AU",
                      flag: "🇦🇺",
                      insights: [
                        { text: "Wellness-first angle dominates over gym culture", highlight: "Wellness-first" },
                        { text: "Social Proof Cascade is the winning pattern", highlight: "Social Proof Cascade" },
                        { text: "Smallest market but highest avg iteration count", highlight: "highest avg iteration" },
                      ],
                    },
                  ].map((m) => (
                    <div key={m.market}>
                      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{m.flag}</span> {m.market}
                      </div>
                      {m.insights.map((ins, i) => (
                        <div key={i} className={styles.insightItem}>
                          <span className={styles.insightIcon} style={{ color: "var(--accent-green)" }}>&#x2022;</span>
                          <span className={styles.insightText}>
                            {ins.text.split(ins.highlight).map((part, j, arr) => (
                              <span key={j}>
                                {part}
                                {j < arr.length - 1 && <span className={styles.insightHighlight}>{ins.highlight}</span>}
                              </span>
                            ))}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className={`${styles.summaryCard} ${styles.summaryCardFull}`}>
                <div className={`${styles.summaryCardTitle} ${styles.purple}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                  Strategic Recommendations for FusiForce
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                  {[
                    { label: "STEAL", color: "#00c896", icon: ">>", items: ["Problem-First UGC with gym-bro talent (US)", "Before/After reveal hooks (highest scroll-stop rate)"] },
                    { label: "KAIZEN", color: "#f59e0b", icon: "↑", items: ["Extend best-performing hooks to 30-45s format", "Add Social Proof elements to existing UGC"] },
                    { label: "UPGRADE", color: "#7c3aed", icon: "★", items: ["Authority Demo + Wellness positioning for UK/AU — zero competitors doing this. Biggest moat opportunity."] },
                  ].map((rec) => (
                    <div key={rec.label}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 999, background: `${rec.color}22`, color: rec.color, fontSize: 11, fontWeight: 800, marginBottom: 12, letterSpacing: 1 }}>
                        {rec.icon} {rec.label}
                      </div>
                      {rec.items.map((item, i) => (
                        <div key={i} className={styles.insightItem}>
                          <span className={styles.insightIcon} style={{ color: rec.color }}>&#x2022;</span>
                          <span className={styles.insightText}>{item}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer note */}
        <p className={styles.screenshotHint}>
          Tip: Use browser DevTools (Ctrl+Shift+P → &quot;Capture node screenshot&quot;) to screenshot individual sections cleanly
        </p>
      </div>
    </div>
  );
}
