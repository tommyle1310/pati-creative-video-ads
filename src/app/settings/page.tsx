"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings, Loader2, Key, RotateCcw, Check, AlertCircle, Image, Video, Brain, Mic } from "lucide-react";

type Provider = "vidtory" | "kie";
type AiProvider = "gemini" | "claude";

interface SettingsData {
  geminiApiKey: string;
  isUsingCustomGeminiKey: boolean;
  hasEnvGeminiKey: boolean;
  anthropicApiKey: string;
  isUsingCustomAnthropicKey: boolean;
  hasEnvAnthropicKey: boolean;
  groqApiKey: string;
  isUsingCustomGroqKey: boolean;
  hasEnvGroqKey: boolean;
  aiProvider: AiProvider;
  imageApiKey: string;
  imageProvider: Provider;
  isUsingCustomImageKey: boolean;
  hasEnvImageKey: boolean;
  videoApiKey: string;
  videoProvider: Provider;
  isUsingCustomVideoKey: boolean;
  hasEnvVideoKey: boolean;
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Per-section state
  const [geminiKey, setGeminiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [aiProvider, setAiProvider] = useState<AiProvider>("gemini");
  const [imageKey, setImageKey] = useState("");
  const [imageProvider, setImageProvider] = useState<Provider>("vidtory");
  const [videoKey, setVideoKey] = useState("");
  const [videoProvider, setVideoProvider] = useState<Provider>("vidtory");

  const [savingGemini, setSavingGemini] = useState(false);
  const [savingAnthropic, setSavingAnthropic] = useState(false);
  const [savingGroq, setSavingGroq] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [savingVideo, setSavingVideo] = useState(false);
  const [resettingGemini, setResettingGemini] = useState(false);
  const [resettingAnthropic, setResettingAnthropic] = useState(false);
  const [resettingGroq, setResettingGroq] = useState(false);
  const [resettingImage, setResettingImage] = useState(false);
  const [resettingVideo, setResettingVideo] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: SettingsData) => {
        setData(d);
        setAiProvider(d.aiProvider || "gemini");
        setImageProvider(d.imageProvider || "vidtory");
        setVideoProvider(d.videoProvider || "vidtory");
      })
      .catch(() => {});
  }, []);

  const showMessage = useCallback((type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  async function handleSave(section: "gemini" | "anthropic" | "groq" | "image" | "video") {
    const setLoading = section === "gemini" ? setSavingGemini : section === "anthropic" ? setSavingAnthropic : section === "groq" ? setSavingGroq : section === "image" ? setSavingImage : setSavingVideo;
    setLoading(true);
    try {
      const body: Record<string, string> = {};
      if (section === "gemini") {
        if (!geminiKey.trim()) return;
        body.geminiApiKey = geminiKey.trim();
      } else if (section === "anthropic") {
        if (!anthropicKey.trim()) return;
        body.anthropicApiKey = anthropicKey.trim();
      } else if (section === "groq") {
        if (!groqKey.trim()) return;
        body.groqApiKey = groqKey.trim();
      } else if (section === "image") {
        if (!imageKey.trim()) return;
        body.imageApiKey = imageKey.trim();
        body.imageProvider = imageProvider;
      } else {
        if (!videoKey.trim()) return;
        body.videoApiKey = videoKey.trim();
        body.videoProvider = videoProvider;
      }

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setData((prev) => prev ? { ...prev, ...result } : prev);
      if (section === "gemini") setGeminiKey("");
      else if (section === "anthropic") setAnthropicKey("");
      else if (section === "groq") setGroqKey("");
      else if (section === "image") setImageKey("");
      else setVideoKey("");

      const labels = { gemini: "Gemini", anthropic: "Anthropic", groq: "Groq", image: "Image generation", video: "Video generation" };
      showMessage("success", `${labels[section]} API key saved`);
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProvider(section: "image" | "video", provider: Provider) {
    if (section === "image") setImageProvider(provider);
    else setVideoProvider(provider);

    try {
      const body: Record<string, string> = {};
      body[section === "image" ? "imageProvider" : "videoProvider"] = provider;
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData((prev) => prev ? { ...prev, ...result } : prev);
    } catch {
      // revert on failure
      if (section === "image") setImageProvider(data?.imageProvider || "vidtory");
      else setVideoProvider(data?.videoProvider || "vidtory");
    }
  }

  async function handleSaveAiProvider(provider: AiProvider) {
    setAiProvider(provider);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiProvider: provider }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData((prev) => prev ? { ...prev, ...result } : prev);
      showMessage("success", `AI provider set to ${provider === "claude" ? "Claude" : "Gemini"}`);
    } catch {
      setAiProvider(data?.aiProvider || "gemini");
    }
  }

  async function handleReset(section: "gemini" | "anthropic" | "groq" | "image" | "video") {
    const setLoading = section === "gemini" ? setResettingGemini : section === "anthropic" ? setResettingAnthropic : section === "groq" ? setResettingGroq : section === "image" ? setResettingImage : setResettingVideo;
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: section }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData((prev) => prev ? { ...prev, ...result } : prev);
      if (section === "anthropic") setAiProvider("gemini");
      if (section === "image") setImageProvider("vidtory");
      if (section === "video") setVideoProvider("vidtory");
      showMessage("success", `Reset to default .env key`);
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Failed to reset");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings size={28} className="text-emerald-400" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Global message */}
      {message && (
        <div className={`max-w-xl flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
          message.type === "success"
            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
            : "bg-red-500/10 border border-red-500/30 text-red-400"
        }`}>
          {message.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
          {message.text}
        </div>
      )}

      <div className="max-w-xl space-y-6">
        {/* ── AI Provider ── */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-violet-400" />
            <h2 className="text-lg font-semibold">AI Provider</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Choose which LLM powers analysis, script, storyboard, and prompt enhancement.
            TTS always uses Gemini or ElevenLabs regardless of this setting.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleSaveAiProvider("gemini")}
              className={`flex-1 px-3 py-2.5 rounded-md text-sm font-medium border transition-colors cursor-pointer ${
                aiProvider === "gemini"
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                  : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="block font-semibold">Gemini</span>
              <span className="block text-[10px] mt-0.5 opacity-70">Google Gemini 2.5 Flash</span>
            </button>
            <button
              onClick={() => handleSaveAiProvider("claude")}
              className={`flex-1 px-3 py-2.5 rounded-md text-sm font-medium border transition-colors cursor-pointer ${
                aiProvider === "claude"
                  ? "bg-violet-500/15 border-violet-500/40 text-violet-400"
                  : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="block font-semibold">Claude</span>
              <span className="block text-[10px] mt-0.5 opacity-70">Anthropic Sonnet 4</span>
            </button>
          </div>
          {aiProvider === "claude" && (
            <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2">
              Claude requires a Groq API key (free) for audio transcription via Whisper.
              Without it, analysis will rely on visible text overlays only.
            </p>
          )}
        </div>

        {/* ── Gemini API Key ── */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Key size={18} className="text-emerald-400" />
            <h2 className="text-lg font-semibold">Gemini API Key</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {aiProvider === "gemini"
              ? "Used for video analysis, script generation, storyboard, TTS, and prompt enhancement."
              : "Used for TTS (text-to-speech) even when Claude is the active AI provider."}
          </p>

          {data && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
              data.isUsingCustomGeminiKey
                ? "bg-blue-500/10 border border-blue-500/30 text-blue-400"
                : "bg-muted/50 border border-border text-muted-foreground"
            }`}>
              <span className="font-mono text-xs">{data.geminiApiKey || "Not set"}</span>
              <span className="text-[10px] ml-auto">
                {data.isUsingCustomGeminiKey ? "Custom key" : "Default (.env)"}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Enter new API key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIza..."
                className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm font-mono"
                onKeyDown={(e) => e.key === "Enter" && handleSave("gemini")}
              />
              <button
                onClick={() => handleSave("gemini")}
                disabled={!geminiKey.trim() || savingGemini}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium cursor-pointer"
              >
                {savingGemini ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save
              </button>
            </div>
          </div>

          {data?.isUsingCustomGeminiKey && (
            <button
              onClick={() => handleReset("gemini")}
              disabled={resettingGemini}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
            >
              {resettingGemini ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              Reset to default key
            </button>
          )}
        </div>

        {/* ── Anthropic API Key ── */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Key size={18} className="text-violet-400" />
            <h2 className="text-lg font-semibold">Anthropic API Key</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Required when Claude is selected as the AI provider. Used for analysis, script, storyboard, and prompt enhancement.
          </p>

          {data && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
              data.isUsingCustomAnthropicKey
                ? "bg-violet-500/10 border border-violet-500/30 text-violet-400"
                : "bg-muted/50 border border-border text-muted-foreground"
            }`}>
              <span className="font-mono text-xs">{data.anthropicApiKey || "Not set"}</span>
              <span className="text-[10px] ml-auto">
                {data.isUsingCustomAnthropicKey ? "Custom key" : data.hasEnvAnthropicKey ? "Default (.env)" : "Not configured"}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Enter new API key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
                className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm font-mono"
                onKeyDown={(e) => e.key === "Enter" && handleSave("anthropic")}
              />
              <button
                onClick={() => handleSave("anthropic")}
                disabled={!anthropicKey.trim() || savingAnthropic}
                className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium cursor-pointer"
              >
                {savingAnthropic ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save
              </button>
            </div>
          </div>

          {data?.isUsingCustomAnthropicKey && (
            <button
              onClick={() => handleReset("anthropic")}
              disabled={resettingAnthropic}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
            >
              {resettingAnthropic ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              Reset to default key
            </button>
          )}
        </div>

        {/* ── Groq API Key (Whisper transcription) ── */}
        {aiProvider === "claude" && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Mic size={18} className="text-cyan-400" />
              <h2 className="text-lg font-semibold">Groq API Key</h2>
              <span className="text-[10px] font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">FREE</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Used for audio transcription (Whisper) when Claude is the AI provider.
              Get a free key at{" "}
              <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">
                console.groq.com
              </a>
            </p>

            {data && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                data.isUsingCustomGroqKey
                  ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400"
                  : data.hasEnvGroqKey
                  ? "bg-muted/50 border border-border text-muted-foreground"
                  : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
              }`}>
                <span className="font-mono text-xs">{data.groqApiKey || "Not set"}</span>
                <span className="text-[10px] ml-auto">
                  {data.isUsingCustomGroqKey ? "Custom key" : data.hasEnvGroqKey ? "Default (.env)" : "Not configured"}
                </span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Enter Groq API key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm font-mono"
                  onKeyDown={(e) => e.key === "Enter" && handleSave("groq")}
                />
                <button
                  onClick={() => handleSave("groq")}
                  disabled={!groqKey.trim() || savingGroq}
                  className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium cursor-pointer"
                >
                  {savingGroq ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save
                </button>
              </div>
            </div>

            {data?.isUsingCustomGroqKey && (
              <button
                onClick={() => handleReset("groq")}
                disabled={resettingGroq}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
              >
                {resettingGroq ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                Reset to default key
              </button>
            )}
          </div>
        )}

        {/* ── Image Generation API Key ── */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Image size={18} className="text-blue-400" />
            <h2 className="text-lg font-semibold">Image Generation API Key</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Used to generate scene images in the Studio.
          </p>

          {/* Provider toggle */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Provider</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleSaveProvider("image", "vidtory")}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-colors cursor-pointer ${
                  imageProvider === "vidtory"
                    ? "bg-blue-500/15 border-blue-500/40 text-blue-400"
                    : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Vidtory
              </button>
              <button
                onClick={() => handleSaveProvider("image", "kie")}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-colors cursor-pointer ${
                  imageProvider === "kie"
                    ? "bg-purple-500/15 border-purple-500/40 text-purple-400"
                    : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Kie — Nano Banana Pro
              </button>
            </div>
          </div>

          {data && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
              data.isUsingCustomImageKey
                ? "bg-blue-500/10 border border-blue-500/30 text-blue-400"
                : "bg-muted/50 border border-border text-muted-foreground"
            }`}>
              <span className="font-mono text-xs">{data.imageApiKey || "Not set"}</span>
              <span className="text-[10px] ml-auto">
                {data.isUsingCustomImageKey ? "Custom key" : "Default (.env)"}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {imageProvider === "vidtory" ? "Vidtory API key" : "Kie API key"}
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={imageKey}
                onChange={(e) => setImageKey(e.target.value)}
                placeholder={imageProvider === "vidtory" ? "vidtory_..." : "kie_..."}
                className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm font-mono"
                onKeyDown={(e) => e.key === "Enter" && handleSave("image")}
              />
              <button
                onClick={() => handleSave("image")}
                disabled={!imageKey.trim() || savingImage}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium cursor-pointer"
              >
                {savingImage ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save
              </button>
            </div>
          </div>

          {data?.isUsingCustomImageKey && (
            <button
              onClick={() => handleReset("image")}
              disabled={resettingImage}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
            >
              {resettingImage ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              Reset to default key
            </button>
          )}
        </div>

        {/* ── Video Generation API Key ── */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Video size={18} className="text-orange-400" />
            <h2 className="text-lg font-semibold">Video Generation API Key</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Used to generate scene videos in the Studio.
          </p>

          {/* Provider toggle */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Provider</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleSaveProvider("video", "vidtory")}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-colors cursor-pointer ${
                  videoProvider === "vidtory"
                    ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                    : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Vidtory
              </button>
              <button
                onClick={() => handleSaveProvider("video", "kie")}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-colors cursor-pointer ${
                  videoProvider === "kie"
                    ? "bg-purple-500/15 border-purple-500/40 text-purple-400"
                    : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Kie — Kling 3.0 Standard
              </button>
            </div>
            {videoProvider === "kie" && (
              <p className="text-xs text-muted-foreground">
                Kling 3.0 Standard generates video with or without audio.
              </p>
            )}
          </div>

          {data && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
              data.isUsingCustomVideoKey
                ? "bg-blue-500/10 border border-blue-500/30 text-blue-400"
                : "bg-muted/50 border border-border text-muted-foreground"
            }`}>
              <span className="font-mono text-xs">{data.videoApiKey || "Not set"}</span>
              <span className="text-[10px] ml-auto">
                {data.isUsingCustomVideoKey ? "Custom key" : "Default (.env)"}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {videoProvider === "vidtory" ? "Vidtory API key" : "Kie API key"}
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={videoKey}
                onChange={(e) => setVideoKey(e.target.value)}
                placeholder={videoProvider === "vidtory" ? "vidtory_..." : "kie_..."}
                className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm font-mono"
                onKeyDown={(e) => e.key === "Enter" && handleSave("video")}
              />
              <button
                onClick={() => handleSave("video")}
                disabled={!videoKey.trim() || savingVideo}
                className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium cursor-pointer"
              >
                {savingVideo ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save
              </button>
            </div>
          </div>

          {data?.isUsingCustomVideoKey && (
            <button
              onClick={() => handleReset("video")}
              disabled={resettingVideo}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
            >
              {resettingVideo ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              Reset to default key
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
