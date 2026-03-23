"use client";

import { useCallback, useEffect } from "react";
import {
  Image as ImageIcon,
  Globe,
  Link,
  X,
  Plus,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useStudio } from "../_state/context";
import { useLandingPageScrape } from "../_hooks/useLandingPageScrape";
import { MOTIVATORS, EMOTIONAL_TONES, STORYLINE_TYPES } from "../_constants";
import { fileToBase64 } from "../_utils/helpers";

export function StepProduct() {
  const { s, dispatch } = useStudio();
  const {
    handleAddUrl,
    handleRemoveUrl,
    handleUrlChange,
    handleScrapeLandingPages,
    loadSavedProfileUrls,
  } = useLandingPageScrape();

  // Auto-populate URLs from saved product profiles on mount
  useEffect(() => { loadSavedProfileUrls(); }, []);

  const handleImageUpload = useCallback(
    async (
      e: React.ChangeEvent<HTMLInputElement>,
      field: "SET_PRODUCT_IMAGE" | "SET_CREATOR_IMAGE"
    ) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const base64 = await fileToBase64(file);
      dispatch({ type: field, data: base64 });
    },
    [dispatch]
  );

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Product & Creator Setup</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product image */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Product Image <span className="text-red-400">*</span>
          </label>
          <label className="block border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground transition-colors">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e, "SET_PRODUCT_IMAGE")}
            />
            {s.productImage ? (
              <img
                src={s.productImage}
                alt="Product"
                className="h-32 mx-auto rounded"
              />
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
          <label className="block border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground transition-colors">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e, "SET_CREATOR_IMAGE")}
            />
            {s.creatorImage ? (
              <img
                src={s.creatorImage}
                alt="Creator"
                className="h-32 mx-auto rounded"
              />
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
            {MOTIVATORS.map((m) => (
              <button
                key={m.value}
                onClick={() =>
                  dispatch({
                    type: "SET_FIELD",
                    field: "motivator",
                    value: s.motivator === m.value ? "" : m.value,
                  })
                }
                className={`text-left px-3 py-2 rounded-md border text-xs transition-colors ${
                  s.motivator === m.value
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <span className="font-medium block">{m.label}</span>
                <span className="text-muted-foreground block mt-0.5 leading-tight">
                  {m.desc}
                </span>
              </button>
            ))}
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
            {EMOTIONAL_TONES.map((t) => (
              <button
                key={t.value}
                onClick={() =>
                  dispatch({
                    type: "SET_FIELD",
                    field: "emotionalTone",
                    value: s.emotionalTone === t.value ? "" : t.value,
                  })
                }
                className={`px-3 py-1.5 rounded-md border text-xs transition-colors ${
                  s.emotionalTone === t.value
                    ? "border-blue-500 bg-blue-500/10 text-blue-300"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Storyline Type */}
        <div>
          <label className="text-sm font-medium">Storyline Type</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {STORYLINE_TYPES.map((st) => (
              <button
                key={st.value}
                onClick={() =>
                  dispatch({
                    type: "SET_FIELD",
                    field: "storylineType",
                    value: s.storylineType === st.value ? "" : st.value,
                  })
                }
                className={`px-3 py-1.5 rounded-md border text-xs transition-colors ${
                  s.storylineType === st.value
                    ? "border-purple-500 bg-purple-500/10 text-purple-300"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <span className="font-medium">{st.label}</span>
                <span className="text-muted-foreground ml-1">
                  — {st.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
