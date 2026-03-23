"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image as ImageIcon,
  Globe,
  Link,
  X,
  Plus,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Eye,
  Trash2,
} from "lucide-react";
import { useStudio } from "../_state/context";
import { useLandingPageScrape } from "../_hooks/useLandingPageScrape";
import { MOTIVATORS, EMOTIONAL_TONES, STORYLINE_TYPES } from "../_constants";
import { fileToBase64 } from "../_utils/helpers";
import type { AdAnalysis } from "@/lib/studio/types";

// ── Fuzzy detection: map ad analysis → our constant values ──

const MOTIVATOR_KEYWORDS: Record<string, string[]> = {
  "pain-point": ["pain", "frustrat", "struggle", "problem", "agitat", "tired of"],
  "aspiration": ["aspir", "transform", "dream", "desire", "pleasure", "imagin", "result"],
  "social-proof": ["social proof", "everyone", "people", "reviews", "testimonial", "million"],
  "curiosity": ["curiosity", "curiosity gap", "secret", "didn't know", "information gap"],
  "urgency": ["urgen", "scarci", "fear", "fomo", "limited", "last chance", "running out"],
  "identity": ["identity", "persona", "who you are", "tribe", "community"],
  "feature-led": ["feature", "attribute", "specification", "ingredient", "formula"],
  "problem-solution": ["problem.?solution", "before.?after", "PAS", "bridge"],
  "authority": ["authority", "expert", "doctor", "scientist", "credib", "research"],
  "comparison": ["comparison", "versus", "vs\\.?", "competitor", "alternative", "better than"],
};

const TONE_KEYWORDS: Record<string, string[]> = {
  "inspirational": ["inspir", "transform", "aspir", "motivat", "empower"],
  "relatable": ["relat", "pain", "problem", "frustrat", "struggle", "empathy"],
  "urgent": ["urgen", "scarci", "limited", "countdown", "fomo"],
  "calm": ["calm", "reassur", "trust", "premium", "serene", "gentle"],
  "humorous": ["humor", "funny", "satir", "comedy", "laugh", "pattern interrupt"],
  "educational": ["educat", "inform", "learn", "explain", "science", "mechanism"],
  "emotional": ["emotion", "heartfelt", "sentimental", "touching", "feel"],
};

const STORYLINE_KEYWORDS: Record<string, string[]> = {
  "founder-story": ["founder", "origin", "why.?creat", "started"],
  "day-in-the-life": ["day.?in", "routine", "lifestyle", "daily"],
  "problem-solution": ["problem.?solution", "before.?after", "PAS", "bridge", "AIDA"],
  "things-you-didnt-know": ["didn't know", "surprising", "fact", "myth", "educati"],
  "behind-the-scenes": ["behind.?the", "how it's made", "BTS", "making of"],
  "testimonial": ["testimonial", "review", "UGC", "customer.?story", "experience"],
  "unboxing": ["unboxing", "first impression", "discovery", "reveal"],
};

function detectMatch(text: string, keywords: Record<string, string[]>): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  let bestMatch: string | null = null;
  let bestScore = 0;
  for (const [value, patterns] of Object.entries(keywords)) {
    let score = 0;
    for (const pattern of patterns) {
      if (new RegExp(pattern, "i").test(lower)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = value;
    }
  }
  return bestScore > 0 ? bestMatch : null;
}

function useDetectedStrategy(adAnalysis: AdAnalysis | undefined) {
  return useMemo(() => {
    if (!adAnalysis) return { motivator: null, tone: null, storyline: null };
    const combined = [
      adAnalysis.hookType,
      adAnalysis.primaryAngle,
      adAnalysis.psychology,
      adAnalysis.hook,
      adAnalysis.concept,
    ].join(" ");
    return {
      motivator: detectMatch(combined, MOTIVATOR_KEYWORDS),
      tone: detectMatch(combined, TONE_KEYWORDS),
      storyline: detectMatch(
        [adAnalysis.frameworkName, adAnalysis.creativePattern, adAnalysis.scriptBreakdown].join(" "),
        STORYLINE_KEYWORDS
      ),
    };
  }, [adAnalysis]);
}

// ── Brand/Product auto-fill types ──

interface BrandProduct {
  id: string;
  name: string;
  landingPageUrls: string[];
  images: string[];
  bigIdea: string | null;
  productInfo: string | null;
  targetAudience: string | null;
}

interface BrandOption {
  id: string;
  name: string;
  products: BrandProduct[];
}

