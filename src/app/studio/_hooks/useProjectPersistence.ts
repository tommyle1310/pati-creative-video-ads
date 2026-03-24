"use client";

import { useCallback } from "react";
import { useStudio } from "../_state/context";
import type { StudioState } from "../_state/types";

/** Upload a remote URL to Supabase Storage, returns the new public URL */
async function uploadUrlToSupabase(
  url: string,
  type: "image" | "video" | "source"
): Promise<string> {
  // Skip if already a Supabase URL
  if (url.includes("supabase.co/storage")) return url;
  // Skip data URLs that are too large or blob URLs (need file upload instead)
  if (url.startsWith("blob:")) return url;

  const res = await fetch("/api/studio/supabase-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, type }),
  });
  if (!res.ok) {
    console.warn(`Failed to upload ${type} to Supabase:`, await res.text());
    return url; // fallback to original URL
  }
  const { url: supabaseUrl } = await res.json();
  return supabaseUrl;
}

/** Upload a File to Supabase Storage via FormData */
async function uploadFileToSupabase(
  file: File,
  type: "image" | "video" | "source"
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);

  const res = await fetch("/api/studio/supabase-upload", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    console.warn(`Failed to upload file to Supabase:`, await res.text());
    return "";
  }
  const { url } = await res.json();
  return url;
}

/**
 * Upload all media (images, videos, source video) to Supabase Storage.
 * Returns a patched copy of the state with Supabase URLs.
 */
async function uploadMediaToSupabase(
  s: StudioState
): Promise<Partial<StudioState>> {
  const patches: Partial<StudioState> = {};

  // 1. Upload source video if it's a blob URL and we have the file
  if (s.uploadedVideoUrl && s.uploadedVideoUrl.startsWith("blob:") && s.uploadedVideoFile) {
    const supabaseUrl = await uploadFileToSupabase(s.uploadedVideoFile, "source");
    if (supabaseUrl) {
      patches.uploadedVideoUrl = supabaseUrl;
    }
  } else if (s.uploadedVideoUrl && !s.uploadedVideoUrl.startsWith("blob:") && !s.uploadedVideoUrl.includes("supabase.co/storage")) {
    // Remote URL (e.g., from DB ad) — re-upload to Supabase
    patches.uploadedVideoUrl = await uploadUrlToSupabase(s.uploadedVideoUrl, "source");
  }

  // 2. Upload scene images and videos
  const updatedScenes = await Promise.all(
    s.scenes.map(async (scene) => {
      // Upload images (concurrently)
      const uploadedImages = await Promise.all(
        scene.images.map((img) => uploadUrlToSupabase(img, "image"))
      );

      // Upload selected image for video
      let selectedImg = scene.selectedImageForVideo;
      if (selectedImg) {
        const idx = scene.images.indexOf(selectedImg);
        if (idx !== -1) {
          selectedImg = uploadedImages[idx];
        } else {
          selectedImg = await uploadUrlToSupabase(selectedImg, "image");
        }
      }

      // Upload videos (concurrently)
      const uploadedVideos = await Promise.all(
        scene.videos.map(async (v) => ({
          ...v,
          url: await uploadUrlToSupabase(v.url, "video"),
        }))
      );

      return {
        ...scene,
        images: uploadedImages,
        selectedImageForVideo: selectedImg,
        videos: uploadedVideos,
      };
    })
  );

  patches.scenes = updatedScenes;

  return patches;
}

function serializeState(s: StudioState): Record<string, unknown> {
  const { uploadedVideoFile, frames, ...rest } = s;
  // Strip blob URLs from scenes (audio)
  const scenes = (rest.scenes || []).map((sc) => ({
    ...sc,
    audioUrl: undefined,
    isGeneratingImage: false,
    isGeneratingVideo: false,
    isGeneratingAudio: false,
  }));
  return {
    ...rest,
    scenes,
    isAnalyzing: false,
    isGeneratingScript: false,
    isGeneratingStoryboard: false,
    isScrapingUrls: false,
  };
}

export interface StudioProjectSummary {
  id: string;
  name: string;
  step: number;
  createdAt: string;
  updatedAt: string;
}

export function useProjectPersistence() {
  const { s, dispatch } = useStudio();

  const saveProject = useCallback(
    async (name: string): Promise<string> => {
      // Upload media to Supabase before saving
      const mediaPatches = await uploadMediaToSupabase(s);
      const patchedState = { ...s, ...mediaPatches };

      const stateJson = serializeState(patchedState as StudioState);
      const res = await fetch("/api/studio/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, step: s.step, stateJson }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { project } = await res.json();

      // Update local state with Supabase URLs so subsequent saves don't re-upload
      if (mediaPatches.uploadedVideoUrl) {
        dispatch({ type: "SET_FIELD", field: "uploadedVideoUrl", value: mediaPatches.uploadedVideoUrl });
      }
      if (mediaPatches.scenes) {
        dispatch({ type: "SET_SCENES", scenes: mediaPatches.scenes });
      }

      dispatch({
        type: "SET_PROJECT_META",
        id: project.id,
        name: project.name,
      });
      return project.id;
    },
    [s, dispatch]
  );

  const updateProject = useCallback(async () => {
    if (!s.currentProjectId) return;

    // Upload media to Supabase before updating
    const mediaPatches = await uploadMediaToSupabase(s);
    const patchedState = { ...s, ...mediaPatches };

    const stateJson = serializeState(patchedState as StudioState);
    await fetch(`/api/studio/projects/${s.currentProjectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: s.step, stateJson }),
    });

    // Update local state with Supabase URLs
    if (mediaPatches.uploadedVideoUrl) {
      dispatch({ type: "SET_FIELD", field: "uploadedVideoUrl", value: mediaPatches.uploadedVideoUrl });
    }
    if (mediaPatches.scenes) {
      dispatch({ type: "SET_SCENES", scenes: mediaPatches.scenes });
    }
  }, [s, dispatch]);

  const loadProject = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/studio/projects/${id}`);
      if (!res.ok) throw new Error((await res.json()).error);
      const { project } = await res.json();
      const state = project.stateJson as Partial<StudioState>;
      state.uploadedVideoFile = null;
      dispatch({
        type: "LOAD_PROJECT",
        state: {
          ...state,
          currentProjectId: project.id,
          currentProjectName: project.name,
        },
      });
    },
    [dispatch]
  );

  const listProjects = useCallback(async (): Promise<
    StudioProjectSummary[]
  > => {
    const res = await fetch("/api/studio/projects");
    if (!res.ok) return [];
    const { projects } = await res.json();
    return projects;
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    await fetch(`/api/studio/projects/${id}`, { method: "DELETE" });
  }, []);

  return { saveProject, updateProject, loadProject, listProjects, deleteProject };
}
