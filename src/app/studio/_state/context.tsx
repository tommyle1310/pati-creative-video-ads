"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { StudioState, Action } from "./types";
import { initialState } from "./initial";
import { reducer } from "./reducer";

const STORAGE_KEY = "studio-state";

function cleanStoredState(parsed: Partial<StudioState>): Partial<StudioState> {
  // Clear non-serializable / blob fields
  parsed.uploadedVideoFile = null;
  parsed.frames = [];
  // Blob URLs don't survive navigation, clear audio
  if (Array.isArray(parsed.scenes)) {
    parsed.scenes = parsed.scenes.map((sc) => ({
      ...sc,
      audioUrl: undefined,
      isGeneratingImage: false,
      isGeneratingVideo: false,
      isGeneratingAudio: false,
    }));
  }
  parsed.isAnalyzing = false;
  parsed.isGeneratingScript = false;
  parsed.isGeneratingStoryboard = false;
  parsed.isScrapingUrls = false;
  // If auto-generate was mid-pipeline when page unloaded, mark as error
  // (the async pipeline can't survive a full page reload)
  const ap = parsed.autoPhase;
  if (ap && ap !== "idle" && ap !== "complete" && ap !== "error") {
    parsed.autoPhase = "error";
    parsed.autoError = "Pipeline interrupted — page was reloaded";
  }
  return parsed;
}

function persistToStorage(state: StudioState) {
  try {
    const serializable = {
      ...state,
      uploadedVideoFile: null,
      frames: [], // too large for sessionStorage
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // sessionStorage full or unavailable — silently ignore
  }
}

interface StudioContextValue {
  s: StudioState;
  dispatch: React.Dispatch<Action>;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
  // ALWAYS start with initialState to match server render (fixes hydration)
  const [s, dispatch] = useReducer(reducer, initialState);
  const hydrated = useRef(false);

  // Hydrate from sessionStorage AFTER first mount (client-only)
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<StudioState>;
      const cleaned = cleanStoredState(parsed);
      dispatch({ type: "LOAD_PROJECT", state: cleaned });
    } catch {
      // corrupt storage — ignore
    }
  }, []);

  // Persist on every state change (debounced 100ms)
  useEffect(() => {
    if (!hydrated.current) return;
    const timer = setTimeout(() => persistToStorage(s), 100);
    return () => clearTimeout(timer);
  }, [s]);

  // Flush state to sessionStorage on unmount (navigation away)
  useEffect(() => {
    return () => {
      if (hydrated.current) persistToStorage(s);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also persist on latest state via ref for the unmount flush
  const stateRef = useRef(s);
  stateRef.current = s;
  useEffect(() => {
    return () => {
      persistToStorage(stateRef.current);
    };
  }, []);

  return (
    <StudioContext.Provider value={{ s, dispatch }}>
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used inside StudioProvider");
  return ctx;
}
