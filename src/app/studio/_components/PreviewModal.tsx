"use client";

import { X, Download } from "lucide-react";

interface PreviewModalProps {
  preview: { type: "image" | "video"; src: string } | null;
  onClose: () => void;
}

export function PreviewModal({ preview, onClose }: PreviewModalProps) {
  if (!preview) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
      >
        <X size={20} className="text-white" />
      </button>
      {preview.type === "image" ? (
        <img
          src={preview.src}
          alt="Preview"
          className="max-w-full max-h-[90vh] rounded-lg object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <video
          src={preview.src}
          controls
          autoPlay
          className="max-w-full max-h-[90vh] rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <a
        href={preview.src}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-md text-sm transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <Download size={14} /> Download
      </a>
    </div>
  );
}
