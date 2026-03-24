"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  FileText,
  Loader2,
  Plus,
  Save,
  X,
  Check,
  Eye,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Search,
  Clapperboard,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────── */

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

interface PromptDef {
  key: string;
  label: string;
  description: string;
}

interface StepSection {
  id: string;
  label: string;
  icon: "search" | "filetext" | "clapperboard" | "sparkles";
  masterPrompts: PromptDef[];
  specificPrompts: PromptDef[];
}

/* ── Studio step definitions ──────────────────────────────── */

const ROLL_SPECIFIC_PROMPTS: PromptDef[] = [
  { key: "enhance_aroll_image", label: "A-Roll Image", description: "Image prompts for talking head / hero shots." },
  { key: "enhance_aroll_video", label: "A-Roll Video", description: "Video prompts for lip-sync / speaking scenes." },
  { key: "enhance_broll_image", label: "B-Roll Image", description: "Image prompts for product interaction shots." },
  { key: "enhance_broll_video", label: "B-Roll Video", description: "Video prompts for silent product movement." },
  { key: "enhance_croll_image", label: "C-Roll Image", description: "Image prompts for anatomy / concept visuals." },
  { key: "enhance_croll_video", label: "C-Roll Video", description: "Video prompts for locked camera concept shots." },
];

const STUDIO_STEPS: StepSection[] = [
  {
    id: "analyze",
    label: "Step 2 — Analyze",
    icon: "search",
    masterPrompts: [
      { key: "analyze", label: "Analyze", description: "Video frame extraction & scene-by-scene analysis with roll type classification." },
    ],
    specificPrompts: [],
  },
  {
    id: "script",
    label: "Step 4 — Script",
    icon: "filetext",
    masterPrompts: [
      { key: "script", label: "Script", description: "Cloned script generation that matches original ad structure for a new product." },
    ],
    specificPrompts: [],
  },
  {
    id: "storyboard",
    label: "Step 5 — Storyboard",
    icon: "clapperboard",
    masterPrompts: [
      { key: "storyboard", label: "Storyboard", description: "Scene-by-scene visual storyboard with roll types, voiceover scripts, and prompts." },
      { key: "prompt_framework", label: "Prompt Framework", description: "Shared visual rules (skin realism, expression, product accuracy). Embedded via {{PROMPT_FRAMEWORK}}." },
    ],
    specificPrompts: ROLL_SPECIFIC_PROMPTS,
  },
  {
    id: "generate",
    label: "Step 6 — Generate Assets",
    icon: "sparkles",
    masterPrompts: [
      { key: "enhance", label: "Enhance Prompt", description: "Generic prompt enhancement fallback used at the step level." },
    ],
    specificPrompts: ROLL_SPECIFIC_PROMPTS,
  },
];

const ALL_TYPES = Array.from(
  new Set(
    STUDIO_STEPS.flatMap((step) => [
      ...step.masterPrompts.map((p) => p.key),
      ...step.specificPrompts.map((p) => p.key),
    ])
  )
);

/* ── Step icon helper ─────────────────────────────────────── */

function StepIcon({ icon, className }: { icon: StepSection["icon"]; className?: string }) {
  switch (icon) {
    case "search": return <Search size={16} className={className} />;
    case "filetext": return <FileText size={16} className={className} />;
    case "clapperboard": return <Clapperboard size={16} className={className} />;
    case "sparkles": return <Sparkles size={16} className={className} />;
  }
}

/* ── Main Page ────────────────────────────────────────────── */

