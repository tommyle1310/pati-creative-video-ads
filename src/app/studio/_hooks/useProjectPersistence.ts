"use client";

import { useCallback } from "react";
import { useStudio } from "../_state/context";
import type { StudioState } from "../_state/types";

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
      const stateJson = serializeState(s);
      const res = await fetch("/api/studio/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, step: s.step, stateJson }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { project } = await res.json();
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
    const stateJson = serializeState(s);
    await fetch(`/api/studio/projects/${s.currentProjectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: s.step, stateJson }),
    });
  }, [s]);

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
