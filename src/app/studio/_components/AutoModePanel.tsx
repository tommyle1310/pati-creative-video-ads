"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Upload,
  Sparkles,
  Loader2,
  X,
  Plus,
  Download,
  Square,
  Play,
  Maximize2,
  Check,
  AlertCircle,
  Zap,
  UserPlus,
  Eye,
} from "lucide-react";
import { useStudio } from "../_state/context";
import { useAutoGenerate, type AutoPhase } from "../_hooks/useAutoGenerate";
import { fileToBase64 } from "../_utils/helpers";
import { PreviewModal } from "./PreviewModal";
import { VoicePicker } from "./VoicePicker";

// ── Brand/Product/Character types (same as StepProduct) ──

interface BrandProduct {
  id: string;
  name: string;
  landingPageUrls: string[];
  images: string[];
  bigIdea: string | null;
  productInfo: string | null;
  targetAudience: string | null;
}

interface BrandCharacter {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  voiceId: string | null;
  voiceSource: string | null;
  voiceName: string | null;
}

interface BrandOption {
  id: string;
  name: string;
  products: BrandProduct[];
  characters: BrandCharacter[];
}

// ── Phase config for progress display ──

const PHASES: { key: AutoPhase; label: string; icon: string }[] = [
  { key: "analyzing", label: "Analyze", icon: "1" },
  { key: "scripting", label: "Script", icon: "2" },
  { key: "storyboarding", label: "Storyboard", icon: "3" },
  { key: "uploading-refs", label: "Upload Refs", icon: "4" },
  { key: "generating-images", label: "Images", icon: "5" },
  { key: "generating-audio", label: "Audio", icon: "6" },
  { key: "generating-videos", label: "Videos", icon: "7" },
];

function getPhaseIndex(phase: AutoPhase): number {
  return PHASES.findIndex((p) => p.key === phase);
}

// ── Character prompt generator ──

