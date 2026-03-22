"use client";

import Link from "next/link";
import { AlertCircle, Settings, X } from "lucide-react";

interface GeminiErrorBannerProps {
  error: string | null;
  onDismiss?: () => void;
}

const GEMINI_ERROR_PATTERNS = [
  "429", "RESOURCE_EXHAUSTED", "quota", "rate-limited", "rate limit",
  "API key", "api key", "INVALID_API_KEY", "invalid", "unauthorized",
  "PERMISSION_DENIED", "API_KEY_INVALID", "not set", "not valid",
  "All Gemini models", "exhausted",
];

function isGeminiError(error: string): boolean {
  const lower = error.toLowerCase();
  return GEMINI_ERROR_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

export function GeminiErrorBanner({ error, onDismiss }: GeminiErrorBannerProps) {
  if (!error) return null;

  const isGemini = isGeminiError(error);

  if (!isGemini) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3 text-sm text-red-400 flex items-start gap-2">
        <AlertCircle size={16} className="shrink-0 mt-0.5" />
        <span className="flex-1">{error}</span>
        {onDismiss && (
          <button onClick={onDismiss} className="shrink-0 hover:text-red-300">
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3 text-sm text-amber-400 space-y-2">
      <div className="flex items-start gap-2">
        <AlertCircle size={16} className="shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium">Gemini API Error</p>
          <p className="text-xs text-amber-400/80 mt-0.5">{error}</p>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="shrink-0 hover:text-amber-300">
            <X size={14} />
          </button>
        )}
      </div>
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 rounded-md transition-colors font-medium"
      >
        <Settings size={12} />
        Change Gemini API Key
      </Link>
    </div>
  );
}
