"use client";

import { useState } from "react";
import {
  Image as ImageIcon,
  Video,
  Volume2,
  Loader2,
  Plus,
  Maximize2,
  Wand2,
  Mic,
  MicOff,
  ChevronDown,
  ChevronUp,
  FolderOpen,
} from "lucide-react";
import { useStudio } from "../_state/context";
import { useAssetGeneration } from "../_hooks/useAssetGeneration";
import { VOICES } from "../_constants";
import { PreviewModal } from "./PreviewModal";
import { SaveAssetButton } from "./SaveAssetButton";
import { AssetPicker } from "./AssetPicker";
import { GeminiErrorBanner } from "./GeminiErrorBanner";

export function StepGenerate() {
  const { s, dispatch } = useStudio();
  const {
    handleGenerateImage,
    handleGenerateVideo,
    handleGenerateAudio,
    handleGenerateAllImages,
    handleGenerateAllAudio,
    handleEnhancePrompt,
  } = useAssetGeneration();

  const [previewModal, setPreviewModal] = useState<{
    type: "image" | "video";
    src: string;
  } | null>(null);
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(
    new Set()
  );
  const [assetPicker, setAssetPicker] = useState<{
    sceneId: string;
    type: "image" | "video";
  } | null>(null);

  const toggleSceneExpanded = (id: string) => {
    setExpandedScenes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header + controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold">Generate Assets</h2>
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Aspect Ratio
            </label>
            <select
              value={s.aspectRatio}
              onChange={(e) =>
                dispatch({
                  type: "SET_FIELD",
                  field: "aspectRatio",
                  value: e.target.value,
                })
              }
              className="bg-background border border-border rounded px-2 py-1.5 text-sm"
            >
              <option value="9:16">9:16 (Portrait)</option>
              <option value="16:9">16:9 (Landscape)</option>
              <option value="1:1">1:1 (Square)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Voiceover Voice
            </label>
            <select
              value={s.voice}
              onChange={(e) =>
                dispatch({
                  type: "SET_FIELD",
                  field: "voice",
                  value: e.target.value,
                })
              }
              className="bg-background border border-border rounded px-2 py-1.5 text-sm"
            >
              {VOICES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGenerateAllImages}
            disabled={s.scenes.every((sc) => sc.isGeneratingImage)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm"
          >
            {s.scenes.some((sc) => sc.isGeneratingImage) ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ImageIcon size={14} />
            )}
            Generate All Images
          </button>
          <button
            onClick={handleGenerateAllAudio}
            disabled={s.scenes.every((sc) => sc.isGeneratingAudio)}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm"
          >
            {s.scenes.some((sc) => sc.isGeneratingAudio) ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Volume2 size={14} />
            )}
            Generate All Audio
          </button>
        </div>
      </div>

      {/* Scene cards */}
      <div className="space-y-4">
        {s.scenes.map((scene, i) => {
          const isExpanded = expandedScenes.has(scene.id);
          return (
            <div
              key={scene.id}
              className="bg-muted/20 border border-border rounded-lg overflow-hidden"
            >
              {/* Scene header */}
              <button
                onClick={() => toggleSceneExpanded(scene.id)}
                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
              >
                <span className="text-sm font-medium text-emerald-400 shrink-0">
                  Scene {i + 1}
                </span>
                {scene.rollType && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
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
                {/* Status indicators */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {scene.isGeneratingImage && (
                    <Loader2
                      size={12}
                      className="animate-spin text-blue-400"
                    />
                  )}
                  {scene.images.length > 0 && (
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1 rounded">
                      {scene.images.length} img
                    </span>
                  )}
                  {scene.isGeneratingVideo && (
                    <Loader2
                      size={12}
                      className="animate-spin text-emerald-400"
                    />
                  )}
                  {scene.videos.length > 0 && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1 rounded">
                      {scene.videos.length} vid
                    </span>
                  )}
                  {scene.isGeneratingAudio && (
                    <Loader2
                      size={12}
                      className="animate-spin text-purple-400"
                    />
                  )}
                  {scene.audioUrl && (
                    <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1 rounded">
                      audio
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {scene.voiceoverScript.slice(0, 80)}
                  {scene.voiceoverScript.length > 80 ? "..." : ""}
                </span>
                {isExpanded ? (
                  <ChevronUp
                    size={16}
                    className="text-muted-foreground shrink-0"
                  />
                ) : (
                  <ChevronDown
                    size={16}
                    className="text-muted-foreground shrink-0"
                  />
                )}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  {/* Lipsync toggle */}
                  {scene.rollType === "aroll" ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          dispatch({
                            type: "UPDATE_SCENE",
                            id: scene.id,
                            patch: {
                              includeDialogueInPrompt:
                                !scene.includeDialogueInPrompt,
                            },
                          })
                        }
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                          scene.includeDialogueInPrompt
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                            : "border-border text-muted-foreground hover:border-muted-foreground"
                        }`}
                      >
                        {scene.includeDialogueInPrompt ? (
                          <Mic size={12} />
                        ) : (
                          <MicOff size={12} />
                        )}
                        {scene.includeDialogueInPrompt
                          ? "Lipsync ON"
                          : "Lipsync OFF"}
                      </button>
                      <span className="text-[10px] text-muted-foreground">
                        {scene.includeDialogueInPrompt
                          ? "Video will include dialogue for lip-sync"
                          : "Video will be silent (no lip-sync)"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <MicOff size={12} className="text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        {scene.rollType === "broll" ? "B-Roll" : "C-Roll"} —
                        always silent, no lip-sync
                      </span>
                    </div>
                  )}

                  {/* Editable prompts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-blue-400">
                          Image Prompt
                        </label>
                        <button
                          onClick={() =>
                            handleEnhancePrompt(scene.id, "image")
                          }
                          className="text-[10px] px-2 py-0.5 bg-muted hover:bg-muted/80 rounded flex items-center gap-1"
                          title="Enhance with AI"
                        >
                          <Wand2 size={10} /> Enhance
                        </button>
                      </div>
                      <textarea
                        value={scene.imagePrompt}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_SCENE",
                            id: scene.id,
                            patch: { imagePrompt: e.target.value },
                          })
                        }
                        className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs font-mono h-32 resize-y"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-emerald-400">
                          Video Prompt
                        </label>
                        <button
                          onClick={() =>
                            handleEnhancePrompt(scene.id, "video")
                          }
                          className="text-[10px] px-2 py-0.5 bg-muted hover:bg-muted/80 rounded flex items-center gap-1"
                          title="Enhance with AI"
                        >
                          <Wand2 size={10} /> Enhance
                        </button>
                      </div>
                      <textarea
                        value={scene.videoPrompt}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_SCENE",
                            id: scene.id,
                            patch: { videoPrompt: e.target.value },
                          })
                        }
                        className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs font-mono h-32 resize-y"
                      />
                    </div>
                  </div>

                  {/* Generation cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Image Card */}
                    <div className="border border-blue-500/20 bg-blue-500/5 rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold flex items-center gap-1.5 text-blue-400">
                          <ImageIcon size={14} /> Images
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              setAssetPicker({
                                sceneId: scene.id,
                                type: "image",
                              })
                            }
                            className="text-[10px] px-2 py-1.5 border-1 border-slate-700 bg-muted hover:bg-muted/80 rounded-md flex items-center gap-1 text-muted-foreground"
                            title="Use saved image"
                          >
                            <FolderOpen size={10} /> Browse saved imgs
                          </button>
                          <button
                            onClick={() => handleGenerateImage(scene.id)}
                            disabled={scene.isGeneratingImage}
                            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md flex items-center gap-1.5 font-medium"
                          >
                            {scene.isGeneratingImage ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Plus size={12} />
                            )}
                            {scene.isGeneratingImage
                              ? "Generating..."
                              : "New Image"}
                          </button>
                        </div>
                      </div>
                      {scene.imageGenerationError && (
                        <GeminiErrorBanner
                          error={scene.imageGenerationError}
                          onDismiss={() =>
                            dispatch({ type: "UPDATE_SCENE", id: scene.id, patch: { imageGenerationError: null } })
                          }
                        />
                      )}
                      {scene.isGeneratingImage &&
                        scene.images.length === 0 && (
                          <div className="h-28 bg-blue-500/5 rounded-lg flex flex-col items-center justify-center gap-2 border border-dashed border-blue-500/20 animate-pulse">
                            <Loader2
                              size={20}
                              className="animate-spin text-blue-400"
                            />
                            <span className="text-[10px] text-muted-foreground">
                              Generating image...
                            </span>
                          </div>
                        )}
                      <div className="flex gap-1.5 flex-wrap">
                        {scene.images.map((img, j) => (
                          <div key={j} className="relative group">
                            <img
                              src={img}
                              alt={`Scene ${i + 1} image ${j}`}
                              onClick={() =>
                                dispatch({
                                  type: "UPDATE_SCENE",
                                  id: scene.id,
                                  patch: { selectedImageForVideo: img },
                                })
                              }
                              className={`h-48 rounded-md border-2 transition-all ${
                                scene.selectedImageForVideo === img
                                  ? "border-emerald-500 ring-1 ring-emerald-500/30"
                                  : "border-transparent hover:border-muted-foreground"
                              }`}
                            />
                            <div className="absolute top-1 right-1 flex gap-0.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewModal({ type: "image", src: img });
                                }}
                                className="p-1 bg-black/60 rounded  transition-opacity"
                              >
                                <Maximize2
                                  size={10}
                                  className="text-white"
                                />
                              </button>
                              <SaveAssetButton
                                type="image"
                                url={img}
                                defaultName={`Scene ${i + 1} - Image ${j + 1}`}
                                metadata={{ sceneId: scene.id, aspectRatio: s.aspectRatio }}
                              />
                            </div>
                            {scene.selectedImageForVideo === img && (
                              <div className="absolute bottom-1 left-1 text-[8px] bg-emerald-600 text-white px-1 rounded">
                                selected
                              </div>
                            )}
                          </div>
                        ))}
                        {scene.isGeneratingImage &&
                          scene.images.length > 0 && (
                            <div className="h-24 w-16 bg-blue-500/5 rounded-md flex items-center justify-center border border-dashed border-blue-500/20">
                              <Loader2
                                size={14}
                                className="animate-spin text-blue-400"
                              />
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Video Card */}
                    <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold flex items-center gap-1.5 text-emerald-400">
                          <Video size={14} /> Videos
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              setAssetPicker({
                                sceneId: scene.id,
                                type: "video",
                              })
                            }
                            className="text-[10px] px-2 py-1.5 border-1 border-slate-700 bg-muted hover:bg-muted/80 rounded-md flex items-center gap-1 text-muted-foreground"
                            title="Use saved video"
                          >
                            <FolderOpen size={10} /> Browse saved vids
                          </button>
                          <button
                            onClick={() => handleGenerateVideo(scene.id)}
                            disabled={
                              scene.isGeneratingVideo ||
                              !scene.selectedImageForVideo
                            }
                            className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md flex items-center gap-1.5 font-medium"
                          >
                            {scene.isGeneratingVideo ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Plus size={12} />
                            )}
                            {scene.isGeneratingVideo
                              ? "Generating..."
                              : "New Video"}
                          </button>
                        </div>
                      </div>
                      {!scene.selectedImageForVideo &&
                        scene.images.length === 0 && (
                          <p className="text-[10px] text-muted-foreground italic">
                            Generate an image first, then select it
                          </p>
                        )}
                      {scene.videoGenerationError && (
                        <GeminiErrorBanner
                          error={scene.videoGenerationError}
                          onDismiss={() =>
                            dispatch({ type: "UPDATE_SCENE", id: scene.id, patch: { videoGenerationError: null } })
                          }
                        />
                      )}
                      {scene.isGeneratingVideo &&
                        scene.videos.length === 0 && (
                          <div className="h-28 bg-emerald-500/5 rounded-lg flex flex-col items-center justify-center gap-2 border border-dashed border-emerald-500/20 animate-pulse">
                            <Loader2
                              size={20}
                              className="animate-spin text-emerald-400"
                            />
                            <span className="text-[10px] text-muted-foreground">
                              Generating video...
                            </span>
                          </div>
                        )}
                      <div className="space-y-2">
                        {scene.videos.map((v, j) => (
                          <div key={j} className="relative group">
                            <video
                              src={v.url}
                              controls
                              className="w-full max-h-36 rounded-md"
                            />
                            <div className="absolute top-1 right-1 flex gap-0.5">
                              <button
                                onClick={() =>
                                  setPreviewModal({
                                    type: "video",
                                    src: v.url,
                                  })
                                }
                                className="p-1 bg-black/60 rounded  transition-opacity"
                              >
                                <Maximize2
                                  size={10}
                                  className="text-white"
                                />
                              </button>
                              <SaveAssetButton
                                type="video"
                                url={v.url}
                                defaultName={`Scene ${i + 1} - Video ${j + 1}`}
                                metadata={{ sceneId: scene.id, aspectRatio: s.aspectRatio }}
                              />
                            </div>
                          </div>
                        ))}
                        {scene.isGeneratingVideo &&
                          scene.videos.length > 0 && (
                            <div className="h-20 bg-emerald-500/5 rounded-md flex items-center justify-center border border-dashed border-emerald-500/20">
                              <Loader2
                                size={14}
                                className="animate-spin text-emerald-400"
                              />
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Audio Card */}
                    <div className="border border-purple-500/20 bg-purple-500/5 rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold flex items-center gap-1.5 text-purple-400">
                          <Volume2 size={14} /> Audio
                        </span>
                        <button
                          onClick={() => handleGenerateAudio(scene.id)}
                          disabled={scene.isGeneratingAudio}
                          className="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-md flex items-center gap-1.5 font-medium"
                        >
                          {scene.isGeneratingAudio ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Plus size={12} />
                          )}
                          {scene.isGeneratingAudio
                            ? "Generating..."
                            : "New Audio"}
                        </button>
                      </div>
                      {scene.audioGenerationError && (
                        <GeminiErrorBanner
                          error={scene.audioGenerationError}
                          onDismiss={() =>
                            dispatch({ type: "UPDATE_SCENE", id: scene.id, patch: { audioGenerationError: null } })
                          }
                        />
                      )}
                      {scene.isGeneratingAudio && !scene.audioUrl && (
                        <div className="h-16 bg-purple-500/5 rounded-lg flex items-center justify-center gap-2 border border-dashed border-purple-500/20 animate-pulse">
                          <Loader2
                            size={14}
                            className="animate-spin text-purple-400"
                          />
                          <span className="text-[10px] text-muted-foreground">
                            Generating audio...
                          </span>
                        </div>
                      )}
                      {scene.audioUrl && (
                        <audio
                          src={scene.audioUrl}
                          controls
                          className="w-full"
                        />
                      )}
                      {!scene.audioUrl &&
                        !scene.isGeneratingAudio &&
                        !scene.audioGenerationError && (
                          <p className="text-[10px] text-muted-foreground italic">
                            No audio yet
                          </p>
                        )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <PreviewModal
        preview={previewModal}
        onClose={() => setPreviewModal(null)}
      />

      {/* Asset Picker for using saved assets */}
      {assetPicker && (
        <AssetPicker
          open={true}
          onClose={() => setAssetPicker(null)}
          type={assetPicker.type}
          onSelect={(url) => {
            const sceneId = assetPicker.sceneId;
            const scene = s.scenes.find((sc) => sc.id === sceneId);
            if (!scene) return;

            if (assetPicker.type === "image") {
              dispatch({
                type: "UPDATE_SCENE",
                id: sceneId,
                patch: {
                  images: [...scene.images, url],
                  selectedImageForVideo:
                    scene.selectedImageForVideo || url,
                },
              });
            } else {
              dispatch({
                type: "UPDATE_SCENE",
                id: sceneId,
                patch: {
                  videos: [
                    ...scene.videos,
                    { url, mediaGenerationId: "saved", seed: 0 },
                  ],
                },
              });
            }
          }}
        />
      )}
    </div>
  );
}
