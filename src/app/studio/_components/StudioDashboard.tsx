"use client";

import { useState, useEffect, useCallback } from "react";
import {
  User,
  FolderOpen,
  Play,
  Image as ImageIcon,
  Video,
  Loader2,
  ChevronDown,
  ChevronRight,
  Clock,
  Trash2,
  Search,
  X,
  Maximize2,
  Film,
} from "lucide-react";
import { useStudio } from "../_state/context";
import { useProjectPersistence } from "../_hooks/useProjectPersistence";
import { VoicePicker } from "./VoicePicker";

interface StudioProjectSummary {
  id: string;
  name: string;
  step: number;
  createdAt: string;
  updatedAt: string;
}

interface AssetData {
  id: string;
  type: "image" | "video";
  url: string;
  name: string;
  folderId: string | null;
  folder: { id: string; name: string; parentId: string | null } | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface CharacterData {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  voiceId: string | null;
  voiceSource: string | null;
  voiceName: string | null;
}

interface BrandWithCharacters {
  id: string;
  name: string;
  characters: CharacterData[];
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function StudioDashboard({ onStart }: { onStart: () => void }) {
  const { s, dispatch } = useStudio();
  const { listProjects, loadProject, deleteProject } =
    useProjectPersistence();

  // Character section
  const [charExpanded, setCharExpanded] = useState(true);
  const [brands, setBrands] = useState<BrandWithCharacters[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);

  // Assets section
  const [assetsExpanded, setAssetsExpanded] = useState(true);
  const [projects, setProjects] = useState<StudioProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);

  // Saved assets section
  const [savedAssetsExpanded, setSavedAssetsExpanded] = useState(true);
  const [savedAssets, setSavedAssets] = useState<AssetData[]>([]);
  const [savedAssetsTotal, setSavedAssetsTotal] = useState(0);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assetFilter, setAssetFilter] = useState<"all" | "image" | "video">("all");
  const [assetSearch, setAssetSearch] = useState("");
  const [previewAsset, setPreviewAsset] = useState<AssetData | null>(null);

  // Character name/desc (local state — dispatched on start)
  const [charName, setCharName] = useState("");
  const [charDesc, setCharDesc] = useState("");