// ── Analysis field display ──

function AnalysisRefField({ label, content }: { label: string; content?: string }) {
  if (!content) return null;
  return (
    <div className="rounded-md border border-border/50 bg-background/50 p-3">
      <h4 className="text-[11px] font-semibold uppercase text-muted-foreground mb-1">{label}</h4>
      <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  );
}

export function StepProduct() {
  const { s, dispatch } = useStudio();
  const {
    handleAddUrl,
    handleRemoveUrl,
    handleUrlChange,
    handleScrapeLandingPages,
    loadSavedProfileUrls,
  } = useLandingPageScrape();

  const adAnalysis = s.analysis?.adAnalysis;
  const detected = useDetectedStrategy(adAnalysis);
  const [showAnalysisRef, setShowAnalysisRef] = useState(true);

  // Brand/product auto-fill
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");

  // Auto-populate URLs from saved product profiles on mount
  useEffect(() => { loadSavedProfileUrls(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch brands for auto-fill
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/brand-config");
        if (res.ok) {
          const data = await res.json();
          setBrands(
            (data.brands || []).filter(
              (b: BrandOption) => b.products.length > 0
            )
          );
        }
      } catch {
        /* silent */
      }
    })();
  }, []);

  const selectedBrand = brands.find((b) => b.id === selectedBrandId);
  const selectedProduct = selectedBrand?.products.find(
    (p) => p.id === selectedProductId
  );

  const handleAutoFill = () => {
    if (!selectedProduct) return;
    if (selectedProduct.bigIdea)
      dispatch({ type: "SET_FIELD", field: "bigIdea", value: selectedProduct.bigIdea });
    if (selectedProduct.productInfo)
      dispatch({ type: "SET_FIELD", field: "productInfo", value: selectedProduct.productInfo });
    if (selectedProduct.targetAudience)
      dispatch({ type: "SET_FIELD", field: "targetAudience", value: selectedProduct.targetAudience });
    if (selectedProduct.landingPageUrls?.length)
      dispatch({ type: "SET_FIELD", field: "landingPageUrls", value: selectedProduct.landingPageUrls });
    if (selectedProduct.images?.length && selectedProduct.images[0])
      dispatch({ type: "SET_PRODUCT_IMAGE", data: selectedProduct.images[0] });
  };

  const handleImageUpload = useCallback(
    async (
      e: React.ChangeEvent<HTMLInputElement>,
      field: "SET_PRODUCT_IMAGE" | "SET_CREATOR_IMAGE"
    ) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      // For product image: use first file as primary
      const base64 = await fileToBase64(files[0]);
      dispatch({ type: field, data: base64 });
    },
    [dispatch]
  );

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Product & Creator Setup</h2>

      {/* Brand/Product auto-fill */}
      {brands.length > 0 && (
        <div className="flex items-end gap-3 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
          <div className="flex-1">
            <label className="text-xs font-medium text-blue-400 mb-1 block">
              Auto-fill from saved brand
            </label>
            <div className="flex gap-2">
              <select
                value={selectedBrandId}
                onChange={(e) => {
                  setSelectedBrandId(e.target.value);
                  setSelectedProductId("");
                }}
                className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-sm"
              >
                <option value="">Select brand...</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {selectedBrand && (
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-sm"
                >
                  <option value="">Select product...</option>
                  {selectedBrand.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <button
            onClick={handleAutoFill}
            disabled={!selectedProduct}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-md text-xs font-medium shrink-0"
          >
            <Sparkles size={12} />
            Auto-fill
          </button>
        </div>
      )}

      {/* Original Ad Analysis Reference */}
      {adAnalysis && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-500/10 transition-colors"
            onClick={() => setShowAnalysisRef(!showAnalysisRef)}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-amber-400">
              <Eye size={14} />
              Original Ad Analysis
              {adAnalysis.hookType && (
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">
                  {adAnalysis.hookType}
                </span>
              )}
              {adAnalysis.creativePattern && (
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300">
                  {adAnalysis.creativePattern}
                </span>
              )}
            </span>
            {showAnalysisRef ? <ChevronDown size={14} className="text-amber-400" /> : <ChevronRight size={14} className="text-amber-400" />}
          </button>
          {showAnalysisRef && (
            <div className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AnalysisRefField label="Concept / Big Idea" content={adAnalysis.concept} />
                <AnalysisRefField label="Hook" content={adAnalysis.hook} />
                <AnalysisRefField label="Psychology" content={adAnalysis.psychology} />
                <AnalysisRefField label="CTA" content={adAnalysis.cta} />
                <AnalysisRefField label="Visual Strategy" content={adAnalysis.visual} />
                <AnalysisRefField label="Script Breakdown" content={adAnalysis.scriptBreakdown} />
                <AnalysisRefField label="Key Takeaways" content={adAnalysis.keyTakeaways} />
                <AnalysisRefField label="Production Formula" content={adAnalysis.productionFormula} />
              </div>
              {/* Classification badges */}
              <div className="flex flex-wrap gap-2">
                {adAnalysis.primaryAngle && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    Angle: {adAnalysis.primaryAngle}
                  </span>
                )}
                {adAnalysis.frameworkName && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    Framework: {adAnalysis.frameworkName}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product image */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Product Image <span className="text-red-400">*</span>
          </label>
          <label className="block border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground transition-colors relative group">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleImageUpload(e, "SET_PRODUCT_IMAGE")}
            />
            {s.productImage ? (
              <>
                <img
                  src={s.productImage}
                  alt="Product"
                  className="h-32 mx-auto rounded"
                />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dispatch({ type: "SET_PRODUCT_IMAGE", data: "" });
                  }}
                  className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </>
            ) : (
              <>
                <ImageIcon
                  size={24}
                  className="mx-auto mb-2 text-muted-foreground"
                />
                <p className="text-sm text-muted-foreground">
                  Upload product image
                </p>
              </>
            )}
          </label>
        </div>

        {/* Creator image */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Creator/Character Image (optional)
          </label>
          <label className="block border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground transition-colors relative group">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e, "SET_CREATOR_IMAGE")}
            />
            {s.creatorImage ? (
              <>
                <img
                  src={s.creatorImage}
                  alt="Creator"
                  className="h-32 mx-auto rounded"
                />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dispatch({ type: "SET_CREATOR_IMAGE", data: "" });
                  }}
                  className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </>
            ) : (
              <>
                <ImageIcon
                  size={24}
                  className="mx-auto mb-2 text-muted-foreground"
                />
                <p className="text-sm text-muted-foreground">
                  Upload creator face
                </p>
              </>
            )}
          </label>
        </div>
      </div>

      {/* Landing Page URLs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Globe size={14} />
            Landing Page URLs
            <span className="text-xs font-normal text-muted-foreground">
              (AI auto-fills fields below)
            </span>
          </label>
          <button
            onClick={handleScrapeLandingPages}
            disabled={
              s.isScrapingUrls || !s.landingPageUrls.some((u) => u.trim())
            }
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer"
          >
            {s.isScrapingUrls ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {s.isScrapingUrls ? "Scraping..." : "Auto-fill from URLs"}
          </button>
        </div>
        {s.landingPageUrls.map((url, i) => (
          <div key={i} className="flex gap-2">
            <div className="relative flex-1">
              <Link
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="url"
                value={url}
                onChange={(e) => handleUrlChange(i, e.target.value)}
                placeholder="https://example.com/product"
                className="w-full bg-background border border-border rounded px-3 py-2 pl-8 text-sm"
              />
            </div>
            {s.landingPageUrls.length > 1 && (
              <button
                onClick={() => handleRemoveUrl(i)}
                className="p-2 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={handleAddUrl}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Plus size={14} />
          Add another URL
        </button>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">
            Big Idea / Core Message <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={s.bigIdea}
            onChange={(e) =>
              dispatch({
                type: "SET_FIELD",
                field: "bigIdea",
                value: e.target.value,
              })
            }
            placeholder='e.g. "This creatine gummy changed my gym performance in 2 weeks"'
            className="w-full bg-background border border-border rounded px-3 py-2 text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Product Info</label>
          <textarea
            value={s.productInfo}
            onChange={(e) =>
              dispatch({
                type: "SET_FIELD",
                field: "productInfo",
                value: e.target.value,
              })
            }
            placeholder="Creatine monohydrate gummies, 5g per serving, berry flavor..."
            className="w-full bg-background border border-border rounded px-3 py-2 text-sm mt-1 h-20 resize-y"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Target Audience</label>
          <input
            type="text"
            value={s.targetAudience}
            onChange={(e) =>
              dispatch({
                type: "SET_FIELD",
                field: "targetAudience",
                value: e.target.value,
              })
            }
            placeholder="Men 18-35 interested in fitness and bodybuilding"
            className="w-full bg-background border border-border rounded px-3 py-2 text-sm mt-1"
          />
        </div>
      </div>

      {/* Creative Strategy */}
      <div className="border-t border-border pt-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            Creative Strategy
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
              Meta Ads AI Stack
            </span>
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Different motivators reach different audiences via Andromeda&apos;s
            embedding system. &quot;Creative is the new targeting.&quot;
          </p>
        </div>

        {/* Motivator */}
        <div>
          <label className="text-sm font-medium">Primary Motivator</label>
          <p className="text-xs text-muted-foreground mb-2">
            The psychological driver that makes someone take action
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {MOTIVATORS.map((m) => {
              const isDetected = detected.motivator === m.value;
              const isSelected = s.motivator === m.value;
              const isMatch = isSelected && isDetected;
              return (
                <button
                  key={m.value}
                  onClick={() =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "motivator",
                      value: s.motivator === m.value ? "" : m.value,
                    })
                  }
                  className={`text-left px-3 py-2 rounded-md border text-xs transition-colors relative ${
                    isMatch
                      ? "border-green-500 bg-green-500/15 text-green-300 ring-1 ring-green-500/30"
                      : isSelected
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                      : isDetected
                      ? "border-amber-500/40 bg-amber-500/5 text-foreground"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  {isDetected && !isSelected && (
                    <span className="absolute -top-1.5 -right-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 leading-none">
                      Detected
                    </span>
                  )}
                  {isMatch && (
                    <span className="absolute -top-1.5 -right-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 leading-none">
                      Match
                    </span>
                  )}
                  <span className="font-medium block">{m.label}</span>
                  <span className="text-muted-foreground block mt-0.5 leading-tight">
                    {m.desc}
                  </span>
                </button>
              );
            })}
          </div>
          {s.motivator && (
            <div className="mt-2 bg-muted/30 rounded px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                Hook templates:{" "}
              </span>
              {MOTIVATORS.find((m) => m.value === s.motivator)?.hook}
            </div>
          )}
        </div>

        {/* Emotional Tone */}
        <div>
          <label className="text-sm font-medium">Emotional Tone</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {EMOTIONAL_TONES.map((t) => {
              const isDetected = detected.tone === t.value;
              const isSelected = s.emotionalTone === t.value;
              const isMatch = isSelected && isDetected;
              return (
                <button
                  key={t.value}
                  onClick={() =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "emotionalTone",
                      value: s.emotionalTone === t.value ? "" : t.value,
                    })
                  }
                  className={`px-3 py-1.5 rounded-md border text-xs transition-colors relative ${
                    isMatch
                      ? "border-green-500 bg-green-500/15 text-green-300 ring-1 ring-green-500/30"
                      : isSelected
                      ? "border-blue-500 bg-blue-500/10 text-blue-300"
                      : isDetected
                      ? "border-amber-500/40 bg-amber-500/5 text-foreground"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  {isDetected && !isSelected && (
                    <span className="absolute -top-1.5 -right-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 leading-none">
                      Detected
                    </span>
                  )}
                  {isMatch && (
                    <span className="absolute -top-1.5 -right-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 leading-none">
                      Match
                    </span>
                  )}
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Storyline Type */}
        <div>
          <label className="text-sm font-medium">Storyline Type</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {STORYLINE_TYPES.map((st) => {
              const isDetected = detected.storyline === st.value;
              const isSelected = s.storylineType === st.value;
              const isMatch = isSelected && isDetected;
              return (
                <button
                  key={st.value}
                  onClick={() =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "storylineType",
                      value: s.storylineType === st.value ? "" : st.value,
                    })
                  }
                  className={`px-3 py-1.5 rounded-md border text-xs transition-colors relative ${
                    isMatch
                      ? "border-green-500 bg-green-500/15 text-green-300 ring-1 ring-green-500/30"
                      : isSelected
                      ? "border-purple-500 bg-purple-500/10 text-purple-300"
                      : isDetected
                      ? "border-amber-500/40 bg-amber-500/5 text-foreground"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  {isDetected && !isSelected && (
                    <span className="absolute -top-1.5 -right-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 leading-none">
                      Detected
                    </span>
                  )}
                  {isMatch && (
                    <span className="absolute -top-1.5 -right-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 leading-none">
                      Match
                    </span>
                  )}
                  <span className="font-medium">{st.label}</span>
                  <span className="text-muted-foreground ml-1">
                    — {st.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
