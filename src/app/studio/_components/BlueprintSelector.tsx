"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText,
  ChevronDown,
  Check,
  Eye,
  Plus,
  X,
  Loader2,
  Save,
} from "lucide-react";

interface BlueprintMeta {
  id: string;
  title: string;
  description: string | null;
  type: string;
  variant: string;
  version: number;
  isDefault: boolean;
  isActive: boolean;
}

interface BlueprintFull extends BlueprintMeta {
  content: string;
}

interface Props {
  type: "analyze" | "script" | "storyboard" | "enhance" | "prompt_framework" | "enhance_aroll_image" | "enhance_aroll_video" | "enhance_broll_image" | "enhance_broll_video" | "enhance_croll_image" | "enhance_croll_video";
  label?: string;
}

export function BlueprintSelector({ type, label }: Props) {
  const [blueprints, setBlueprints] = useState<BlueprintMeta[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [viewingBlueprint, setViewingBlueprint] = useState<BlueprintFull | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const active = blueprints.find((b) => b.isActive);

  const fetchBlueprints = useCallback(async () => {
    try {
      const res = await fetch(`/api/studio/blueprints?type=${type}`);
      if (!res.ok) { setHasFetched(true); return; }
      const data = await res.json();
      setBlueprints(data.blueprints || []);
    } catch {
      // DB unavailable — silent fallback
    }
    setHasFetched(true);
  }, [type]);

  useEffect(() => {
    fetchBlueprints();
  }, [fetchBlueprints]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const handleActivate = async (id: string) => {
    setActivating(id);
    try {
      const res = await fetch(`/api/studio/blueprints/${id}/activate`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchBlueprints();
      }
    } catch {
      // silent
    }
    setActivating(null);
  };

  const handleView = async (id: string) => {
    try {
      const res = await fetch(`/api/studio/blueprints/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setViewingBlueprint(data.blueprint);
    } catch {
      // silent
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/studio/blueprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
          type,
        }),
      });
      if (res.ok) {
        setNewTitle("");
        setNewContent("");
        setIsCreating(false);
        await fetchBlueprints();
      }
    } catch {
      // silent
    }
    setLoading(false);
  };

  const handleUpdateContent = async () => {
    if (!viewingBlueprint) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/studio/blueprints/${viewingBlueprint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: viewingBlueprint.content }),
      });
      if (res.ok) {
        const data = await res.json();
        setViewingBlueprint(data.blueprint);
        await fetchBlueprints();
      }
    } catch {
      // silent
    }
    setLoading(false);
  };

  // Hide only if DB returned empty AFTER fetching (DB unavailable or truly no data)
  if (hasFetched && blueprints.length === 0) return null;

  return (
    <>
      {/* Selector pill */}
      <div className="relative inline-block" ref={dropdownRef}>
        <button
          onClick={() => blueprints.length > 0 && setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border border-border hover:border-muted-foreground transition-colors bg-background text-muted-foreground hover:text-foreground"
          title={`Active prompt: ${active?.title || "Default"}`}
        >
          {!hasFetched ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <FileText size={11} />
          )}
          <span className="max-w-[140px] truncate">
            {label || active?.title || "Prompt"}
          </span>
          {active && (
            <span className="text-[9px] text-muted-foreground/60">
              v{active.version}
            </span>
          )}
          <ChevronDown size={10} />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 top-full mt-1 left-0 w-72 bg-background border border-border rounded-lg shadow-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                {type} Blueprints
              </p>
            </div>

            <div className="max-h-48 overflow-y-auto">
              {blueprints.map((bp) => (
                <div
                  key={bp.id}
                  className={`flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors ${
                    bp.isActive ? "bg-emerald-500/5" : ""
                  }`}
                >
                  {/* Activate button */}
                  <button
                    onClick={() => handleActivate(bp.id)}
                    disabled={activating === bp.id}
                    className={`shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      bp.isActive
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-muted-foreground/40 hover:border-emerald-500"
                    }`}
                  >
                    {activating === bp.id ? (
                      <Loader2 size={8} className="animate-spin text-muted-foreground" />
                    ) : bp.isActive ? (
                      <Check size={8} className="text-white" />
                    ) : null}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{bp.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {bp.variant} · v{bp.version}
                      {bp.isDefault ? " · built-in" : ""}
                    </p>
                  </div>

                  {/* View button */}
                  <button
                    onClick={() => {
                      handleView(bp.id);
                      setIsOpen(false);
                    }}
                    className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="View prompt"
                  >
                    <Eye size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* New blueprint button */}
            <div className="border-t border-border px-3 py-2">
              <button
                onClick={() => {
                  setIsCreating(true);
                  setIsOpen(false);
                }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus size={12} />
                New blueprint
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View/Edit modal */}
      {viewingBlueprint && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setViewingBlueprint(null)}
        >
          <div
            className="bg-background border border-border rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div>
                <h3 className="text-sm font-semibold">{viewingBlueprint.title}</h3>
                <p className="text-[10px] text-muted-foreground">
                  {viewingBlueprint.type} · {viewingBlueprint.variant} · v{viewingBlueprint.version}
                  {viewingBlueprint.isDefault ? " · built-in default" : ""}
                </p>
              </div>
              <button
                onClick={() => setViewingBlueprint(null)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              <textarea
                value={viewingBlueprint.content}
                onChange={(e) =>
                  setViewingBlueprint({ ...viewingBlueprint, content: e.target.value })
                }
                className="w-full h-full min-h-[400px] bg-muted/20 border border-border rounded-lg px-4 py-3 text-xs font-mono leading-relaxed resize-y"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground">
                Edit the prompt content above, then save.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewingBlueprint(null)}
                  className="text-xs px-3 py-1.5 border border-border rounded-md hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateContent}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md font-medium"
                >
                  {loading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Save size={12} />
                  )}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {isCreating && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setIsCreating(false)}
        >
          <div
            className="bg-background border border-border rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">New {type} Blueprint</h3>
              <button
                onClick={() => setIsCreating(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <div>
                <label className="text-xs font-medium">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Concise Analyzer v1"
                  className="w-full bg-muted/20 border border-border rounded px-3 py-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Prompt Content</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Paste your prompt text here..."
                  className="w-full bg-muted/20 border border-border rounded-lg px-4 py-3 text-xs font-mono leading-relaxed mt-1 min-h-[300px] resize-y"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
              <button
                onClick={() => setIsCreating(false)}
                className="text-xs px-3 py-1.5 border border-border rounded-md hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !newTitle.trim() || !newContent.trim()}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md font-medium"
              >
                {loading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Plus size={12} />
                )}
                Create Blueprint
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
