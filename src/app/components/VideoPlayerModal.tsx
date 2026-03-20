"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, CircleX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface VideoPlayerModalProps {
  videoUrl: string;
  adTitle: string;
  videoFormat?: string | null;
  metadata?: {
    brand?: string;
    market?: string;
    adScore?: number;
    longevityDays?: number;
    hookType?: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoPlayerModal({
  videoUrl,
  adTitle,
  videoFormat,
  metadata,
  isOpen,
  onClose,
}: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const proxiedUrl = `/api/video-proxy?url=${encodeURIComponent(videoUrl)}`;
  const isVertical = videoFormat === "9:16" || videoFormat === "4:5";

  // Keyboard shortcuts — Esc is handled by Radix Dialog natively
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      const video = videoRef.current;
      switch (e.key) {
        case " ":
          e.preventDefault();
          if (video) video.paused ? video.play() : video.pause();
          break;
        case "ArrowLeft":
          if (video) video.currentTime = Math.max(0, video.currentTime - 5);
          break;
        case "ArrowRight":
          if (video) video.currentTime += 5;
          break;
      }
    },
    [isOpen]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  // Reset state each time the modal opens with a (possibly new) video
  useEffect(() => {
    if (isOpen) {
      setError(false);
      setLoading(true);
    }
  }, [isOpen, videoUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className={
          isVertical
            ? "max-w-sm w-full flex flex-col gap-3 p-4"
            : "max-w-3xl w-full flex flex-col gap-3 p-4"
        }
      >
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold leading-snug pr-6 line-clamp-2">
            {adTitle}
          </DialogTitle>
        </DialogHeader>

        {/* Video container */}
        <div className="relative w-full bg-black rounded-md overflow-hidden flex items-center justify-center min-h-[200px]">
          {/* Spinner — shown while loading and no error */}
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white z-10">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-xs text-zinc-300">Loading video...</span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-400">
              <CircleX className="w-12 h-12 text-zinc-500" />
              <p className="text-sm">Video expired or unavailable.</p>
              <p className="text-xs text-zinc-500">Re-crawl this ad to refresh the URL.</p>
            </div>
          )}

          {/* Video element — hidden while loading, visible after onCanPlay */}
          <video
            ref={videoRef}
            src={proxiedUrl}
            controls
            playsInline
            preload="metadata"
            className={`w-full rounded-md ${loading || error ? "hidden" : "block"}`}
            onCanPlay={() => setLoading(false)}
            onError={() => { setError(true); setLoading(false); }}
          />
        </div>

        {/* Metadata pills */}
        {metadata && (
          <div className="flex flex-wrap gap-1.5">
            {metadata.brand && (
              <Badge variant="secondary">{metadata.brand}</Badge>
            )}
            {metadata.market && (
              <Badge variant="secondary">{metadata.market}</Badge>
            )}
            {metadata.adScore != null && (
              <Badge variant="default">Score: {metadata.adScore.toFixed(1)}</Badge>
            )}
            {metadata.longevityDays != null && (
              <Badge variant="secondary">{metadata.longevityDays}d active</Badge>
            )}
            {metadata.hookType && (
              <Badge variant="outline">{metadata.hookType}</Badge>
            )}
          </div>
        )}

        {/* Keyboard hints */}
        <p className="text-[11px] text-zinc-500 text-center">
          Space: play/pause &middot; Arrows: seek &middot; Esc: close
        </p>
      </DialogContent>
    </Dialog>
  );
}