export default function PromptLibraryPage() {
  const [blueprintsByType, setBlueprintsByType] = useState<Record<string, BlueprintMeta[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set(["analyze", "script", "storyboard", "generate"]));
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  // Modal states
  const [viewingBlueprint, setViewingBlueprint] = useState<BlueprintFull | null>(null);
  const [isCreating, setIsCreating] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const results: Record<string, BlueprintMeta[]> = {};
    await Promise.all(
      ALL_TYPES.map(async (type) => {
        try {
          const res = await fetch(`/api/studio/blueprints?type=${type}`);
          if (res.ok) {
            const data = await res.json();
            results[type] = data.blueprints || [];
          }
        } catch {
          // silent
        }
      })
    );
    setBlueprintsByType(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const toggleStep = (id: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleType = (key: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleActivate = async (id: string, type: string) => {
    setActivating(id);
    try {
      const res = await fetch(`/api/studio/blueprints/${id}/activate`, { method: "POST" });
      if (res.ok) {
        const r = await fetch(`/api/studio/blueprints?type=${type}`);
        if (r.ok) {
          const data = await r.json();
          setBlueprintsByType((prev) => ({ ...prev, [type]: data.blueprints || [] }));
        }
      }
    } catch { /* silent */ }
    setActivating(null);
  };

  const handleView = async (id: string) => {
    try {
      const res = await fetch(`/api/studio/blueprints/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setViewingBlueprint(data.blueprint);
    } catch { /* silent */ }
  };

  const handleUpdateContent = async () => {
    if (!viewingBlueprint) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/studio/blueprints/${viewingBlueprint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: viewingBlueprint.content }),
      });
      if (res.ok) {
        const data = await res.json();
        setViewingBlueprint(data.blueprint);
        const r = await fetch(`/api/studio/blueprints?type=${viewingBlueprint.type}`);
        if (r.ok) {
          const d = await r.json();
          setBlueprintsByType((prev) => ({ ...prev, [viewingBlueprint.type]: d.blueprints || [] }));
        }
      }
    } catch { /* silent */ }
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!isCreating || !newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/studio/blueprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), content: newContent.trim(), type: isCreating }),
      });
      if (res.ok) {
        setNewTitle("");
        setNewContent("");
        const type = isCreating;
        setIsCreating(null);
        const r = await fetch(`/api/studio/blueprints?type=${type}`);
        if (r.ok) {
          const d = await r.json();
          setBlueprintsByType((prev) => ({ ...prev, [type]: d.blueprints || [] }));
        }
      }
    } catch { /* silent */ }
    setSaving(false);
  };

  const handleDelete = async (id: string, type: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/studio/blueprints/${id}`, { method: "DELETE" });
      if (res.ok) {
        const r = await fetch(`/api/studio/blueprints?type=${type}`);
        if (r.ok) {
          const d = await r.json();
          setBlueprintsByType((prev) => ({ ...prev, [type]: d.blueprints || [] }));
        }
      }
    } catch { /* silent */ }
    setDeleting(null);
  };

  /* ── Render helpers ──────────────────────────────────────── */

  function renderBlueprintRow(bp: BlueprintMeta) {
    return (
      <div
        key={bp.id}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
          bp.isActive
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-border bg-muted/10 hover:bg-muted/20"
        }`}
      >
        <button
          onClick={() => handleActivate(bp.id, bp.type)}
          disabled={activating === bp.id}
          className={`shrink-0 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-colors ${
            bp.isActive
              ? "border-emerald-500 bg-emerald-500"
              : "border-muted-foreground/30 hover:border-emerald-500"
          }`}
          title={bp.isActive ? "Active" : "Click to activate"}
        >
          {activating === bp.id ? (
            <Loader2 size={9} className="animate-spin text-muted-foreground" />
          ) : bp.isActive ? (
            <Check size={9} className="text-white" />
          ) : null}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{bp.title}</p>
            {bp.isDefault && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 shrink-0">
                built-in
              </span>
            )}
            {bp.isActive && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 shrink-0">
                active
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {bp.variant} · v{bp.version}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => handleView(bp.id)}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted/50 transition-colors"
            title="View & Edit"
          >
            <Eye size={14} />
          </button>
          {!bp.isActive && !bp.isDefault && (
            <button
              onClick={() => handleDelete(bp.id, bp.type)}
              disabled={deleting === bp.id}
              className="p-1.5 text-muted-foreground hover:text-red-400 rounded hover:bg-red-500/10 transition-colors"
              title="Delete"
            >
              {deleting === bp.id ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderPromptType(prompt: PromptDef, isMaster: boolean) {
    const blueprints = blueprintsByType[prompt.key] || [];
    const isExpanded = expandedTypes.has(prompt.key);
    const active = blueprints.find((b) => b.isActive);

    return (
      <div
        key={prompt.key}
        className={`border rounded-lg overflow-hidden ${
          isMaster
            ? "border-violet-500/30 bg-violet-500/5"
            : "border-border/50 bg-muted/5"
        }`}
      >
        <button
          onClick={() => toggleType(prompt.key)}
          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors ${
            isMaster ? "hover:bg-violet-500/10" : "hover:bg-muted/20"
          }`}
        >
          {isExpanded ? (
            <ChevronDown size={14} className="text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight size={14} className="text-muted-foreground shrink-0" />
          )}
          {isMaster ? (
            <Sparkles size={13} className="text-violet-400 shrink-0" />
          ) : (
            <FileText size={13} className="text-muted-foreground shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${isMaster ? "text-violet-300" : "text-foreground"}`}>
                {prompt.label}
              </span>
              {active && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                  {active.title} v{active.version}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground/50">
                {blueprints.length}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{prompt.description}</p>
          </div>
        </button>

        {isExpanded && (
          <div className="px-3.5 pb-3 space-y-1.5 border-t border-border/30 pt-2.5">
            {blueprints.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground italic py-1.5">
                No blueprints yet.
              </p>
            )}
            {blueprints.map(renderBlueprintRow)}
            <button
              onClick={() => {
                setIsCreating(prompt.key);
                setNewTitle("");
                setNewContent("");
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 px-1"
            >
              <Plus size={12} />
              New blueprint
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderStepSection(step: StepSection) {
    const isExpanded = expandedSteps.has(step.id);

    // Count total blueprints across all prompt types in this step
    const allKeys = [...step.masterPrompts, ...step.specificPrompts].map((p) => p.key);
    const uniqueKeys = Array.from(new Set(allKeys));
    const totalBlueprints = uniqueKeys.reduce((sum, k) => sum + (blueprintsByType[k]?.length || 0), 0);

    return (
      <div key={step.id} className="border border-border rounded-xl overflow-hidden bg-background">
        {/* Step header */}
        <button
          onClick={() => toggleStep(step.id)}
          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/20 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown size={18} className="text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight size={18} className="text-muted-foreground shrink-0" />
          )}
          <StepIcon icon={step.icon} className="text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold text-foreground">{step.label}</span>
          <span className="text-[10px] text-muted-foreground/60 ml-auto">
            {totalBlueprints} blueprint{totalBlueprints !== 1 ? "s" : ""}
          </span>
        </button>

        {/* Expanded: master + specific */}
        {isExpanded && (
          <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
            {/* Master Prompts */}
            {step.masterPrompts.length > 0 && (
              <div>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-violet-400 mb-2 flex items-center gap-1.5">
                  <Sparkles size={10} />
                  Master Prompt{step.masterPrompts.length > 1 ? "s" : ""}
                </h3>
                <div className="space-y-2">
                  {step.masterPrompts.map((p) => renderPromptType(p, true))}
                </div>
              </div>
            )}

            {/* Specific Prompts */}
            {step.specificPrompts.length > 0 && (
              <div>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <FileText size={10} />
                  Specific Prompts (per scene / roll type)
                </h3>
                <div className="space-y-2">
                  {step.specificPrompts.map((p) => renderPromptType(p, false))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ── Page layout ─────────────────────────────────────────── */

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <BookOpen size={24} className="text-violet-400" />
        <div>
          <h1 className="text-xl font-bold">Prompt Library</h1>
          <p className="text-sm text-muted-foreground">
            Manage all Studio prompts organized by pipeline step. Each step has
            master prompts (step-level) and specific prompts (per scene / roll type).
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {STUDIO_STEPS.map(renderStepSection)}
        </div>
      )}

      {/* ── View/Edit Modal ── */}
      {viewingBlueprint && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setViewingBlueprint(null)}
        >
          <div
            className="bg-background border border-border rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div>
                <h3 className="text-sm font-semibold">{viewingBlueprint.title}</h3>
                <p className="text-[10px] text-muted-foreground">
                  {viewingBlueprint.type} · {viewingBlueprint.variant} · v{viewingBlueprint.version}
                  {viewingBlueprint.isDefault ? " · built-in default" : ""}
                </p>
              </div>
              <button onClick={() => setViewingBlueprint(null)} className="p-1 text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <textarea
                value={viewingBlueprint.content}
                onChange={(e) => setViewingBlueprint({ ...viewingBlueprint, content: e.target.value })}
                className="w-full h-full min-h-[400px] bg-muted/20 border border-border rounded-lg px-4 py-3 text-xs font-mono leading-relaxed resize-y"
              />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground">Edit the prompt content above, then save.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewingBlueprint(null)}
                  className="text-xs px-3 py-1.5 border border-border rounded-md hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateContent}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md font-medium"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Modal ── */}
      {isCreating && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setIsCreating(null)}
        >
          <div
            className="bg-background border border-border rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">New {isCreating} Blueprint</h3>
              <button onClick={() => setIsCreating(null)} className="p-1 text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
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
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
              <button
                onClick={() => setIsCreating(null)}
                className="text-xs px-3 py-1.5 border border-border rounded-md hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !newTitle.trim() || !newContent.trim()}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md font-medium"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Create Blueprint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
