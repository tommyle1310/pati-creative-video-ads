"use client";

import { useState, useCallback } from "react";
import { Database, Upload, Trash2 } from "lucide-react";
import { useStudio } from "../_state/context";
import { SourceChangeDialog } from "./SourceChangeDialog";
import { useProjectPersistence } from "../_hooks/useProjectPersistence";
import type { Action } from "../_state/types";

export function StepSource() {
  const { s, dispatch } = useStudio();
  const { saveProject } = useProjectPersistence();

  const [pendingAction, setPendingAction] = useState<Action | null>(null);

  const handleUploadVideo = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const action: Action = { type: "SET_SOURCE_UPLOAD", url, file };
      guardSourceChange(action);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.analysis, s.scriptScenes, s.scenes]
  );

  const hasProgress =
    s.analysis !== null ||
    s.scriptScenes.length > 0 ||
    s.scenes.length > 0;

  function guardSourceChange(action: Action) {
    if (hasProgress) {
      setPendingAction(action);
    } else {
      dispatch(action);
    }
  }

  function handleConfirmChange() {
    if (pendingAction) {
      dispatch({ type: "RESET_PROGRESS" });
      dispatch(pendingAction);
    }
    setPendingAction(null);
  }

  async function handleSaveAndChange() {
    try {
      const name = s.selectedAdBrand
        ? `${s.selectedAdBrand} Project`
        : "Untitled Project";
      await saveProject(name);
      handleConfirmChange();
    } catch {
      alert("Failed to save project");
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Choose Source Video</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* From DB — temporarily unavailable (embedded video URLs expired) */}
        <div
          className="border rounded-lg p-4 space-y-3 border-border opacity-50 cursor-not-allowed relative"
        >
          <div className="absolute inset-0 bg-background/60 rounded-lg z-10 flex items-center justify-center">
            <div className="text-center px-4">
              <p className="text-sm font-medium text-muted-foreground">Temporarily Unavailable</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Crawled video URLs have expired. Upload a video instead.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Database size={18} />
            <span className="font-medium">From Crawled Ads</span>
          </div>
          <input
            type="text"
            placeholder="Search by brand..."
            className="w-full bg-background border border-border rounded px-3 py-2 text-sm"
            disabled
          />
          <div className="max-h-40 overflow-hidden space-y-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-muted/30 rounded animate-pulse" />
            ))}
          </div>
        </div>

        {/* Upload */}
        <div
          className={`border rounded-lg p-4 space-y-3 transition-colors ${
            s.sourceType === "upload"
              ? "border-emerald-500 bg-emerald-500/5"
              : "border-border hover:border-muted-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            <Upload size={18} />
            <span className="font-medium">Upload Video</span>
          </div>
          <label className="block border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground transition-colors">
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleUploadVideo}
            />
            <Upload
              size={24}
              className="mx-auto mb-2 text-muted-foreground"
            />
            <p className="text-sm text-muted-foreground">
              Drop or click to upload a video ad
            </p>
          </label>
          {s.uploadedVideoUrl && (
            <div className="space-y-2">
              <video
                src={s.uploadedVideoUrl}
                controls
                className="w-full max-h-48 rounded"
              />
              <button
                onClick={() => {
                  if (hasProgress) {
                    setPendingAction({ type: "CLEAR_SOURCE" });
                  } else {
                    dispatch({ type: "CLEAR_SOURCE" });
                  }
                }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-400 transition-colors"
              >
                <Trash2 size={12} />
                Remove video
              </button>
            </div>
          )}
        </div>
      </div>

      <SourceChangeDialog
        open={!!pendingAction}
        onCancel={() => setPendingAction(null)}
        onSaveAndChange={handleSaveAndChange}
        onConfirm={handleConfirmChange}
      />
    </div>
  );
}
