"use client";

import { useState, useRef } from "react";
import styles from "./AdAnalyzer.module.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AnalysisResult {
  success: boolean;
  error?: string;
  transcript: string;
  durationSeconds: number;
  videoFormat: string;
  frameCount: number;
  analysis: {
    hook: string;
    concept: string;
    scriptBreakdown: string;
    visual: string;
    psychology: string;
    cta: string;
    keyTakeaways: string;
    productionFormula: string;
    hookType: string;
    primaryAngle: string;
    frameworkName: string;
    creativePattern: string;
  };
}

function FieldBlock({ label, content }: { label: string; content: string }) {
  const [open, setOpen] = useState(true);
  if (!content) return null;

  return (
    <div className={styles.fieldBlock}>
      <button className={styles.fieldLabel} onClick={() => setOpen(!open)}>
        <span>{label}</span>
        <span className={styles.chevron}>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className={styles.fieldContent}>{content}</div>
      )}
    </div>
  );
}

export default function AdAnalyzer() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"url" | "upload">("url");
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");

  const handleAnalyzeUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Analysis failed");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error — check the server logs");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeFile = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("video", file);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Analysis failed");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error — check the server logs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Mode Toggle */}
      <div className={styles.modeToggle}>
        <button
          className={`${styles.modeBtn} ${mode === "url" ? styles.modeActive : ""}`}
          onClick={() => setMode("url")}
        >
          URL Input
        </button>
        <button
          className={`${styles.modeBtn} ${mode === "upload" ? styles.modeActive : ""}`}
          onClick={() => setMode("upload")}
        >
          Video Upload
        </button>
      </div>

      {/* URL Input */}
      {mode === "url" && (
        <div className={styles.inputRow}>
          <Input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste Meta Ad Library URL or direct video URL..."
            className={cn(
              styles.urlInput,
              'border-1 border-white ring-1 ring-slate-700'
            )}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyzeUrl()}
          />
          <Button
            onClick={handleAnalyzeUrl}
            disabled={loading || !url.trim()}
            className={styles.analyzeBtn}
          >
            {loading ? (
              <><span className={styles.spinner} /> Analyzing...</>
            ) : (
              "Analyze"
            )}
          </Button>
        </div>
      )}

      {/* File Upload */}
      {mode === "upload" && (
        <div className={styles.uploadArea}>
          <input
            type="file"
            ref={fileRef}
            accept="video/*"
            className={styles.fileInput}
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFileName(f ? f.name : "");
            }}
          />
          <div className={styles.uploadBox} onClick={() => fileRef.current?.click()}>
            <span className={styles.uploadIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </span>
            <span className={styles.uploadText}>
              {fileName || "Click to select a video file"}
            </span>
          </div>
          <button
            onClick={handleAnalyzeFile}
            disabled={loading || !fileName}
            className={styles.analyzeBtn}
          >
            {loading ? (
              <><span className={styles.spinner} /> Analyzing...</>
            ) : (
              "Analyze Video"
            )}
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className={styles.loadingBar}>
          <div className={styles.loadingProgress} />
          <span>Downloading video, extracting frames, transcribing audio, running Sonnet analysis...</span>
        </div>
      )}

      {/* Error */}
      {error && <div className={styles.errorMsg}>{error}</div>}

      {/* Result */}
      {result && result.success && (
        <div className={styles.resultContainer}>
          {/* Meta Row */}
          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Duration</span>
              <span className={styles.metaValue}>{Math.round(result.durationSeconds)}s</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Format</span>
              <span className={styles.metaValue}>{result.videoFormat}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Frames Analyzed</span>
              <span className={styles.metaValue}>{result.frameCount}</span>
            </div>
            {result.analysis.hookType && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Hook Type</span>
                <span className={styles.metaValue}>{result.analysis.hookType}</span>
              </div>
            )}
            {result.analysis.creativePattern && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Pattern</span>
                <span className={styles.metaValue}>{result.analysis.creativePattern}</span>
              </div>
            )}
            {result.analysis.frameworkName && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Framework</span>
                <span className={styles.metaValue}>{result.analysis.frameworkName}</span>
              </div>
            )}
          </div>

          {/* Transcript */}
          {result.transcript && (
            <div className={styles.transcriptBlock}>
              <h4 className={styles.transcriptTitle}>Full Transcript</h4>
              <div className={styles.transcriptText}>{result.transcript}</div>
            </div>
          )}

          {/* Analysis Fields */}
          <div className={styles.analysisFields}>
            <FieldBlock label="Hook Analysis" content={result.analysis.hook} />
            <FieldBlock label="Concept / Big Idea" content={result.analysis.concept} />
            <FieldBlock label="Script Breakdown" content={result.analysis.scriptBreakdown} />
            <FieldBlock label="Visual Roll" content={result.analysis.visual} />
            <FieldBlock label="Consumer Psychology" content={result.analysis.psychology} />
            <FieldBlock label="CTA Analysis" content={result.analysis.cta} />
            <FieldBlock label="Key Takeaways (STEAL / KAIZEN / UPGRADE)" content={result.analysis.keyTakeaways} />
            <FieldBlock label="Production Formula" content={result.analysis.productionFormula} />
          </div>
        </div>
      )}
    </div>
  );
}