  const fetchBrands = useCallback(async () => {
    setLoadingBrands(true);
    try {
      const res = await fetch("/api/brand-config");
      if (res.ok) {
        const data = await res.json();
        setBrands(
          (data.brands || []).filter(
            (b: BrandWithCharacters) => b.characters.length > 0
          )
        );
      }
    } catch {
      /* silent */
    } finally {
      setLoadingBrands(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const list = await listProjects();
      setProjects(list);
    } catch {
      /* silent */
    } finally {
      setLoadingProjects(false);
    }
  }, [listProjects]);

  const fetchAssets = useCallback(async (type?: string, search?: string) => {
    setLoadingAssets(true);
    try {
      const params = new URLSearchParams({ limit: "30" });
      if (type && type !== "all") params.set("type", type);
      if (search) params.set("search", search);
      const res = await fetch(`/api/studio/assets?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSavedAssets(data.assets || []);
        setSavedAssetsTotal(data.total || 0);
      }
    } catch { /* silent */ }
    setLoadingAssets(false);
  }, []);

  const handleDeleteAsset = async (id: string) => {
    try {
      const res = await fetch(`/api/studio/assets/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSavedAssets((prev) => prev.filter((a) => a.id !== id));
        setSavedAssetsTotal((prev) => prev - 1);
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchBrands();
    fetchProjects();
    fetchAssets();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch assets when filter/search changes
  useEffect(() => {
    fetchAssets(assetFilter, assetSearch);
  }, [assetFilter, assetSearch, fetchAssets]);

  const handleLoadCharacter = (c: CharacterData) => {
    setCharName(c.name);
    setCharDesc(c.description || "");
    if (c.imageUrl) {
      dispatch({ type: "SET_CREATOR_IMAGE", data: c.imageUrl });
    }
    if (c.voiceId) {
      dispatch({ type: "SET_FIELD", field: "voice", value: c.voiceId });
      dispatch({
        type: "SET_FIELD",
        field: "voiceSource",
        value: c.voiceSource || "gemini",
      });
      dispatch({
        type: "SET_FIELD",
        field: "voiceName",
        value: c.voiceName || c.name,
      });
    }
  };

  const handleCreatorImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    dispatch({ type: "SET_CREATOR_IMAGE", data: base64 });
  };

  const handleOpenProject = async (id: string) => {
    setLoadingProjectId(id);
    try {
      await loadProject(id);
      onStart();
    } catch {
      /* silent */
    } finally {
      setLoadingProjectId(null);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch {
      /* silent */
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const STEP_LABELS = [
    "",
    "Source",
    "Analyze",
    "Product",
    "Script",
    "Storyboard",
    "Generate",
    "Preview",
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Character Card ── */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
            onClick={() => setCharExpanded(!charExpanded)}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <User size={16} className="text-violet-400" />
              Character
            </span>
            {charExpanded ? (
              <ChevronDown size={14} className="text-muted-foreground" />
            ) : (
              <ChevronRight size={14} className="text-muted-foreground" />
            )}
          </button>

          {charExpanded && (
            <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
              {/* Creator image */}
              <div className="flex items-start gap-4">
                <label className="h-20 w-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-muted-foreground transition-colors overflow-hidden shrink-0 relative group">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCreatorImageUpload}
                  />
                  {s.creatorImage ? (
                    <>
                      <img
                        src={s.creatorImage}
                        alt="Creator"
                        className="h-full w-full object-cover"
                      />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          dispatch({ type: "SET_CREATOR_IMAGE", data: "" });
                        }}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </>
                  ) : (
                    <ImageIcon
                      size={20}
                      className="text-muted-foreground"
                    />
                  )}
                </label>
                <div className="flex-1 space-y-2">
                  <input
                    value={charName}
                    onChange={(e) => setCharName(e.target.value)}
                    placeholder="Character name"
                    className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm"
                  />
                  <input
                    value={charDesc}
                    onChange={(e) => setCharDesc(e.target.value)}
                    placeholder="Description (age, style, energy)"
                    className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              {/* Voice */}
              <VoicePicker />

              {/* Load from saved characters */}
              {brands.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wide">
                    Load from saved
                  </p>
                  {loadingBrands ? (
                    <Loader2
                      size={14}
                      className="animate-spin text-muted-foreground"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {brands.flatMap((b) =>
                        b.characters.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleLoadCharacter(c)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-xs hover:border-violet-500/50 hover:bg-violet-500/5 transition-colors"
                          >
                            {c.imageUrl && (
                              <img
                                src={c.imageUrl}
                                alt={c.name}
                                className="h-4 w-4 rounded-full object-cover"
                              />
                            )}
                            <span>{c.name}</span>
                            <span className="text-[9px] text-muted-foreground">
                              ({b.name})
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Assets / Projects Card ── */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
            onClick={() => setAssetsExpanded(!assetsExpanded)}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <FolderOpen size={16} className="text-amber-400" />
              Projects
              {projects.length > 0 && (
                <span className="text-[10px] text-muted-foreground font-normal">
                  ({projects.length})
                </span>
              )}
            </span>
            {assetsExpanded ? (
              <ChevronDown size={14} className="text-muted-foreground" />
            ) : (
              <ChevronRight size={14} className="text-muted-foreground" />
            )}
          </button>

          {assetsExpanded && (
            <div className="px-5 pb-5 space-y-3 border-t border-border pt-4">
              {/* Search */}
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full bg-background border border-border rounded pl-7 pr-3 py-1.5 text-xs"
                />
              </div>

              {loadingProjects ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2
                    size={16}
                    className="animate-spin text-muted-foreground"
                  />
                </div>
              ) : filteredProjects.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  {projects.length === 0
                    ? "No saved projects yet"
                    : "No matching projects"}
                </p>
              ) : (
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {filteredProjects.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => handleOpenProject(p.id)}
                    >
                      {loadingProjectId === p.id ? (
                        <Loader2
                          size={12}
                          className="animate-spin text-amber-400 shrink-0"
                        />
                      ) : (
                        <FolderOpen
                          size={12}
                          className="text-amber-400 shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                          <span className="px-1 py-0.5 bg-muted rounded text-[9px]">
                            Step {p.step}: {STEP_LABELS[p.step] || "?"}
                          </span>
                          <Clock size={9} />
                          {new Date(p.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(p.id);
                        }}
                        className="p-1 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Start Card ── */}
        <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Play size={32} className="text-emerald-400 ml-1" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-semibold">Start New Project</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Clone & improve a competitor video ad
              </p>
            </div>
            <button
              onClick={onStart}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Start Studio
            </button>
          </div>

          {/* Current project indicator */}
          {s.currentProjectName && (
            <div className="border-t border-border px-5 py-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                Last session
              </p>
              <button
                onClick={onStart}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              >
                Continue: {s.currentProjectName} (Step {s.step})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Saved Assets Section ── */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
          onClick={() => setSavedAssetsExpanded(!savedAssetsExpanded)}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Film size={16} className="text-blue-400" />
            Saved Assets
            {savedAssetsTotal > 0 && (
              <span className="text-[10px] text-muted-foreground font-normal">
                ({savedAssetsTotal})
              </span>
            )}
          </span>
          {savedAssetsExpanded ? (
            <ChevronDown size={14} className="text-muted-foreground" />
          ) : (
            <ChevronRight size={14} className="text-muted-foreground" />
          )}
        </button>

        {savedAssetsExpanded && (
          <div className="px-5 pb-5 space-y-3 border-t border-border pt-4">
            {/* Filter + Search */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border border-border overflow-hidden text-[11px]">
                {(["all", "image", "video"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setAssetFilter(f)}
                    className={`px-2.5 py-1 transition-colors ${
                      assetFilter === f
                        ? "bg-blue-600 text-white"
                        : "bg-background text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    {f === "all" ? "All" : f === "image" ? "Images" : "Videos"}
                  </button>
                ))}
              </div>
              <div className="relative flex-1">
                <Search
                  size={12}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  placeholder="Search assets..."
                  className="w-full bg-background border border-border rounded pl-7 pr-3 py-1.5 text-xs"
                />
              </div>
            </div>

            {loadingAssets ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            ) : savedAssets.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                {savedAssetsTotal === 0
                  ? "No saved assets yet. Save images & videos from the Generate step."
                  : "No matching assets"}
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {savedAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="relative group border border-border rounded-lg overflow-hidden bg-muted/10 hover:border-blue-500/40 transition-colors"
                  >
                    {/* Thumbnail */}
                    {asset.type === "image" ? (
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="w-full h-28 object-cover cursor-pointer"
                        onClick={() => setPreviewAsset(asset)}
                      />
                    ) : (
                      <div
                        className="w-full h-28 bg-muted/20 flex items-center justify-center cursor-pointer relative"
                        onClick={() => setPreviewAsset(asset)}
                      >
                        <Video size={24} className="text-emerald-400" />
                        <span className="absolute top-1 right-1 text-[8px] bg-emerald-500/20 text-emerald-400 px-1 rounded">
                          VID
                        </span>
                      </div>
                    )}

                    {/* Info overlay */}
                    <div className="px-2 py-1.5">
                      <p className="text-[11px] font-medium truncate">{asset.name}</p>
                      <div className="flex items-center gap-1">
                        {asset.folder && (
                          <span className="text-[9px] text-muted-foreground truncate">
                            {asset.folder.name}
                          </span>
                        )}
                        <span className="text-[9px] text-muted-foreground ml-auto flex items-center gap-0.5">
                          <Clock size={8} />
                          {new Date(asset.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Hover actions */}
                    <div className="absolute top-1 left-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setPreviewAsset(asset)}
                        className="p-1 bg-black/60 rounded"
                        title="Preview"
                      >
                        <Maximize2 size={10} className="text-white" />
                      </button>
                      <button
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="p-1 bg-black/60 rounded hover:bg-red-600/80"
                        title="Delete"
                      >
                        <Trash2 size={10} className="text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Asset Preview Modal ── */}
      {previewAsset && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreviewAsset(null)}
        >
          <div
            className="bg-background border border-border rounded-xl max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <h3 className="text-sm font-semibold">{previewAsset.name}</h3>
                <p className="text-[10px] text-muted-foreground">
                  {previewAsset.type} · {previewAsset.folder?.name || "Root"}
                  {" · "}
                  {new Date(previewAsset.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setPreviewAsset(null)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
              {previewAsset.type === "image" ? (
                <img
                  src={previewAsset.url}
                  alt={previewAsset.name}
                  className="max-w-full max-h-[70vh] rounded-lg"
                />
              ) : (
                <video
                  src={previewAsset.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[70vh] rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
