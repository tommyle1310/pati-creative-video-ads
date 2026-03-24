"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  ChevronDown,
  Search,
  Plus,
  Loader2,
  Play,
  Pause,
  Save,
  Volume2,
  Sparkles,
} from "lucide-react";
import { useStudio } from "../_state/context";
import { VOICES } from "../_constants";

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  preview_url: string;
}

interface VoicePreview {
  audio_base_64: string;
  generated_voice_id: string;
  media_type: string;
  duration_secs: number;
}

type VoiceSource = "gemini" | "elevenlabs";

export function VoicePicker() {
  const { s, dispatch } = useStudio();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<VoiceSource>(
    s.voiceSource === "elevenlabs" ? "elevenlabs" : "gemini"
  );

  // ElevenLabs voices
  const [elVoices, setElVoices] = useState<ElevenLabsVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  // Create voice
  const [showCreate, setShowCreate] = useState(false);
  const [newVoiceName, setNewVoiceName] = useState("");
  const [newVoiceDesc, setNewVoiceDesc] = useState("");
  const [newVoiceText, setNewVoiceText] = useState(
    "The first move is what sets everything in motion. Every great journey starts with a single step forward, and this is yours. Are you ready to begin?"
  );
  const [creating, setCreating] = useState(false);
  const [previews, setPreviews] = useState<VoicePreview[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Audio preview
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  const fetchVoices = useCallback(async () => {
    if (voicesLoaded) return;
    setLoadingVoices(true);
    try {
      const res = await fetch("/api/studio/elevenlabs-voices");
      if (res.ok) {
        const data = await res.json();
        setElVoices(data.voices || []);
        setVoicesLoaded(true);
      }
    } catch {
      // silent
    } finally {
      setLoadingVoices(false);
    }
  }, [voicesLoaded]);

  // Sync tab to current voiceSource when popover opens
  useEffect(() => {
    if (open) {
      setTab(s.voiceSource === "elevenlabs" ? "elevenlabs" : "gemini");
    }
  }, [open, s.voiceSource]);

  useEffect(() => {
    if (open && tab === "elevenlabs" && !voicesLoaded) {
      fetchVoices();
    }
  }, [open, tab, voicesLoaded, fetchVoices]);

  const playPreview = (url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (playingUrl === url) {
      setPlayingUrl(null);
      return;
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingUrl(url);
    audio.play();
    audio.onended = () => setPlayingUrl(null);
  };

  const playBase64 = (base64: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const url = `data:audio/mpeg;base64,${base64}`;
    if (playingUrl === url) {
      setPlayingUrl(null);
      return;
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingUrl(url);
    audio.play();
    audio.onended = () => setPlayingUrl(null);
  };

  const handleCreatePreviews = async () => {
    if (!newVoiceName.trim() || !newVoiceText.trim()) return;
    setCreating(true);
    setPreviews([]);
    try {
      const res = await fetch("/api/studio/elevenlabs-voices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newVoiceName,
          description: newVoiceDesc || newVoiceName,
          text: newVoiceText,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviews(data.previews || []);
      }
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  };

  const handleSaveVoice = async (preview: VoicePreview) => {
    setSavingId(preview.generated_voice_id);
    try {
      const res = await fetch("/api/studio/elevenlabs-voices/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voice_name: newVoiceName,
          voice_description: newVoiceDesc || newVoiceName,
          generated_voice_id: preview.generated_voice_id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // Select the newly saved voice
        dispatch({
          type: "SET_FIELD",
          field: "voice",
          value: data.voice_id,
        });
        dispatch({
          type: "SET_FIELD",
          field: "voiceSource",
          value: "elevenlabs",
        });
        dispatch({
          type: "SET_FIELD",
          field: "voiceName",
          value: newVoiceName,
        });
        // Refresh voice list
        setVoicesLoaded(false);
        setShowCreate(false);
        setPreviews([]);
        setNewVoiceName("");
        setNewVoiceDesc("");
      }
    } catch {
      // silent
    } finally {
      setSavingId(null);
    }
  };

  const selectGeminiVoice = (name: string) => {
    dispatch({ type: "SET_FIELD", field: "voice", value: name });
    dispatch({ type: "SET_FIELD", field: "voiceSource", value: "gemini" });
    dispatch({ type: "SET_FIELD", field: "voiceName", value: name });
    setOpen(false);
  };

  const selectElevenLabsVoice = (voice: ElevenLabsVoice) => {
    dispatch({ type: "SET_FIELD", field: "voice", value: voice.voice_id });
    dispatch({
      type: "SET_FIELD",
      field: "voiceSource",
      value: "elevenlabs",
    });
    dispatch({ type: "SET_FIELD", field: "voiceName", value: voice.name });
    setOpen(false);
  };

  const filteredGemini = VOICES.filter((v) =>
    v.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEl = elVoices.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  const displayName = s.voiceName || s.voice;
  const sourceLabel =
    s.voiceSource === "elevenlabs" ? "ElevenLabs" : "Gemini";

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        Voiceover Voice
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 bg-background border border-border rounded px-2 py-1.5 text-sm hover:border-muted-foreground transition-colors min-w-[160px]">
            <Volume2 size={12} className="text-purple-400 shrink-0" />
            <span className="truncate flex-1 text-left">{displayName}</span>
            <span
              className={`text-[9px] px-1 py-0.5 rounded shrink-0 ${
                s.voiceSource === "elevenlabs"
                  ? "bg-violet-500/20 text-violet-400"
                  : "bg-cyan-500/20 text-cyan-400"
              }`}
            >
              {sourceLabel}
            </span>
            <ChevronDown size={12} className="text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-80 p-0 max-h-[500px] flex flex-col"
        >
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setTab("gemini")}
              className={`flex-1 text-xs py-2 font-medium transition-colors ${
                tab === "gemini"
                  ? "text-cyan-400 border-b-2 border-cyan-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Gemini Voices
            </button>
            <button
              onClick={() => setTab("elevenlabs")}
              className={`flex-1 text-xs py-2 font-medium transition-colors ${
                tab === "elevenlabs"
                  ? "text-violet-400 border-b-2 border-violet-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ElevenLabs
            </button>
          </div>

          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search
                size={12}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search voices..."
                className="w-full bg-muted/50 border border-border rounded pl-7 pr-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                autoFocus
              />
            </div>
          </div>

          {/* Voice list */}
          <div className="overflow-y-auto flex-1 max-h-[300px]">
            {tab === "gemini" && (
              <div className="p-1">
                {filteredGemini.map((v) => (
                  <button
                    key={v}
                    onClick={() => selectGeminiVoice(v)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-left hover:bg-muted/50 transition-colors ${
                      s.voice === v && s.voiceSource === "gemini"
                        ? "bg-cyan-500/10 text-cyan-300"
                        : ""
                    }`}
                  >
                    <Volume2 size={12} />
                    <span className="flex-1">{v}</span>
                    <span className="text-[9px] text-muted-foreground">
                      Gemini
                    </span>
                  </button>
                ))}
                {filteredGemini.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-4">
                    No matching Gemini voices
                  </p>
                )}
              </div>
            )}

            {tab === "elevenlabs" && !showCreate && (
              <div className="p-1">
                {loadingVoices ? (
                  <div className="flex items-center justify-center gap-2 py-6">
                    <Loader2
                      size={14}
                      className="animate-spin text-violet-400"
                    />
                    <span className="text-xs text-muted-foreground">
                      Loading voices...
                    </span>
                  </div>
                ) : (
                  <>
                    {filteredEl.map((v) => (
                      <button
                        key={v.voice_id}
                        onClick={() => selectElevenLabsVoice(v)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-left hover:bg-muted/50 transition-colors ${
                          s.voice === v.voice_id &&
                          s.voiceSource === "elevenlabs"
                            ? "bg-violet-500/10 text-violet-300"
                            : ""
                        }`}
                      >
                        {v.preview_url && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              playPreview(v.preview_url);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.stopPropagation();
                                playPreview(v.preview_url);
                              }
                            }}
                            className="shrink-0 p-0.5 hover:text-violet-400 cursor-pointer"
                          >
                            {playingUrl === v.preview_url ? (
                              <Pause size={10} />
                            ) : (
                              <Play size={10} />
                            )}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{v.name}</div>
                          {v.category && (
                            <div className="text-[9px] text-muted-foreground">
                              {v.category}
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-violet-400 shrink-0">
                          11Labs
                        </span>
                      </button>
                    ))}
                    {filteredEl.length === 0 && !loadingVoices && (
                      <p className="text-[10px] text-muted-foreground text-center py-4">
                        {search
                          ? "No matching voices"
                          : "No ElevenLabs voices found"}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Create voice form */}
            {tab === "elevenlabs" && showCreate && (
              <div className="p-3 space-y-3">
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium">
                    Voice Name
                  </label>
                  <input
                    value={newVoiceName}
                    onChange={(e) => setNewVoiceName(e.target.value)}
                    placeholder="e.g. Confident Male Narrator"
                    className="w-full bg-muted/50 border border-border rounded px-2 py-1.5 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium">
                    Voice Description (prompt)
                  </label>
                  <textarea
                    value={newVoiceDesc}
                    onChange={(e) => setNewVoiceDesc(e.target.value)}
                    placeholder="e.g. A deep, warm male voice with a confident tone, slight American accent, suitable for product advertisements"
                    className="w-full bg-muted/50 border border-border rounded px-2 py-1.5 text-xs mt-1 h-16 resize-y"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium">
                    Sample Text
                    <span className={`ml-1 ${newVoiceText.length < 100 ? "text-red-400" : "text-emerald-400"}`}>
                      ({newVoiceText.length}/100 min)
                    </span>
                  </label>
                  <textarea
                    value={newVoiceText}
                    onChange={(e) => setNewVoiceText(e.target.value)}
                    className={`w-full bg-muted/50 border rounded px-2 py-1.5 text-xs mt-1 h-12 resize-y ${
                      newVoiceText.length < 100 ? "border-red-500/50" : "border-border"
                    }`}
                  />
                </div>
                <button
                  onClick={handleCreatePreviews}
                  disabled={
                    creating || !newVoiceName.trim() || !newVoiceText.trim()
                  }
                  className="w-full flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-medium"
                >
                  {creating ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  {creating ? "Generating Previews..." : "Generate Voice Previews"}
                </button>

                {/* Preview results */}
                {previews.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Pick a preview to save:
                    </p>
                    {previews.map((p, i) => (
                      <div
                        key={p.generated_voice_id}
                        className="flex items-center gap-2 bg-muted/30 rounded p-2"
                      >
                        <button
                          onClick={() => playBase64(p.audio_base_64)}
                          className="shrink-0 p-1 hover:text-violet-400"
                        >
                          {playingUrl ===
                          `data:audio/mpeg;base64,${p.audio_base_64}` ? (
                            <Pause size={12} />
                          ) : (
                            <Play size={12} />
                          )}
                        </button>
                        <span className="text-xs flex-1">
                          Preview {i + 1}{" "}
                          <span className="text-[9px] text-muted-foreground">
                            ({p.duration_secs?.toFixed(1)}s)
                          </span>
                        </span>
                        <button
                          onClick={() => handleSaveVoice(p)}
                          disabled={savingId === p.generated_voice_id}
                          className="flex items-center gap-1 text-[10px] bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-2 py-1 rounded font-medium"
                        >
                          {savingId === p.generated_voice_id ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <Save size={10} />
                          )}
                          Save & Use
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer: create voice button */}
          {tab === "elevenlabs" && (
            <div className="border-t border-border p-2">
              <button
                onClick={() => {
                  setShowCreate(!showCreate);
                  setPreviews([]);
                }}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 py-1.5"
              >
                <Plus size={12} />
                {showCreate ? "Back to Voice List" : "Create New Voice"}
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