function CharacterPromptGenerator({
  onGenerated,
}: {
  onGenerated: (imageUrl: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    setPreviewUrl(null);

    try {
      const fullPrompt = `Hyperrealistic portrait photography of a person: ${prompt}. Head and shoulders shot, natural lighting, neutral background, looking at camera. Shot on Canon R5, 85mm f/1.4, studio lighting.`;

      // Try KIE (nano-banana-pro) first, fallback to Vidtory
      let resultUrl: string | null = null;
      try {
        const kieRes = await fetch("/api/studio/kie-generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: fullPrompt, aspectRatio: "1:1" }),
        });
        if (!kieRes.ok) throw new Error((await kieRes.json()).error);
        const { jobId: kieJobId } = await kieRes.json();

        const start = Date.now();
        while (Date.now() - start < 300000) {
          const pollRes = await fetch(`/api/studio/kie-job-status?jobId=${kieJobId}`);
          const data = await pollRes.json();
          if (data.status === "COMPLETED" && data.url) { resultUrl = data.url; break; }
          if (data.status === "FAILED") throw new Error(data.error || "KIE failed");
          await new Promise((r) => setTimeout(r, 5000));
        }
      } catch (kieErr) {
        console.warn("[auto] KIE character gen failed, fallback to Vidtory:", kieErr);
        const vidRes = await fetch("/api/studio/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: fullPrompt, aspectRatio: "1:1" }),
        });
        if (!vidRes.ok) throw new Error((await vidRes.json()).error);
        const { jobId: vidJobId } = await vidRes.json();

        const start = Date.now();
        while (Date.now() - start < 300000) {
          const pollRes = await fetch(`/api/studio/job-status?jobId=${vidJobId}`);
          const data = await pollRes.json();
          if (data.status === "COMPLETED" && data.url) { resultUrl = data.url; break; }
          if (data.status === "FAILED") throw new Error(data.error || "Vidtory failed");
          await new Promise((r) => setTimeout(r, 5000));
        }
      }

      if (resultUrl) {
        setPreviewUrl(resultUrl);
        setIsGenerating(false);
        return;
      }
      throw new Error("Timed out");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-3 p-3 rounded-lg border border-dashed border-violet-500/30 bg-violet-500/5">
      <div className="flex items-center gap-2 text-xs font-medium text-violet-400">
        <UserPlus size={14} />
        Generate New Character
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Young woman, 25, athletic build, brown hair, confident smile"
          className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm"
          onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-3 py-2 rounded text-xs font-medium shrink-0"
        >
          {isGenerating ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          {isGenerating ? "Generating..." : "Preview"}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
      {previewUrl && (
        <div className="flex items-center gap-3">
          <img
            src={previewUrl}
            alt="Generated character"
            className="h-24 w-24 rounded-lg object-cover border border-violet-500/30"
          />
          <button
            onClick={() => onGenerated(previewUrl)}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded text-xs font-medium"
          >
            <Check size={12} />
            Use This Character
          </button>
        </div>
      )}
    </div>
  );
}

// ── Progress Timeline ──

function ProgressTimeline({
  phase,
  detail,
}: {
  phase: AutoPhase;
  detail: string;
}) {
  const currentIdx = getPhaseIndex(phase);
  const isComplete = phase === "complete";
  const isError = phase === "error";

  return (
    <div className="space-y-4">
      {/* Phase dots */}
      <div className="flex items-center gap-1">
        {PHASES.map((p, i) => {
          const isDone = isComplete || i < currentIdx;
          const isCurrent = i === currentIdx && !isComplete && !isError;
          return (
            <div key={p.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isDone
                      ? "bg-emerald-500 text-white"
                      : isCurrent
                      ? "bg-blue-500 text-white ring-4 ring-blue-500/20 animate-pulse"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? <Check size={14} /> : p.icon}
                </div>
                <span
                  className={`text-[10px] mt-1 ${
                    isDone
                      ? "text-emerald-400"
                      : isCurrent
                      ? "text-blue-400 font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {p.label}
                </span>
              </div>
              {i < PHASES.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-1 mt-[-16px] ${
                    isDone ? "bg-emerald-500" : "bg-muted"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      {!isComplete && !isError && currentIdx >= 0 && (
        <div className="space-y-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{
                width: `${((currentIdx + 0.5) / PHASES.length) * 100}%`,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">{detail}</p>
        </div>
      )}

      {/* Complete message */}
      {isComplete && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-emerald-400 font-medium">
          <Check size={16} />
          All assets generated! Scroll down to review.
        </div>
      )}
    </div>
  );
}

// ── Main Component ──

export function AutoModePanel() {
  const { s, dispatch } = useStudio();
  const {
    phase,
    error,
    detail,
    isRunning,
    startAutoGenerate,
    cancelAutoGenerate,
  } = useAutoGenerate();

  // Brand/product/character state
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [showCharacterGen, setShowCharacterGen] = useState(false);
  const [previewModal, setPreviewModal] = useState<{
    type: "image" | "video";
    src: string;
  } | null>(null);

  // Fetch brands
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/brand-config");
        if (res.ok) {
          const data = await res.json();
          const filtered = (data.brands || []).filter(
            (b: BrandOption) => b.products.length > 0
          );
          setBrands(filtered);
          // Auto-select first brand if only one
          if (filtered.length === 1) {
            setSelectedBrandId(filtered[0].id);
            if (filtered[0].products.length === 1) {
              setSelectedProductId(filtered[0].products[0].id);
            }
            if (filtered[0].characters.length === 1) {
              setSelectedCharacterId(filtered[0].characters[0].id);
            }
          }
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
  const selectedCharacter = selectedBrand?.characters.find(
    (c) => c.id === selectedCharacterId
  );

  // Auto-fill from brand selection
  const handleAutoFill = useCallback(() => {
    if (selectedProduct) {
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
    }
    if (selectedCharacter) {
      if (selectedCharacter.imageUrl)
        dispatch({ type: "SET_CREATOR_IMAGE", data: selectedCharacter.imageUrl });
      if (selectedCharacter.voiceId)
        dispatch({ type: "SET_FIELD", field: "voice", value: selectedCharacter.voiceId });
      if (selectedCharacter.voiceSource)
        dispatch({ type: "SET_FIELD", field: "voiceSource", value: selectedCharacter.voiceSource });
      if (selectedCharacter.voiceName)
        dispatch({ type: "SET_FIELD", field: "voiceName", value: selectedCharacter.voiceName });
    }
  }, [selectedProduct, selectedCharacter, dispatch]);

  // Auto-fill when product/character changes
  useEffect(() => {
    if (selectedProduct || selectedCharacter) {
      handleAutoFill();
    }
  }, [selectedProductId, selectedCharacterId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUploadVideo = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      dispatch({ type: "SET_SOURCE_UPLOAD", url, file });
    },
    [dispatch]
  );

  const handleMultiImageUpload = useCallback(
    async (
      e: React.ChangeEvent<HTMLInputElement>,
      target: "product" | "creator"
    ) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const images: string[] = [];
      for (let i = 0; i < files.length; i++) {
        images.push(await fileToBase64(files[i]));
      }
      dispatch({
        type: target === "product" ? "ADD_PRODUCT_IMAGES" : "ADD_CREATOR_IMAGES",
        images,
      });
    },
    [dispatch]
  );

  const canStart =
    !isRunning &&
    !!s.uploadedVideoUrl &&
    !!s.productImage &&
    !!s.bigIdea;

  // Show output grid as soon as scenes exist (even during generation)
  const hasResults = s.scenes.length > 0;

  return (
    <div className="space-y-6">
      {/* ─── INPUT SECTION ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Video Upload */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Upload size={14} />
            Source Video
          </h3>
          {s.uploadedVideoUrl ? (
            <div className="space-y-2">
              <video
                src={s.uploadedVideoUrl}
                controls
                className="w-full max-h-56 rounded-lg border border-border"
              />
              {!isRunning && (
                <button
                  onClick={() => dispatch({ type: "CLEAR_SOURCE" })}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-400 transition-colors"
                >
                  <X size={12} /> Replace video
                </button>
              )}
            </div>
          ) : (
            <label className="block border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all">
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleUploadVideo}
              />
              <Upload size={28} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drop or click to upload a competitor video ad
              </p>
            </label>
          )}
        </div>

        {/* Right: Product & Character */}
        <div className="space-y-4">
          {/* Brand/Product selector */}
          {brands.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles size={14} className="text-blue-400" />
                Brand / Product
              </h3>
              <div className="flex gap-2">
                <select
                  value={selectedBrandId}
                  onChange={(e) => {
                    setSelectedBrandId(e.target.value);
                    setSelectedProductId("");
                    setSelectedCharacterId("");
                  }}
                  disabled={isRunning}
                  className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-sm"
                >
                  <option value="">Select brand...</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {selectedBrand && (
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    disabled={isRunning}
                    className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-sm"
                  >
                    <option value="">Select product...</option>
                    {selectedBrand.products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Character selector */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Eye size={14} className="text-violet-400" />
              Character / Creator
            </h3>
            {selectedBrand && selectedBrand.characters.length > 0 && (
              <select
                value={selectedCharacterId}
                onChange={(e) => setSelectedCharacterId(e.target.value)}
                disabled={isRunning}
                className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm"
              >
                <option value="">Select character...</option>
                {selectedBrand.characters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}

            {/* Selected character preview */}
            {selectedCharacter && selectedCharacter.imageUrl && (
              <div className="flex items-center gap-3 p-2 rounded-lg border border-violet-500/20 bg-violet-500/5">
                <img
                  src={selectedCharacter.imageUrl}
                  alt={selectedCharacter.name}
                  className="h-12 w-12 rounded-lg object-cover border border-violet-500/30"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-violet-300">{selectedCharacter.name}</p>
                  {selectedCharacter.voiceName && (
                    <p className="text-[10px] text-muted-foreground">
                      Voice: {selectedCharacter.voiceName}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Creator image thumbnails */}
            <div className="flex flex-wrap gap-2">
              {s.creatorImages.map((img, i) => (
                <div
                  key={i}
                  className={`relative group cursor-pointer rounded-lg border-2 transition-all overflow-hidden ${
                    s.creatorImage === img
                      ? "border-violet-500 ring-1 ring-violet-500/30"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() =>
                    !isRunning &&
                    dispatch({ type: "SET_CREATOR_IMAGE", data: img })
                  }
                >
                  <img src={img} alt={`Creator ${i + 1}`} className="h-16 w-16 object-cover" />
                  {!isRunning && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: "REMOVE_CREATOR_IMAGE", index: i });
                      }}
                      className="absolute top-0.5 right-0.5 bg-red-500/90 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={8} />
                    </button>
                  )}
                </div>
              ))}
              {!isRunning && (
                <label className="h-16 w-16 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-muted-foreground transition-colors shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleMultiImageUpload(e, "creator")}
                  />
                  <Plus size={12} className="text-muted-foreground" />
                  <span className="text-[8px] text-muted-foreground">Add</span>
                </label>
              )}
            </div>

            {/* Generate character from prompt */}
            {!isRunning && (
              <div>
                <button
                  onClick={() => setShowCharacterGen(!showCharacterGen)}
                  className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                >
                  <UserPlus size={12} />
                  {showCharacterGen ? "Hide" : "Generate character from prompt"}
                </button>
                {showCharacterGen && (
                  <div className="mt-2">
                    <CharacterPromptGenerator
                      onGenerated={(url) => {
                        dispatch({ type: "SET_CREATOR_IMAGE", data: url });
                        setShowCharacterGen(false);
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Product images (compact) */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Product Images</h3>
            <div className="flex flex-wrap gap-2">
              {s.productImages.map((img, i) => (
                <div
                  key={i}
                  className={`relative group cursor-pointer rounded-lg border-2 transition-all overflow-hidden ${
                    s.productImage === img
                      ? "border-emerald-500 ring-1 ring-emerald-500/30"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() =>
                    !isRunning &&
                    dispatch({ type: "SET_PRODUCT_IMAGE", data: img })
                  }
                >
                  <img src={img} alt={`Product ${i + 1}`} className="h-16 w-16 object-cover" />
                  {!isRunning && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: "REMOVE_PRODUCT_IMAGE", index: i });
                      }}
                      className="absolute top-0.5 right-0.5 bg-red-500/90 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={8} />
                    </button>
                  )}
                </div>
              ))}
              {!isRunning && (
                <label className="h-16 w-16 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-muted-foreground transition-colors shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleMultiImageUpload(e, "product")}
                  />
                  <Plus size={12} className="text-muted-foreground" />
                  <span className="text-[8px] text-muted-foreground">Add</span>
                </label>
              )}
            </div>
          </div>

          {/* Settings row */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Aspect Ratio
              </label>
              <select
                value={s.aspectRatio}
                onChange={(e) =>
                  dispatch({ type: "SET_FIELD", field: "aspectRatio", value: e.target.value })
                }
                disabled={isRunning}
                className="bg-background border border-border rounded px-2 py-1.5 text-sm"
              >
                <option value="9:16">9:16</option>
                <option value="16:9">16:9</option>
                <option value="1:1">1:1</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Image Model
              </label>
              <select
                value={s.imageModel}
                onChange={(e) =>
                  dispatch({ type: "SET_FIELD", field: "imageModel", value: e.target.value })
                }
                disabled={isRunning}
                className="bg-background border border-border rounded px-2 py-1.5 text-sm"
              >
                <option value="kie">KIE (Nano Banana Pro)</option>
                <option value="vidtory">Vidtory</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Video Model
              </label>
              <select
                value={s.videoModel}
                onChange={(e) =>
                  dispatch({ type: "SET_FIELD", field: "videoModel", value: e.target.value })
                }
                disabled={isRunning}
                className="bg-background border border-border rounded px-2 py-1.5 text-sm"
              >
                <option value="kie">KIE (Kling 3.0)</option>
                <option value="vidtory">Vidtory</option>
              </select>
            </div>
            <VoicePicker />
          </div>
        </div>
      </div>

      {/* Big Idea (required, may be auto-filled) */}
      {!isRunning && (
        <div>
          <label className="text-sm font-medium">
            Big Idea / Core Message <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={s.bigIdea}
            onChange={(e) =>
              dispatch({ type: "SET_FIELD", field: "bigIdea", value: e.target.value })
            }
            placeholder='e.g. "This creatine gummy changed my gym performance in 2 weeks"'
            className="w-full bg-background border border-border rounded px-3 py-2 text-sm mt-1"
          />
        </div>
      )}

      {/* ─── ACTION BUTTON ─── */}
      <div className="flex items-center justify-center gap-3">
        {isRunning ? (
          <button
            onClick={cancelAutoGenerate}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg text-sm font-medium"
          >
            <Square size={16} />
            Cancel
          </button>
        ) : (
          <button
            onClick={startAutoGenerate}
            disabled={!canStart}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg text-base font-semibold shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Zap size={18} /> 
            Auto-Generate All Assets
          </button>
        )}
      </div>

      {/* Validation hints */}
      {!canStart && !isRunning && (
        <div className="text-center space-y-1">
          {!s.uploadedVideoUrl && (
            <p className="text-xs text-muted-foreground">Upload a source video</p>
          )}
          {!s.productImage && (
            <p className="text-xs text-muted-foreground">Select or upload a product image</p>
          )}
          {!s.bigIdea && (
            <p className="text-xs text-muted-foreground">Enter a Big Idea / Core Message</p>
          )}
        </div>
      )}

      {/* ─── ERROR ─── */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/10">
          <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-red-400 font-medium">Pipeline Error</p>
            <p className="text-xs text-red-400/80 mt-0.5">{error}</p>
            <button
              onClick={startAutoGenerate}
              className="text-xs text-red-400 underline mt-1"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ─── PROGRESS TIMELINE ─── */}
      {(isRunning || phase === "complete") && (
        <div className="p-4 rounded-lg border border-border bg-card">
          <ProgressTimeline phase={phase} detail={detail} />
        </div>
      )}

      {/* ─── ASSET OUTPUT ─── */}
      {hasResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Play size={18} className="text-emerald-400" />
              Generated Assets
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {s.scenes.length} scenes
              </span>
            </h3>
          </div>

          <div className="space-y-4">
            {s.scenes.map((scene, i) => (
              <div
                key={scene.id}
                className="bg-muted/20 border border-border rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-emerald-400">
                    Scene {i + 1}
                  </span>
                  {scene.rollType && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        scene.rollType === "aroll"
                          ? "bg-blue-500/20 text-blue-400"
                          : scene.rollType === "broll"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-purple-500/20 text-purple-400"
                      }`}
                    >
                      {scene.rollType === "aroll"
                        ? "A-ROLL"
                        : scene.rollType === "broll"
                        ? "B-ROLL"
                        : "C-ROLL"}
                    </span>
                  )}
                  {/* Status badges */}
                  {scene.isGeneratingImage && (
                    <Loader2 size={12} className="animate-spin text-blue-400" />
                  )}
                  {scene.isGeneratingVideo && (
                    <Loader2 size={12} className="animate-spin text-emerald-400" />
                  )}
                  {scene.isGeneratingAudio && (
                    <Loader2 size={12} className="animate-spin text-purple-400" />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Video / Image */}
                  <div>
                    {scene.videos[0] ? (
                      <div className="space-y-1">
                        <div className="relative group">
                          <video
                            src={scene.videos[0].url}
                            controls
                            className="w-full rounded-md"
                          />
                          <button
                            onClick={() =>
                              setPreviewModal({
                                type: "video",
                                src: scene.videos[0].url,
                              })
                            }
                            className="absolute top-1 right-1 p-1 bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Maximize2 size={10} className="text-white" />
                          </button>
                        </div>
                        <a
                          href={scene.videos[0].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <Download size={10} /> Download clip
                        </a>
                      </div>
                    ) : scene.images[0] ? (
                      <div className="relative group">
                        <img
                          src={scene.images[0]}
                          alt={`Scene ${i + 1}`}
                          className="w-full rounded-md"
                        />
                        <button
                          onClick={() =>
                            setPreviewModal({
                              type: "image",
                              src: scene.images[0],
                            })
                          }
                          className="absolute top-1 right-1 p-1 bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Maximize2 size={10} className="text-white" />
                        </button>
                      </div>
                    ) : scene.isGeneratingImage || scene.isGeneratingVideo ? (
                      <div className="h-32 bg-muted/30 rounded-md flex items-center justify-center border border-dashed border-border animate-pulse">
                        <Loader2 size={20} className="animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="h-32 bg-muted/20 rounded-md flex items-center justify-center text-muted-foreground text-xs">
                        Pending
                      </div>
                    )}
                  </div>

                  {/* Script + Guide */}
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        Script
                      </p>
                      <p className="text-sm leading-relaxed">
                        {scene.voiceoverScript}
                      </p>
                    </div>
                    {scene.voiceoverGuide && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          Voice Guide
                        </p>
                        <p className="text-xs italic text-muted-foreground">
                          {scene.voiceoverGuide}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Audio */}
                  <div>
                    {scene.audioUrl ? (
                      <audio src={scene.audioUrl} controls className="w-full" />
                    ) : scene.isGeneratingAudio ? (
                      <div className="h-12 bg-purple-500/5 rounded-md flex items-center justify-center gap-2 border border-dashed border-purple-500/20 animate-pulse">
                        <Loader2 size={14} className="animate-spin text-purple-400" />
                        <span className="text-[10px] text-muted-foreground">
                          Generating...
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        Pending
                      </p>
                    )}
                  </div>
                </div>

                {/* Error messages */}
                {(scene.imageGenerationError ||
                  scene.videoGenerationError ||
                  scene.audioGenerationError) && (
                  <div className="mt-2 text-xs text-red-400/80">
                    {scene.imageGenerationError && (
                      <p>Image: {scene.imageGenerationError}</p>
                    )}
                    {scene.videoGenerationError && (
                      <p>Video: {scene.videoGenerationError}</p>
                    )}
                    {scene.audioGenerationError && (
                      <p>Audio: {scene.audioGenerationError}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Post-completion tip */}
          {phase === "complete" && (
            <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
              Download each scene clip above and combine them sequentially in your
              video editor (CapCut, Premiere, DaVinci Resolve). Overlay the audio
              tracks on the timeline.
            </div>
          )}
        </div>
      )}

      <PreviewModal
        preview={previewModal}
        onClose={() => setPreviewModal(null)}
      />
    </div>
  );
}
