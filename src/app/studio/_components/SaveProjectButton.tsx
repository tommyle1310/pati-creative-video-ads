"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save,
  Loader2,
  FolderOpen,
  FilePlus,
  Search,
  Trash2,
  Check,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStudio } from "../_state/context";
import {
  useProjectPersistence,
  type StudioProjectSummary,
} from "../_hooks/useProjectPersistence";
import { STEPS } from "../_constants";

export function SaveProjectButton() {
  const { s, dispatch } = useStudio();
  const { saveProject, updateProject, loadProject, listProjects, deleteProject } =
    useProjectPersistence();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Save dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [name, setName] = useState("");
  // Open dialog
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [projects, setProjects] = useState<StudioProjectSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    const list = await listProjects();
    setProjects(list);
    setLoadingProjects(false);
  }, [listProjects]);

  // Save current project (update if exists, else show name dialog)
  const handleSave = async () => {
    if (s.currentProjectId) {
      setSaving(true);
      try {
        await updateProject();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        alert("Failed to save project");
      } finally {
        setSaving(false);
      }
    } else {
      setName(s.selectedAdBrand ? `${s.selectedAdBrand} Project` : "");
      setShowSaveDialog(true);
    }
  };

  // Save as new project
  const handleSaveAs = () => {
    setName(
      s.currentProjectName
        ? `${s.currentProjectName} (copy)`
        : s.selectedAdBrand
        ? `${s.selectedAdBrand} Project`
        : ""
    );
    setShowSaveDialog(true);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await saveProject(name.trim());
      setShowSaveDialog(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  // Open project dialog
  const handleOpenDialog = async () => {
    setSearchTerm("");
    setShowOpenDialog(true);
    await fetchProjects();
  };

  const handleLoad = async (id: string) => {
    setLoadingId(id);
    try {
      await loadProject(id);
      setShowOpenDialog(false);
    } catch {
      alert("Failed to load project");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (s.currentProjectId === id) {
      dispatch({ type: "SET_PROJECT_META", id: null, name: null });
    }
  };

  // New project (reset everything)
  const handleNew = () => {
    dispatch({ type: "LOAD_PROJECT", state: {} });
  };

  const filteredProjects = projects.filter(
    (p) =>
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center gap-1.5">
          {/* Current project indicator */}
          {s.currentProjectName && (
            <span className="text-[10px] text-muted-foreground mr-1 truncate max-w-[120px]">
              {s.currentProjectName}
            </span>
          )}

          {/* New */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleNew}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              >
                <FilePlus size={14} />
                New
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Start a new project from scratch
            </TooltipContent>
          </Tooltip>

          {/* Open */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleOpenDialog}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              >
                <FolderOpen size={14} />
                Open
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Open a previously saved project
            </TooltipContent>
          </Tooltip>

          {/* Save */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-md transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : saved ? (
                  <Check size={14} className="text-emerald-400" />
                ) : (
                  <Save size={14} />
                )}
                {saved ? "Saved" : "Save"}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {s.currentProjectId
                ? "Save changes to current project"
                : "Save as a new project"}
            </TooltipContent>
          </Tooltip>

          {/* Save As (only if already saved) */}
          {s.currentProjectId && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleSaveAs}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                >
                  <Save size={14} />
                  Save As
                </button>
              </TooltipTrigger>
              <TooltipContent>
                Save a copy with a new name
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name..."
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Current step: {STEPS[s.step - 1]?.label || s.step} (Step {s.step} of {STEPS.length})
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim() || saving}>
              {saving && <Loader2 size={14} className="animate-spin mr-1" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Open Dialog */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent className="sm:max-w-lg max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Open Project</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search projects..."
              className="pl-8"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 min-h-[200px]">
            {loadingProjects ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {projects.length === 0
                  ? "No saved projects yet"
                  : "No projects match your search"}
              </div>
            ) : (
              filteredProjects.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted/50 transition-colors group ${
                    s.currentProjectId === p.id
                      ? "bg-emerald-500/10 border border-emerald-500/30"
                      : ""
                  }`}
                >
                  <button
                    onClick={() => handleLoad(p.id)}
                    disabled={loadingId === p.id}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Step {p.step} ({STEPS[p.step - 1]?.label || "?"}) &middot;{" "}
                      {new Date(p.updatedAt).toLocaleDateString()}{" "}
                      {new Date(p.updatedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </button>
                  {loadingId === p.id ? (
                    <Loader2 size={14} className="animate-spin text-emerald-400 shrink-0" />
                  ) : (
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      title="Delete project"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
