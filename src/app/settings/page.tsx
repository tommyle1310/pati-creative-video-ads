"use client";

import { useState, useEffect } from "react";
import { Settings, Loader2, Key, RotateCcw, Check, AlertCircle } from "lucide-react";

interface SettingsData {
  geminiApiKey: string;
  isUsingCustomKey: boolean;
  hasEnvKey: boolean;
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  function showMessage(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleSave() {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiApiKey: apiKey.trim() }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData((prev) => prev ? { ...prev, geminiApiKey: result.geminiApiKey, isUsingCustomKey: true } : prev);
      setApiKey("");
      showMessage("success", "Gemini API key saved successfully");
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      const res = await fetch("/api/settings", { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData((prev) => prev ? { ...prev, geminiApiKey: result.geminiApiKey, isUsingCustomKey: false } : prev);
      setApiKey("");
      showMessage("success", "Reset to default .env key");
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Failed to reset");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings size={28} className="text-emerald-400" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="max-w-xl space-y-6">
        {/* Gemini API Key */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Key size={18} className="text-emerald-400" />
            <h2 className="text-lg font-semibold">Gemini API Key</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Used for video analysis, script generation, storyboard, TTS, and prompt enhancement in the Studio.
          </p>

          {/* Current key status */}
          {data && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
              data.isUsingCustomKey
                ? "bg-blue-500/10 border border-blue-500/30 text-blue-400"
                : "bg-muted/50 border border-border text-muted-foreground"
            }`}>
              <span className="font-mono text-xs">{data.geminiApiKey || "Not set"}</span>
              <span className="text-[10px] ml-auto">
                {data.isUsingCustomKey ? "Custom key" : "Default (.env)"}
              </span>
            </div>
          )}

          {/* Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Enter new API key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm font-mono"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
              <button
                onClick={handleSave}
                disabled={!apiKey.trim() || saving}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save
              </button>
            </div>
          </div>

          {/* Reset */}
          {data?.isUsingCustomKey && (
            <button
              onClick={handleReset}
              disabled={resetting}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {resetting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              Reset to default key
            </button>
          )}

          {/* Message */}
          {message && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
              message.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}>
              {message.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
