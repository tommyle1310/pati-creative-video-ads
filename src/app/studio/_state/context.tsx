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

function hydrateFromStorage(): StudioState {
  if (typeof window === "undefined") return initialState;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<StudioState>;
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
    return { ...initialState, ...parsed };
  } catch {
    return initialState;
  }
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
  const [s, dispatch] = useReducer(reducer, undefined, hydrateFromStorage);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => persistToStorage(s), 100);
    return () => clearTimeout(timer);
  }, [s]);

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
