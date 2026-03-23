"use client";

import { useCallback } from "react";
import { useStudio } from "../_state/context";
import { pollJob, pollKieJob, pcmToWav } from "../_utils/helpers";

export function useAssetGeneration() {
  const { s, dispatch } = useStudio();

  const ensureVidtoryUploads = useCallback(async () => {
    let productUrl = s.productVidtoryUrl;
    let creatorUrl = s.creatorVidtoryUrl;

    if (!productUrl && s.productImage) {
      const res = await fetch("/api/studio/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: s.productImage }),
      });
      const data = await res.json();
      productUrl = data.url;
    }
    if (!creatorUrl && s.creatorImage) {
      const res = await fetch("/api/studio/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: s.creatorImage }),
      });
      const data = await res.json();
      creatorUrl = data.url;
    }
    dispatch({
      type: "SET_VIDTORY_URLS",
      product: productUrl || undefined,
      creator: creatorUrl || undefined,
    });
    return { productUrl, creatorUrl };
  }, [
    s.productImage,
    s.creatorImage,
    s.productVidtoryUrl,
    s.creatorVidtoryUrl,
    dispatch,
  ]);

  const handleGenerateImage = useCallback(
    async (sceneId: string) => {
      const scene = s.scenes.find((sc) => sc.id === sceneId);
      if (!scene) return;

      dispatch({
        type: "UPDATE_SCENE",
        id: sceneId,
        patch: { isGeneratingImage: true, imageGenerationError: null },
      });

      try {
        const { productUrl, creatorUrl } = await ensureVidtoryUploads();

        let prompt =
          typeof scene.imagePrompt === "object"
            ? JSON.stringify(scene.imagePrompt)
            : scene.imagePrompt;
        if (
          scene.rollType === "aroll" &&
          !prompt.toLowerCase().startsWith("hyperrealistic")
        ) {
          prompt = `Hyperrealistic photography. ${prompt}`;
        }
        if (scene.imageFocusObject)
          prompt = `Focus on: ${scene.imageFocusObject}. ${prompt}`;
        if (scene.imageCameraAngle)
          prompt = `${scene.imageCameraAngle} shot. ${prompt}`;

        const res = await fetch("/api/studio/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            aspectRatio: s.aspectRatio,
            characterUrl: creatorUrl,
            productUrl,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        const { jobId } = await res.json();

        dispatch({
          type: "UPDATE_SCENE",
          id: sceneId,
          patch: { imageJobId: jobId },
        });

        const imageUrl = await pollJob(jobId, 5000, 300000);

        dispatch({
          type: "UPDATE_SCENE",
          id: sceneId,
          patch: {
            images: [...scene.images, imageUrl],
            selectedImageForVideo: scene.selectedImageForVideo || imageUrl,
            isGeneratingImage: false,
          },
        });
      } catch (err) {
        dispatch({
          type: "UPDATE_SCENE",
          id: sceneId,
          patch: {
            isGeneratingImage: false,
            imageGenerationError:
              err instanceof Error ? err.message : "Failed",
          },
        });
      }
    },
    [s.scenes, s.aspectRatio, ensureVidtoryUploads, dispatch]
  );

  const handleGenerateVideo = useCallback(
    async (sceneId: string) => {
      const scene = s.scenes.find((sc) => sc.id === sceneId);
      if (!scene?.selectedImageForVideo) return;

      dispatch({
        type: "UPDATE_SCENE",
        id: sceneId,
        patch: { isGeneratingVideo: true, videoGenerationError: null },
      });

      try {
        const vpStr =
          typeof scene.videoPrompt === "object"
            ? JSON.stringify(scene.videoPrompt)
            : scene.videoPrompt;
        const rollType = scene.rollType || "broll";
        const allowLipsync =
          rollType === "aroll" && scene.includeDialogueInPrompt;
        let prompt = `Motion/Action: ${vpStr}`;
        if (allowLipsync) {
          prompt = `The creator is speaking.\n${prompt}`;
          prompt += `\nDialogue in English: "${scene.voiceoverScript}"`;
        }
        if (rollType !== "aroll") {
          prompt +=
            "\n\nThe subject does NOT speak. No lip movement. No mouth movement. No lip sync. No dialogue. Completely silent character.";
        }
        prompt +=
          "\n\nAUDIO CONSTRAINT: Absolutely NO background music. NO ambient sounds. NO sound effects. NO soundtrack. Complete silence except for voiceover if present. No Music Background.";
        if (rollType === "aroll") {
          if (!prompt.includes("Shot on"))
            prompt +=
              "\nShot on iPhone 15 Pro, portrait mode, f/1.8. 1600 ISO grain. No color grade. Unfiltered.";
        } else {
          if (!prompt.includes("Shot on"))
            prompt +=
              "\nPhotorealistic, shot on Sony A7IV, 85mm lens, natural color grading.";
        }

        const useKie = s.videoModel === "kling-3.0";
        const endpoint = useKie
          ? "/api/studio/kie-generate-video"
          : "/api/studio/generate-video";

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            aspectRatio: s.aspectRatio,
            startImageUrl: scene.selectedImageForVideo,
            duration: 5,
            ...(useKie ? { mode: "std" } : {}),
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        const { jobId } = await res.json();

        dispatch({
          type: "UPDATE_SCENE",
          id: sceneId,
          patch: { videoJobId: jobId },
        });

        const videoUrl = useKie
          ? await pollKieJob(jobId, 10000, 900000)
          : await pollJob(jobId, 10000, 900000);

        dispatch({
          type: "UPDATE_SCENE",
          id: sceneId,
          patch: {
            videos: [
              ...scene.videos,
              { url: videoUrl, mediaGenerationId: jobId, seed: 0 },
            ],
            isGeneratingVideo: false,
          },
        });
      } catch (err) {
        dispatch({
          type: "UPDATE_SCENE",
          id: sceneId,
          patch: {
            isGeneratingVideo: false,
            videoGenerationError:
              err instanceof Error ? err.message : "Failed",
          },
        });
      }
    },
    [s.scenes, s.aspectRatio, s.videoModel, dispatch]
  );

  const handleGenerateAudio = useCallback(
    async (sceneId: string) => {
      const scene = s.scenes.find((sc) => sc.id === sceneId);
      if (!scene) return;

      dispatch({
        type: "UPDATE_SCENE",
        id: sceneId,
        patch: { isGeneratingAudio: true, audioGenerationError: null },
      });

      try {
        const res = await fetch("/api/studio/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: scene.voiceoverScript,
            guide: scene.voiceoverGuide,
            voice: s.voice,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        const { audioBase64 } = await res.json();

        const audioUrl = pcmToWav(audioBase64);

        dispatch({
          type: "UPDATE_SCENE",
          id: sceneId,
          patch: { audioUrl, isGeneratingAudio: false },
        });
      } catch (err) {
        dispatch({
          type: "UPDATE_SCENE",
          id: sceneId,
          patch: {
            isGeneratingAudio: false,
            audioGenerationError:
              err instanceof Error ? err.message : "Failed",
          },
        });
      }
    },
    [s.scenes, s.voice, dispatch]
  );

  const handleGenerateAllImages = useCallback(async () => {
    const tasks = s.scenes
      .filter((sc) => sc.images.length === 0 && !sc.isGeneratingImage)
      .map((sc) => sc.id);

    const running: Promise<void>[] = [];
    for (const id of tasks) {
      const p = handleGenerateImage(id);
      running.push(p);
      if (running.length >= 3) {
        await Promise.race(running);
        running.splice(
          running.findIndex((r) => r === p),
          1
        );
      }
    }
    await Promise.all(running);
  }, [s.scenes, handleGenerateImage]);

  const handleGenerateAllAudio = useCallback(async () => {
    const tasks = s.scenes
      .filter((sc) => !sc.audioUrl && !sc.isGeneratingAudio)
      .map((sc) => sc.id);

    const running: Promise<void>[] = [];
    for (const id of tasks) {
      const p = handleGenerateAudio(id);
      running.push(p);
      if (running.length >= 3) {
        await Promise.race(running);
        running.splice(
          running.findIndex((r) => r === p),
          1
        );
      }
    }
    await Promise.all(running);
  }, [s.scenes, handleGenerateAudio]);

  const handleEnhancePrompt = useCallback(
    async (sceneId: string, promptType: "image" | "video") => {
      const scene = s.scenes.find((sc) => sc.id === sceneId);
      if (!scene) return;

      try {
        const res = await fetch("/api/studio/enhance-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectContext: `Product: ${s.productInfo}\nAudience: ${s.targetAudience}\nBig Idea: ${s.bigIdea}${s.motivator ? `\nMotivator: ${s.motivator}` : ""}${s.emotionalTone ? `\nEmotional Tone: ${s.emotionalTone}` : ""}${s.storylineType ? `\nStoryline: ${s.storylineType}` : ""}`,
            scene,
            promptType,
            productImage: s.productImage,
            creatorImage: s.creatorImage,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        const { enhancedPrompt } = await res.json();

        dispatch({
          type: "UPDATE_SCENE",
          id: sceneId,
          patch:
            promptType === "image"
              ? { imagePrompt: enhancedPrompt }
              : { videoPrompt: enhancedPrompt },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Enhancement failed";
        dispatch({
          type: "UPDATE_SCENE",
          id: sceneId,
          patch:
            promptType === "image"
              ? { imageGenerationError: msg }
              : { videoGenerationError: msg },
        });
      }
    },
    [
      s.scenes,
      s.productInfo,
      s.targetAudience,
      s.bigIdea,
      s.productImage,
      s.creatorImage,
      s.motivator,
      s.emotionalTone,
      s.storylineType,
      dispatch,
    ]
  );

  return {
    handleGenerateImage,
    handleGenerateVideo,
    handleGenerateAudio,
    handleGenerateAllImages,
    handleGenerateAllAudio,
    handleEnhancePrompt,
  };
}
